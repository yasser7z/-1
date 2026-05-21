const db = require('../../database/db');
const logger = require('../utils/logger');

const permanentActions = ['night_investigate', 'night_protect', 'day_veto'];

class ActionLockManager {
    isLocked(sessionId, userId, action) {
        const row = db.prepare(
            'SELECT locked FROM action_locks WHERE game_id = ? AND user_id = ? AND action = ?'
        ).get(sessionId, userId, action);
        return !!row;
    }

    acquireLock(sessionId, userId, action) {
        const isPermanent = permanentActions.includes(action);
        try {
            db.prepare(
                'INSERT INTO action_locks (game_id, user_id, action, permanent) VALUES (?, ?, ?, ?)'
            ).run(sessionId, userId, action, isPermanent ? 1 : 0);
            logger.debug(`Lock acquired: ${sessionId} ${userId} ${action}`);
            return true;
        } catch (err) {
            if (err.message.includes('UNIQUE')) {
                logger.warn(`Lock already exists: ${sessionId} ${userId} ${action}`);
                return false;
            }
            throw err;
        }
    }

    releaseLock(sessionId, userId, action) {
        db.prepare(
            'DELETE FROM action_locks WHERE game_id = ? AND user_id = ? AND action = ? AND permanent = 0'
        ).run(sessionId, userId, action);
        logger.debug(`Lock released: ${sessionId} ${userId} ${action}`);
    }

    resetLocksAtPhaseStart(sessionId) {
        db.prepare('DELETE FROM action_locks WHERE game_id = ? AND permanent = 0').run(sessionId);
        logger.debug(`Locks reset for session ${sessionId}`);
    }
}

module.exports = ActionLockManager;
