const CardManager = require("./CardManager.js");
const ChatLog = require("./ChatLog.js");
const Eventful = require("./helpers/Eventful.js");

class LLM extends Eventful {
	currentGeneration = "";
	currentSentence = "";

	constructor(config) {
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

		//Add first char message
		let firstMessage = this.currentChat.generateFirstMessage();
		this.provider.getTokenCount(firstMessage.formatted, (count) => {
			log.trace("LLM", "TokenCountFirstMessage", firstMessage, count);
			this.currentChat.addMessage(firstMessage.formatted, count, false, firstMessage.raw);
		});
	}

	onToken(token) {
		this.currentGeneration += token;
		log.trace("LLM", "Token", token);
		this.notifyEvent("llm_token", token);

		//Check if token ends a sentence. has single .?! near the end.
		//This specifies end of sentence
		//Non terminator then terminator then maybe a non terminator
		//test set:
		/*
			...
			wow.
			hi
			some."
			.) No
			.)
			.
			 .
			."
			???
			!!!
		*/
		let phaseMatch = token.trim().match(/(?<![\.])[\.\!\?](?![\.])/);
		if(phaseMatch && token.trim().endsWith(phaseMatch[0])) {
			let idx = this.currentGeneration.indexOf(this.currentSentence);
			//New sentence without the new token
			let newSentence = this.currentGeneration.substring(this.currentSentence.length + idx);
			let words = newSentence.trim().split(/ +/g);

			//Avoid very short sentences
			if(words.length >= this.config.sentence_split.min_word_count) {
				this.currentSentence = newSentence;
				this.notifyEvent("llm_sentence", this.currentSentence.trim());
			}
		}
	}

	onEnd() {
		log.info("LLM", "Generation END", this.currentGeneration);

		//Check if last sentence needs to be manually triggered, as not all LLM outputs ends with .?!
		if(!this.currentGeneration.endsWith(this.currentSentence) || this.currentSentence.length === 0) {
			let idx = this.currentGeneration.indexOf(this.currentSentence);
			let newSentence = this.currentGeneration.substring(idx + this.currentSentence.length);
			this.currentSentence = newSentence;
			this.notifyEvent("llm_sentence", this.currentSentence.trim());
		}

		this.provider.getLastGenStats((count) => {
			this.currentChat.addMessage(this.currentGeneration, count, false, this.currentGeneration.trim());
			this.notifyEvent("llm_genend_web", this.currentChat.messages[this.currentChat.messages.length - 1]);

			this.currentGeneration = "";
			this.currentSentence = "";
		});
	}

	stream(prompt) {
		log.info("LLM", "Generation START");
		let msg = this.currentChat.generateUserMessage(prompt);

		this.provider.getTokenCount(msg, (count) => {
			this.currentChat.addMessage(msg.formatted, count, true, msg.raw);
			this.notifyEvent("llm_genend_web", this.currentChat.messages[this.currentChat.messages.length - 1]);

			let genObj = this.provider.buildSamplersObject();
			genObj.prompt = this.currentChat.generateFullPrompt(this.config.context_size - this.config.max_response_length);

			this.provider.stream(genObj);
		});
	}
}

module.exports = LLM;