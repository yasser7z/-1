const pools = require('./messagePools');
const formatter = require('./NarratorFormatter');

class NarratorEngine {
    constructor() {
        this.history = new Map();
    }

    announce(eventType, channel, context = {}) {
        const pool = pools[eventType];
        if (!pool) return;

        if (!this.history.has(eventType)) this.history.set(eventType, []);
        const history = this.history.get(eventType);

        let message;
        let attempts = 0;
        do {
            message = pool[Math.floor(Math.random() * pool.length)];
            attempts++;
        } while (history.includes(message) && attempts < 100);

        history.push(message);
        if (history.length > 15) history.shift();

        let finalMessage = message;
        if (eventType.includes('NIGHT') && Math.random() < 0.25) {
            finalMessage += " ⏳";
        }

        const embed = formatter.format(finalMessage, context);
        return channel.send({ embeds: [embed] });
    }
}

module.exports = new NarratorEngine();
