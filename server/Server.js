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
		app.use(express.static("./site/", {extensions:["html"]}));
		app.get('/card', (req, res) => {
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
				this.llm.stream(text);
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
	}
}

module.exports = Server;