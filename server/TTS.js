const { spawn, spawnSync } = require("child_process");
const { EdgeTTS } = require("node-edge-tts");
const Eventful = require("./helpers/Eventful.js");

class TTS extends Eventful {
	constructor(config) {
		super();
		this.config = config;
		this.etts = new EdgeTTS(this.config.edge_tts);
		this.generating = false;
		this.queue = [];
	}

	addToQueue(txt) {
		if(this.config.remove_asterisks) {
			txt = txt.replaceAll(/(\*.+?\*)/g, "");
		}
		if(this.config.remove_emojis) {
			txt = this.#removeEmojis(txt);
		}

		txt = txt.trim();
		if(txt.length === 0) {
			return;
		}

		this.queue.push(txt);
		if(!this.generating) {
			this.process();
		}
	}

	async process() {
		let txt = this.queue.shift();
		if(txt) {
			this.generating = true;
			let location = `${this.config.audio_log_location}${this.config.autio_log_filename()}`;
			await this.etts.ttsPromise(txt, location);
			this.notifyEvent("tts_result", location);
			this.generating = false;
			log.info("TTS", "Generation END", location);
			this.process(); //try next queue item
		}
	}

	#removeEmojis(str) {
		return str.replace(/[\p{Emoji_Presentation}\p{Emoji}\p{Emoji_Modifier_Base}\p{Emoji_Modifier}\p{Emoji_Component}]/gu, "");
	}
}

module.exports = TTS;