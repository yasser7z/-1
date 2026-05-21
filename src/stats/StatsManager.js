const db = require('../../database/db');
const logger = require('../utils/logger');

class StatsManager {
    getStats(userId) {
        const row = db.prepare('SELECT * FROM player_stats WHERE user_id = ?').get(userId);
        if (!row) {
            return { userId, wins: 0, losses: 0, gamesPlayed: 0, rolesPlayed: {} };
        }
        return {
            userId: row.user_id,
            wins: row.wins,
            losses: row.losses,
            gamesPlayed: row.games_played,
            rolesPlayed: JSON.parse(row.roles_played || '{}')
        };
    }

    getLeaderboard(limit = 10) {
        const rows = db.prepare('SELECT user_id, wins, games_played FROM player_stats ORDER BY wins DESC LIMIT ?').all(limit);
        return rows.map(r => ({
            userId: r.user_id,
            wins: r.wins,
            gamesPlayed: r.games_played
        }));
    }

    async recordGame(session, winner) {
        const team = winner === 'villagers' ? 'villagers' : 'wolves';
        const duration = Math.floor((Date.now() - session.phaseStartTimestamp) / 1000);

        const gameId = `${session.guildId}_${session.channelId}_${Date.now()}`;
        const playersArr = Array.from(session.players.values());
        const playersJson = JSON.stringify(playersArr.map(p => ({ id: p.id, role: p.role })));

        const insertHistory = db.prepare(
            'INSERT INTO game_history (game_id, players, winner_team, duration, date) VALUES (?, ?, ?, ?, ?)'
        );
        insertHistory.run(gameId, playersJson, team, duration, new Date().toISOString());

        for (const player of playersArr) {
            const current = this.getStats(player.id);
            const wins = winner === 'villagers' && player.role !== 'werewolf' ? current.wins + 1
                : winner === 'wolves' && player.role === 'werewolf' ? current.wins + 1
                : current.wins;
            const losses = !(winner === 'villagers' && player.role !== 'werewolf') &&
                !(winner === 'wolves' && player.role === 'werewolf') ? current.losses + 1
                : current.losses;

            const rolesPlayed = current.rolesPlayed;
            rolesPlayed[player.role] = (rolesPlayed[player.role] || 0) + 1;

            db.prepare(
                'INSERT INTO player_stats (user_id, wins, losses, games_played, roles_played) VALUES (?, ?, ?, ?, ?) ' +
                'ON CONFLICT(user_id) DO UPDATE SET wins = excluded.wins, losses = excluded.losses, ' +
                'games_played = excluded.games_played, roles_played = excluded.roles_played'
            ).run(player.id, wins, losses, current.gamesPlayed + 1, JSON.stringify(rolesPlayed));
        }

        logger.info(`Game recorded: ${gameId}, winner: ${team}, duration: ${duration}s`);
    }
}

module.exports = new StatsManager();
