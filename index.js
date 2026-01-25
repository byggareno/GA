//Misc
require("dotenv").config()
const path = require("path");
const fs = require("fs").promises
const bcrypt = require("bcryptjs");
port = process.env.port || 3456
sessionSecret = process.env.session_sec


//Handling Express and Sessions
const express = require("express");
const app = express();
const session = require("express-session")
app.use(express.static("public"))
const sessionMiddleware = session({
    secret: sessionSecret,
    resave: true,
    saveUninitialized: true,
    cookie: { secure: false }
})
app.use(sessionMiddleware)
app.use(express.urlencoded({extended: true}))


//Handle Websockets
const { Server } = require("socket.io");
const { createServer } = require('node:http');
const server = createServer(app);
const io = new Server(server);
io.engine.use(sessionMiddleware);
server.listen(port, () => {
  console.log('server is running');
});



io.on('connection', handleConnection);

function handleConnection(socket){
    console.log("connected to " + (socket.request.session.username || "unkown"));

    socket.on("chat", handleChat);
    socket.on("disconnect", handleDisconnect)
    socket.on("loadMore", handleLoadMore)
}

async function handleChat(msg){
    //Skicka iväg de som inte är inloggade
    const tSession = this.request.session
    if(!tSession.loggedIn) return res.redirect("/?error=Not logged in")
    const authorId = tSession.userId
    const timeStamp = Date.now()
    let posts = JSON.parse(await fs.readFile("posts.json"))
    id = 0

    const post = {"id": id, "author": authorId, "timeStamp": timeStamp, "content": msg}
    posts.unshift(post)

    await fs.writeFile("posts.json", JSON.stringify(posts, null, 3))

    const SimplePost = {"author": tSession.username, "timeStamp":await timeSinceTime(timeStamp), "content": msg}
    console.log("chat",SimplePost)
    io.emit("chat",SimplePost)

}

async function handleDisconnect(event){
    console.log("Client Disconnected")
}

async function handleLoadMore(event){
    console.log(this.request.session.username + " Wants chats from " + event)
    let posts = JSON.parse(await fs.readFile("posts.json"))
    posts = posts.slice(event, event+10)
    const users = JSON.parse(await fs.readFile("users.json"))


    posts = await Promise.all( posts.map(async p => {
        const user = users.find(c => c.id == p.author)
        let author = "Unkown"
        if(user) author = user.username

        const timeStamp = await timeSinceTime(p.timeStamp) || "Unkown"

        newmsg = {"author": author, "timeStamp": timeStamp, "content": p.content}
        console.log(newmsg)
        return newmsg
    }))

    console.log(posts)
    this.emit("moreChats", posts)

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

//Helt importerad från mitt halvkursprojekt
//Turns a Date.now() number a string displaying the time since the original number was made
async function timeSinceTime(time){
    let timeT = Math.floor((Date.now() - time)/1000)
            if(timeT > 31557599){
                year = Math.floor(timeT/31557600)
                timeT -= year*31557600
                month = Math.floor(timeT/2591999)
                if(year > 1){
                    newTimeT = year + "years " + month + "mon"
                }
                else{
                    newTimeT = year + "year " + month + "mon"
                }
            }
            else if (timeT > 2592000){
                month = Math.floor(timeT/2591999)
                timeT -= month*2592000
                day = Math.floor(timeT/86400)
                newTimeT = month + "mon " + day + "d"
            }
            else if(timeT > 86399){
                day = Math.floor(timeT/86400)
                timeT -= day*86400
                hour = Math.floor(timeT/3600)
                newTimeT = day + "d " + hour + "h" 
            }
            else if(timeT > 3599){
                hour = Math.floor(timeT/3600)
                timeT -= hour*3600
                min = Math.floor(timeT/60)
                timeT -= min*60
                newTimeT = hour + "h " + min + "m"
            }
            else if(timeT > 59){
                min = Math.floor(timeT/60)
                timeT -= min*60
                newTimeT = min + "m " + timeT + "s"
            }
            else{
                newTimeT = timeT + "s"
            }
    return newTimeT
}




//Routes

//Chatt
app.get("/chat", async (req,res) => {

    let posts = JSON.parse(await fs.readFile("posts.json"))
    let users = JSON.parse(await fs.readFile("users.json"))

    posts = posts.slice(0,10)

    //Check login
    if(!req.session.loggedIn) return res.redirect("/?error=Must be logged in to chat")

    html = await render(req, "Chat","client.js", `    
        <form action="" id="form">
            <input name="msg" type="text" placeholder="Type Message">
        </form>

        <div id="chat"></div>
        
        <div class="outerDiv">
            ${(await Promise.all( 
                posts.map (async el => {
                    const user = users.find(c => c.id == el.author) || "Unkown"
                    const authorName = user.username || "Unkown"
                    
                    return `
                    <div class="innerDiv">
                        <div class="innerHeader">
                            <div class="profilePicture">

                            </div>
                            <h3>
                                ${authorName}
                            </h3>
                            <div class = "positionBottom">
                                <p>
                                    ${await timeSinceTime(el.timeStamp)}
                                </p>
                            </div>
                        </div>
                        <div class="innerMain">
                            <p>
                                ${el.content}
                            </p>
                        </div>
                    </div>`
                })
            )).join("")}
        </div>

    <div class="bottomDiv">
        <h3 id="bottomInfo">Your website is stuck</h3>
        <button id="LoadButton"> Click to force loading more </button>
    </div>
    <br>


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