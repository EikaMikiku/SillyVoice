const { spawn, spawnSync } = require("child_process");
const { EdgeTTS } = require("node-edge-tts");

class TTS {
	constructor(config) {
		this.config = config;
		this.etts = new EdgeTTS(this.config.edge_tts);
		this.audioPlayer = new AudioPlayer(this.config);
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
			this.speak();
		}
	}

	async speak() {
		let txt = this.queue.shift();
		if(txt) {
			this.generating = true;
			let location = `${this.config.output_location}${this.config.output_filename()}`;
			await this.etts.ttsPromise(txt, location);
			this.generating = false;
			log.debug("TTS", "Generation END", txt);
			this.audioPlayer.addToQueue(location);
			this.speak(); //try next queue item
		}
	}

	#removeEmojis(str) {
		return str.replace(/[\p{Emoji_Presentation}\p{Emoji}\p{Emoji_Modifier_Base}\p{Emoji_Modifier}\p{Emoji_Component}]/gu, '');
	}
}

class AudioPlayer {
	constructor(config) {
		this.config = config
		this.queue = [];
		this.playing = false;
	}

	addToQueue(audioPath) {
		this.queue.push(audioPath);
		if(!this.playing) {
			this.startQueue();
		}
	}

	startQueue() {
		let item = this.queue.shift();
		if(item) {
			this.playItem(item);
		}
	}

	playItem(item) {
		let ffprobeResult = spawnSync("ffprobe", [
			"-show_entries", "format=duration",
			"-hide_banner",
			"-loglevel", "error",
			"-i",
			item
		]);

		let durStr = ffprobeResult.stdout.toString("utf-8");
		log.trace("TTS", "ffprobe result", durStr);
		let duration = parseFloat(durStr.split("\n")[1].trim().split("=")[1]);

		this.playing = true;
		let ffplay = spawn("ffplay", [
			...this.config.ffplayArgs,
			"-ss",
			this.config.ffplay_time_start_offset,
			"-t",
			duration + this.config.ffplay_time_end_offset,
			item
		]);
		ffplay.on("exit", async () => {
			this.playing = false;
			this.startQueue();
		});
	}

}

module.exports = TTS;