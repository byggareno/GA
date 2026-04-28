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
    const param = (socket.handshake.headers.referer.slice(baseLink.length)).split("?")[0]
    console.log(baseLink)
    console.log(param)
    console.log("connected to " + (socket.request.session.username || "unkown") + " at " + param);
    socket.join(param)

    //Fixing all socket.on's/connections
    socket.on("chat", handleChat);
    socket.on("newRoomCreated", handleCreateRoom)
    socket.on("disconnect", handleDisconnect)
    socket.on("loadMoreChats", handleLoadMoreChats)
    socket.on("updateChat", handleUpdateChat)
    socket.on("deleteChat", handleDeleteChat)
    socket.on("deleteRoom", handleDeleteRoom)
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


### Escape function
``` js
//Escape post
async function escapePost(post){
    if(post.content) post.content = escape(post.content)
    if(post.author) post.author.username = escape(post.author.username)
    return post
}
```

Funktion som tar in ett "post object" och escapar den viktiga datan i det.

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
    if(email.length > process.env.maxEmailLen) return res.redirect("/register?error=" + `Email can't be longer than ${process.env.maxEmailLen} characters`)
    if(username.length > process.env.maxUsernameLen) return res.redirect("/register?error=" + `Username can't be longer than ${process.env.maxUsernameLen} characters`)
    if(password.length > process.env.maxPasswordLen) return res.redirect("/register?error=" + `Password can't be longer than ${process.env.maxPasswordLen} characters`)
    if(users.find(c => c.email == email)) return res.redirect("/register?error=Account Already Exists")

    //Create new user and add user to file
    let user = {"id": id, "email": email, "username": username, "password": await bcrypt.hash(password,8)}
    users.push(user)
    await fs.writeFile("data/users.json", JSON.stringify(users, null, 3))

    //Redirect to login
    res.redirect("/login?success=Account has been made")
})
```
Använder params från inputen på förra sidan (Register Route) för att skapa ett "user" objekt som blir inpushat i data/users.json filen som har laddats in och sparas ner. Redirectar sen användaren tillbaka till login fast med ett "success" medelande som säger att det fungerade. Om kontot har för långt användarnamn, lösenord eller email eller så finns det redan ett konto med den emailen så skickar den ett error medelande istället.

***
`Email can't be longer than ${process.env.maxEmailLen} characters`

### Login Route

``` js
//Login page
app.get("/login", async (req, res) => {

    //Set error and success variables
    let errorText = req.query.error || "";
    let successText = req.query.success || "";

    //Render html
    html = await render(req, "Login","", ` 
    <p class="error">%VarError%</p>
    <p class="success">%VarSuccess%</p>
    <form action="/processLogin" method="post">
        <input type="email" name="email" placeholder="Email">
        <input type="password" name="password" placeholder="Password">
        <input type="submit">
    </form>
        `.replace("%VarError%",errorText).replace("%VarSuccess%",escape(successText)))

    //Send html
    res.send(html);
});
```
Text
Väldigt enkel login, exakt samma som Register Routen fast med andra inputs
***




### Login Process

``` js
//Handle login
app.post("/processLogin", async (req,res) => {

    //Define variables
    const email = req.body.email
    const password = req.body.password
    let users = JSON.parse(await fs.readFile("data/users.json"))
    //Find user and return error if user not found
    const user = (users.find(c => c.email == email))
    if(!user) return res.redirect("/login?error=No user with that email exists")
    //Password Check
    if(!(await bcrypt.compare(password, user.password))) return res.redirect("/login?error=Wrong password")

    //Fix sessions
    req.session.loggedIn = true
    req.session.email = user.email
    req.session.userId = user.id
    req.session.username = user.username

    if(user.admin) req.session.admin = true

    res.redirect("/?success=Login Successful")
})
```
Post:en som hanterar login requests, läser av paramsen och uses.json filen och kollar om det finns en user med det mailet och den usern då har rätt lösenord. Om detta inte stämmer så skickar den ett beskrivande error medelande men om det godkänns så sätter den användarens session cookies till rätt session cookies för det kontot och sen redirectar användaren till hemsidan med ett success medelande. Den kollar också om kontot är admin och ändrar då också den session cookien.

