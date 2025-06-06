const { spawn, spawnSync } = require("child_process");
const { EdgeTTS } = require("node-edge-tts");
const KokoroTTS = require("kokoro-js").KokoroTTS;
const Eventful = require("./helpers/Eventful.js");

class TTS extends Eventful {
	constructor(config) {
		super();
		this.config = config;

		if(this.config.tts_type === "edge") {
			this.etts = new EdgeTTS(this.config.edge_tts);
			this.ttsProcessFunction = this.processEdgeTTS;
		} else if(this.config.tts_type === "orpheus") {
			this.ttsProcessFunction = this.processOrpheusTTS;
		} else if(this.config.tts_type === "kokoro") {
			this.ttsProcessFunction = this.processKokoroTTS;
			this.ktts = null;
		}

		this.generating = false;
		this.queue = [];

		setInterval(() => {
			//Check queue
			if(!this.generating) {
				this.ttsProcessFunction();
			}
		}, 100);
	}

	addToQueue(txt) {
		if(this.config.remove_asterisks) {
			txt = txt.replaceAll(/(\*.+?\*)/g, "");
		}
		if(this.config.remove_emojis) {
			txt = this.#removeEmojis(txt);
		}
		if(this.config.remove_stutter) {
			txt = this.#removeStutter(txt);
		}
		if(this.config.pronunciation_replacements) {
			for(let replacement in this.config.pronunciation_replacements) {
				let newString = this.config.pronunciation_replacements[replacement];
				txt = txt.replaceAll(replacement, newString);
			}
		}

		txt = txt.replaceAll("\n", " "); //Remove new lines.
		txt = txt.replaceAll(/\s+/g, " ");//Remove multiple spaces.
		txt = txt.trim();

		if(txt.length === 0) {
			return;
		}

		this.queue.push(txt);
	}

	async processKokoroTTS() {
		let txt = this.queue.shift();
		if(txt) {
			if(!this.ktts) {
				this.ktts = await KokoroTTS.from_pretrained(this.config.kokoro_tts.model_id, {
					dtype: this.config.kokoro_tts.quant,
					device: "cpu"
				});
			}

			log.info("KTTS", "Generation START", txt);
			this.generating = true;
			const audio = await this.ktts.generate(txt, {
				voice: this.config.kokoro_tts.voice,
			});
			let location = `${this.config.audio_log_location}${this.config.autio_log_filename()}`;
			await audio.save(location);
			this.notifyEvent("tts_result", location);
			this.generating = false;
			log.info("KTTS", "Generation END", location);
		}
	}

	async processEdgeTTS() {
		let txt = this.queue.shift();
		if(txt) {
			log.info("ETTS", "Generation START", txt);
			this.generating = true;
			let location = `${this.config.audio_log_location}${this.config.autio_log_filename()}`;
			await this.etts.ttsPromise(txt, location);
			this.notifyEvent("tts_result", location);
			this.generating = false;
			log.info("ETTS", "Generation END", location);
		}
	}

	async processOrpheusTTS() {
		let txt = this.queue.shift();
		if(txt) {
			log.info("OTTS", "Generation START", txt);
			this.generating = true;
			let location = `${this.config.audio_log_location}${this.config.autio_log_filename()}`;
			let orpheus = spawn("python.exe", [
				...this.config.orpheus_tts.args,
				"--output",
				location,
				"--text",
				txt
			]);
			orpheus.on("exit", () => {
				this.notifyEvent("tts_result", location);
				this.generating = false;
				log.info("OTTS", "Generation END", location);
			});
		}
	}

	#removeEmojis(str) {
		return str.replace(/(?!\d)[\p{Emoji_Presentation}\p{Emoji}\p{Emoji_Modifier_Base}\p{Emoji_Modifier}\p{Emoji_Component}]/gu, "");
	}

	#removeStutter(str) {
		//This regex matches repeated characters separated by hyphens
		//For example: "H-h", "W-w", etc.
		return str.replace(/([a-zA-Z])-\1/gi, (match, p1) => {
			// Return just the first character (and preserve its case)
			return p1;
		});
	}
}

module.exports = TTS;