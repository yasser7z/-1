const db = require('../../database/db');
const config = require('../../config/config');
const logger = require('../utils/logger');

class GuildConfigManager {
    constructor() {
        this.cache = new Map();
    }

    get(guildId) {
        if (this.cache.has(guildId)) {
            return this.cache.get(guildId);
        }

        const row = db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(guildId);
        if (row) {
            const cfg = {
                night_duration: row.night_duration,
                day_duration: row.day_duration,
                voting_duration: row.voting_duration,
                auto_absent_vote: !!row.auto_absent_vote,
                narrator_style: row.narrator_style
            };
            this.cache.set(guildId, cfg);
            return cfg;
        }

        return { ...config.DEFAULT_GUILD_CONFIG };
    }

    set(guildId, key, value) {
        const current = this.get(guildId);
        current[key] = value;

        db.prepare(
            `INSERT INTO guild_config (guild_id, night_duration, day_duration, voting_duration, auto_absent_vote, narrator_style)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(guild_id) DO UPDATE SET
             night_duration = excluded.night_duration,
             day_duration = excluded.day_duration,
             voting_duration = excluded.voting_duration,
             auto_absent_vote = excluded.auto_absent_vote,
             narrator_style = excluded.narrator_style`
        ).run(
            guildId,
            current.night_duration,
            current.day_duration,
            current.voting_duration,
            current.auto_absent_vote ? 1 : 0,
            current.narrator_style
        );

        this.cache.set(guildId, current);
        logger.info(`Guild config updated for ${guildId}: ${key}=${value}`);
    }

    invalidateCache(guildId) {
        this.cache.delete(guildId);
    }
}

module.exports = GuildConfigManager;
