//Allt här är för att ladda in mer rum när man skrollat till slutet
//Definera lite variabler
const outerDiv = document.querySelector(".outerDiv")
let reachedBottom = false

//Koppla upp oss med websockets
const socket = io();


//Hade inte riktigt behövt göra detta till en funktion
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

//Får tillbaka ett message som är en lista med 10 "room" object
socket.on("moreRooms", (room) => {
    //Om mindre än 10 object så är det för att det inte finns mer så då markerar den det och slutar skicka requests.
    if(room.length < 10){
        reachedBottom = true
        document.querySelector("#bottomInfo").textContent = "Nothing more to load"
    }

    //Skapa ny InnerDiv osv för varje room object och lägg till dom till .OuterDiv längst ner
    room.forEach(el => {
        
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
                                <p>
                                    ${el.timeSince + " since last post"}
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

})