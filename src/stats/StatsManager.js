const { query, queryOne, execute, transaction } = require('../../database/db');
const logger = require('../utils/logger');

class StatsManager {
  static async recordGameEnd(gameSession, winner) {
    try {
      const guildId = gameSession.guildId;
      const duration = Math.floor((Date.now() - gameSession.phaseStartTimestamp) / 1000);
      const players = Array.from(gameSession.players.values());
      const roles = gameSession.roles;

      transaction(() => {
        StatsManager._insertGameHistory(guildId, gameSession.channelId, winner, players.length, duration, roles, players);
        StatsManager._updatePlayerStats(players, winner, guildId);
      });

      logger.info(`Game recorded: ${winner} won in ${duration}s with ${players.length} players.`);
    } catch (error) {
      logger.error({ err: error }, 'Failed to record game stats.');
    }
  }

  static _insertGameHistory(guildId, channelId, winner, totalPlayers, duration, roles, players) {
    const playerData = players.map(p => ({
      userId: p.userId,
      username: p.username,
      role: p.role,
      isAlive: p.isAlive,
      isKilled: p.isKilled,
      isLynched: p.isLynched,
    }));

    execute(
      `INSERT INTO game_history (guild_id, channel_id, winner, total_players, duration_seconds, roles, players) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      {
        guild_id: guildId,
        channel_id: channelId || '',
        winner,
        total_players: totalPlayers,
        duration_seconds: duration,
        roles: JSON.stringify(roles),
        players: JSON.stringify(playerData),
      },
    );

    logger.debug(`Game history inserted for guild ${guildId}.`);
  }

  static _updatePlayerStats(players, winner, guildId) {
    for (const player of players) {
      try {
        const existing = queryOne(
          `SELECT id FROM player_stats WHERE user_id = ? AND guild_id = ?`,
          { user_id: player.userId, guild_id: guildId },
        );

        const playerWon = StatsManager._didPlayerWin(player.role, winner);
        const roleField = player.role ? player.role.toLowerCase() : 'villager';

        if (existing) {
          const updates = [
            'games_played = games_played + 1',
            playerWon ? 'games_won = games_won + 1' : 'games_lost = games_lost + 1',
            'updated_at = CURRENT_TIMESTAMP',
          ];

          if (player.isKilled) {
            updates.push('total_kills = total_kills + 0');
          }

          if (player.role === 'Doctor' && player.protectedBy) {
            updates.push('total_saves = total_saves + 1');
          }

          execute(
            `UPDATE player_stats SET ${updates.join(', ')} WHERE id = ?`,
            { id: existing.id },
          );
        } else {
          execute(
            `INSERT INTO player_stats (user_id, guild_id, games_played, games_won, games_lost, most_played_role) VALUES (?, ?, 1, ?, ?, ?)`,
            {
              user_id: player.userId,
              guild_id: guildId,
              games_won: playerWon ? 1 : 0,
              games_lost: playerWon ? 0 : 1,
              most_played_role: roleField,
            },
          );
        }

        StatsManager._updateRoleStats(player, guildId);
      } catch (err) {
        logger.error({ err }, `Failed to update stats for player ${player.userId}`);
      }
    }
  }

  static _didPlayerWin(role, winner) {
    if (role === 'Werewolf') return winner === 'werewolves';
    return winner === 'villagers';
  }

  static _updateRoleStats(player, guildId) {
    const existing = queryOne(
      `SELECT id, most_played_role FROM player_stats WHERE user_id = ? AND guild_id = ?`,
      { user_id: player.userId, guild_id: guildId },
    );

    if (existing) {
      execute(
        `UPDATE player_stats SET most_played_role = ? WHERE id = ?`,
        { most_played_role: player.role ? player.role.toLowerCase() : 'villager', id: existing.id },
      );
    }
  }

  static async getPlayerStats(userId, guildId) {
    try {
      const row = queryOne(
        `SELECT * FROM player_stats WHERE user_id = ? AND guild_id = ?`,
        { user_id: userId, guild_id: guildId },
      );

      if (!row) return null;

      const total = row.games_played || 0;
      const wins = row.games_won || 0;
      const rate = total > 0 ? Math.round((wins / total) * 100) : 0;

      return {
        userId: row.user_id,
        guildId: row.guild_id,
        gamesPlayed: total,
        gamesWon: wins,
        gamesLost: row.games_lost || 0,
        winRate: rate,
        totalKills: row.total_kills || 0,
        totalSaves: row.total_saves || 0,
        totalInvestigations: row.total_investigations || 0,
        mvps: row.mvps || 0,
        mostPlayedRole: row.most_played_role || 'none',
      };
    } catch (error) {
      logger.error({ err: error }, 'Failed to get player stats.');
      return null;
    }
  }

  static async getLeaderboard(guildId, limit = 10) {
    try {
      const rows = query(
        `SELECT user_id, games_played, games_won, games_lost, most_played_role FROM player_stats WHERE guild_id = ? ORDER BY games_won DESC, games_played DESC LIMIT ?`,
        { guild_id: guildId, limit },
      );

      return rows.map((row, index) => {
        const total = row.games_played || 0;
        const wins = row.games_won || 0;
        const rate = total > 0 ? Math.round((wins / total) * 100) : 0;

        return {
          rank: index + 1,
          userId: row.user_id,
          gamesPlayed: total,
          gamesWon: wins,
          gamesLost: row.games_lost || 0,
          winRate: rate,
          mostPlayedRole: row.most_played_role || 'none',
        };
      });
    } catch (error) {
      logger.error({ err: error }, 'Failed to get leaderboard.');
      return [];
    }
  }
}

module.exports = { StatsManager };
