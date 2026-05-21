const logger = require('../utils/logger');

class RateLimitGuard {
    constructor() {
        this.failures = new Map();
        this.blocked = new Map();
        this.messageEdits = new Map();
    }

    recordFailure(userId) {
        const now = Date.now();
        let record = this.failures.get(userId);
        if (!record) {
            record = { count: 1, first: now };
            this.failures.set(userId, record);
        } else {
            if (now - record.first > 10000) {
                record.count = 1;
                record.first = now;
            } else {
                record.count++;
            }
        }

        if (record.count >= 5) {
            this.blocked.set(userId, now);
            logger.warn(`User ${userId} rate limited for 30s`);
            setTimeout(() => {
                this.blocked.delete(userId);
                this.failures.delete(userId);
            }, 30000);
        }
    }

    isRateLimited(userId) {
        if (this.blocked.has(userId)) return true;
        return false;
    }

    resetFailures(userId) {
        this.failures.delete(userId);
    }

    canEditMessage(messageId) {
        const now = Date.now();
        const last = this.messageEdits.get(messageId) || 0;
        if (now - last < 1000) return false;
        this.messageEdits.set(messageId, now);
        return true;
    }
}

module.exports = RateLimitGuard;
