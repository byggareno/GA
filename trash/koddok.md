# Kattechatt kod dokumentation
## GA 2026

### Start Server
``` js
//Misc
require("dotenv").config()
const fs = require("fs").promises
const bcrypt = require("bcryptjs");
const escape = require("escape-html");
const port = process.env.port || 3456
const sessionSecret = process.env.session_sec


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
```
Definerar grundläggande variabler, importerar packages/middlewares, definerar ett public folder och sessions.
***


### Start wesockets

``` js
//Handle Websockets
const { Server } = require("socket.io");
const { createServer } = require('node:http');
const server = createServer(app);
const io = new Server(server);
io.engine.use(sessionMiddleware);
server.listen(port, () => {
    console.log('server is running on port ' + port);
});
```
Startar en socket.io server och låter den använda sessions.
Allt fungerar så det brukar med skillnaden att den kommer skapa en websocket koppling till kopplade klienter.

***


### On Websocket connection

``` js
//Connecting to client
io.on('connection', handleConnection);
function handleConnection(socket){

    //Joining the right room
    const baseLink = "http://" + socket.handshake.headers.host + "/"
    const param = (socket.handshake.headers.referer.slice(baseLink.length))
    console.log("connected to " + (socket.request.session.username || "unkown") + " at " + param);
    socket.join(param)

    //Fixing all socket.on's/connections
    socket.on("chat", handleChat);
    socket.on("newRoomCreated", handleCreateRoom)
    socket.on("disconnect", handleDisconnect)
    socket.on("loadMoreChats", handleLoadMoreChats)
    socket.on("updateChat", handleUpdateChat)
    socket.on("deleteChat", handleDeleteChat)
}
```
När en klient går in på en ny route kommer denna koden köras.
baselink kommer bli hela url:en minus routen och då blir param bara routen. Så om man är inne på hemsidan "http://localhost:3456/room/1769367787753" så kommer baselink bli "http://localhost:3456/" och param "room/1769367787753". Klienter kopplar sig till socket rummet som matchar dens param så varje egen route eller param till routen kommer få ett eget rum där de bara tar emot datan som klienter från samma rum/route/param skickar.  
En socket.on säger bara att när klienter tar emot ett socket event med första argumentets namn kommer den köra funktionen från det andra argumentet med klientens "socket-data". t.ex. socket.on("chat", handleChat); säger att när en klient skickar "chat" så kommer server köra funktionen handleChat där handlechats argument blir klientens socket-data.  
Går igenom de olika "handlesena" när de blir relevanta

***


### Template html

``` html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="https://cdn.socket.io/4.8.1/socket.io.min.js"></script>
    <link rel="stylesheet" href="/style.css">
    <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
<!--     <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Mynerve&display=swap" rel="stylesheet">
    --> <title>%VarTitle%</title>
    %VarScript%
</head>
<body>

    <header>
        %VarHeader%
    </header>

    <main>
        %VarMain%
    </main>

</body>
</html>
```
Jätte enkel självförklarande html template

***


### Render funktion

``` js
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
        htmlText = htmlText.replace("%VarHeader%",`
        <nav>
            <div class="linkDiv">
                <a href="/"><h3>HOME</h3></a>
                <a href="/roomList"><h3>CHAT</h3></a>
                <h1>${title}</h1>    
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
                <h1>${title}</h1>    
                <a href="/profile/${escape(req.session.userId)}"><h3 >PROFILE</h3></a>
                <a href="/processLogout"><h3 >LOGOUT</h3></a>
            </div>
        </nav>
        `)
    }
    //Set Main
    htmlText = htmlText.replace("%VarMain%",main)

    return htmlText
}
```
Ganska grundläggande render funktion, laddar in template.html och ändrar olika delar av den beroende på routen och klientens session data.
Funktionen tar emot reqestet klienten skickade med (för sesseion data), page titel, vilket klientscript sidan ska använda och såklart vad som ska vara i main fältet. Render funktionen kollar om du är inloggad eller inte och skapar en header med olika flikar beroende på det.

***


### Time Since funktion

``` js
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
```
Funktion jag använder väldigt mycket i alla tre olika javascript filer. Den är importerad från mitt halvkursprojekt och väldigt enkel i vad den gör. Man matar in en Date.now() int och den gör om talet till en string som beskriver hur länge sedan det Date.now() skapades. Date.now() timestamps räknar i millisekunder som har gått sedan ett visst datum (1 januray 1970 UTC) så om du tar ett Date.now() - ett äldre så kommer du få ut millisekunderna mellan de två Date.now() kördes. Det är exakt det jag gör + att dela med tusen för att göra om till sekunder och sen avrunda det neråt.  
När den väl har tiden i sekunder så kollar den bara hur lång tid som har gått och gör om det på ett ganska självförklarande sätt till en sträng som beskriver tiden i max två enheter t.ex. år + månader eller minuter + sekunder.

***


### Home Route

``` js
app.get("/", async (req, res) => {

    //Set error and success variables
    const errorText = req.query.error || "";
    const successText = req.query.success || "";
    let name = "Please log in to use website"
    if(req.session.username) name = "Welcome " + req.session.username
    let desc = ""
    if(req.session.loggedIn) desc = "Press chat to browse chatrooms"

    html = await render(req, "Home","", `
        <p class="error">%VarError%</p>
        <p class="success">%VarSuccess%</p>
        <h3> ${escape(name)}</h3>
        <h4> ${desc}</h4>
        `.replace("%VarError%",errorText).replace("%VarSuccess%",escape(successText)))
    res.send(html);
});
```
Den kollar det finns ett error eller success query och sätter de i p taggar som ligger i main om det finns något. Den kollar också om klienten är inloggad och antingen välkomnar namnet eller säger åt klienten att logga in beroende på det.
Den skaffar html genom render funktionen som använder template.html filen som visades innan.

***


### Register Routen

``` js
//Register
app.get("/register", async (req, res) => {

    //Set error variables
    let errorText = req.query.error || "";

    //Render html
    html = await render(req, "Register","", ` 
    <p class="error">%VarError%</p>
    <form action="/processRegister" method="post">
        <input type="text" name="name" placeholder="Username">
        <input type="email" name="email" placeholder="Email">
        <input type="password" name="password" placeholder="Password">
        <input type="submit">
    </form>
        `.replace("%VarError%",escape(errorText)))

    //Send html
    res.send(html);
});
```
Använder en basic template sida med errorText och ett form med inputs för att kunna skapa ett konto.

***


### Process Register

``` js
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
```
Text

***


### Rubrik

``` js


```
Text

***


