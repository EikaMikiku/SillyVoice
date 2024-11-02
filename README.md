# SillyVoice
Can like, talk to an LLM 'n' shit.

## Features

* Can hold voice-to-voice conversations with an LLM running locally.
    * Flexible control over samplers.
    * Prompt formatting is not hardcoded.
    * Support for character cards (not all bits).
* Uses Web Audio API to get microphone data stream.
    * Uses Silero model for VAD (Voice Activity Detection).
* Front end is compatible with smartphone. **NOTE: mic input requires an HTTPS connection on the phone**
    * Can easily switch between devices.
* Uses EdgeTTS.
    * Configurable activation words.
    * Custom pronunciation replacements.
    * Saves output locally.
    * Can ignore content in between asterisks.
    * Can removes emojis.
* Supports HTTPS and basic auth.

## Requirements

* Only works with kobold.cpp API at the moment. So that's where your LLM would be running.
* NodeJS.
* Built whisper.cpp and a model for it.

## Installation
1) Need to download whisper.cpp, built for your system.<br>
Can get it here: [whisper.cpp](https://github.com/ggerganov/whisper.cpp/releases).<br>
Put it in where `STT.whisper_location` points to.<br>
Default `main` call is `./3rd_party/whisper/main.exe`. Might need to change to remove .exe if ur not on windows.<br>

2) Need to download a whisper model, for example `whisper-base.en-q5-1.bin` and put it as a parameter into `STT.whisper_args` in the `config.js`.<br>
Can get it here: [ggml-model-whisper-base.en-q5_1](https://whisper.ggerganov.com/ggml-model-whisper-base.en-q5_1.bin).<br>
Default location is: `./models/`.<br>
Make sure filenames match with the config setup.

3) Make sure you have NodeJS installed then run `npm i` in the project repo to install dependencies.

4) Make sure koboldcpp API is running with the LLM model loaded.

5) `node .` to run SillyVoice.<br>
Then it should start at http://localhost:51113/ by default.