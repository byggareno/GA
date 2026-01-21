const express = require("express");
require("dotenv").config()
const path = require("path");
const { Server } = require("socket.io");
const { createServer } = require('node:http');
const app = express();
const server = createServer(app);
const session = require("express-session")
const fs = require("fs").promises
const bcrypt = require("bcryptjs");

app.use(express.static("public"))

app.use(session({
    secret: process.env.session_sec,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}))

app.use(express.urlencoded({extended: true}))

server.listen(process.env.port, () => {
  console.log('server is running');
});

const io = new Server(server);

io.on('connection', handleConnection);

function handleConnection(socket){
    console.log("connected");

    socket.on("chat", handleChat);
}

function handleChat(msg){
    //Skica ut msg till alla uppkopplade
    console.log("From client ",msg)
    io.emit("chat", "from server: " + msg)
}

