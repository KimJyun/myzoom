const wrap = document.getElementById("wrap");

//room 열리면 화면 키우기
if(room.hidden === false){
    console.log("열림");
    wrap.css("height","10000");
}
