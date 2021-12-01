import express from "express";
import http from "http";
import { type } from "os";
import WebSocket from "ws";
import {instrument} from "@socket.io/admin-ui";
import {Server} from "socket.io";
import { SSL_OP_NO_TICKET } from "constants";

const app = express();

app.set('view engine',"pug");
app.set("views",__dirname + "/views");
app.use("/public",express.static(__dirname+"/public"));

app.get("/",(req,res)=> res.render("home"));

console.log("hello");

//socketio + http 서버 동시에 돌리기 ==> socket.io로 변경
const httpServer = http.createServer(app);
const ioServer = new Server(httpServer, {
    cors: {
        origin: ["https://admin.socket.io"],
        credentials: true,
    },
});

instrument(ioServer, {
    auth:false
})

function arrayRoom() {
    const sids = ioServer.sockets.adapter.sids;
    const rooms = ioServer.sockets.adapter.rooms;
    const roomArray = [];
    rooms.forEach((_,key)=> {
        if(sids.get(key)===undefined) {
            roomArray.push(key);
        }
    });
    return roomArray;
}

function countPerson(roomName) {
    return ioServer.sockets.adapter.rooms.get(roomName)?.size;
}

ioServer.on("connection", socket => {
    socket["nickname"]="익명의 사용자";
    socket.onAny((event)=>{
        // console.log(ioServer.sockets.adapter);
        console.log(`Socket Event:${event}`);
    });
    socket.on("enter_room",(roomName,done)=>{
        socket.join(roomName);
        done();
        socket.to(roomName).emit("welcome",socket.nickname,countPerson(roomName));
        ioServer.sockets.emit("room_change",arrayRoom());
    });
    socket.on("disconnecting",() => {
        socket.rooms.forEach((room) => socket.to(room).emit("exit",socket.nickname,countPerson(room)-1));
    });
    socket.on("disconnect",() => {
        ioServer.sockets.emit("room_change",arrayRoom());
    });
    socket.on("sendmessage",(msg,room,done) => {
        socket.to(room).emit("sendmessage",`${socket.nickname}: ${msg}`);
        done();
    });
    socket.on("setNickname",nickname=>socket["nickname"]=nickname);

    socket.on("offer", (offer, roomName)=> {
        socket.to(roomName).emit("offer",offer);
    });

    socket.on("answer",(answer, roomName)=> {
        socket.to(roomName).emit("answer",answer);
    });

    socket.on("ice",(ice, roomName)=> {
        socket.to(roomName).emit("ice",ice);
    });

});

/*
const ws_server = new WebSocket.Server({ server });
const sockets= []; //connection 된 서버

//back->front
ws_server.on("connection", (socket) =>{
    sockets.push(socket);
    socket["username"] = "none";
    console.log("브라우저랑 연결됨");
    socket.on("close", () => console.log("브라우저 연결 끊김"));
    socket.on("message", (msg) => {
        const message = JSON.parse(msg);
        switch(message.type){
            case "new_msg":
                sockets.forEach((iSocket) => 
                    iSocket.send('${socket.username}: ${message.payload}')
                );
            case "username":
                socket["username"] = message.payload;
        }
    });
});*/

httpServer.listen(8080);
