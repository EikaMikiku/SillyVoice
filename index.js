const config = require("./config.js");

new (require("./server/helpers/Logger.js"))(config); //Logger should be first.
const Server = require("./server/Server.js");
const STT = require("./server/STT.js");
const TTS = require("./server/TTS.js");
const LLM = require("./server/LLM.js");

let tts = new TTS(config.TTS);
let stt = new STT(config.STT);
let llm = new LLM(config.LLM);

let server = new Server(config.Server, tts, stt, llm);
server.start();