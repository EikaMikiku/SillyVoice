class Settings {
	constructor(socket) {
		this.socket = socket;
		this.settings;

		this.avatarImgEl = document.getElementById("avatar-img");
		this.autoSendToggleEl = document.getElementById("auto-send-toggle");
		this.autoSendDelayEl = document.getElementById("auto-send-delay");
		this.volumeEl = document.getElementById("volume");

		this.defaultSettings = {
			autoSend: false,
			autoSendDelay: 0,
			volume: 80
		}

		if(window.localStorage["localSettings"]) {
			this.localSettings = JSON.parse(window.localStorage["localSettings"]);
			this.localSettings.autoSend = this.localSettings.autoSend || this.defaultSettings.autoSend;
			this.localSettings.autoSendDelay = this.localSettings.autoSendDelay || this.defaultSettings.autoSendDelay;
			this.localSettings.volume = this.localSettings.volume || this.defaultSettings.volume;
			this.loadLocalSettings();
		} else {
			this.localSettings = this.defaultSettings;
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

		this.volumeEl.addEventListener("change", (e) => {
			this.localSettings.volume = parseInt(e.target.value);
			this.updateLocalSettings();
		});
	}

	updateLocalSettings() {
		window.localStorage["localSettings"] = JSON.stringify(this.localSettings);
	}

	loadLocalSettings() {
		this.autoSendToggleEl.checked = this.localSettings.autoSend || false;
		this.autoSendDelayEl.value = parseInt(this.localSettings.autoSendDelay) || 0;
		this.volumeEl.value = parseInt(this.localSettings.volume) || 80;
	}
}