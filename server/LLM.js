const CardManager = require("./CardManager.js");
const ChatLog = require("./ChatLog.js");
const Eventful = require("./helpers/Eventful.js");

class LLM extends Eventful {
	currentGeneration = "";

	constructor(config, funcLLM) {
		super();
		this.config = config;
		this.provider = new (require(`./llm_providers/${this.config.provider}.js`))(config);
		this.provider.on("token", (token) => this.onToken(token));
		this.provider.on("stream_end", () => this.onEnd());
		this.card = new CardManager(this.config.card);
		this.currentChat = new ChatLog(this.config, this.card);
		this.provider.getTokenCount(this.currentChat.generatePermanentPrompt(), (count) => {
			this.currentChat.permanentPromptTokens = count;
		});
		this.funcLLM = funcLLM;

		//Add first char message
		let firstMessage = this.currentChat.generateFirstMessage();
		this.provider.getTokenCount(firstMessage.formatted, (count) => {
			this.currentChat.addMessage(firstMessage.formatted, count, false, firstMessage.raw);
		});
	}

	onToken(token) {
		this.currentGeneration += token;
		log.trace("LLM", "Token", token);
		this.notifyEvent("llm_token", token);
	}

	onEnd() {
		log.info("LLM", "Generation END", this.currentGeneration.trim());

		this.provider.getLastGenStats((count) => {
			this.currentChat.addMessage(this.currentGeneration, count, false, this.currentGeneration.trim());
			this.notifyEvent("llm_genend_web", this.currentChat.messages[this.currentChat.messages.length - 1]);

			this.currentGeneration = "";
		});
	}

	async stream(prompt) {
		log.info("LLM", "Generation START");

		let instantAnswer = await this.funcLLM.getInstantAnswer(prompt);
		if(instantAnswer) {
			prompt += `\n\n<websearchresult>${instantAnswer}</websearchresult>`;
		}

		let msg = this.currentChat.generateUserMessage(prompt);

		this.provider.getTokenCount(msg.formatted, (count) => {
			this.currentChat.addMessage(msg.formatted, count, true, msg.raw);
			this.notifyEvent("llm_genend_web", this.currentChat.messages[this.currentChat.messages.length - 1]);

			let genObj = this.provider.buildSamplersObject();
			genObj.prompt = this.currentChat.generateFullPrompt(this.config.context_size - this.config.max_response_length);

			this.provider.stream(genObj);
		});
	}

	async reroll(idx) {
		//Remove msgs after idx
		this.currentChat.messages.splice(idx);
		//Get last msg (will be user, since you can only roll non user msgs)
		let lastUserMsg = this.currentChat.messages.pop();
		await this.stream(lastUserMsg.raw);
	}

	async edit(idx, newTxt) {
		this.currentChat.messages.splice(idx);
		await this.stream(newTxt);
	}

	removeStoppingStringsFromString(str) {
		let stoppingStrings = this.provider.samplers.stopping_strings;

		for(let stop of stoppingStrings) {
			if(str.trim().endsWith(stop)) {
				return str.trim().substring(0, str.indexOf(stop));
			}
		}

		return str;
	}
}

module.exports = LLM;