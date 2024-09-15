class AudioManager {
	constructor(socket) {
		this.socket = socket;
		this.audioCtx;
		this.analyser;
		this.currentAudioBuffer;

		this.queue = [];
		this.playing = false;

		this.bindEvents();
	}

	bindEvents() {
		this.socket.on("tts-result", (buffer) => {
			console.log(buffer);
			let blob = new Blob([buffer], { type: "audio/wav" });
			this.addToQueue(URL.createObjectURL(blob));
		});
	}

	addToQueue(audioURL) {
		this.queue.push(audioURL);
		if(!this.playing) {
			this.startQueue();
		}
	}

	startQueue() {
		let item = this.queue.shift();
		if(item) {
			this.play(item);
		}
	}

	play(audioURL) {
		this.audioCtx = this.audioCtx || new AudioContext();
		this.analyser = this.analyser || this.audioCtx.createAnalyser();
		this.analyser.smoothingTimeConstant = 0.8;
		this.analyser.fftSize = 256;
		this.currentAudioBuffer = new Uint8Array(this.analyser.frequencyBinCount);

		let audio = new Audio(audioURL);
		audio.crossOrigin = "anonymous";
		let input = this.audioCtx.createMediaElementSource(audio);
		input.connect(this.analyser);
		this.analyser.connect(this.audioCtx.destination);
		audio.addEventListener("ended", () => {
			this.playing = false;
			URL.revokeObjectURL(audioURL);
			this.startQueue();
		});
		audio.play();
		this.playing = true;
		this.charBorderUpdate();
	}

	charBorderUpdate() {
		requestAnimationFrame(() => this.charBorderUpdate());

		this.analyser.getByteFrequencyData(this.currentAudioBuffer);
		let avg = this.currentAudioBuffer.reduce((a, v) => a + v) / this.currentAudioBuffer.length;
		let normal = avg / 255;

		document.documentElement.style.setProperty("--audio-scale", (normal - 0.1) * 1.2);
	}
}