***




### Logout Route/Handle

``` js
//Handle logout
app.get("/processLogout", async (req,res) => {
    //Don't know if theres a better way but setting everything to null seems to work
    req.session.loggedIn = null
    req.session.email = null
    req.session.userId = null
    req.session.username = null
    req.session.admin = null
    res.redirect("/?success=Logout Successful")
})
```
Väldigt väldigt enkel kod som bara tar bort alla session cookies och redirectar till hemsidan med ett success medelande när man går in på routen.

***




### RoomList Route

``` js
//Room List
app.get("/roomList", async (req,res) => {

    //Ladda in filerna som behövs
    let rooms = JSON.parse(await fs.readFile("data/rooms.json"))
    const posts = JSON.parse(await fs.readFile("data/posts.json"))

    //Updaterar rummens posts och timeSince så den visas rätt. Updateras inte live dock
    rooms = await Promise.all(rooms.map(async r => {
        //Hittar postsen som har samma id som rum id:et (alltså tillhär de dethär rummet)
        revPosts = posts.filter(p => (p.roomId == r.id))
        r.posts = revPosts.length
        //Om rummet har posts, sätt rummets timeSince till den senaste skickade postsens timeSince
        if(r.posts) r.timeSince = (revPosts[0].timeSince)
        //Escapar namnet och beskrivningen till rummet
        r.name = escape(r.name)
        r.desc = escape(r.desc)
        return r
    }))
    //Kommer genuint inte ihåg varför jag skapar denna variablen istället för att bara använda rooms, kanske har jag tagit bort anledningen men inte själva variablen. Är för rädd för att ta sönder något om jag ändrar det nu så kommer bara låta det vara.
    const extendedRooms = rooms

    //Fixar lite självförklarande variabler
    let errorText = req.query.error || "";
    let successText = req.query.success || "";
    let loggedInHide = ""
    if(!req.session.loggedIn) loggedInHide = "hidden"
    let admin = false
    if(req.session.admin) admin = true
    const clientUserId = req.session.userId || 0

    //Skickar med en javascript lista som inehåller alla rooms, klientUserId:et och om användaren är admin. Sen skickar den med javascript som kan använda javascript Room-listan för att skapa en html div fylld med room object. Om man är inloggad kommer Create Room fliken visas, annars är den hidden. Det finns ett par olika filter knappar man kan trycka på som alla har sin egen javascript samt en sökfunktion bland rummen.
    html = await render(req, "Rooms List","roomList.js",`

        <script>let roomList = ${JSON.stringify(extendedRooms)}; const clientUserId = ${clientUserId}; const admin = ${admin}</script>
        
        <p class="error">${escape(errorText)}</p>
        <p class="success">${escape(successText)}</p>

        <details class="createRoomDetails ${loggedInHide}">
            <summary>Create Room</summary>

            <form action="createRoom" method="post" id="createRoomForm">
                <input type="text" name="name" placeholder="Room Name">
                <input type="text" name="desc" placeholder="Description">
                <input type="submit" value="Create Room">
            </form>
        </details>


        <div class="outerFilters">
            <h3>Sorting Order</h3>

            <div class="filters">
                <button id="oldFilter" class="filterButton usingFilter">Old</button>    
                <button id="newFilter" class="filterButton">New</button>
                <button id="updatedFilter" class="filterButton">Updated</button>
                <button id="postsFilter" class="filterButton">Posts</button>
            </div>
        </div>

        <form action="" id="searchForm">
            <input type="text" placeholder="Search room" name="search">
        </form>
        
        <div class="outerDiv">
        </div>

    <div class="bottomDiv">
        <h3 id="bottomInfo">You have reached the bottom</h3>
    </div>
    <br>
        `)

    res.send(html)
})
```
Kommentarerna förklarar

***




### RoomList Client Script

