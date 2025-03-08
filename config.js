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
			//voice: "ru-RU-SvetlanaNeural", //Russia!
			voice: "en-US-AvaNeural", //Most expressive

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
	SerpAPI: {
		search_url: "https://serpapi.com/search.json",
		location: "585069bdee19ad271e9bc072", //Example of a location from https://serpapi.com/locations-api
		country: "uk",
		language: "en",
		api_key: "YOUR KEY HERE"
	},
	FCL: { //Function Calling LLM
		enabled: false,
		provider: "koboldcpp",
		generate_url: "http://localhost:5020/api/v1/generate",
		samplers: "./data/samplers/default.json", //SillyTavern compatible
		//In case new samplers are supported, but not in the samplers json,
		//of you want to overwrite some without changing json
		force_custom_samplers: [
			{
				//sets stream: true, overrides the setting samplers/default.json
				prop: "stream",
				value: false
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

		context_size: 8192, //overrides samplers too, should match with LLM
		max_response_length: 512, //overrides samplers too
		user: "User", //Also used as a stopping string
		primary_system_prompt: `You are a query classifier that analyzes user input to determine if it contains questions requiring real-time data from online sources.

Your sole purpose is to identify if the user's message contains questions that need current information that would be stale, unavailable, or impossible to know in a static knowledge base.

Follow these rules carefully:
1. If the user's input contains a question requiring real-time or frequently updated information, respond with a clear search query that captures the information need.
2. If the user's input contains a question about yourself, your status, your capabilities, or uses phrases like "at the moment" or "right now" but doesn't require external data, respond with "null".
3. If the user's input contains a question that can be answered using general knowledge (historical facts, definitions, concepts, etc.), respond with "null".
4. If the user's input doesn't contain a question at all, respond with "null".

Questions that ALWAYS require real-time data include those about:
- Current time or date (e.g., "What time is it?" → "Current time")
- Current weather (e.g., "Is it raining outside?" → "Current weather")
- Stock prices and financial markets (e.g., "How is TSLA doing?" → "Current TSLA stock price")
- News and current events (e.g., "What's happening in Ukraine?" → "Latest news Ukraine")
- Sports scores and results (e.g., "Who's winning the football game?" → "Latest football scores")
- Traffic conditions (e.g., "How is traffic on I-95?" → "Current I-95 traffic")
- Currency exchange rates (e.g., "What's the euro to dollar rate?" → "Current EUR to USD exchange rate")
- Product prices and availability (e.g., "How much is the iPhone 15?" → "Current iPhone 15 price")

Examples of inputs requiring real-time data:
- "What's the current time in Tokyo?" → "Current time Tokyo"
- "What's the date today?" → "Current date"
- "What's the current price of Bitcoin?" → "Current price of Bitcoin"
- "Can you tell me how NVIDIA stock is doing today?" → "Current NVIDIA stock price"
- "Is it going to rain in Chicago tomorrow?" → "Weather forecast Chicago"

Examples of inputs NOT requiring real-time data:
- "What's the height of the Eiffel Tower?" → "null"
- "Who was the first person to walk on the moon?" → "null"
- "How do I make chocolate chip cookies?" → "null"
- "Hello, how are you today?" → "null"

Your output should be ONLY the search query or "null" - no explanations or additional text.`,

		secondary_system_prompt: `You are a JSON response parser that extracts relevant information to answer user queries.

Your task is to find the answer to the ORIGINAL_QUERY question within a JSON response from an external API. The JSON response will contain data that may include the answer to the question.

Your output should be the full answer.`,

		//* Llama-3
		system_prefix: "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n",
		system_suffix: "<|eot_id|>",
		user_prefix: "<|start_header_id|>user<|end_header_id|>\n",
		user_suffix: "",
		char_prefix: "<|start_header_id|>assistant<|end_header_id|>\n",
		char_suffix: "",
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
		user_prefix: "<|im_start|>user\n",
		user_suffix: "<|im_end|>",
		char_prefix: "<|im_start|>assistant\n",
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

		/* CommandR / Aya
		system_prefix: "<|START_OF_TURN_TOKEN|><|SYSTEM_TOKEN|>",
		system_suffix: "<|END_OF_TURN_TOKEN|>",
		user_prefix: "<|START_OF_TURN_TOKEN|><|USER_TOKEN|>",
		user_suffix: "<|END_OF_TURN_TOKEN|>",
		char_prefix: "<|START_OF_TURN_TOKEN|><|CHATBOT_TOKEN|>",
		char_suffix: "<|END_OF_TURN_TOKEN|>",
		//*/

		card: "./data/cards/Vika.png"
	},
	Logger: {
		show_level: "trace"
	}
};