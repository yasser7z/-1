const logger = require('../utils/logger');

const WINDOW_MS = 10000;
const MAX_INVALID = 5;
const MUTE_DURATION = 30000;

class RateLimitGuard {
  constructor() {
    this.records = new Map();
    this._cleanupInterval = setInterval(() => this._cleanup(), 60000);
  }

  recordClick(userId, isValid) {
    let record = this.records.get(userId);
    if (!record) {
      record = { invalidClicks: [], mutedUntil: 0 };
      this.records.set(userId, record);
    }

    if (record.mutedUntil > Date.now()) {
      return true;
    }

    if (!isValid) {
      const now = Date.now();
      record.invalidClicks.push(now);
      const cutoff = now - WINDOW_MS;
      record.invalidClicks = record.invalidClicks.filter(t => t > cutoff);

      if (record.invalidClicks.length >= MAX_INVALID) {
        record.mutedUntil = now + MUTE_DURATION;
        record.invalidClicks = [];
        logger.warn(`User ${userId} muted for ${MUTE_DURATION}ms due to spam.`);
        return true;
      }
    }

    return false;
  }

  isMuted(userId) {
    const record = this.records.get(userId);
    if (!record) return false;
    if (record.mutedUntil > Date.now()) return true;
    return false;
  }

  getMutedTimeLeft(userId) {
    const record = this.records.get(userId);
    if (!record) return 0;
    return Math.max(0, record.mutedUntil - Date.now());
  }

  resetUser(userId) {
    this.records.delete(userId);
  }

  _cleanup() {
    const now = Date.now();
    for (const [userId, record] of this.records) {
      if (record.mutedUntil < now && record.invalidClicks.length === 0) {
        this.records.delete(userId);
      }
    }
  }

  destroy() {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
    }
    this.records.clear();
  }
}

module.exports = new RateLimitGuard();