``` js
console.log("Running")

//Har redan gått igenom denhär funktionen
function timeSinceTime(time){
    if(!time) return "No posts"
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

//Lite variabler som vanligt
const outerDiv = document.querySelector(".outerDiv")
let activeFilter = "oldFilter"
let searchFilter = ""
//Variable för att kunna stoppa hemsidan från att updateras, användbart när jag debuggade
let updateList = true

//Tar listan roomList och skapar "OuterDiv":en (alltså diven med alla rum i sig) vilket är typ 80% av sidan
function reloadRooms(){
    if(!updateList) return
    //Skapar kopia av roomList
    let sortedRoomList = roomList.slice()
    //Bad filtering system
/*     sortedRoomList = sortedRoomList.filter(c => (
        searchlist = searchFilter.split(" ")
        
        (c.name).includes(searchFilter))) */

    //Good filtering (but resource expensive to client)
    tempList = JSON.parse(JSON.stringify(sortedRoomList))
    sortedRoomList.forEach(room => {
        const searchList = searchFilter.split(" ")
        searchList.forEach(sSearch => {
            if(!room.name.toLowerCase().includes(sSearch.toLowerCase()) && !room.desc.toLowerCase().includes(sSearch.toLowerCase())){
                const index = tempList.map(c => {return c.id}).indexOf(room.id)
                if(index > -1) {
                    tempList.splice(index, 1)
                }
            }
        });
    });
    sortedRoomList = tempList

    //Sorting order
    if(activeFilter == "oldFilter"){
        sortedRoomList.sort(function(a, b){
            return a.id - b.id
        })
    }
    if(activeFilter == "newFilter"){
        sortedRoomList.sort(function(a, b){
            return b.id - a.id
        })
    }
    else if(activeFilter == "postsFilter"){
        sortedRoomList.sort(function(a, b){
            return b.posts - a.posts
        })
    }
    else if(activeFilter == "updatedFilter"){
        sortedRoomList.sort(function(a, b){
            return b.timeSince - a.timeSince
        })
    }

    //Use list that is now sorted and filtered to render html
    outerDiv.innerHTML = ""
    //Creates an innerDiv for each room in list and adds said innerDiv to outerDiv
    sortedRoomList.forEach(el => {

        const innerDiv  = document.createElement("div");
        innerDiv.classList.add("innerDiv")

        const divContent = `
                        <div class="innerHeader">
                            <div class="profilePicture">

                            </div>
                            <h3>
                                ${el.name}
                            </h3>
                            <div class = "positionBottom">
                                <p id="${el.timeSince}" class="timeSinceText">
                                    ${timeSinceTime(el.timeSince)}
                                </p>
                                <p>
                                    : ${el.posts + " posts"}
                                </p>
                            </div>
                            <div class = "positionRight">
                            </div>
                        </div>
                        <div class="innerMain">
                            <p>
                                ${el.desc}
                            </p>
                            <a href="room/${el.id}">Enter Room</a>
                            <form action="" class="hidden deleteForm">
                                <input type="submit" value="Delete">
                            </form>
                        </div>`

        innerDiv.innerHTML = divContent;
        const positionRight = innerDiv.querySelector(".positionRight")

        //If post was made by client account (or admin), add Edit and Delete buttons
        if(clientUserId == el.owner || admin){

            //Adding edit/delete checkmarks
            const deleteDiv = document.createElement("div")
            deleteDiv.classList.add("deleteStyle")
            deleteDiv.innerHTML = `                                   
                <i class="iconSmall material-icons deleteCheck">delete</i>
            `
            positionRight.appendChild(deleteDiv)

            //Handle Delete
            //Delete checkmark
            const deleteButton = innerDiv.querySelector(".deleteCheck")
            const deleteForm = innerDiv.querySelector(".deleteForm")
            deleteButton.addEventListener("click", (ev) => {
                if(!deleteButton.classList.contains("checked")) {
                    deleteForm.classList.remove("hidden")
                    deleteButton.classList.add("checked")
                }
                    else {
                    deleteForm.classList.add("hidden")
                    deleteButton.classList.remove("checked")
                }
            })
            //Delete Confirm Button
            deleteForm.addEventListener("submit", (ev) => {
                //Tydligen la jag aldrig till denna funktionen, ummm
                //Lets the client handle the form instead of redirecting to a new link
                ev.preventDefault();
                const postId = innerDiv.id
                //If new text is not empty nor the same as the original text, send to server for update processing
                socket.emit("deleteRoom", postId);
                console.log("Deleted div " + innerDiv.id)
            });

    }
        outerDiv.appendChild(innerDiv, outerDiv.firstChild);
    });
}

//Kör funktionen så fort sidan scriptet laddas in
reloadRooms()

//Update only timeSince so the timestamps can update live without having to reload everything (all filtering/sorting + rendering html)
function updateTimeSince(){
    let childList = outerDiv.childNodes
    childList.forEach(element => {
        const timeSinceP = element.querySelector(".timeSinceText")
        if(timeSinceP.id == 0) return
        timeSinceP.textContent = timeSinceTime(timeSinceP.id)
    });
}
let intervalId = setInterval(updateTimeSince, 1000)

//Funktion så klienten kan ändra hur lång tid det ska ta mellan varje updatering (Otroligt jobbigt att lista ut hur man skulle göra detta)
function changeInterval(ms){
    clearInterval(intervalId)
    intervalId = setInterval(updateTimeSince, ms)
}


//Old search
/* const searchForm = document.querySelector("#searchForm")
searchForm.addEventListener("submit", handleSubmitSearch);
function handleSubmitSearch(ev){
    searchFilter = ""
    if(ev.type == "submit") console.log("It is"); reloadRooms()
    if(!(ev.type == "submit")) return searchForm.removeChild(document.querySelector("#filterTxt"))
    //Gör så att den inte skickar formet till servern utan istället låter clienten hantera datan
    ev.preventDefault();
    const search = (ev.target.search.value);
    searchFilter = search
    ev.target.search.value = ""
    filterTxt = document.createElement("p")
    filterTxt.textContent = "'" + searchFilter + "'"
    filterTxt.id = "filterTxt"
    searchForm.appendChild(filterTxt)
    filterTxt.addEventListener("click", handleSubmitSearch)

    reloadRooms()
} */

//Better Search
const searchInput = document.querySelector("#searchForm").firstElementChild
searchInput.addEventListener("input", (ev) => {
    searchFilter = searchInput.value
    if(!searchFilter) return removeFilter()
    //Vet inte varför jag raderar filterTxt och bygger upp den igen istället för att ändra den, minns att jag först ville ändra den och så fick jag något problem och bara gjorde såhär istället men kommer inte ihåg vad problemet var.
    if(searchForm.querySelector("#filterTxt")) searchForm.removeChild(searchForm.querySelector("#filterTxt"))
    filterTxt = document.createElement("p")
    filterTxt.textContent = "'" + searchFilter + "'"
    filterTxt.id = "filterTxt"
    searchForm.appendChild(filterTxt)
    filterTxt.addEventListener("click", removeFilter)
    reloadRooms()
})

function removeFilter(){
    searchFilter = ""
    searchForm.removeChild(searchForm.querySelector("#filterTxt"))
    searchInput.value = ""    
    reloadRooms()
}


//Sorting filter buttons
const oldButton = document.querySelector("#oldFilter")
const newButton = document.querySelector("#newFilter")
const updatedButton = document.querySelector("#updatedFilter")
const postsButton = document.querySelector("#postsFilter")

function changeFilter(event){
    console.log(event.target.id)
    activeFilter = event.target.id

    oldButton.classList.remove("usingFilter")
    newButton.classList.remove("usingFilter")
    updatedButton.classList.remove("usingFilter")
    postsButton.classList.remove("usingFilter")

    event.target.classList.add("usingFilter")

    reloadRooms()

}

oldButton.addEventListener("click", changeFilter)
newButton.addEventListener("click", changeFilter)
updatedButton.addEventListener("click", changeFilter)
postsButton.addEventListener("click", changeFilter)


/* oldButton.addEventListener("click", (ev) =>{
    activeFilter = "Old"
    reloadRooms()
})
newButton.addEventListener("click", (ev) =>{
    activeFilter = "New"
    reloadRooms()
})
updatedButton.addEventListener("click", (ev) =>{
    activeFilter = "Updated"
    reloadRooms()
})
postsButton.addEventListener("click", (ev) =>{
    activeFilter = "Posts"
    reloadRooms()
})
 */

//Create room code
const createRoomForm = document.querySelector("#createRoomForm")
createRoomForm.addEventListener("submit", handleSubmit);
function handleSubmit(ev){
    //Gör så att användaren stannar på sidan och den här koden körs istället för att skicka ett request direkt till servern
    ev.preventDefault()
    nameTemp = ev.target.name.value
    descTemp = ev.target.desc.value
    ev.target.name.value = ""
    ev.target.desc.value = ""
    if(!nameTemp) return setError("Room needs a name")
    if(!descTemp) return setError("Room needs a description")
    //Skapar ett room object och skickar det till servern via websocket id:et "newRoomCreated"
    const room = {name: nameTemp, desc: descTemp, timeSince: 0, posts: 0, id: Date.now()}
    socket.emit("newRoomCreated", room)
}

//Koppla upp oss med websockets
const socket = io();

//Klient får rum från servern, pusha in det till listan roomList och ladda om sidan.
socket.on("roomToClient", (room) => {
    roomList.push(room)
    reloadRooms()
})

//New room deleted and sent to client
socket.on("roomRemoved", (roomId) => {
    roomList = roomList.filter(c => c.id != roomId)
    reloadRooms()
})

//Error/Success Handling
socket.on("error", setError)
socket.on("success", setSuccess)

const errorEl = document.querySelector(".error")
function setError(error){
    errorEl.textContent = error
}
const successEl = document.querySelector(".success")
function setSuccess(success){
    successEl.textContent = success
}

```
Kommentarerna förklarar jag tror allt

