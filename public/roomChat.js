//Basic Variables
    const outerDiv = document.querySelector(".outerDiv")
    let reachedBottom = false


// Basic Functions
reloadEverything()
setInterval(updateTimeSince, 1000)

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

    let editButtonText = ""
    if(clientUserId == post.author.id) editButtonText = "<input type='checkbox' class='editCheck'>"
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
                                <p class = "timeSinceText">
                                    ${timeSinceTime(post.timeSince)}
                                </p>
                            </div>
                            <div class = "positionRight">
                            ${editButtonText}
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
                                <input type="submit">
                            </form>
                        </div>`
                        
    //Skrev först detta för att få orginal texten "chatList.find(c => (c.id == innerDiv.id)).content"
    //för jag glömde helt att post.content också borde fungera lol

    //If post was made by client account, add Edit button
    if(clientUserId == post.author.id){
        const editButton = innerDiv.querySelector(".editCheck")
        const mainText = innerDiv.querySelector(".contentP")
        const editForm = innerDiv.querySelector(".editForm")

        editButton.addEventListener("change", (ev) => {
            if(editButton.checked) {
                mainText.contentEditable = true                
                editForm.classList.remove("hidden")
                console.log("Now editing " + innerDiv.id)
            }
                else {
                mainText.contentEditable = false
                editForm.classList.add("hidden")
                mainText.textContent = post.content
                console.log("Stopped editing " + innerDiv.id)
            }
        })

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

function updateTimeSince(){
    let childList = outerDiv.childNodes
    childList.forEach(element => {
        element.querySelector(".timeSinceText").textContent = timeSinceTime(element.id)
    });
}


//Basic Websockets

//Connect to websocket
const socket = io();



//Handle Messages

//Get message from form and send to "sendMessage"
const form = document.querySelector("#form")
form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    console.log(ev)
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
    if(reachedBottom) return
    socket.emit("loadMoreChats", ChildCount);
}

socket.on("moreChats", (posts) => {
    console.log(posts)
    posts.forEach(element => {
        addToBot(generateInnerDiv(element))
        chatList.push(element)
    });
    if(posts.length < 10){
        reachedBottom = true
        document.querySelector("#bottomInfo").textContent = "Nothing more to load"
    }

})


//Load more activations
window.addEventListener("scroll", (ev) => {
    if (window.innerHeight + window.scrollY >= document.body.scrollHeight-50){
        loadMoreChats()
    }
})
button = document.querySelector("#LoadButton")
button.addEventListener("click", loadMoreChats)



//Handle Edit


socket.on("chatUpdated", (post) => {
    console.log(post)

    document.getElementById(post.id).replaceWith(generateInnerDiv(post))
    
    //outerDiv.querySelector("#" + post.id) = generateInnerDiv(post)


})