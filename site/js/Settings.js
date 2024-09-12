class Settings {
	constructor(socket) {
		this.socket = socket;
		this.settings;

		this.bindEvents();
	}

	bindEvents() {
		this.socket.on("settings", (settings) => {
			console.log("Settings", settings);
			this.settings = settings;
			document.getElementById("avatar-img").style.setProperty("--background", `url("/card/?name=${settings.card}")`);
			window.messageManager.initChatLog(settings.currentChat);
		});
	}

}