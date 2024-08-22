const LEVELS = {
	trace: 0,
	debug: 5,
	info: 10,
	error: 15,
	none: 20
};

class Logger {
	constructor(config) {
		this.config = config;
		let show_level = this.config.Logger.show_level;
		let show_level_val = LEVELS[show_level];

		global.log = function(level, ...args) {
			let level_val = LEVELS[level];
			if(level_val < show_level_val) {
				return; //level isnt high enough
			}

			let date = new Date();
			let day = date.toISOString().substring(0, 10);
			let time = date.getHours().toString().padStart(2, "0");
			time += ":" + date.getMinutes().toString().padStart(2, "0");
			time += ":" + date.getSeconds().toString().padStart(2, "0");
			time += "." + date.getMilliseconds().toString().padStart(3, "0");

			args = args.flatMap(i => [i, "|"]);
			args.pop();

			console.log(day + " " + time, "|", level.padEnd(5, " "), "|", ...args);
		}

		global.log.trace = function(...args) {
			global.log("trace", ...args);
		}

		global.log.debug = function(...args) {
			global.log("debug", ...args);
		}

		global.log.info = function(...args) {
			global.log("info", ...args);
		}

		global.log.error = function(...args) {
			global.log("error", ...args);
		}
	}
}

module.exports = Logger;