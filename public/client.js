console.log("client")
console.log(document.cookie)

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
    const chatBox = document.querySelector("#chat")
    const p  = document.createElement("p");
    p.innerText = msg;
    chatBox.appendChild(p);


}

const form = document.querySelector("#form")
form.addEventListener("submit", handleSubmit);

function handleSubmit(ev){
    ev.preventDefault();
    const msg = (ev.target.msg.value).trim();

    if(msg) sendMessage(msg)

    ev.target.msg.value = ""
}