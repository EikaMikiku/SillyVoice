class MessageManager {
	constructor(socket) {
		this.socket = socket;

		this.chatInputEl = document.getElementById("chat-input");
		this.chatSendEl = document.getElementById("chat-send");
		this.msgContainerEl = document.getElementById("messages-container");

		this.autoSendTimer;

		this.bindEvents();
	}

	bindEvents() {
		this.socket.on("llm-genend", (msg) => {
			this.clearMsgsWithBiggerIdx(msg.idx); //Remove existing msgs with that idx or later
			let messagesContainer = this.msgContainerEl;

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
			} else {
				//We just sent our response and got a reply
				this.chatInputEl.value = "";
			}

			this.scrollChatDown();
		});

		this.socket.on("llm-token", (token) => {
			let messagesContainer = this.msgContainerEl;
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

			this.scrollChatDown();
		});

		this.chatSendEl.addEventListener("click", (e) => {
			this.setWaiting();
			this.socket.emit("chat-input", this.chatInputEl.value);
			this.chatInputEl.value = "";
		});

		this.chatInputEl.addEventListener("keydown", (e) => {
			if(e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				this.chatSendEl.click();
			} else if(e.key === "ArrowUp") {
				//get last user msg and edit it
				let pens = document.querySelectorAll(".message.user pen");
				pens[pens.length - 1].click();
			}
		});

		this.socket.on("stt-result", (txt) => {
			this.appendVoiceText(txt);

			//Auto send delay timer logic
			if(window.settings.localSettings.autoSend) {
				clearTimeout(this.autoSendTimer);
				let delay = window.settings.localSettings.autoSendDelay;
				this.autoSendTimer = setTimeout(() => {
					if(window.VAD.activated && this.chatInputEl.value.length > 0) {
						//VAD has to be active for auto-send to work.
						this.chatSendEl.click();
					}
				}, delay * 1000);
			}
		});
	}

	initChatLog(messages) {
		let messagesContainer = this.msgContainerEl;
		while(messagesContainer.firstElementChild) {
			messagesContainer.removeChild(messagesContainer.firstElementChild);
		}

		for(let msg of messages) {
			let msgEl = this.createMessageElement(msg.idx, msg.raw, msg.isUser);
			messagesContainer.appendChild(msgEl);
		}

		this.scrollChatDown();
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
							this.chatInputEl.focus();
						} else if(e.key === "Escape") {
							span.innerHTML = span.original;
							span.removeAttribute("contenteditable");
							this.chatInputEl.focus();
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

	scrollChatDown() {
		let messagesContainer = this.msgContainerEl;
		messagesContainer.scrollTo({
			top: messagesContainer.scrollHeight,
			behaviour: "smooth"
		});
	}

	setWaiting() {
		this.chatSendEl.disabled = true;
		let rollBtns = document.querySelectorAll(".message-content roll");
		for(let btn of rollBtns) {
			btn.setAttribute("disabled", "");
		}
	}

	setAvailable() {
		this.chatSendEl.disabled = false;
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

	appendVoiceText(txt) {
		let currentText = this.chatInputEl.value.trim();
		if(currentText.length > 0) {
			if(currentText.match(/[\w\d]$/)) { //Ends with a letter or a digit
				currentText += ".\n";
			} else {
				currentText += "\n";
			}
		}
		this.chatInputEl.value = currentText + txt.charAt(0).toUpperCase() + txt.substring(1);
		this.chatInputEl.scrollTop = this.chatInputEl.scrollHeight;
	}
}