***




### Websocket Server får rum

``` js
//Recives room
async function handleCreateRoom(room){

    //Skicka iväg de som inte är inloggade
    const tSession = this.request.session
    if(!tSession.loggedIn) console.log(("error", "must be logged in")) 
    if(!tSession.loggedIn) return this.emit("error", "must be logged in")
    
    room.owner = tSession.userId
    console.log(room)
    if(room.name.length > process.env.maxRoomNameLen) return this.emit("error", `Room name must be shorter than ${.process.envmaxRoomNameLen} characters`)
    if(room.name.length > process.env.maxRoomDescLen) return this.emit("error", `Room description must be shorter than ${process.env.maxRoomDescLen} characters`)    
    let rooms = JSON.parse(await fs.readFile("data/rooms.json"))
    rooms.push(room)
    await fs.writeFile("data/rooms.json", JSON.stringify(rooms, null, 3))


    room.name = escape(room.name)
    room.desc = escape(room.desc)
    //Create simpler post to send to clients in the same room
    console.log(`${this.request.session.username} created room : ${room.name}`)
    io.emit("roomToClient", room)
}
```
Server får ett room-object från en klient som var inne på /roomList.
Servern kollar så att användaren är inloggad och om det godkänds så skapar servern rummet, lägger till den i rooms.json filen och skickar iväg rummet till alla klienter så de dyker upp för dom. Om rum namnet eller descriptionen är längre än vad som är tillåtet så kommer ett error medelande skickas.

