//Definera lite variabler
const outerDiv = document.querySelector(".outerDiv")

//Koppla upp oss med websockets
const socket = io();

//Ganska lättläst funktion
function sendMessage(msg){
    socket.emit("chat", msg);
}

//När man får "chat", lägg till den högst uppe i chattfönstrer (.outerDiv)
socket.on("chat", handleChatClient)

function handleChatClient(msg){
    const innerDiv  = document.createElement("div");
    innerDiv.classList.add("innerDiv")

    const divContent = `
                        <div class="innerHeader">
                            <div class="profilePicture">

                            </div>
                            <h3>
                                ${msg.author}
                            </h3>
                            <div class = "positionBottom">
                                <p>
                                    ${msg.timeStamp}
                                </p>
                            </div>
                        </div>
                        <div class="innerMain">
                            <p>
                                ${msg.content}
                            </p>
                        </div>`

    innerDiv.innerHTML = divContent;
    outerDiv.insertBefore(innerDiv, outerDiv.firstChild);
}

//Kod för att kunna skicka chattar till servern som sen tar hand om det (sparar och skickar tillbaka till clienter)
const form = document.querySelector("#form")
form.addEventListener("submit", handleSubmit);

function handleSubmit(ev){
    //Gör så att den inte skickar formet till servern utan istället låter clienten hantera datan
    ev.preventDefault();
    const msg = (ev.target.msg.value).trim();
    //Checker så att den inte skickar tomma chattar
    if(msg) sendMessage(msg)
    //Tömmer inputen efter chatten blivit skickat
    ev.target.msg.value = ""
}

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