const recordbtn = document.querySelector("#recording");
const stopbtn = document.querySelector("#recording-stop");
const downloadbtn = document.querySelector("#recording-download");

let blobs=[];
let blob; // 데이터
let rec; // 스트림을 기반으로 동작하는 mediarecorder 객체
let stream; // 통합
let voiceStream; // 오디오 스트림
let desktopStream; // 비디오 스트림
let videoElment = [];

let url;
stopbtn.disabled = true;
// 녹화 버튼 클릭시 실행
recordbtn.onclick = async () => { 
    downloadbtn.disabled = true;

    desktopStream = await navigator.mediaDevices.getDisplayMedia({ video:true }); //비디오스트림 생성
    voiceStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true }); // 오디오스트림 생성
    
    const tracks = [
        ...desktopStream.getTracks(), 
        ...voiceStream.getAudioTracks()
    ];
    console.log('Tracks to add to stream', tracks);
    stream = new MediaStream(tracks);
    videoElment.srcObject = stream;
    console.log("videoElement", videoElment);
    
    
    rec = new MediaRecorder(stream, {mimeType: 'video/webm; codecs=vp9,opus'}); // mediaRecorder객체 생성
    rec.ondataavailable = (e) => blobs.push(e.data);
    console.log(blobs);
    // blob = new Blob(blobs, {type: 'video/webm'});
    rec.onstop = async () => {
        // downloadbtn.style.display = 'block';
        blob = new Blob(blobs, {type: 'video/webm'});
        console.log(blob);
        url = window.URL.createObjectURL(blob);
        console.log(url);
        downloadbtn.href = url;
        downloadbtn.download = 'test.webm';
    };
    
    recordbtn.disabled = true; // 시작 버튼 비활성화
    stopbtn.disabled = false; // 종료 버튼 활성화
    rec.start(); // 녹화 시작
};

downloadbtn.onclick = () => {
    console.log("다운로드 클릭");
    console.log("실행끝");
};
// 녹화 중지 버튼 클릭시 실행
stopbtn.onclick = () => { 
    // 버튼 비활성화
    recordbtn.disabled = true;
    stopbtn.disabled = true;
    downloadbtn.disabled = false;
    
    rec.stop(); // 화면녹화 종료 및 녹화된 영상 다운로드
    
    desktopStream.getTracks().forEach(s=>s.stop());
    // console.log(desktopStream.getTracks());
    voiceStream.getTracks().forEach(s=>s.stop());
    // console.log(voiceStream.getTracks());
    desktopStream = null;
    voiceStream = null;
    
    recordbtn.disabled = false; // 시작 버튼 활성화
};
