const db = require('../../database/db');
const logger = require('../utils/logger');

class InteractionVersioning {
    getVersion(sessionId) {
        const row = db.prepare('SELECT version FROM phase_version WHERE game_id = ?').get(sessionId);
        return row ? row.version : 0;
    }

    isValid(sessionId, version) {
        const current = this.getVersion(sessionId);
        return version === current;
    }

    incrementVersion(sessionId) {
        const current = this.getVersion(sessionId);
        db.prepare(
            'INSERT OR REPLACE INTO phase_version (game_id, version) VALUES (?, ?)'
        ).run(sessionId, current + 1);
        logger.debug(`Version incremented for ${sessionId}: ${current} -> ${current + 1}`);
    }

    getCustomId(sessionId, action, target) {
        const version = this.getVersion(sessionId);
        return `${sessionId}_${version}_${action}_${target}`;
    }
}

module.exports = InteractionVersioning;
