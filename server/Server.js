const http = require("http");
const https = require("https");
const express = require("express");
const SocketIO = require("socket.io");
const fs = require("fs");
const path = require("path");

class Server {
	constructor(config, tts, stt, llm) {
		this.config = config;
		this.tts = tts;
		this.stt = stt;
		this.llm = llm;
		this.io = null;
	}

	start() {
		let app = express();

		app.use(express.json());

		if(this.config.basic_auth.enabled) {
			app.use((req, res, cb) => this.basicAuthHandler(req, res, cb));
		}

		app.use(express.static("./site/", {extensions:["html"]}));
		app.get("/card", (req, res) => {
			//For security purposes, going to be forcing the path to ./data/cards only
			let name = req.query.name.split(/[\/\\]/g).pop();
			res.sendFile(`${name}`, { root: "./data/cards" });
		});

		let server;
		if(this.config.https.enabled) {
			let creds = {};
			try {
				creds.key = fs.readFileSync(this.config.https.certs.key, "utf8");
				creds.cert = fs.readFileSync(this.config.https.certs.cert, "utf8");
				creds.ca = fs.readFileSync(this.config.https.certs.ca, "utf8");
			} catch {
				//Trying to deal with symlinks...
				let keyPath = fs.readlinkSync(this.config.https.certs.key);
				let certPath = fs.readlinkSync(this.config.https.certs.cert);
				let caPath = fs.readlinkSync(this.config.https.certs.ca);
				creds.key = fs.readFileSync(path.resolve(this.config.https.certs.key, "..", keyPath), "utf8");
				creds.cert = fs.readFileSync(path.resolve(this.config.https.certs.cert, "..", certPath), "utf8");
				creds.ca = fs.readFileSync(path.resolve(this.config.https.certs.ca, "..", caPath), "utf8");
			}
			server = https.Server(creds, app);
			server.listen(this.config.port, () => log.info(`HTTPS Server running: https://localhost:${this.config.port}/`));
		} else {
			server = http.Server(app);
			server.listen(this.config.port, () => log.info(`HTTP Server running: http://localhost:${this.config.port}/`));
		}

		this.io = new SocketIO.Server(server);

		this.io.on("connection", (socket) => {
			socket.on("chat-input", (text) => {
				log.info("Server", "Received", text);

				let ok = this.config.activation_words.length > 0 ? false : true;
				for(let word of this.config.activation_words) {
					if(text.toLowerCase().startsWith(word.toLowerCase())) {
						ok = true;

						if(this.config.remove_activation_word) {
							text = text.substring(word.length).trim();
							text = text[0].toUpperCase() + text.substring(1);
						}

						break;
					}
				}

				if(ok) {
					this.llm.stream(text);
				} else {
					this.io.emit("llm-genend");
				}
			});

			socket.on("reroll", (idx) => {
				this.llm.reroll(idx);
			});

			socket.on("edit-msg", (idx, newTxt) => {
				this.llm.edit(idx, newTxt);
			});

			socket.on("vad-result", (wavBuffer) => {
				let location = `${this.config.audio_log_location}${this.config.autio_log_filename()}`;
				fs.writeFileSync(location, Int8Array.from(wavBuffer));
				this.stt.transcribe(location);
			});

			socket.emit("settings", {
				cardMetadata: this.llm.card.metadata,
				card: this.llm.config.card,
				currentChat: this.llm.currentChat.messages
			});
		});

		this.llm.on("llm_token", (txt) => {
			this.io.emit("llm-token", txt);
		});

		this.llm.on("llm_genend_web", (msg) => {
			this.io.emit("llm-genend", msg);
		});

		this.stt.on("stt_result", (txt) => {
			log.info("STT", "Result", txt);
			this.io.emit("stt-result", txt);
		});

		this.llm.on("llm_sentence", (sentence) => {
			this.tts.addToQueue(sentence);
		});

		this.tts.on("tts_result", (filepath) => {
			let wavContent = fs.readFileSync(filepath);
			this.io.emit("tts-result", wavContent);
		});
	}

	unauthorisedResponse(res) {
		res.set("WWW-Authenticate", "Basic realm=\"SillyVoice\", charset=\"UTF-8\"");
		return res.status(401).send("Authentication required");
	}

	basicAuthHandler(req, res, cb) {
		let authHeader = req.headers.authorization;

		if (!authHeader) {
			return this.unauthorisedResponse(res);
		}

		let [scheme, credentials] = authHeader.split(" ");

		if (scheme !== "Basic" || !credentials) {
			return this.unauthorisedResponse(res);
		}

		let [username, password] = Buffer.from(credentials, "base64").toString("utf8").split(":");

		if (username === this.config.basic_auth.username && password === this.config.basic_auth.password) {
			return cb();
		} else {
			return this.unauthorisedResponse(res);
		}
	}
}

module.exports = Server;