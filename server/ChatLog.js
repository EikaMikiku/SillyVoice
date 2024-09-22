class ChatLog {
	messages = [];

	constructor(config, card) {
		this.config = config;
		this.card = card;
		this.permanentPromptTokens = 0;
	}

	addMessage(formattedMsg, tokenCount, isUser, raw) {
		this.messages.push({
			idx: this.messages.length,
			isUser,
			tokens: tokenCount - 1, //Removing BOS token
			value: formattedMsg,
			raw
		});
	}

	generatePermanentPrompt() {
		let meta = this.card.metadata;
		let str = this.config.prefix;

		//System prompt
		str += `${this.config.system_prompt}\n`

		//Character description
		str += `${meta.description}`;
		str += this.config.suffix;

		//Templating replacements
		str = str.replaceAll("{{char}}", meta.name);
		str = str.replaceAll("{{user}}", this.config.user);

		return str;
	}

	generateFirstMessage() {
		let meta = this.card.metadata;
		let raw = meta.first_mes || "Hello";

		raw = raw.replaceAll("{{char}}", meta.name);
		raw = raw.replaceAll("{{user}}", this.config.user);

		return {
			formatted: `${meta.name}: ${raw}`,
			raw: raw.trim()
		};
	}

	generateUserMessage(prompt) {
		let str = `\n${this.config.prefix}{{user}}: ${prompt}${this.config.suffix}`;
		str += `\n{{char}}:`;

		str = str.replaceAll("{{char}}", this.card.metadata.name);
		str = str.replaceAll("{{user}}", this.config.user);

		return {
			formatted: str,
			raw: prompt.trim()
		};;
	}

	generateFullPrompt(tokenLimit) {
		tokenLimit = tokenLimit - 25; //Small padding for safety
		let str = "";
		let currentTokens = 0;
		currentTokens += this.permanentPromptTokens;

		let firstMessageByUser = false;
		let isCutOff = false;
		//Loop from latest msgs to oldest and add until limit is hit
		for(let i = this.messages.length - 1; i >= 0; i--) {
			let msg = this.messages[i];
			if(currentTokens + msg.tokens < tokenLimit) {
				str = msg.value + str;
				currentTokens += msg.tokens;
				firstMessageByUser = msg.isUser; //First message in msgs is  made by a user
			} else {
				isCutOff = true;
				break;
			}
		}

		//Need to check for cutoff since greeting will have the name from char
		if(!firstMessageByUser && isCutOff) {
			//Note: this can potentially cause prompt to over context size
			//But hopefully 25 padding from above is good enough for a metadata.name
			//Space after : comes from str usually (mirrors the generation too)
			str = `\n${this.card.metadata.name}:` + str; //Should include the name.
		}

		return this.generatePermanentPrompt() + str;
	}
}

module.exports = ChatLog;