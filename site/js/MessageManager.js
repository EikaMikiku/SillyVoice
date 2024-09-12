class MessageManager {
	constructor(socket) {
		this.socket = socket;

		this.bindEvents();
	}

	bindEvents() {
		this.socket.on("llm-genend", (msg) => {
			let messagesContainer = document.getElementById("messages-container");

			let tempMsg = messagesContainer.querySelector(".temp");
			if(tempMsg && !msg.isUser) {
				tempMsg.classList.remove("temp");
				let span = tempMsg.querySelector("span");
				span.innerHTML = marked.parse(this.processText(msg.raw));
			} else {
				let elem = this.createMessageElement(msg.raw, msg.isUser);
				messagesContainer.appendChild(elem);
			}

			if(!msg.isUser) {
				let sendButton = document.getElementById("chat-send");
				sendButton.disabled = false;
			}

			this.scrollDown();
		});

		this.socket.on("llm-token", (token) => {
			let messagesContainer = document.getElementById("messages-container");
			let tempMsg = messagesContainer.querySelector(".temp");

			if(!tempMsg) {
				tempMsg = this.createMessageElement(token, false);
				tempMsg.classList.add("temp");
				messagesContainer.appendChild(tempMsg);
			} else {
				let span = tempMsg.querySelector("span");
				span.innerHTML = this.processText(span.innerHTML + token);
			}

			this.scrollDown();
		});

		document.getElementById("chat-send").addEventListener("click", (e) => {
			e.target.disabled = true;
			let chatInputEl = document.getElementById("chat-input");
			this.socket.emit("chat-input", chatInputEl.value);
			chatInputEl.value = "";
		});

		document.getElementById("chat-input").addEventListener("keydown", (e) => {
			if(e.key === "Enter") {
				e.preventDefault();
				document.getElementById("chat-send").click();
			}
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

		if(!isUser) {
			let img = document.createElement("img");
			img.src = `/card?name=${window.settings.settings.card}`;
			contentDiv.appendChild(img);
		}

		let span = document.createElement("span");
		span.innerHTML = marked.parse(this.processText(txt)) || "&nbsp;";
		contentDiv.appendChild(span);

		return msgDiv;
	}

	processText(txt) {
		return txt.replace(/"([^"]*)"/g, '<q>$1</q>'); //process quotes
	}

	scrollDown() {
		let messagesContainer = document.getElementById("messages-container");
		messagesContainer.scrollTo({
			top: messagesContainer.scrollHeight,
			behaviour: "smooth"
		});
	}
}