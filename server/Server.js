const http = require("http");
const express = require("express");
const SocketIO = require("socket.io");
const fs = require("fs");

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

		let server = http.Server(app);

		app.get('/card', (req, res) => {
			//For security purposes, going to be forcing the path to ./data/cards only
			let name = req.query.name.split(/[\/\\]/g).pop();
			res.sendFile(`${name}`, { root: "./data/cards" });
		});

		server.listen(this.config.port, () => log.info(`HTTP Server running: http://localhost:${this.config.port}/`));
		this.io = new SocketIO.Server(server);

		this.io.on("connection", (socket) => {
			socket.on("chat-input", (text) => {
				log.info("Server", "Received", text);
				this.llm.stream(text);
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
	}
}

module.exports = Server;