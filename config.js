module.exports = {
	Server: {
		port: 51113,
		audio_log_location: "./data/audio/",
		autio_log_filename: () => `${Date.now()}_VAD_Voice.wav`,
		https: {
			enabled: false,
			certs: {
				key: "certs/privkey.pem",
				cert: "certs/cert.pem",
				ca: "certs/chain.pem",
			}
		},
		basic_auth: {
			enabled: false,
			username: "admin",
			password: "miku"
		},
		activation_words: [/*"Hey"*/],
		remove_activation_word: true,
	},
	TTS: {
		edge_tts: {
			//https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts
			//Some voices dont work :(

			//voice: "en-IE-EmilyNeural", //Smooth voice.
			//voice: "ka-GE-EkaNeural", //Cold voice
			//voice: "en-US-AvaNeural", //Most expressive
			//voice: "zh-CN-XiaoyiNeural", //China!
			voice: "en-US-AvaNeural",

			lang: "en",
			rate: "+10%"
		},
		audio_log_location: "./data/audio/",
		autio_log_filename: () => `${Date.now()}_TTS_Voice.wav`,
		remove_asterisks: true,
		remove_emojis: true,
		pronunciation_replacements: {
			//Should be tailored for a specific voice you plan on using.
			//Can test using some online WebAPI SpeechSynthesis test using Edge browser
			"Eika": "[eh-eeka]"
		}
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
				prop: "stop_sequence",
				value: [
				]
			},
			{
				prop: "temperature",
				value: 0.4
			},
			/*
			{
				prop: "seed",
				value: 123
			}
			*/
		],
		sentence_split: {
			min_word_count: 4
		},

		context_size: 16384, //overrides samplers too, should match with LLM
		max_response_length: 512, //overrides samplers too
		user: "Boss", //Also used as a stopping string
		system_prompt: "You are {{char}}! Only respond as {{char}}. Hold and drive a conversation with {{user}}",

		//Prefix and suffix for system prompt and your inputs

		/* ChatML
		system_prefix: "<|im_start|>system\n",
		system_suffix: "<|im_end|>",
		user_prefix: "<|im_start|>",
		user_suffix: "<|im_end|>",
		char_prefix: "<|im_start|>",
		char_suffix: "<|im_end|>",
		//*/

		//* Mistral
		system_prefix: "[INST] ",
		system_suffix: " [/INST]",
		user_prefix: "[INST] ",
		user_suffix: " [/INST]",
		char_prefix: "",
		char_suffix: "",
		//*/

		card: "./data/cards/Vika.png"
	},
	Logger: {
		show_level: "trace"
	}
};