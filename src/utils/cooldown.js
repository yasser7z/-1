const logger = require('./logger');

class CooldownManager {
  constructor() {
    this.cooldowns = new Map();
  }

  _key(userId, buttonId) {
    return `${userId}_${buttonId}`;
  }

  check(userId, buttonId, ms = 500) {
    const key = this._key(userId, buttonId);
    const last = this.cooldowns.get(key);
    if (!last) return false;
    return Date.now() - last < ms;
  }

  set(userId, buttonId) {
    const key = this._key(userId, buttonId);
    this.cooldowns.set(key, Date.now());
  }

  clear(userId, buttonId) {
    const key = this._key(userId, buttonId);
    this.cooldowns.delete(key);
  }

  clearAllForUser(userId) {
    const prefix = `${userId}_`;
    for (const key of this.cooldowns.keys()) {
      if (key.startsWith(prefix)) {
        this.cooldowns.delete(key);
      }
    }
  }

  clearAll() {
    const count = this.cooldowns.size;
    this.cooldowns.clear();
    logger.debug(`Cleared ${count} cooldown entries.`);
  }

  get remaining() {
    const key = this._key(userId, buttonId);
    const last = this.cooldowns.get(key);
    if (!last) return 0;
    const elapsed = Date.now() - last;
    return Math.max(0, ms - elapsed);
  }
}

module.exports = new CooldownManager();
