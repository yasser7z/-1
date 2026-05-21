const db = require('../../database/db');
const logger = require('../utils/logger');

class RoleResolver {
    constructor() {
        this.lastHealed = new Map();
    }

    validateAction(player, targetId, session) {
        if (!player.isAlive) return { valid: false, reason: 'أنت ميت.' };

        switch (player.role) {
            case 'doctor': {
                const key = `${session.guildId}_${session.channelId}_${player.id}`;
                const last = this.lastHealed.get(key);
                if (last === targetId) {
                    return { valid: false, reason: 'لا يمكنك علاج نفس اللاعب مرتين متتاليتين.' };
                }
                break;
            }
            case 'king': {
                const lock = db.prepare(
                    'SELECT locked FROM action_locks WHERE game_id = ? AND user_id = ? AND action = ? AND permanent = 1'
                ).get(`${session.guildId}_${session.channelId}`, player.id, 'day_veto');
                if (lock) {
                    return { valid: false, reason: 'لقد استخدمت حق النقض مسبقاً.' };
                }
                break;
            }
            case 'investigator': {
                const lock = db.prepare(
                    'SELECT locked FROM action_locks WHERE game_id = ? AND user_id = ? AND action = ? AND permanent = 1'
                ).get(`${session.guildId}_${session.channelId}`, player.id, 'night_investigate');
                if (lock) {
                    return { valid: false, reason: 'لقد استخدمت قدرة التحقيق مسبقاً.' };
                }
                break;
            }
            case 'bodyguard': {
                const lock = db.prepare(
                    'SELECT locked FROM action_locks WHERE game_id = ? AND user_id = ? AND action = ? AND permanent = 1'
                ).get(`${session.guildId}_${session.channelId}`, player.id, 'night_protect');
                if (lock) {
                    return { valid: false, reason: 'لقد استخدمت قدرة الحماية مسبقاً.' };
                }
                break;
            }
        }

        return { valid: true };
    }

    recordHeal(sessionId, doctorId, targetId) {
        const key = `${sessionId}_${doctorId}`;
        this.lastHealed.set(key, targetId);
    }

    resetSession(sessionId) {
        for (const key of this.lastHealed.keys()) {
            if (key.startsWith(sessionId)) {
                this.lastHealed.delete(key);
            }
        }
    }
}

module.exports = new RoleResolver();
