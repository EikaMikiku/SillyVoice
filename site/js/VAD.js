class VAD {
	constructor(socket) {
		this.socket = socket;
		this.activated = false;

		this.audioContext = null;
		this.vadSession = null;
		this.mediaStream = null;
		this.sessionParamH = new Float32Array(2 * 1 * 64).fill(0);
		this.sessionParamC = new Float32Array(2 * 1 * 64).fill(0);
		this.workletNode = null;
		this.mediaSource = null;

		this.rw = new RIFFWAVE();

		//Chunks to keep before speech
		this.prevChunksToKeep = 4; //1 chunk = 2048 / 16000 = 0.128 of a second
		//Chunks to keep after speech
		this.nextChunksToKeep = 4;
		this.currentSilenceCounter = 0;
		this.savedDataChunks = [];
		this.speechDetected = false;
		this.speechThreshold = 0.75;

		this.vadStartEl = document.getElementById("vad-start");

		this.bindEvents();
	}

	bindEvents() {
		this.vadStartEl.addEventListener("click", () => {
			if(this.activated) {
				this.deactivate();
			} else {
				this.activate();
			}
		})
	}

	async activate() {
		if(this.audioContext) {
			await this.audioContext.resume();
			this.vadStartEl.innerText = "⏹";
			this.activated = true;
			this.vadStartEl.classList.add("activated");
		} else {
			try {
				await this.initSession();

				//Needs HTTPS on the phone...
				this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
				console.log("Created media stream", this.mediaStream);

				this.audioContext = new AudioContext({
					sampleRate: 16000 //Silero VAD supports 8k and 16k sample rate.
				});

				console.log("Created audio context", this.audioContext);

				await this.audioContext.audioWorklet.addModule("./js/vad-processor.js");
				this.workletNode = new AudioWorkletNode(this.audioContext, "vad-processor");
				console.log("Created audio worklet node", this.workletNode);

				this.workletNode.port.onmessage = async (event) => {
					if(event.data.type === "audioData") {
						await this.processAudioData(event.data.audioData);
					}
					if(event.data.type === "reset") {
						console.log("RESET?");
					}
				};
				this.workletNode.onprocessorerror = async (error) => {
					alert("Audio worker Error:\n" + error);
					console.error("Audio worker Error", error);
				};

				this.mediaSource = this.audioContext.createMediaStreamSource(this.mediaStream);
				this.mediaSource.connect(this.workletNode);

				this.vadStartEl.innerText = "⏹";
				this.activated = true;
				this.vadStartEl.classList.add("activated");
			} catch(e) {
				alert("Error accessing microphone:\n" + e);
				console.error("Error accessing microphone:", e);
				return;
			}
		}
	}

	async deactivate() {
		if(this.audioContext) {
			await this.audioContext.suspend();
		}
		this.vadStartEl.innerText = "🎤";
		this.vadStartEl.classList.remove("activated");
		this.activated = false;
	}

	async processAudioData(inputData) {
		let result = await this.vadSession.run({
			"input": new ort.Tensor("float32", inputData, [1, inputData.length]),
			"h": new ort.Tensor("float32", this.sessionParamH, [2, 1, 64]),
			"c": new ort.Tensor("float32", this.sessionParamC, [2, 1, 64]),
			"sr": new ort.Tensor("int64", BigInt64Array.from([BigInt(16000)]))
		});
		console.log("VAD", "SileroResult", (100 * result.output.data[0]).toFixed(2) + "%");

		if(result.output.data[0] > this.speechThreshold) {
			//Speech started or continues
			this.speechDetected = true;
			this.savedDataChunks.push(inputData);
			this.currentSilenceCounter = 0;
			window.messageManager.autoSendReset();
		} else {
			this.currentSilenceCounter++;
			if(this.currentSilenceCounter === this.nextChunksToKeep && this.savedDataChunks.length > this.prevChunksToKeep) {
				// Collection is over
				this.savedDataChunks.push(inputData);
				console.log("Collected", this.savedDataChunks);
				this.sendData();
				this.currentSilenceCounter = 0;
				this.savedDataChunks = [];
				this.speechDetected = false;
			} else {
				if(this.savedDataChunks.length > this.prevChunksToKeep) {
					//There are some chunks that are speech
					//Simply continue adding until we hit counter = next chunks
					this.savedDataChunks.push(inputData);
				} else {
					this.currentSilenceCounter = 0;
					this.savedDataChunks.push(inputData);
					if(this.savedDataChunks.length > this.prevChunksToKeep) {
						this.savedDataChunks.shift();
					}
				}
			}
		}

		this.sessionParamH = result.hn.cpuData; //Update running params
		this.sessionParamC = result.cn.cpuData;
	}

	sendData() {
		let pcmData = this.convertAudioDataToPCM16();
		this.rw.Make(pcmData);
		this.socket.emit("vad-result", this.rw.wav);
	}

	convertAudioDataToPCM16() {
		let pcmData = [];
		for(let chunk of this.savedDataChunks) {
			for(let sample of chunk) {
				let pcm = Math.max(-1, Math.min(1, sample));
				pcmData.push(pcm < 0 ? pcm * 0x8000 : pcm * 0x7FFF);
			}
		}
		return pcmData;
	}

	async initSession() {
		this.vadSession = await ort.InferenceSession.create("/models/silero_vad.onnx", {
			providers: ["CPUExecutionProvider"]
		});
		console.log("VAD session created");
	}
}