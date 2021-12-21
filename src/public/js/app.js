const socket=io();

const first_div = document.getElementById("first_div");
const room = document.getElementById("room");
const form = first_div.querySelector("form#roomselect");
// const form2 = room.querySelector("form");
const myFace = document.getElementById("myFace");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("camera");
const camerasBtn = document.getElementById("cameras");

let myStream;
let roomName;
let muted = false;
let camera = true;
let mypeerconnection;
let nickname = "익명의 사용자";

room.hidden= true;


const nameForm = first_div.querySelector("form#name");
nameForm.addEventListener("submit",handleNameSubmit);
form.addEventListener("submit",handleRoomEnter);


function handleNameSubmit(event) {
    event.preventDefault();
    const i = first_div.querySelector("#name input");
    const value = i.value;
    nickname = value;
    socket.emit("setNickname", value);
}

async function startMedia(){
    first_div.hidden = true;
    room.hidden = false;
    await getMedia();
    makeConnection();
}

async function getMedia(deviceId) {
    const initConst = {
        audio : true,
        video: {facingMode:"user"},
    };
    const cameraConst = {
        audio:true,
        video: {deviceId: {exact: deviceId}},
    };
    try {
        myStream =await navigator.mediaDevices.getUserMedia(
            deviceId? cameraConst : initConst
        );
        myFace.srcObject = myStream;
        if(!deviceId) {
            await getCameras();
        }
    } 
    catch(e) {
        console.log(e);
    }
}

async function getCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(devices => devices.kind === "videoinput");
        const currentCamera = myStream.getVideoTracks()[0];
        console.log(cameras);
        cameras.forEach(camera => {
            const option = document.createElement("option");
            option.value = camera.deviceId;
            option.innerText = camera.label;
            if(currentCamera.label === camera.label) {
                option.selected = true;
            }
            camerasBtn.appendChild(option);
        });

    }
    catch(e) {
        console.log(e);
    }
}

// 채팅

function showMessage(message) {
    const chat = room.querySelector("textarea#chat");
    chat.append(message+"\n");
    chat.scrollTop=chat.scrollHeight;
}

function handleMessageSubmit(event) {
    event.preventDefault();
    const i = room.querySelector("#msg input");
    const value = i.value;
    socket.emit("sendmessage",value,roomName, () => {
        showMessage(`${nickname} : ${value}`);
    });
    i.value="";
}

// 방 입장
function enterRoom() {
    first_div.hidden=true;
    room.hidden = false;
    const h3 = room.querySelector("h3");
    h3.innerText = `Room ${roomName}`;
    const msgForm = room.querySelector("#msg");
    msgForm.addEventListener("submit",handleMessageSubmit);
}

async function handleRoomEnter(event) {
    event.preventDefault();
    const i = form.querySelector("input");
    await startMedia();
    socket.emit("enter_room", i.value, enterRoom);
    roomName = i.value;
    i.value = "";
}

socket.on("welcome", async (user, personCount) => {
    const h3 = room.querySelector("h3");
    h3.innerText = `Room ${roomName} (${personCount})`;
    showMessage(`${user}(이)가 입장하였습니다`);

    // 처음 참가자/기존 참가자에게 적용됨 (offer 제공하는 쪽)
    const offer = await mypeerconnection.createOffer();
    mypeerconnection.setLocalDescription(offer); 
    console.log("offer 보냄");
    socket.emit("offer", offer, roomName)
});

// offer 받는 쪽
socket.on("offer", async (offer) => {
    console.log("offer 받음");
    mypeerconnection.setRemoteDescription(offer);
    const answer = await mypeerconnection.createAnswer();
    console.log(answer);
    mypeerconnection.setLocalDescription(answer); 
    socket.emit("answer", answer, roomName);
    console.log("answer 보냄");
});

// answer을 받는 쪽 ( offer을 준 쪽)
socket.on("answer", (answer) =>{
    console.log("answer 받음");
    mypeerconnection.setRemoteDescription(answer);
});
socket.on("icecandidate", icecandidate => {
    console.log("candidate 받음");
    mypeerconnection.addIceCandidate(icecandidate);
});

function makeConnection(){
    mypeerconnection = new RTCPeerConnection({
        iceServers:[
            {
                urls:[
                    "stun:stun.l.google.com:19302",
                    "stun:stun1.l.google.com:19302",
                    "stun:stun2.l.google.com:19302",
                    "stun:stun3.l.google.com:19302",
                    "stun:stun4.l.google.com:19302",
                ],
            },
        ],
    });
    mypeerconnection.addEventListener("icecandidate", handleIcecandidate);
    mypeerconnection.addEventListener("addstream", handleAddstream);
    myStream.getTracks().forEach((track) => mypeerconnection.addTrack(track,myStream));
}