***




### RoomChat Clientscript

``` js
//Basic Variables
    const outerDiv = document.querySelector(".outerDiv")
    let reachedBottom = false


// Basic Functions
reloadEverything()

let intervalId = setInterval(updateTimeSince, 1000)

function changeInterval(ms){
clearInterval(intervalId)
intervalId = setInterval(updateTimeSince, ms)
}


//Get time since date object was created
function timeSinceTime(time){
    if(!time) return "No posts"
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

//Generate an innerDiv (chat/post)
function generateInnerDiv(post){
    console.log(post)

    if(!post.author || !post.content){
        let innerDiv = document.createElement("div")
        innerDiv.classList.add("innerDiv")
        innerDiv.classList.add("deletedDiv")
        innerDiv.id = post.id
        innerDiv.innerHTML = `
                            <div class="innerHeader">
                                <div class="profilePicture">

                                </div>
                                <h3>
                                    Unkown
                                </h3>
                                <div class = "positionBottom">
                                    <p id="${post.timeSince}" class = "timeSinceText">
                                        ${timeSinceTime(post.timeSince)}
                                    </p>
                                </div>
                            </div>
                            <div class="innerMain">
                                <p>
                                    Deleted
                                </p> 
                            </div>`
        return innerDiv
    }


    let edited = ""
    if(post.edited) edited = "(edited)"
    let innerDiv = document.createElement("div")
    innerDiv.classList.add("innerDiv")
    innerDiv.id = post.id
    innerDiv.innerHTML = `
                        <div class="innerHeader">
                            <div class="profilePicture">

                            </div>
                            <h3>
                                ${post.author.username}
                            </h3>
                            <div class = "positionBottom">
                                <p id="${post.timeSince}" class = "timeSinceText">
                                    ${timeSinceTime(post.timeSince)}
                                </p>
                            </div>
                            <div class = "positionRight">
                                <p>
                                    ${edited}
                                </p>
                            </div>
                        </div>
                        <div class="innerMain">
                            <p class="contentP">
                                ${post.content}
                            </p>
                            <form action="" class="hidden editForm">
                                <input type="submit" value="Update">
                            </form>
                            <form action="" class="hidden deleteForm">
                                <input type="submit" value="Delete">
                            </form>
                        </div>`
                        
    //Skrev först detta för att få orginal texten "chatList.find(c => (c.id == innerDiv.id)).content"
    //för jag glömde helt att post.content också borde fungera lol

    //If post was made by client account, add Edit button
    if(clientUserId == post.author.id || admin){

        //Adding edit/delete checkmarks
        const positionRight = innerDiv.querySelector(".positionRight")
        
        const editDiv = document.createElement("div")
        editDiv.classList.add("editStyle")
        editDiv.innerHTML = `                                   
            <i class="iconSmall material-icons editCheck">edit</i>
        `
        const deleteDiv = document.createElement("div")
        deleteDiv.classList.add("deleteStyle")
        deleteDiv.innerHTML = `                                   
            <i class="iconSmall material-icons deleteCheck">delete</i>
        `
        positionRight.appendChild(editDiv)
        positionRight.appendChild(deleteDiv)

        //Handle Edit
        //Edit checkmark
        const editButton = innerDiv.querySelector(".editCheck")
        const mainText = innerDiv.querySelector(".contentP")
        const editForm = innerDiv.querySelector(".editForm")
        editButton.addEventListener("click", (ev) => {
            if(!editButton.classList.contains("checked")) {
                mainText.contentEditable = true                
                editForm.classList.remove("hidden")
                editButton.classList.add("checked")
                console.log("Now editing " + innerDiv.id)
                if(deleteButton.classList.contains("checked")) {
                    deleteForm.classList.add("hidden")
                    deleteButton.classList.remove("checked")
                }
            }
                else {
                mainText.contentEditable = false
                editForm.classList.add("hidden")
                mainText.innerHTML = post.content
                editButton.classList.remove("checked")
                console.log("Stopped editing " + innerDiv.id)
            }
        })
        //Edit Confirm Button
        editForm.addEventListener("submit", (ev) => {
            //Lets the client handle the form instead of redirecting to a new link
            ev.preventDefault();
            const newText = mainText.textContent.trim();
            const postId = innerDiv.id
            const originalText = post.content
            //If new text is not empty nor the same as the original text, send to server for update processing
            if(newText && newText.trim() != originalText.trim()) socket.emit("updateChat", {text: newText, id: postId});
            console.log("Updated div " + innerDiv.id + " with the new text : " + newText)
        });

        //Handle Delete
        //Delete checkmark
        const deleteButton = innerDiv.querySelector(".deleteCheck")
        const deleteForm = innerDiv.querySelector(".deleteForm")
        deleteButton.addEventListener("click", (ev) => {
            if(!deleteButton.classList.contains("checked")) {
                deleteForm.classList.remove("hidden")
                deleteButton.classList.add("checked")
                if(editButton.classList.contains("checked")){
                    mainText.contentEditable = false
                    editForm.classList.add("hidden")
                    mainText.innerHTML = post.content
                    editButton.classList.remove("checked")
                    console.log("Stopped editing " + innerDiv.id)
                }
            }
                else {
                deleteForm.classList.add("hidden")
                deleteButton.classList.remove("checked")
            }
        })
        //Delete Confirm Button
        deleteForm.addEventListener("submit", (ev) => {
            //Lets the client handle the form instead of redirecting to a new link
            ev.preventDefault();
            const postId = innerDiv.id
            //If new text is not empty nor the same as the original text, send to server for update processing
            socket.emit("deleteChat", postId);
            console.log("Deleted div " + innerDiv.id)
        });


    }

    return innerDiv
}

function reloadEverything(){
    outerDiv.innerHTML = ""
    chatList.forEach(Object => {
        outerDiv.appendChild(generateInnerDiv(Object))
    });
}

function addToTop(Object){
    outerDiv.insertBefore(Object,outerDiv.firstElementChild)
}

function addToBot(Object){
    outerDiv.appendChild(Object)
}

//Runs through every innerDiv and updates their TimeSince while not changing anything else
//There is a setIntervall at the top where you can adjust the time between each update if you want.
function updateTimeSince(){
    let childList = outerDiv.childNodes
    childList.forEach(element => {
        const timeSinceP = element.querySelector(".timeSinceText")
        timeSinceP.textContent = timeSinceTime(timeSinceP.id)
    });
}

//--------- Basic functions done

//Websockets

//Connect to websocket
const socket = io();



//Handle Messages

//Get message from form and send to "sendMessage"
const form = document.querySelector("#form")
form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    //console.log(ev)
    const msg = (ev.target.msg.value).trim();
    if(msg) sendMessage(msg)
    ev.target.msg.value = ""
});

//"sendMessage" function, sends message recived to server
function sendMessage(msg){
    socket.emit("chat", msg);
}

//Handles messages recived from server
socket.on("chat", handleChatClient)
function handleChatClient(msg){
    console.log(msg)
    chatList.unshift(msg)
    addToTop(generateInnerDiv(msg))
}



//Handle Load More


//Load more handeling
function loadMoreChats(){
    ChildCount = outerDiv.childElementCount
    if(reachedBottom) return false
    socket.emit("loadMoreChats", ChildCount);
    return true
}

//Triggers for "loadMore"
//If scrolling
window.addEventListener("scroll", (ev) => {
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight-(window.innerHeight*0.4)){
        loadMoreChats()
    }
})
//If zooming using ctrl+scroll
window.addEventListener("wheel", (ev) => {
    if(!ev.ctrlKey) return
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight-(window.innerHeight*0.4)){
        loadMoreChats()
    }
})
//If bottom on page load
if (window.innerHeight + window.scrollY >= document.body.scrollHeight-(window.innerHeight*0.4)){
    loadMoreChats()
}

button = document.querySelector("#LoadButton")
button.addEventListener("click", loadMoreChats)

//Load more received handeling
socket.on("moreChats", (posts) => {
    //console.log(posts)
    posts.forEach(element => {
        addToBot(generateInnerDiv(element))
        chatList.push(element)
    });
    if(posts.length < 10){
        reachedBottom = true
        document.querySelector("#bottomInfo").textContent = "Nothing more to load"
        document.querySelector(".bottomDiv").removeChild(document.querySelector("#LoadButton"))

    }
    loadMoreChatsCheck()
})

function loadMoreChatsCheck(){
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight-(window.innerHeight*0.4)){
        loadMoreChats()
    }
}
//Handle Edit and Delete
socket.on("chatUpdated", (post) => {
    document.getElementById(post.id).replaceWith(generateInnerDiv(post))
    //console.log(post)
    //outerDiv.querySelector("#" + post.id) = generateInnerDiv(post)
})

```
Tror typ allt var antingen förklarat i förra klientscripten (mycket samma) eller av kommentarerna

