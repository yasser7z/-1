const db = require('../../database/db');
const logger = require('../utils/logger');

class SessionManager {
    constructor() {
        this.sessions = new Map();
    }

    getKey(guildId, channelId) {
        return `${guildId}_${channelId}`;
    }

    get(key) {
        return this.sessions.get(key) || null;
    }

    set(key, session) {
        this.sessions.set(key, session);
    }

    delete(key) {
        this.sessions.delete(key);
    }

    getAll() {
        return Array.from(this.sessions.values());
    }

    saveToDB(session) {
        const stmt = db.prepare(
            'INSERT OR REPLACE INTO active_games (guild_id, channel_id) VALUES (?, ?)'
        );
        stmt.run(session.guildId, session.channelId);
        logger.debug(`Saved session ${session.guildId}_${session.channelId} to DB`);
    }

    restoreFromDB() {
        const rows = db.prepare('SELECT guild_id, channel_id FROM active_games').all();
        logger.info(`Restoring ${rows.length} sessions from database`);
        return rows;
    }
}

module.exports = SessionManager;
