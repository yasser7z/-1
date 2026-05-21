const logger = require('../utils/logger');

class SessionManager {
  constructor() {
    this.sessions = new Map();
  }

  createKey(guildId, channelId) {
    return `${guildId}_${channelId}`;
  }

  set(session) {
    const key = session.sessionKey || this.createKey(session.guildId, session.channelId);
    session.sessionKey = key;
    this.sessions.set(key, session);
    logger.info(`Session stored: ${key}`);
  }

  get(guildId, channelId) {
    const key = this.createKey(guildId, channelId);
    return this.sessions.get(key) || null;
  }

  delete(guildId, channelId) {
    const key = this.createKey(guildId, channelId);
    const deleted = this.sessions.delete(key);
    if (deleted) logger.info(`Session deleted: ${key}`);
    return deleted;
  }

  has(guildId, channelId) {
    const key = this.createKey(guildId, channelId);
    return this.sessions.has(key);
  }

  getAll() {
    return Array.from(this.sessions.values());
  }

  getByGuild(guildId) {
    const results = [];
    for (const session of this.sessions.values()) {
      if (session.guildId === guildId) {
        results.push(session);
      }
    }
    return results;
  }

  getActiveSessions() {
    return this.getAll().filter(s => s.isActive === true);
  }

  clear() {
    const count = this.sessions.size;
    this.sessions.clear();
    logger.info(`Cleared ${count} sessions.`);
  }

  get size() {
    return this.sessions.size;
  }
}

module.exports = new SessionManager();
