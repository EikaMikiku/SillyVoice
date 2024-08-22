const http = require("http");
const express = require("express");
const SocketIO = require("socket.io");

class Server {
	constructor(config) {
		this.config = config;
		this.currentSocket = null;
	}

	start() {
		let app = express();

		app.use(express.json());
		app.use(express.static("./site/", {extensions:["html"]}));

		let server = http.Server(app);

		server.listen(this.config.port, () => this.onListen());
		let io = new SocketIO.Server(server);

		io.on("connection", (socket) => {
			this.currentSocket = socket;
		});
	}

	onListen() {
		log.info(`HTTP Server running: http://localhost:${this.config.port}/`);
	}
}

module.exports = Server;