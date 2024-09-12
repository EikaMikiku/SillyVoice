class MessageManager {
	constructor(socket) {
		this.socket = socket;

		this.bindEvents();
	}

	bindEvents() {
		//this.socket.on("");


		document.getElementById("chat-send").addEventListener("click", (e) => {
			e.target.disabled = true;
			let chatInputEl = document.getElementById("chat-input");
			this.socket.emit("chat-input", chatInputEl.value);
			chatInputEl.value = "";
		});
	}

	initChatLog(messages) {
		let messagesContainer = document.getElementById("messages-container");
		for(let msg of messages) {
			messagesContainer.appendChild(this.createMessageElement(msg.raw));
		}
	}

	createMessageElement(txt, isUser) {
		let msgDiv = document.createElement("div");
		msgDiv.className = "message" + (isUser ? " user" : "");

		let contentDiv = document.createElement("div");
		contentDiv.className = "message-content";
		msgDiv.appendChild(contentDiv);

		let img = document.createElement("img");
		img.src = "./img/user_default.webp";
		contentDiv.appendChild(img);

		let span = document.createElement("span");
		span.innerText = txt;
		contentDiv.appendChild(span);

		return msgDiv;
	}
}