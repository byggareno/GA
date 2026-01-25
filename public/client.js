console.log("client")
console.log(document.cookie)
const outerDiv = document.querySelector(".outerDiv")


//Koppla upp oss
const socket = io();


function sendMessage(msg){

    socket.emit("chat", msg);
    console.log("Client has sent a message")
    console.log(socket.id)

}

socket.on("chat", handleChatClient)

function handleChatClient(msg){
    console.log(msg);
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

const form = document.querySelector("#form")
form.addEventListener("submit", handleSubmit);

function handleSubmit(ev){
    ev.preventDefault();
    const msg = (ev.target.msg.value).trim();

    if(msg) sendMessage(msg)

    ev.target.msg.value = ""
}

let reachedBottom = false

function loadMore(){
    ChildCount = outerDiv.childElementCount
    console.log(ChildCount)
    socket.emit("loadMore", ChildCount);
}

window.addEventListener("scroll", (ev) => {
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight-50 && !reachedBottom){
        console.log("Reached Bottom")

        loadMore()
    }
})

button = document.querySelector("#LoadButton")
button.addEventListener("click", loadMore)

socket.on("moreChats", (posts) => {
    console.log(posts)
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


console.log(button)