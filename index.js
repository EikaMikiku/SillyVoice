const config = require("./config.js");
const Server = require("./server/Server.js");

new (require("./server/helpers/Logger.js"))(config); //Logger should be first.
let server = new Server(config.Server);
server.start();