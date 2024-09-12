class Settings {
	constructor(socket) {
		this.socket = socket;
		this.charImg;

		this.bindEvents();
	}

	bindEvents() {
		this.socket.on("settings", (settings) => {
			console.log("Settings", settings);
			this.charImg = `data:image/png;base64,${settings.cardImg}`;
			document.getElementById("avatar-img").style.setProperty("--background", `url(${this.charImg})`);
		});
	}

}