function handleIcecandidate(data){
    socket.emit("ice",data.candidate, roomName);
}

function handleAddstream(data){
    const otherFace = document.getElementById("otherFace");
    otherFace.srcObject = data.stream;
}

socket.on("exit", (user, personCount) => {
    const h3 = room.querySelector("h3");
    h3.innerText = `Room ${roomName} (${personCount})`;
    showMessage(`${user}(이)가 퇴장하였습니다`);
})

socket.on("sendmessage",(msg)=>(showMessage(msg)));

socket.on("room_change",(rooms)=>{
    const roomList = first_div.querySelector("ul");
    roomList.innerHTML="";
    
    if(room.length===0) {
        return;
    }
    rooms.forEach(room => {
        const li = document.createElement("li");
        li.innerText = room;
        roomList.append(li);
    });
});

function handleMuteClick() {
    myStream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled));
    if(!muted) {
        muteBtn.innerText="소리켜기";
    }
    else {
        muteBtn.innerText="음소거하기";
    }
    muted = !muted;
}

function handleCameraClick() {
    myStream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled));
    if(camera) {
        cameraBtn.innerText="카메라켜기";
    }
    else {
        cameraBtn.innerText="카메라끄기";
    }
    camera = !camera;
}

async function handleCameraChange() {
    await getMedia(camerasBtn.value);
    if(mypeerconnection){
        const videoTrack = myStream.getVideoTracks()[0];
        const videoSender = mypeerconnection.getSender()
            .find((sender)=> sender.track.kind === "video");
        videoSender.replaceTrack(videoTrack);
    }
}

muteBtn.addEventListener("click",handleMuteClick);
cameraBtn.addEventListener("click",handleCameraClick);
camerasBtn.addEventListener("input",handleCameraChange);

const file = room.querySelector("form#file");
const fileboxbtn = file.querySelector("input#filebox");
const namebox = file.querySelector("input#namebox");
const uploadbtn = room.querySelector("button#upload");
const uploadArea = room.querySelector("span#uploadarea")

uploadbtn.addEventListener("click",StartUpload);
fileboxbtn.addEventListener("change",FileChosen);

var SelectedFile;
function FileChosen(event) {
    console.log("Filechosen");
    SelectedFile = event.target.files[0];
    namebox.value = SelectedFile.name;
}
const filedownload = room.querySelector("form#filedownload");
const filedownloadlist = filedownload.querySelector("ul");

function showMessageDownload(Nickname,Filename) {
    const ul = room.querySelector("ul");
    const li = document.createElement("li");

    li.innerHTML = Filename + "<button name='" + Filename + "' class='btn btn-primary'>다운로드</button>";
    filedownloadlist.appendChild(li);
    const filedownloadbutton = filedownloadlist.querySelectorAll("li button");
    var i=filedownloadbutton.length-1;
    var name=filedownloadbutton[i].name;
    filedownloadbutton[i].addEventListener("click",function(event) {
        event.preventDefault();
        
        console.log(name);
        u = "/data/" + roomName + '/' + name;
        downloadFile(u,name);
    });
}

function downloadFile(url,name) {
    if (!url) {
        alert("No Notion Page");
        return false;
    }
    else {
        return fetch(url, {
            method: 'GET'
        }).then(function(resp) {
            if (!resp|| !resp.ok) {
                alert("Error");
                return false;
            }
            return resp.blob();
        }).then(function(blob,name) {
            if(blob) download(blob,name);
        });
    }
}

function startdownload(event) {
    console.log(event.target);
}

function StartUpload(event) {
    event.preventDefault();
    var AllSize = SelectedFile.size;
    var UploadedSize = 0;
    // const ss=require("socket.io-stream");
    var stream = ss.createStream();
    console.log("client : " + roomName);
    ss(socket).emit('upload',stream,{name:SelectedFile.name},roomName);
    var blobstream = ss.createBlobReadStream(SelectedFile);
    blobstream.on('data',function(chunk) {
        UploadedSize += chunk.length;
        console.log('update >> ' + UploadedSize + '/' + AllSize);
    });
    blobstream.pipe(stream);

    socket.emit("sendfile",SelectedFile.name,roomName, () => {
        showMessageDownload(nickname, SelectedFile.name);
    });
}

socket.on("sendfile",(nickname,msg)=>(showMessageDownload(nickname,msg)));
