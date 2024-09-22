module.exports = {
	Server: {
		port: 51113,
		audio_log_location: "./data/audio/",
		autio_log_filename: () => `${Date.now()}_VAD_Voice.wav`,
		https: {
			enabled: true,
			certs: {
				key: "certs/privkey.pem",
				cert: "certs/cert.pem",
				ca: "certs/chain.pem",
			}
		},
		basic_auth: {
			enabled: true,
			username: "admin",
			password: "miku"
		}
	},
	TTS: {
		edge_tts: {
			//https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts
			//Some voices dont work :(
			voice: "en-US-AvaNeural",
			//voice: "fr-FR-VivienneMultilingualNeural",

			lang: "en",
			rate: "+15%"
		},
		audio_log_location: "./data/audio/",
		autio_log_filename: () => `${Date.now()}_TTS_Voice.wav`,
		remove_asterisks: true,
		remove_emojis: true
	},
	STT: {
		whisper_location: "./3rd_party/whisper/main.exe",
		whisper_args: [
			"-m",
			"./models/whisper-base.en-q5_1.bin",
			"-nt"
		],
		remove_solo_annotations: true
	},
	LLM: {
		provider: "koboldcpp",
		last_gen_perf: "http://localhost:5001/api/extra/perf",
		token_count_url: "http://localhost:5001/api/extra/tokencount",
		stream_url: "http://localhost:5001/api/extra/generate/stream",
		samplers: "./data/samplers/default.json", //SillyTavern compatible
		//In case new samplers are supported, but not in the samplers json,
		//of you want to overwrite some without changing json
		force_custom_samplers: [
			{
				//sets stream: true, overrides the setting samplers/default.json
				prop: "stream",
				value: true
			},
			{
				//custom stopping strings
				prop: "stop",
				value: [
					"***",
					"###"
				]
			},
			{
				prop: "temperature",
				value: 0.4
			},
		],
		sentence_split: {
			min_word_count: 4
		},
		context_size: 16384, //overrides samplers too, should match with LLM
		max_response_length: 512, //overrides samplers too
		user: "Boss", //Also used as a stopping string
		system_prompt: "You are an expert actor that can fully immerse yourself into any role given. You do not break character for any reason. Only respond as {{char}}. Do not respond as {{user}}.",
		//Prefix and suffix for system prompt and your inputs
		prefix: "[INST] ", //Also used as a stopping string
		suffix: "[/INST]",
		card: "./data/cards/Vika.png"
	},
	Logger: {
		show_level: "trace"
	}
};