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
const { promises } = require("node:dns");
const server = createServer(app);
const io = new Server(server);
io.engine.use(sessionMiddleware);
server.listen(port, () => {
  console.log('server is running on port ' + port);
});

//Connecting to client
io.on('connection', handleConnection);
function handleConnection(socket){

    //Joining the right room
    const baseLink = "http://" + socket.handshake.headers.host + "/"
    const param = (socket.handshake.headers.referer.slice(baseLink.length))
    console.log("connected to " + (socket.request.session.username || "unkown") + " at " + param);
    socket.join(param)

    //Fixing all socket.on's/connections/whateveryouwanttocallthem
    socket.on("chat", handleChat);
    socket.on("disconnect", handleDisconnect)
    socket.on("loadMoreChats", handleLoadMoreChats)
    socket.on("loadMoreRooms", handleLoadMoreRooms)

}

//Recives chat
async function handleChat(msg){

    //Skicka iväg de som inte är inloggade
    const tSession = this.request.session
    if(!tSession.loggedIn) return console.log("Not sure how this happend")

    //Create post and save to file
    const socketRooms = Array.from(this.rooms)
    const socketRoom = socketRooms.find(c => c.includes("room/"))
    const socketRoomId = socketRoom.slice(5)
    const authorId = tSession.userId
    const timeStamp = Date.now()
    let posts = JSON.parse(await fs.readFile("data/posts.json"))
    const post = {"id": socketRoomId, "author": authorId, "timeStamp": timeStamp, "content": msg}
    posts.unshift(post)
    await fs.writeFile("data/posts.json", JSON.stringify(posts, null, 3))

    //Create simpler post to send to clients in the same room
    const SimplePost = {"author": tSession.username, "timeStamp":await timeSinceTime(timeStamp), "content": msg}
    console.log(`in ${socketRoom} ${SimplePost.author} posted ${SimplePost.content}`)
    io.to(socketRoom).emit("chat",SimplePost)
}

//Handle disconnect
async function handleDisconnect(event){
    console.log((this.request.session.username || "Unkown") + " disconnected");
}

//Handle loading more rooms
async function handleLoadMoreRooms(event){
    //console.log(this.request.session.username + " Wants chats from " + event)
    let rooms = JSON.parse(await fs.readFile("data/rooms.json"))
    
    const posts = JSON.parse(await fs.readFile("data/posts.json"))

    //Updaterar rummens posts och timeSince så den visas rätt. Updateras inte live dock
    rooms = await Promise.all(rooms.map(async r => {
        revPosts = posts.filter(p => (p.id == r.id))
        r.posts = revPosts.length
        if(r.posts) r.timeSince = await timeSinceTime(revPosts[0].timeStamp) + " since last post"
        else r.timeSince = "No posts"
        return r
    }))
    
    rooms = rooms.slice(event, event+10)

    this.emit("moreRooms", rooms)
}