***




### Websocket Chat to Server

``` js
//Recives chat
async function handleChat(msg){

    console.log(msg)
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
    const post = {"id": timeStamp,"roomId": socketRoomId, "author": authorId, "timeSince": timeStamp, "content": msg}
    posts.unshift(post)
    await fs.writeFile("data/posts.json", JSON.stringify(posts, null, 3))
    
    //Create simpler post to send to clients in the same room
    const users = JSON.parse(await fs.readFile("data/users.json"))
    let sendPost = post
    sendPost.author = users.find(c => (c.id == sendPost.author))
    delete sendPost.author.password
    delete sendPost.author.password
    sendPost = await escapePost(sendPost)
    io.to(socketRoom).emit("chat",sendPost)
}
```
Servern får en chatt från en klient, den använder msg (texten), klientens session kakor och websocket rummet klienten var kopplad till för att skapa ett post object som den sparar ner till filen och sen skicka iväg till andra klienter som är kopplade till samma rum.

***




### Websocket Update Chatt

``` js
async function  handleUpdateChat(event) {
    console.log(event)   

    //Basic variables
    const tSession = this.request.session 
    const posts = JSON.parse(await fs.readFile("data/posts.json"))
    const users = JSON.parse(await fs.readFile("data/users.json"))
    let post = posts.find(c => (c.id == event.id))
    
    //If wrong account and not admin tries to update, do nothing
    if(!(tSession.userId == post.author || tSession.admin)) return console.log("Wrong account tried to delete post") 
    
    //Change post and write to file
    post.content = event.text
    post.edited = true
    await fs.writeFile("data/posts.json", JSON.stringify(posts, null, 3))

    //Prepare post for websockets and send to relevant room
    const socketRooms = Array.from(this.rooms)
    const socketRoom = socketRooms.find(c => c.includes("room/"))
    post.author = users.find(c => c.id == post.author)
    //post = escapePost(post)

    post = await escapePost(post)

    io.to(socketRoom).emit("chatUpdated",post)
    
    console.log(post) 
}
```
Hitta posten som blev updaterad, kolla om klienten har behörigheterna, ändra posten och markera att den blivit editad, skriv ner til fil och skicka updateringen till websockets som är kopplade till rummet som chatten kom ifrån.

