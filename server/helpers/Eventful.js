class Eventful {
	handlers = {};

	on(event, callback) {
		this.handlers[event] = this.handlers[event] || [];
		this.handlers[event].push(callback);
	}

	notifyEvent(event, ...args) {
		if(this.handlers[event] && this.handlers[event].length > 0) {
			for(let cb of this.handlers[event]) {
				cb(...args);
			}
		}
	}
}

module.exports = Eventful;