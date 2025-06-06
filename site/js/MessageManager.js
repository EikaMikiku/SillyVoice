class GrowingSentenceChunker {
	constructor(onSentenceComplete = null, minWords = 6) {
		this.buffer = "";
		this.onSentenceComplete = onSentenceComplete;
		this.minWords = minWords;
		this.sentences = [];
	}

	// Add new tokens to the sentence buffer
	addToken(token) {
		this.buffer += token;
		this.detectSentences();
		return this.sentences.length > 0 ? this.sentences.pop() : null;
	}

	// Detect complete sentences in the buffer that have at least this.minWords words
	detectSentences() {
		// Regular expression to match sentence endings
		// Matches periods, question marks, or exclamation marks followed by space or end of string
		const sentenceEndRegex = /[.!?](?:\s|$)/g;

		let match;
		let lastIndex = 0;

		// Find all sentence endings in the current buffer
		while ((match = sentenceEndRegex.exec(this.buffer)) !== null) {
			const sentenceEnd = match.index + 1; // Include the punctuation mark
			const potentialSentence = this.buffer.substring(0, sentenceEnd).trim();

			// Count words in the potential sentence
			const wordCount = potentialSentence.split(/\s+/).filter(word => word.length > 0).length;

			// Only process if we have at least this.minWords words
			if (wordCount >= this.minWords) {
				// Store the detected sentence
				this.sentences.unshift(potentialSentence);

				// If callback is provided, call it with the sentence
				if (this.onSentenceComplete) {
					this.onSentenceComplete(potentialSentence);
				}

				// Remove the processed sentence from the buffer
				this.buffer = this.buffer.substring(sentenceEnd).trim();

				// Reset regex search since we've modified the buffer
				sentenceEndRegex.lastIndex = 0;
			} else {
				// If the sentence is too short, continue searching from the next position
				continue;
			}
		}
	}

	// Force output of any remaining text in the buffer
	flush() {
		const remaining = this.buffer;
		this.buffer = "";
		return remaining;
	}
}

class MessageManager {
	constructor(socket) {
		this.socket = socket;

		this.chatInputEl = document.getElementById("chat-input");
		this.chatSendEl = document.getElementById("chat-send");
		this.msgContainerEl = document.getElementById("messages-container");
		this.autoSendProgress = document.getElementById("auto-send-progress");
		this.sentence = new GrowingSentenceChunker((txt) => {
			console.log("Sentence chunker", txt);
			this.socket.emit("tts-request", txt);
		});

		this.autoSendTimer;

		this.bindEvents();
	}

	bindEvents() {
		this.socket.on("llm-genend", (msg) => {
			if(!msg) {
				this.setAvailable();
				return;
			}

			this.clearMsgsWithBiggerIdx(msg.idx); //Remove existing msgs with that idx or later
			let messagesContainer = this.msgContainerEl;

			let tempMsg = messagesContainer.querySelector(".temp");
			if(tempMsg && !msg.isUser) {
				tempMsg.classList.remove("temp");
				let span = tempMsg.querySelector("span");
				span.innerHTML = this.processText(msg.raw);
				let roll = tempMsg.querySelector("roll");
				tempMsg.dataset.idx = msg.idx;

				let lastSentenceBuffer = this.sentence.flush();
				if(lastSentenceBuffer.trim().length > 0) {
					this.socket.emit("tts-request", lastSentenceBuffer);
				}
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

			this.sentence.addToken(token);

			this.scrollChatDown();
		});

		this.chatSendEl.addEventListener("click", (e) => {
			this.setWaiting();
			this.socket.emit("chat-input", this.chatInputEl.value);
			this.chatInputEl.value = "";
			setTimeout(() => {
				this.updateAutoSendProgress(-1);
			});
		});

		this.chatInputEl.addEventListener("keydown", (e) => {
			if(e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				this.chatSendEl.click();
			} else if(e.key === "ArrowUp") {
				//get last user msg and edit it
				let newLineAt = this.chatInputEl.value.indexOf("\n");
				if(newLineAt === -1 || (this.chatInputEl.selectionStart <= newLineAt)) {
					let pens = document.querySelectorAll(".message.user pen");
					pens[pens.length - 1].click();
				}
			} else if(e.key === "ArrowRight") {
				if(this.chatInputEl.value === "" && !this.chatSendEl.disabled) {
					//get last message and reroll it
					let rolls = this.msgContainerEl.querySelectorAll(".message roll");
					rolls[rolls.length - 1].click();
				}
			}
		});

		this.socket.on("stt-result", (txt) => {
			this.appendVoiceText(txt);
			this.autoSendInit();
		});
	}

	autoSendInit() {
		//Auto send delay timer logic
		if(window.settings.localSettings.autoSend) {
			clearTimeout(this.autoSendTimer);
			this.updateAutoSendProgress(-1);
			let delay = window.settings.localSettings.autoSendDelay;
			this.autoSendTimer = setTimeout(() => {
				this.onAutoSendComplete();
			}, delay * 1000);
			setTimeout(() => {
				//Next tick force, so we can terminate transition first and restart it here
				this.updateAutoSendProgress(delay);
			});
		}
	}

	autoSendReset() {
		clearTimeout(this.autoSendTimer); //To not run autoSendComplete
		this.autoSendInit();
	}

	onAutoSendComplete() {
		this.updateAutoSendProgress(-1);
		if(window.settings.localSettings.autoSend && window.VAD.activated && this.chatInputEl.value.length > 0) {
			//VAD has to be active for auto-send to work.
			this.chatSendEl.click();
		}
	}

	updateAutoSendProgress(delay) {
		if(delay === -1) {
			this.autoSendProgress.style.setProperty("--duration", "0s");
			this.autoSendProgress.style.width = "0%";
			this.autoSendProgress.style.height = "0%";
			this.autoSendProgress.classList.remove("auto-send-transition");
		} else {
			this.autoSendProgress.classList.add("auto-send-transition");
			this.autoSendProgress.style.setProperty("--duration", delay+"s");
			this.autoSendProgress.style.width = "100%";
			this.autoSendProgress.style.height = "100%";
		}
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
		span.innerHTML = this.processText(txt);
		span.original = span.innerHTML;

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
		txt = txt.replace(/"([^"]*)"/g, "<q>$1</q>"); //process quotes
		txt = txt.replace(/\*([^*]*)\*/g, "<em>$1</em>"); //process asterisks
		txt = txt.replace(/\n/g, "<br>"); //process new lines
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