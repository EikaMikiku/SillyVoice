class AudioManager {
	constructor(socket) {
		this.socket = socket;
		this.audioCtx;
		this.analyser;
		this.currentAudioBuffer;
	}

	speak(path) {
		this.audioCtx = this.audioCtx || new AudioContext();
		this.analyser = this.analyser || this.audioCtx.createAnalyser();
		this.analyser.smoothingTimeConstant = 0.8;
		this.analyser.fftSize = 256;
		this.currentAudioBuffer = new Uint8Array(this.analyser.frequencyBinCount);

		let audio = document.createElement("audio");
		audio.src = path;
		audio.crossOrigin = "anonymous";
		let input = this.audioCtx.createMediaElementSource(audio);
		input.connect(this.analyser);
		this.analyser.connect(this.audioCtx.destination);
		audio.play();
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