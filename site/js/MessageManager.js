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
}