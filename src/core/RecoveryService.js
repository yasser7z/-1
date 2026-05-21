const logger = require('../utils/logger');
const SessionManager = require('./SessionManager');
const db = require('../../database/db');

class RecoveryService {
    constructor(client, sessionManager) {
        this.client = client;
        this.sessionManager = sessionManager;
    }

    async recoverAll() {
        logger.info('Starting session recovery...');
        const rows = this.sessionManager.restoreFromDB();

        for (const row of rows) {
            try {
                const key = `${row.guild_id}_${row.channel_id}`;
                const guild = await this.client.guilds.fetch(row.guild_id).catch(() => null);
                if (!guild) {
                    logger.warn(`Guild ${row.guild_id} not found, cleaning up`);
                    db.prepare('DELETE FROM active_games WHERE guild_id = ? AND channel_id = ?').run(row.guild_id, row.channel_id);
                    continue;
                }

                const channel = await guild.channels.fetch(row.channel_id).catch(() => null);
                if (!channel) {
                    logger.warn(`Channel ${row.channel_id} not found, cleaning up`);
                    db.prepare('DELETE FROM active_games WHERE guild_id = ? AND channel_id = ?').run(row.guild_id, row.channel_id);
                    continue;
                }

                const stateRow = db.prepare('SELECT phase, turn_count FROM game_state WHERE game_id = ?').get(key);
                const playersRows = db.prepare('SELECT * FROM players WHERE game_id = ?').all(key);

                if (!stateRow) {
                    logger.warn(`No game state found for ${key}, cleaning up`);
                    db.prepare('DELETE FROM active_games WHERE guild_id = ? AND channel_id = ?').run(row.guild_id, row.channel_id);
                    continue;
                }

                const players = playersRows.map(p => ({
                    id: p.user_id,
                    username: p.username,
                    role: p.role,
                    isAlive: !!p.is_alive
                }));

                const GameSession = require('./GameSession');
                const session = new GameSession(row.guild_id, row.channel_id, players, {});
                session.state = stateRow.phase;

                const phaseRow = db.prepare('SELECT version FROM phase_version WHERE game_id = ?').get(key);
                if (phaseRow) {
                    session.phaseVersion = phaseRow.version;
                }

                this.sessionManager.set(key, session);
                logger.info(`Recovered session ${key} in state ${stateRow.phase}`);

            } catch (err) {
                logger.error(`Failed to recover session ${row.guild_id}_${row.channel_id}: ${err.message}`);
            }
        }

        logger.info(`Recovery complete. ${this.sessionManager.getAll().length} sessions active.`);
    }
}

module.exports = RecoveryService;
