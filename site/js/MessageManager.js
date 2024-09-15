class MessageManager {
	constructor(socket) {
		this.socket = socket;

		this.bindEvents();
	}

	bindEvents() {
		this.socket.on("llm-genend", (msg) => {
			this.clearMsgsWithBiggerIdx(msg.idx); //Remove existing msgs with that idx or later
			let messagesContainer = document.getElementById("messages-container");

			let tempMsg = messagesContainer.querySelector(".temp");
			if(tempMsg && !msg.isUser) {
				tempMsg.classList.remove("temp");
				let span = tempMsg.querySelector("span");
				span.innerHTML = this.processText(msg.raw);
				let roll = tempMsg.querySelector("roll");
				tempMsg.dataset.idx = msg.idx;
			} else {
				let msgEl = this.createMessageElement(msg.idx, msg.raw, msg.isUser);
				messagesContainer.appendChild(msgEl);
			}

			if(!msg.isUser) {
				this.setAvailable();
			}

			this.scrollDown();
		});

		this.socket.on("llm-token", (token) => {
			let messagesContainer = document.getElementById("messages-container");
			let tempMsg = messagesContainer.querySelector(".temp");

			if(!tempMsg) {
				tempMsg = this.createMessageElement(-1, token, false);
				tempMsg.classList.add("temp");
				messagesContainer.appendChild(tempMsg);
			} else {
				let span = tempMsg.querySelector("span");
				span.original += token;
				span.innerHTML = this.processText(span.original);
			}

			this.scrollDown();
		});

		document.getElementById("chat-send").addEventListener("click", (e) => {
			this.setWaiting();
			let chatInputEl = document.getElementById("chat-input");
			this.socket.emit("chat-input", chatInputEl.value);
			chatInputEl.value = "";
		});

		document.getElementById("chat-input").addEventListener("keydown", (e) => {
			if(e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				document.getElementById("chat-send").click();
			} else if(e.key === "ArrowUp") {
				//get last user msg and edit it
				let pens = document.querySelectorAll(".message.user pen");
				pens[pens.length - 1].click();
			}
		});

		this.socket.on("stt-result", (txt) => {
			let currentText = document.getElementById("chat-input").value;
			if(currentText.length > 0) {
				if(currentText.endsWith(".")) {
					currentText += "\n";
				} else {
					currentText += ".\n";
				}
			}
			document.getElementById("chat-input").value = currentText + txt;
			document.getElementById("chat-input").scrollTop = document.getElementById("chat-input").scrollHeight
		});
	}

	initChatLog(messages) {
		let messagesContainer = document.getElementById("messages-container");
		while(messagesContainer.firstElementChild) {
			messagesContainer.removeChild(messagesContainer.firstElementChild);
		}

		for(let msg of messages) {
			let msgEl = this.createMessageElement(msg.idx, msg.raw, msg.isUser);
			messagesContainer.appendChild(msgEl);
		}

		this.scrollDown();
	}

	createMessageElement(idx, txt, isUser) {
		let msgDiv = document.createElement("div");
		msgDiv.className = "message" + (isUser ? " user" : "");
		msgDiv.dataset.idx = idx;

		let contentDiv = document.createElement("div");
		contentDiv.className = "message-content";
		msgDiv.appendChild(contentDiv);

		let span = document.createElement("span");
		span.original = txt;
		span.innerHTML = this.processText(txt);

		if(!isUser) {
			let img = document.createElement("img");
			img.src = `/card?name=${window.settings.settings.card}`;
			contentDiv.appendChild(img);

			if(idx !== 0) {
				let roll = document.createElement("roll");
				roll.innerText = "🔄";
				if(idx === -1) {
					roll.setAttribute("disabled", ""); //Disabled for temp msg
				}
				roll.onclick = () => {
					this.rollClick(msgDiv.dataset.idx);
				};
				contentDiv.appendChild(roll);
			}
		} else {
			let pen = document.createElement("pen");
			pen.innerText = "🖊";
			pen.onclick = () => {
				span.setAttribute("contenteditable", "");
				let s = window.getSelection();
				let r = document.createRange();
				r.setStart(span, 0);
				r.setEnd(span, 0);
				s.removeAllRanges();
				s.addRange(r);
				span.onkeydown = (e) => {
					if(span.hasAttribute("contenteditable")) {
						if(e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							this.socket.emit("edit-msg", idx, span.innerText);
							span.removeAttribute("contenteditable");
							document.getElementById("chat-input").focus();
						} else if(e.key === "Escape") {
							span.innerHTML = span.original;
							span.removeAttribute("contenteditable");
							document.getElementById("chat-input").focus();
						}
					}
				};
			};
			contentDiv.appendChild(pen);
		}

		contentDiv.appendChild(span);

		return msgDiv;
	}

	processText(txt) {
		if(!txt) {
			return "&nbsp;";
		}
		txt = txt.replace(/"([^"]*)"/g, '<q>$1</q>'); //process quotes
		txt = txt.replace(/\*([^*]*)\*/g, '<em>$1</em>'); //process asterisks
		txt = txt.replace(/\n/g, '<br>'); //process new lines
		return txt;
	}

	scrollDown() {
		let messagesContainer = document.getElementById("messages-container");
		messagesContainer.scrollTo({
			top: messagesContainer.scrollHeight,
			behaviour: "smooth"
		});
	}

	setWaiting() {
		document.getElementById("chat-send").disabled = true;
		let rollBtns = document.querySelectorAll(".message-content roll");
		for(let btn of rollBtns) {
			btn.setAttribute("disabled", "");
		}
	}

	setAvailable() {
		document.getElementById("chat-send").disabled = false;
		let rollBtns = document.querySelectorAll(".message-content roll");
		for(let btn of rollBtns) {
			btn.removeAttribute("disabled");
		}
	}

	rollClick(idx) {
		this.socket.emit("reroll", idx);
		this.clearMsgsWithBiggerIdx(idx);
		this.setWaiting();
	}

	clearMsgsWithBiggerIdx(idx) {
		let msgs = document.querySelectorAll("#messages-container > .message");
		for(let msg of msgs) {
			if(parseInt(msg.dataset.idx) > idx - 1) {
				msg.parentElement.removeChild(msg);
			}
		}
	}
}