const fs = require("fs");
const extract = require("png-chunks-extract");
const PNGtext = require("png-chunk-text");

class CardManager {
	constructor(cardPath) {
		let buffer = fs.readFileSync(cardPath);
		this.metadata = this.#getMetadata(buffer);
		this.imgData = `data:image/png;base64,${buffer.toString("base64")}`;
		log.info("CardManager", "Loaded Card", cardPath);
		log.debug("CardManager", "Card Data", this.metadata);
	}

	#getMetadata(buffer) {
		let chunks = extract(buffer);
		let textChunks = chunks.filter(function(chunk) {
			return chunk.name === "tEXt";
		}).map(function(chunk) {
			return PNGtext.decode(chunk.data);
		});

		if(textChunks.length === 0) {
			log.error("CardManager", cardPath, "PNG metadata does not contain any text chunks.");
		}

		let index = textChunks.findIndex((chunk) => chunk.keyword.toLowerCase() === "chara");
		if(index === -1) {
			log.error("CardManager", cardPath, "PNG metadata does not contain any character data.");
		}

		let str = Buffer.from(textChunks[index].text, "base64").toString("utf8");
		return JSON.parse(str);
	}
}

module.exports = CardManager;
