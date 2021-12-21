import express from "express";
import http from "http";
import { type } from "os";
import WebSocket from "ws";
import {instrument} from "@socket.io/admin-ui";
import {Server} from "socket.io";
import { SSL_OP_NO_TICKET } from "constants";
import fs from "fs";
import { ppid } from "process";

const ss = require('socket.io-stream');
const path = require('path');
// const HTTPS = require('https');
// const domain = "2016104166.osschatbot.cf"
// const sslport = 23023;
// const option = {
//     ca: fs.readFileSync('/etc/letsencrypt/live/' + domain +'/fullchain.pem'),
//     key: fs.readFileSync(path.resolve(process.cwd(), '/etc/letsencrypt/live/' + domain +'/privkey.pem'), 'utf8').toString(),
//     cert: fs.readFileSync(path.resolve(process.cwd(), '/etc/letsencrypt/live/' + domain +'/cert.pem'), 'utf8').toString(),
// };

const app = express();

app.set('view engine',"pug");
app.set("views",__dirname + "/views");
app.use("/public",express.static(__dirname+"/public"));
app.use("/data",express.static(__dirname+"/data"));

app.get("/",(req,res)=> res.render("home"));
console.log("hello");

const httpServer = http.createServer(app);
const ioServer = new Server(httpServer);
httpServer.listen(8080);
// // https 서버 작성
// const httpsServer = HTTPS.createServer(option,app);
// httpsServer.listen(23023);
// const ioServer = new Server(httpsServer);


instrument(ioServer, {
    auth:false
});

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
    socket.on("setNickname",(nickname) => {
        socket["nickname"]=nickname;
        console.log("nickname : "+ nickname);
    }); //nickname=>socket["nickname"]=nickname);

    socket.on("offer", (offer, roomName)=> {
        socket.to(roomName).emit("offer",offer);
        //socket.broadcast.emit('offer',data);
    });

    socket.on("answer",(answer, roomName)=> {
        socket.to(roomName).emit("answer",answer);
    });

    socket.on("ice",(ice, roomName)=> {
        socket.to(roomName).emit("ice",ice);
    });

    ss(socket).on('upload',function(stream,data,roomName) {
        var filename = path.basename(data.name);
        console.log("server : " + roomName);
        roomName = "src/data/"+roomName;
        const makeFolder = (roomName) => {
            if(!fs.existsSync(roomName)) {
                fs.mkdirSync(roomName);
            }
        };
        makeFolder(roomName);
        stream.pipe(fs.createWriteStream(roomName + '/' + filename));
    });
    
    socket.on("sendfile",(msg,room,done) => {
        socket.to(room).emit("sendfile",socket.nickname,msg);
        done();
    });


    //화면 공유
    socket.on("start_sharing",(stream) => {
        console.log("화면 공유 시작");
        socket.emit("start",stream);
    });
    socket.on("s_offer", (offer, roomName)=>{
        socket.to(roomName).emit("ss_offer",offer);
    })

    socket.on("s_answer",(answer, roomName)=> {
        socket.to(roomName).emit("ss_answer",answer);
    });

    socket.on("s_ice",(ice,roomName)=> {
        socket.to(roomName).emit("ss_ice",ice);
    });
    
});
