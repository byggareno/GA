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


//Handle Websockets

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

//Render function
async function render(req, title, script, main){
    //Load template
    let htmlText = await fs.readFile("template.html", "utf8");
    //Set Title
    htmlText = htmlText.replace("%VarTitle%", title)
    //Set Script
    if(script) htmlText = htmlText.replace("%VarScript%", "<script defer src="+script+"></script>")
    else htmlText = htmlText.replace("%VarScript%", "")
    //Set Header
    if(!req.session.loggedIn){
        htmlText = htmlText.replace("%VarHeader%", `
        <nav>
            <div class="linkDiv">
                <a href="/"><h3>HOME</h3></a>
                <a href="/chat"><h3>CHAT</h3></a>
                <h1>Home page</h1>    
                <a href="/login"><h3 >LOGIN</h3></a>
                <a href="/register"><h3 >REGISTER</h3></a>
            </div>
        </nav>
        `)
    }
    else{
        htmlText = htmlText.replace("%VarHeader%", `
        <nav>
            <div class="linkDiv">
                <a href="/"><h3>HOME</h3></a>
                <a href="/chat"><h3>CHAT</h3></a>
                <h1>Home page</h1>    
                <a href="/profile/${req.session.userId}"><h3 >PROFILE</h3></a>
                <a href="/processLogout"><h3 >LOGOUT</h3></a>
            </div>
        </nav>
        `)
    }
    //Set Main
    htmlText = htmlText.replace("%VarMain%",main)

    return htmlText
}

//Routes

//Chatt
app.get("/chat", async (req,res) => {

    //Check login
    if(!req.session.loggedIn) return res.redirect("/?error=Must be logged in to chat")

    html = await render(req, "Home","client.js", `    
        <form action="" id="form">
            <input name="msg" type="text" placeholder="Type Message">
        </form>

        <div id="chat"></div>
    `)
    res.send(html);
})

//Home page
app.get("/", async (req, res) => {

    //Set error and success variables
    let errorText = req.query.error || "";
    let successText = req.query.success || "";

    html = await render(req, "Home","", `
        <p class="error">%VarError%</p>
        <p class="success">%VarSuccess%</p>
        `.replace("%VarError%",errorText).replace("%VarSuccess%",successText))
    res.send(html);
});

//Register
app.get("/register", async (req, res) => {

    //Set error variables
    let errorText = req.query.error || "";

    //Render html
    html = await render(req, "Home","", ` 
    <p class="error">%VarError%</p>
    <form action="/processRegister" method="post">
        <input type="text" name="name" placeholder="Username">
        <input type="email" name="email" placeholder="Email">
        <input type="password" name="password" placeholder="Password">
        <input type="submit">
    </form>
        `.replace("%VarError%",errorText))

    //Send html
    res.send(html);
});

//Handle register
app.post("/processRegister", async (req,res) => {

    //Define variables
    const username = req.body.name
    const email = req.body.email
    const password = req.body.password
    let users = JSON.parse(await fs.readFile("users.json"))
    const id = Date.now()

    //Return error if account with email already
    if(users.find(c => c.email == email)) return res.redirect("/register?error=Account Already Exists")

    //Create new user and add user to file
    let user = {"id": id, "email": email, "username": username, "password": password}
    users.push(user)
    await fs.writeFile("users.json", JSON.stringify(users, null, 3))

    //Redirect to login
    res.redirect("/login?success=Account has been made")


})

//Login page
app.get("/login", async (req, res) => {

    //Set error and success variables
    let errorText = req.query.error || "";
    let successText = req.query.success || "";

    //Render html
    html = await render(req, "Home","", ` 
    <p class="error">%VarError%</p>
    <p class="success">%VarSuccess%</p>
    <form action="/processLogin" method="post">
        <input type="email" name="email" placeholder="Email">
        <input type="password" name="password" placeholder="Password">
        <input type="submit">
    </form>
        `.replace("%VarError%",errorText).replace("%VarSuccess%",successText))

    //Send html
    res.send(html);
});

//Handle login
app.post("/processLogin", async (req,res) => {

    //Define variables
    const email = req.body.email
    const password = req.body.password
    let users = JSON.parse(await fs.readFile("users.json"))

    //Find user and return error if user not found
    const user = (users.find(c => c.email == email))
    if(!user) res.redirect("/login?error=No user with that email exists")
    //Password Check
    if(!(password == user.password)) return res.redirect("/login?error=Wrong password")

    //Fix sessions
    req.session.loggedIn = true
    req.session.email = user.email
    req.session.userId = user.id
    req.session.username = user.username

    res.redirect("/?success=Login Successful")
})

//Handle logout
app.get("/processLogout", async (req,res) => {
    console.log(req.session)
    req.session.loggedIn = null
    req.session.email = null
    req.session.userId = null
    req.session.username = null
    console.log(req.session)
    res.redirect("/?success=Logout Successful")
})