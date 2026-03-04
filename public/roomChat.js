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