// 화면 공유
const shareBtn = document.getElementById("sharing-start");
const stopBtn = document.getElementById("sharing-stop");

// let s_blobs=[];
// let s_blob; // 데이터
// let s_rec; // 스트림을 기반으로 동작하는 mediarecorder 객체
// let s_stream; // 통합
let s_voiceStream; // 오디오 스트림
let s_desktopStream; // 비디오 스트림


let s_mypeer;
// s_stream = navigator.mediaDevices.getUserMedia();

stopBtn.disabled = true;

shareBtn.onclick = async () => {
    shareBtn.disabled = true; // 시작 버튼 비활성화
    stopBtn.disabled = false; // 종료 버튼 활성화


    s_desktopStream = await navigator.mediaDevices.getDisplayMedia({ video: true });

    s_voiceStream = await navigator.mediaDevices.getUserMedia({ voice: false, audio:true });


    const video = document.getElementById('sharing-video');
    video.srcObject = s_desktopStream;
    
    // await s_makeConnect();
    await makecon();

    socket.emit("start_sharing",s_desktopStream);

    s_desktopStream.getVideoTracks()[0].addEventListener('ended', () => {
        shareBtn.disabled = false;
        stopBtn.disabled = true;
    });

};

// s_makeConnection 함수 끝나기전에 
// "start_shaing" 시작 되 버림.
async function makecon(){
    await s_makeConnect();
};
// 공유 중지 버튼 클릭시 실행
stopBtn.onclick = () => { 
    
    shareBtn.disabled = false;
    stopBtn.disabled = true;
    
    s_desktopStream.getTracks().forEach(s=>s.stop())
    console.log("종료");

};
socket.on("start", async(stream)=>{
    
    //offer 보냄
    const s_offer = await s_mypeer.createOffer();
    s_mypeer.setLocalDescription(s_offer);
    console.log("share offer 보냄");
    socket.emit("s_offer",s_offer, roomName);
});


socket.on("ss_offer", async (offer) =>{
    console.log("share offer 받음");
    console.log("offer ",offer);
    s_mypeer.setRemoteDescription(offer);
    // error
    // Uncaught (in promise) TypeError: Cannot read properties of undefined (reading 'setRemoteDescription')

    const s_answer = await s_mypeer.createAnswer();
    console.log(s_answer);
    s_mypeer.setLocalDescription(s_answer);
    socket.emit("s_answer", s_answer, roomName);
    console.log("share answer 보냄");

});

socket.on("ss_answer",(answer)=>{
    console.log("share answer 받음");
    s_mypeer.setRemoteDescription(answer);
});

socket.on("ss_ice",(s_icecandidate, roomName) => {
    console.log("share candidate 받음");
    s_mypeer.addIceCandidate(s_icecandidate);
});

async function s_makeConnect(){
    console.log("s_makeConnect 불림");
    s_mypeer = new RTCPeerConnection({
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
    s_mypeer.onicecandidate = s_handleIce;
    // s_mypeer.addstream = s_handleAddStream;
    // .addstream 이제 안씀 -> .addTrack()으로 바뀜 -> 아래 코드
    console.log("pass");
    s_desktopStream.getTracks().forEach((track) => {
        s_mypeer.addTrack(track,s_desktopStream);
        s_handleAddStream(track);
        console.log("track", track);
    });
    
};

function s_handleIce(data){
    if(data.candidate) s_mypeer.addIceCandidate();
    console.log("s_handleIce 불림");
    socket.emit("s_ice", data.candidate);
    // candidate ->네트워크의 주소 가져옴
};

function s_handleAddStream(data){
    // otherScreen : HTMLMediaElement
    // data : MediaStreamTrack / MediaStream

    console.log("data", data);
    const otherScreen = document.getElementById("sharing-video");
    console.log("s_handleAddStream 불림");
    // otherScreen.srcObject = data.stream;
    otherScreen.play = data;
    // var captureStream = data.captureStream();
    // otherScreen.play();


    console.log("otherScreen",otherScreen.play);
    // otherScreen.srcObject = (data.readyState ="live");
    
    // console.log('data stream', data.stream);
};