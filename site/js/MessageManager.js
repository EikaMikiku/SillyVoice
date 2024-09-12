class MessageManager {
	constructor(socket) {
		this.socket = socket;

		this.bindEvents();
	}

	bindEvents() {
		//this.socket.on("");
		this.socket.on("llm-genend", (msg) => {
			let messagesContainer = document.getElementById("messages-container");
			let elem = this.createMessageElement(msg.raw, msg.isUser);
			messagesContainer.appendChild(elem);

			if(!msg.isUser) {
				let sendButton = document.getElementById("chat-send");
				sendButton.disabled = false;
			}

			this.scrollDown();
		});

		document.getElementById("chat-send").addEventListener("click", (e) => {
			e.target.disabled = true;
			let chatInputEl = document.getElementById("chat-input");
			this.socket.emit("chat-input", chatInputEl.value);
			chatInputEl.value = "";
		});
	}

	initChatLog(messages) {
		let messagesContainer = document.getElementById("messages-container");
		while(messagesContainer.firstElementChild) {
			messagesContainer.removeChild(messagesContainer.firstElementChild);
		}

		for(let msg of messages) {
			messagesContainer.appendChild(this.createMessageElement(msg.raw, msg.isUser));
		}

		this.scrollDown();
	}

	createMessageElement(txt, isUser) {
		let msgDiv = document.createElement("div");
		msgDiv.className = "message" + (isUser ? " user" : "");

		let contentDiv = document.createElement("div");
		contentDiv.className = "message-content";
		msgDiv.appendChild(contentDiv);

		let img = document.createElement("img");
		img.src = isUser ? "./img/user_default.webp" : `/card?name=${window.settings.settings.card}`;
		contentDiv.appendChild(img);

		let span = document.createElement("span");
		span.innerText = txt;
		contentDiv.appendChild(span);

		return msgDiv;
	}

	scrollDown() {
		let messagesContainer = document.getElementById("messages-container");
		messagesContainer.scrollTo({
			top: messagesContainer.scrollHeight,
			behaviour: "smooth"
		});
	}
}