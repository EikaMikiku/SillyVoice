class Settings {
	constructor(socket) {
		this.socket = socket;
		this.settings;

		this.avatarImgEl = document.getElementById("avatar-img");
		this.autoSendToggleEl = document.getElementById("auto-send-toggle");
		this.autoSendDelayEl = document.getElementById("auto-send-delay");

		if(window.localStorage["localSettings"]) {
			this.localSettings = JSON.parse(window.localStorage["localSettings"]);
			this.loadLocalSettings();
		} else {
			this.localSettings = {
				autoSend: false,
				autoSendDelay: 0
			};
		}

		this.bindEvents();
	}

	bindEvents() {
		this.socket.on("settings", (settings) => {
			console.log("Settings", settings);
			this.settings = settings;
			this.avatarImgEl.style.setProperty("--background", `url("/card/?name=${settings.card}")`);
			window.messageManager.initChatLog(settings.currentChat);
		});

		this.autoSendToggleEl.addEventListener("change", (e) => {
			this.localSettings.autoSend = e.target.checked;
			this.updateLocalSettings();
		});

		this.autoSendDelayEl.addEventListener("change", (e) => {
			this.localSettings.autoSendDelay = parseInt(e.target.value);
			this.updateLocalSettings();
		});
	}

	updateLocalSettings() {
		window.localStorage["localSettings"] = JSON.stringify(this.localSettings);
	}

	loadLocalSettings() {
		this.autoSendToggleEl.checked = this.localSettings.autoSend;
		this.autoSendDelayEl.value = parseInt(this.localSettings.autoSendDelay);
	}
}