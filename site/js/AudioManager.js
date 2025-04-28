class AudioManager {
	constructor(socket) {
		this.socket = socket;
		this.audioCtx;
		this.analyser;
		this.currentAudioBuffer;

		this.pannerNode;
		this.pannerNodeValues = [-1, -0.75, -0.5, -0.25, 0, 0.25, 0.5, 0.75, 1];

		this.queue = [];
		this.playing = false;

		this.bindEvents();
	}

	bindEvents() {
		this.socket.on("tts-result", (buffer) => {
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
		this.pannerNode = this.pannerNode || this.audioCtx.createStereoPanner();
		this.analyser.smoothingTimeConstant = 0.8;
		this.analyser.fftSize = 256;
		this.currentAudioBuffer = new Uint8Array(this.analyser.frequencyBinCount);

		if(window.settings.localSettings.voicePan) {
			let idx = Math.floor(Math.random() * this.pannerNodeValues.length);
			this.pannerNode.pan.value = this.pannerNodeValues[idx];
		} else {
			this.pannerNode.pan.value = 0;
		}

		let audio = new Audio(audioURL);
		audio.crossOrigin = "anonymous";
		let input = this.audioCtx.createMediaElementSource(audio);
		input.connect(this.analyser);
		this.analyser.connect(this.pannerNode);
		this.pannerNode.connect(this.audioCtx.destination);

		audio.addEventListener("ended", () => {
			this.playing = false;
			URL.revokeObjectURL(audioURL);
			this.startQueue();
		});

		audio.volume = (window.settings.localSettings.volume || 100) / 100;
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