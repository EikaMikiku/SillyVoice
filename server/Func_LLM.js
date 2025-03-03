const Eventful = require("./helpers/Eventful.js");

class Func_LLM extends Eventful {
	constructor(config, serpAPIconfig) {
		super();
		this.config = config;
		this.serpAPIconfig = serpAPIconfig;
		this.provider = new (require(`./llm_providers/${this.config.provider}.js`))(config);

	}

	async getInstantAnswer(userInput) {
		let text = await this.generate(userInput, this.config.primary_system_prompt);

		if(text.length <= 7) {
			log.info("FCL", "Instant Answer FAST END (No Instant Answer required)", userInput, text);
			return "";
		}

		let url = this.serpAPIconfig.search_url;
		url += `?q=${encodeURIComponent(text)}`;
		url += `&location=${this.serpAPIconfig.location}`;
		url += `&hl=${this.serpAPIconfig.language}`;
		url += `&gl=${this.serpAPIconfig.country}`;
		url += `&api_key=${this.serpAPIconfig.api_key}`;

		let error = null;
		let resp = await fetch(url, {
			method: "GET",
			headers: {
				"Content-Type": "application/json"
			}
		}).catch((e) => error = e);

		if(error) {
			log.error("KoboldCPP Web Search Error", error);
			return "";
		}

		let output = await resp.json();

		if(!output.answer_box) {
			log.info("FCL", "Couldn't find an instant answer for " + userInput);
			return "";
		}

		let instantAnswerJSON = JSON.stringify(output.answer_box, null, "\t");

		log.info("FCL", "Instant Answer Result", instantAnswerJSON);

		//Now clarifying the answer into readable content

		let newInput = `ORIGINAL_QUERY = ${text}\n`;
		newInput += instantAnswerJSON;

		let secondGen = await this.generate(newInput, this.config.secondary_system_prompt);

		log.info("FCL", "Extracted Instant Answer", secondGen);

		return secondGen;
	}

	async generate(userInput, systemPrompt) {
		log.info("FCL", "Generation START");

		let genObj = this.provider.buildSamplersObject();
		genObj.prompt = this.promptGen(userInput, systemPrompt);

		let result = await this.provider.generate(genObj);
		let text = result.results[0].text.trim();

		log.info("FCL", "Generation END", text);
		return text;
	}

	promptGen(userInput, systemPrompt) {
		let str = `${this.config.system_prefix}${systemPrompt}${this.config.system_suffix}`

		str += `${this.config.user_prefix}`;
		str += `User: ${userInput}\n`
		str += `${this.config.user_suffix}`;

		str += `${this.config.char_prefix}Assistant:`;

		return str;
	}

}

module.exports = Func_LLM;