***




### Websocket Delete Chatt

``` js
async function handleDeleteChat(chatId){
    console.log(chatId)
    //Find post, empty it and save to file
    const tSession = this.request.session
    let posts = JSON.parse(await fs.readFile("data/posts.json"))
    let post = posts.find(c => (c.id == chatId))
    if(!post) return console.log("Tried to delete post with id that can't be found")
    if(!(tSession.userId == post.author || tSession.admin)) return console.log("Wrong account tried to delete post") 
    post.author = null
    post.content = null
    await fs.writeFile("data/posts.json", JSON.stringify(posts, null, 3))
    //Send update in posts to clients connected to relevant room
    const socketRooms = Array.from(this.rooms)
    const socketRoom = socketRooms.find(c => c.includes("room/"))
    io.to(socketRoom).emit("chatUpdated",post)
}

```
Hitta post, kolla behörigheter, ta bort all viktig data i chatt objektet, skicka ut till websockets kopplade till samma rum som posten. Viktigt att inte post objektet bara försvinner utan att det blir tomt för användare ska kunna se att något blev borttaget, det ska inte bara försvinna för användarna utan det ska bli blankt.

***


### Websockets Klient to Server Load More Chats Request

``` js
//Handle loading more chats
async function handleLoadMoreChats(event){
    //console.log(this.request.session.username + " Wants chats from " + event)
    //Getting room id
    const socketRooms = Array.from(this.rooms)
    const socketRoom = socketRooms.find(c => c.includes("room/"))
    const socketRoomId = socketRoom.slice(5)
    //Fixing posts list
    let posts = JSON.parse(await fs.readFile("data/posts.json"))
    posts = posts.filter(c => (c.roomId == socketRoomId))
    posts = posts.slice(event, event+10)
    const users = JSON.parse(await fs.readFile("data/users.json"))
    posts = await Promise.all(posts.map(async c => {
        c.author = users.find(u => (u.id == c.author))
        c = await escapePost(c)
        if(!c.author) return c
        delete c.author.password
        delete c.author.email
        return c 
    }))

    //Sending posts list
    this.emit("moreChats", posts)
}
```
En klient har skickat ett request om att den vill ha mer chattar där den tar med hur många chattar den redan har. Servern skapar en lista med chattarna som kommer direkt efter klientens chattar tar slut, förbreder dom för att skickas iväg (escapar och sätter användare till riktigt namn istället för bara id) och skickar sen iväg listan till klienten.

***



### Websocket Disconnect

``` js
//Handle disconnect
async function handleDisconnect(event){
    console.log((this.request.session.username || "Unkown") + " disconnected");
}
```
Console logga vem som disconnectade när en klient går från servern

***




### Rubrik

``` js


```
Text

***