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
let activeFilter = "Old"
let searchFilter = ""

//Tar listan roomList och skapar hemsidan från den
function reloadRooms(){
    let sortedRoomList = roomList.slice()
    sortedRoomList = sortedRoomList.filter(c => ((c.name).includes(searchFilter)))
    
    if(activeFilter == "Old"){
        sortedRoomList.sort(function(a, b){
            return a.id - b.id
        })
    }
    if(activeFilter == "New"){
        sortedRoomList.sort(function(a, b){
            return b.id - a.id
        })
    }
    else if(activeFilter == "Posts"){
        sortedRoomList.sort(function(a, b){
            return b.posts - a.posts
        })
    }
    else if(activeFilter == "Updated"){
        sortedRoomList.sort(function(a, b){
            return b.timeSince - a.timeSince
        })
    }

    console.log("Updating Rooms")
    outerDiv.innerHTML = ""
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
                                <p id="${el.timeSince}">
                                    ${timeSinceTime(el.timeSince)}
                                    : ${el.posts + " posts"}
                                </p>
                            </div>
                        </div>
                        <div class="innerMain">
                            <p>
                                ${el.desc}
                            </p>
                            <a href="room/${el.id}">Enter Room</a>
                        </div>`

        innerDiv.innerHTML = divContent;
        outerDiv.appendChild(innerDiv, outerDiv.firstChild);

    });
}

reloadRooms()
setInterval(reloadRooms, 1000)

//Search
const searchForm = document.querySelector("#searchForm")
searchForm.addEventListener("submit", handleSubmit);
function handleSubmit(ev){
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
    filterTxt.addEventListener("click", handleSubmit)

    reloadRooms()
}

//Sorting filter buttons
const oldButton = document.querySelector("#oldFilter")
const newButton = document.querySelector("#newFilter")
const updatedButton = document.querySelector("#updatedFilter")
const postsButton = document.querySelector("#postsFilter")

oldButton.addEventListener("click", (ev) =>{
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


//Create room code
const createRoomForm = document.querySelector("#createRoomForm")
createRoomForm.addEventListener("submit", handleSubmit);
function handleSubmit(ev){
    ev.preventDefault()
    nameTemp = ev.target.name.value
    descTemp = ev.target.desc.value
    ev.target.name.value = ""
    ev.target.desc.value = ""
    if(!nameTemp) return setError("Room needs a name")
    if(!descTemp) return setError("Room needs a description")
    const room = {name: nameTemp, desc: descTemp, timeSince: 0, posts: 0, id: Date.now()}
    socket.emit("newRoomCreated", room)
}

//Koppla upp oss med websockets
const socket = io();

//New room created and sent to client
socket.on("roomToClient", (room) => {
    roomList.push(room)
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



//Icke använda load more funktioner

function loadMoreRooms(){
    ChildCount = outerDiv.childElementCount
    socket.emit("loadMoreRooms", ChildCount);
}

//Auto loada mer om scrollat till slutet
window.addEventListener("scroll", (ev) => {
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight-50 && !reachedBottom){
        loadMoreRooms()
    }
})

//Knapp för att force loada mer object om det behövs
button = document.querySelector("#LoadButton")
button.addEventListener("click", loadMoreRooms)