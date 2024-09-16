const Eventful = require("../helpers/Eventful.js");
const fs = require("fs");

class KoboldCPP extends Eventful {
	constructor(config) {
		super();
		this.config = config;
		this.samplers = this.buildSamplersObject();
	}

	async stream(promptJSON) {
		let error = null;
		let resp = await fetch(this.config.stream_url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(promptJSON)
		}).catch((e) => error = e);

		if(error) {
			log.error("KoboldCPP Stream Error", error);
			return;
		}

		let reader = resp.body.getReader();
		let decoder = new TextDecoder("utf-8");

		while (true) {
			let { value, done } = await reader.read();
			if(done) break;

			value = decoder.decode(value);

			if(!value.includes("data: ")) continue;

			value = value.split("\n");
			for(let line of value) {
				if(!line.includes("data: ")) {
					continue;
				}

				let token = JSON.parse(line.substring(6)).token;
				this.notifyEvent("token", token);
			}
		}

		this.notifyEvent("stream_end");
	}

	async getLastGenStats(cb) {
		let error = null;
		let resp = await fetch(this.config.last_gen_perf, {
			method: "GET",
			headers: {
				"Content-Type": "application/json"
			},
		}).catch((e) => error = e);

		if(error) {
			log.error("KoboldCPP Last Perf Error", error);
			return;
		}

		let output = await resp.json();
		cb(output.last_token_count);
	}

	async getTokenCount(promptStr, cb) {
		let error = null;
		let resp = await fetch(this.config.token_count_url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				prompt: promptStr
			})
		}).catch((e) => error = e);

		if(error) {
			log.error("KoboldCPP Token Count Error", error);
			return;
		}

		let output = await resp.json();
		cb(output.value);
	}

	buildSamplersObject() {
		let stSamplers = fs.readFileSync(this.config.samplers, "utf-8");
		let stSamplersJson = JSON.parse(stSamplers);

		let koboldSamplers = {
			stream: true
		};

		//Mapping silly tavern samplers to kobold
		koboldSamplers.stream = stSamplersJson.streaming;
		koboldSamplers.max_length = stSamplersJson.genamt;
		koboldSamplers.temperature = stSamplersJson.temp;
		koboldSamplers.top_p = stSamplersJson.top_p;
		koboldSamplers.typical = stSamplersJson.typical_p;
		koboldSamplers.typical_p = stSamplersJson.typical_p;
		koboldSamplers.seed = stSamplersJson.seed || -1;
		koboldSamplers.sampler_seed = stSamplersJson.seed || -1;
		koboldSamplers.min_p = stSamplersJson.min_p;
		koboldSamplers.rep_pen = stSamplersJson.rep_pen;
		koboldSamplers.frequency_penalty = stSamplersJson.freq_pen;
		koboldSamplers.presence_penalty = stSamplersJson.presence_pen;
		koboldSamplers.top_k = stSamplersJson.top_k;
		koboldSamplers.stop = []; //Use force_custom_samplers config to set this one
		koboldSamplers.max_context_length = stSamplersJson.max_length;
		koboldSamplers.top_a = stSamplersJson.top_a;
		koboldSamplers.tfs = stSamplersJson.tfs;
		koboldSamplers.mirostat = stSamplersJson.mirostat_mode;
		koboldSamplers.mirostat_tau = stSamplersJson.mirostat_tau;
		koboldSamplers.mirostat_eta = stSamplersJson.mirostat_eta;
		koboldSamplers.legacy_api = false;
		koboldSamplers.sampler_order = stSamplersJson.sampler_order;
		koboldSamplers.grammar = stSamplersJson.grammar_string;
		koboldSamplers.custom_token_bans = stSamplersJson.banned_tokens;
		koboldSamplers.rep_pen_range = stSamplersJson.rep_pen_range;
		koboldSamplers.rep_pen_slope = stSamplersJson.rep_pen_slope || 1;
		koboldSamplers.ignore_eos = stSamplersJson.ban_eos_token;
		koboldSamplers.smoothing_factor = stSamplersJson.smoothing_factor;
		koboldSamplers.smoothing_curve = stSamplersJson.smoothing_curve;
		koboldSamplers.tfs_z = stSamplersJson.tfs_z || 1;

		for(let forceSampler of this.config.force_custom_samplers) {
			koboldSamplers[forceSampler.prop] = forceSampler.value;
		}

		if(!koboldSamplers.stop.includes(`\n${this.config.user}:`)) {
			koboldSamplers.stop.push(`\n${this.config.user}:`);
		}
		if(!koboldSamplers.stop.includes(`\n${this.config.prefix}`)) {
			koboldSamplers.stop.push(`\n${this.config.prefix}`);
		}

		if(this.config.max_response_length) {
			koboldSamplers.max_length = this.config.max_response_length;
		}

		if(this.config.context_size) {
			koboldSamplers.max_context_length = this.config.context_size;
		}

		return koboldSamplers;
	}
}

module.exports = KoboldCPP;