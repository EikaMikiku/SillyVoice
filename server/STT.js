const { spawn } = require("child_process");
const Eventful = require("./helpers/Eventful.js");

class STT extends Eventful {
	outputHandlers = [];

	constructor(config) {
		super();
		this.config = config;
	}

	transcribe(filePath) {
		log.trace("STT", "Transcription START");
		let whisper = spawn(this.config.whisper_location, [...this.config.whisper_args, filePath]);
		whisper.stdout.on("data", (data) => this.processWhisperOutput(data.toString()));
	}

	processWhisperOutput(data) {
		let txt = data.trim();
		if(txt.length === 0) {
			return;
		}
		if(this.config.remove_solo_annotations) {
			//Remove solo (muffled noises) or [BLANK AUDIO] tags coming up
			let newTxt = txt.replaceAll(/[\[\(].+?[\]\)]/g, "");
			if(newTxt.length === 0) {
				log.info("STT", "Transcription Discarded", txt);
				return;
			}
		}

		this.notifyEvent("stt_result", txt);
	}
}

module.exports = STT;