//Handle loading more chats
async function handleLoadMoreChats(event){
    //console.log(this.request.session.username + " Wants chats from " + event)
    let posts = JSON.parse(await fs.readFile("data/posts.json"))
    posts = posts.slice(event, event+10)
    const users = JSON.parse(await fs.readFile("data/users.json"))

    //Must turn the posts into simpler posts in order for client script to interpret it
    posts = await Promise.all( posts.map(async p => {
        const user = users.find(c => c.id == p.author)
        let author = "Unkown"
        if(user) author = user.username

        const timeStamp = await timeSinceTime(p.timeStamp) || "Unkown"

        newmsg = {"author": author, "timeStamp": timeStamp, "content": p.content}
        return newmsg
    }))

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
    //Set Header which changes based on logged in status
    if(!req.session.loggedIn){
        htmlText = htmlText.replace("%VarHeader%", `
        <nav>
            <div class="linkDiv">
                <a href="/"><h3>HOME</h3></a>
                <a href="/roomList"><h3>CHAT</h3></a>
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
                <a href="/roomList"><h3>CHAT</h3></a>
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

//Room List
app.get("/roomList", async (req,res) => {

    let rooms = JSON.parse(await fs.readFile("data/rooms.json"))
    const posts = JSON.parse(await fs.readFile("data/posts.json"))

    //Updaterar rummens posts och timeSince så den visas rätt. Updateras inte live dock
    rooms = await Promise.all(rooms.map(async r => {
        revPosts = posts.filter(p => (p.id == r.id))
        r.posts = revPosts.length
        if(r.posts) r.timeSince = await timeSinceTime(revPosts[0].timeStamp) + " since last post"
        else r.timeSince = "No posts"
        return r
    }))

    rooms = rooms.slice(0,10)

    let errorText = req.query.error || "";
    let successText = req.query.success || "";

    html = await render(req, "Rooms List","roomList.js",`
        
        <p class="error">${errorText}</p>
        <p class="success">${successText}</p>

        <form action="createRoom" method="post">
            <input type="text" name="name" placeholder="Room Name">
            <input type="text" name="desc" placeholder="Description">
            <input type="submit" value="Create Room">
        </form>
        
        <div class="outerDiv">
            ${(await Promise.all( 
                rooms.map (async el => {
                    const name = el.name
                    const desc = el.desc
                    const posts = el.posts
                    const timeSince = el.timeSince
                    const id = el.id
                    return `
                    <div class="innerDiv">
                        <div class="innerHeader">
                            <div class="profilePicture">

                            </div>
                            <h3>
                                ${name}
                            </h3>
                            <div class = "positionBottom">
                                <p>
                                    ${timeSince}
                                    ||| ${posts + " posts"}
                                </p>


                            </div>
                        </div>
                        <div class="innerMain">
                            <p>
                                ${desc}
                            </p>
                            <a href="room/${id}">Enter Room</a>
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

    res.send(html)

})

//Create Room
app.post("/createRoom", async (req,res) => {

    //just defining a bunch of variables and returning if form not filled out properly or not logged in
    if(!req.session.loggedIn) return res.redirect("/roomList?error=Must be logged in to create room")
    
    let rooms = JSON.parse(await fs.readFile("data/rooms.json"))
    
    const name = req.body.name
    if(!name) return res.redirect("/roomList?error=Room must have a name")
    const desc = req.body.desc
    if(!desc) return res.redirect("/roomList?error=Room must have a description")
    const timeSince = "0s"
    const posts = 0
    const id = Date.now()
    room = {name: name, desc: desc, timeSince: timeSince, posts: posts, id: id}

    rooms.push(room)

    await fs.writeFile("data/rooms.json",JSON.stringify(rooms, null, 3))

    res.redirect("/roomList?success=Room was created")

})

//Inside Chatt Room
app.get("/room/:id", async (req,res) => {

    //Check login
    if(!req.session.loggedIn) return res.redirect("/?error=Must be logged in to chat")

    let posts = JSON.parse(await fs.readFile("data/posts.json"))
    posts = posts.filter(c => (c.id == req.params.id))
    let users = JSON.parse(await fs.readFile("data/users.json"))
    posts = posts.slice(0,10)

    html = await render(req, "Chat","/client.js", `    
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
    const errorText = req.query.error || "";
    const successText = req.query.success || "";
    let name = "Please log in to use website"
    if(req.session.username) name = "Welcome " + req.session.username

    html = await render(req, "Home","", `
        <p class="error">%VarError%</p>
        <p class="success">%VarSuccess%</p>
        <h3> ${name}</h3>
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
    let users = JSON.parse(await fs.readFile("data/users.json"))
    const id = Date.now()

    //Return error if account with email already
    if(users.find(c => c.email == email)) return res.redirect("/register?error=Account Already Exists")

    //Create new user and add user to file
    let user = {"id": id, "email": email, "username": username, "password": await bcrypt.hash(password,8)}
    users.push(user)
    await fs.writeFile("data/users.json", JSON.stringify(users, null, 3))

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
    let users = JSON.parse(await fs.readFile("data/users.json"))
    //Find user and return error if user not found
    const user = (users.find(c => c.email == email))
    if(!user) res.redirect("/login?error=No user with that email exists")
    //Password Check
    if(!(await bcrypt.compare(password, user.password))) return res.redirect("/login?error=Wrong password")

    //Fix sessions
    req.session.loggedIn = true
    req.session.email = user.email
    req.session.userId = user.id
    req.session.username = user.username

    res.redirect("/?success=Login Successful")
})

//Handle logout
app.get("/processLogout", async (req,res) => {
    //Don't know if theres a better way but setting everything to null seems to work
    req.session.loggedIn = null
    req.session.email = null
    req.session.userId = null
    req.session.username = null
    res.redirect("/?success=Logout Successful")
})

//Route used to change unhashed passwords into hashed ones
/* app.get("/QuickFix", async (req,res) => {
    let users = JSON.parse(await fs.readFile("data/users.json"))
    const newUsers = await Promise.all(users.map(async c => {
        c.password = await bcrypt.hash(c.password, 12)
        return c

    }))

    console.log(newUsers)
    await fs.writeFile("data/users.json", JSON.stringify(newUsers, null, 3))
    res.redirect("/")
    
}) */