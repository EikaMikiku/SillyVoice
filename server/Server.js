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

		server.listen(this.config.port, () => log.info(`HTTP Server running: http://localhost:${this.config.port}/`));
		this.io = new SocketIO.Server(server);

		this.io.on("connection", (socket) => {
			socket.on("chat-input", (text) => {
				log.info("Server", "Received", text);
			});

			socket.emit("settings", {
				cardImg: fs.readFileSync(this.llm.config.card, {encoding: "base64"})
			});
		});
	}
}

module.exports = Server;