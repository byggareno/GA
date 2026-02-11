//Definera lite variabler
const outerDiv = document.querySelector(".outerDiv")


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

function generateInnerDiv(post){

    let editButton = ""
    if(clientUserId == post.author.id) editButton = "<input type='checkbox' class='editCheck'>"
    let edited = ""
    if(post.edited) edited = "(edited)"
    let innerDiv = document.createElement("div")
    innerDiv.classList.add("innerDiv")
    innerDiv.innerHTML = `
                        <div class="innerHeader">
                            <div class="profilePicture">

                            </div>
                            <h3>
                                ${post.author.username}
                            </h3>
                            <div class = "positionBottom">
                                <p>
                                    ${timeSinceTime(post.timeSince)}
                                </p>
                            </div>
                            <div class = "positionRight">
                            ${editButton}
                                <p>
                                    ${edited}
                                </p>
                            </div>
                        </div>
                        <div class="innerMain">
                            <p class="contentP">
                                ${post.content}
                            </p>
                            <form action="" id="editForm" class="hidden">
                                <input type="submit">
                            </form>
                        </div>`

    return innerDiv
}

function reloadEverything(){
    outerDiv.innerHTML = ""
    chatList.forEach(Object => {
        outerDiv.appendChild(generateInnerDiv(Object))
    });
}

function addToTop(Object){

}

reloadEverything()

/* ${(await Promise.all( 
                posts.map (async el => {
                    const user = users.find(c => c.id == el.author) || "Unkown"
                    const authorName = user.username || "Unkown"
                    let editButton = ""
                    if(clientUserId == user.id) editButton = "<input type='checkbox' class='editCheck'>"
                    let edited = ""
                    if(el.edited) edited = "(edited)"

                    return `
                    <div class="innerDiv">
                        <div class="innerHeader">
                            <div class="profilePicture">

                            </div>
                            <h3>
                                ${escape(authorName)}
                            </h3>
                            <div class = "positionBottom">
                                <p>
                                    ${escape(await timeSinceTime(el.timeStamp))}
                                </p>
                            </div>
                            <div class = "positionRight">
                            ${editButton}
                                <p>
                                    ${edited}
                                </p>
                            </div>
                        </div>
                        <div class="innerMain">
                            <p>
                                ${escape(el.content)}
                            </p>
                            <form action="" id="editForm" class="hidden">
                                <input type="submit">
                                <p class="originalText hidden"> ${escape(el.content)} </p>
                                <p class="timeStamp hidden"> ${el.timeStamp} </p>
                            </form>
                        </div>
                    </div>`
                })
            )).join("")} */


//Koppla upp oss med websockets
const socket = io();

//Ganska lättläst funktion
function sendMessage(msg){
    socket.emit("chat", msg);
}

//När man får "chat", lägg till den högst uppe i chattfönstrer (.outerDiv)
socket.on("chat", handleChatClient)
function handleChatClient(msg){
    console.log(msg)
    chatList.unshift(msg)
    outerDiv.appendChild(generateInnerDiv(msg))
}

//Kod för att kunna skicka chattar till servern som sen tar hand om det (sparar och skickar tillbaka till clienter)
const form = document.querySelector("#form")
form.addEventListener("submit", (ev) => {
    //Gör så att den inte skickar formet till servern utan istället låter clienten hantera datan
    ev.preventDefault();
    console.log(ev)
    const msg = (ev.target.msg.value).trim();
    //Checker så att den inte skickar tomma chattar
    if(msg) sendMessage(msg)
    //Tömmer inputen efter chatten blivit skickat
    ev.target.msg.value = ""
});

//Allt här under (tror jag) är för att ladda in mer chattar när man skrollat längst ner, detta är någorlunda kommenterat redan på roomList.js som har samma funktion.
let reachedBottom = false

function loadMoreChats(){
    ChildCount = outerDiv.childElementCount
    socket.emit("loadMoreChats", ChildCount);
}

window.addEventListener("scroll", (ev) => {
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight-50 && !reachedBottom){
        loadMoreChats()
    }
})

button = document.querySelector("#LoadButton")
button.addEventListener("click", loadMoreChats)

socket.on("moreChats", (posts) => {
    if(posts.length < 10){
        reachedBottom = true
        document.querySelector("#bottomInfo").textContent = "Nothing more to load"
    }

    posts.forEach(el => {
        const innerDiv  = document.createElement("div");
        innerDiv.classList.add("innerDiv")

        const divContent = `
                            <div class="innerHeader">
                                <div class="profilePicture">

                                </div>
                                <h3>
                                    ${el.author}
                                </h3>
                                <div class = "positionBottom">
                                    <p>
                                        ${el.timeStamp}
                                    </p>
                                </div>
                            </div>
                            <div class="innerMain">
                                <p>
                                    ${el.content}
                                </p>
                            </div>`

        innerDiv.innerHTML = divContent;
        outerDiv.appendChild(innerDiv, outerDiv.firstChild);
    });
})

console.log(document.querySelectorAll(".editCheck"))
document.querySelectorAll(".editCheck").forEach(el => {
    const innerDiv = el.parentElement.parentElement.parentElement
        el.addEventListener("change", (ev) => {
            if(el.checked) {
                innerDiv.querySelector(".innerMain").firstElementChild.contentEditable = true                
                innerDiv.querySelector("#editForm").classList.remove("hidden")
            }
                else {
                innerDiv.querySelector(".innerMain").firstElementChild.contentEditable = false
                innerDiv.querySelector("#editForm").classList.add("hidden")
                innerDiv.querySelector(".innerMain").firstElementChild.textContent = innerDiv.querySelector(".originalText").textContent
            }
        })

        innerDiv.querySelector("#editForm").addEventListener("submit", (ev) => {
            //Gör så att den inte skickar formet till servern utan istället låter clienten hantera datan
            ev.preventDefault();
            const newText = (ev.target.parentElement.firstElementChild.textContent).trim();
            const chatId = ev.target.querySelector(".timeStamp").textContent
            const originalText = ev.target.parentElement.querySelector(".originalText").textContent
            //Checker så att inte updaten är tom eller har samma som innan, om inte så skickar den updaten till servern
            if(newText && newText.trim() != originalText.trim()) socket.emit("chatUpdate", {text: newText, id: chatId, room: document.URL.toString().split("/").reverse()[0]});
            console.log({newText: newText, id: chatId, room: document.URL.toString().split("/").reverse()[0]})
        });
    });


function updateChat(ev){

}