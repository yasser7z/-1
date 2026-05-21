const logger = require('../utils/logger');

class SafeCollector {
    constructor(session, options = {}) {
        this.session = session;
        this.timeout = options.timeout || 60000;
        this.collectors = [];
        this.timeoutId = null;
        this.ended = false;
    }

    createCollector(filter, options = {}) {
        const collector = {
            filter,
            options,
            ended: false,
            end: () => { collector.ended = true; }
        };
        this.collectors.push(collector);
        return collector;
    }

    startTimeout(onTimeout) {
        this.timeoutId = setTimeout(() => {
            if (!this.ended) {
                logger.debug(`SafeCollector timed out for session ${this.session.guildId}_${this.session.channelId}`);
                this.cleanup();
                if (onTimeout) onTimeout();
            }
        }, this.timeout);
    }

    cleanup() {
        this.ended = true;
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        this.collectors.forEach(c => c.ended = true);
        this.collectors = [];
        logger.debug('SafeCollector cleaned up');
    }
}

module.exports = SafeCollector;
