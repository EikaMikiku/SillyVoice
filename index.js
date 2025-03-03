const config = require("./config.js");

new (require("./server/helpers/Logger.js"))(config); //Logger should be first.
const Server = require("./server/Server.js");
const STT = require("./server/STT.js");
const TTS = require("./server/TTS.js");
const LLM = require("./server/LLM.js");
const Func_LLM = require("./server/Func_LLM.js");

let tts = new TTS(config.TTS);
let stt = new STT(config.STT);
let func_llm = new Func_LLM(config.FCL, config.SerpAPI);
let llm = new LLM(config.LLM, func_llm);

let server = new Server(config.Server, tts, stt, llm);
server.start();