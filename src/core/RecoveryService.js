const { query, execute, getDb } = require('../../database/db');
const logger = require('../utils/logger');
const lobbyManager = require('../lobby/LobbyManager');
const sessionManager = require('./SessionManager');
const GameSession = require('./GameSession');

class RecoveryService {
  static async recoverAll(client) {
    logger.info('Starting recovery of sessions and lobbies...');

    try {
      await RecoveryService.recoverLobbies(client);
      await RecoveryService.recoverGameSessions(client);
      await RecoveryService.cleanupStaleEntries();
    } catch (error) {
      logger.error({ err: error }, 'Recovery process failed.');
    }

    logger.info('Recovery completed.');
  }

  static async recoverLobbies(client) {
    try {
      const lobbies = query(
        `SELECT * FROM lobby_sessions WHERE status = 'open'`,
      );

      for (const lobby of lobbies) {
        try {
          const guild = await client.guilds.fetch(lobby.guild_id);
          const channel = await guild.channels.fetch(lobby.channel_id);

          let hostMember = null;
          try {
            hostMember = await guild.members.fetch(lobby.host_id);
          } catch {
            logger.warn(`Host ${lobby.host_id} not found, skipping lobby.`);
            execute(`UPDATE lobby_sessions SET status = 'closed' WHERE id = ?`, {
              id: lobby.id,
            });
            continue;
          }

          const players = JSON.parse(lobby.players || '[]');

          lobbyManager.createLobby(
            lobby.guild_id,
            lobby.channel_id,
            lobby.host_id,
            channel,
            false,
          );

          const currentLobby = lobbyManager.getLobby(
            lobby.guild_id,
            lobby.channel_id,
          );
          if (currentLobby) {
            currentLobby.messageId = lobby.message_id;
            currentLobby.createdAt = new Date(lobby.created_at).getTime();

            for (const p of players) {
              if (p.userId !== lobby.host_id) {
                currentLobby.players.push({
                  userId: p.userId,
                  username: p.username,
                  displayAvatarURL: p.displayAvatarURL || '',
                });
              }
            }

            if (lobby.phase_start_timestamp) {
              currentLobby.phaseStartTimestamp = lobby.phase_start_timestamp;
            }
          }

          logger.info(`Recovered lobby in #${channel.name}`);
        } catch (err) {
          logger.warn(
            { err },
            `Failed to recover lobby ${lobby.guild_id}_${lobby.channel_id}`,
          );
          execute(`UPDATE lobby_sessions SET status = 'closed' WHERE id = ?`, {
            id: lobby.id,
          });
        }
      }
    } catch (error) {
      logger.error({ err: error }, 'Failed to recover lobbies.');
    }
  }

  static async recoverGameSessions(client) {
    try {
      const sessions = query(
        `SELECT * FROM lobby_sessions WHERE status = 'in_game'`,
      );

      for (const record of sessions) {
        try {
          const guild = await client.guilds.fetch(record.guild_id);
          const channel = await guild.channels.fetch(record.channel_id);
          const players = JSON.parse(record.players || '[]');

          const gameSession = GameSession.fromJSON({
            guildId: record.guild_id,
            channelId: record.channel_id,
            players,
            phase: 'NIGHT',
            phaseStartTimestamp: record.phase_start_timestamp || Date.now(),
            isActive: true,
          });

          sessionManager.set(gameSession);
          logger.info(
            `Recovered game session in #${channel.name} (${record.guild_id})`,
          );
        } catch (err) {
          logger.warn(
            { err },
            `Failed to recover game session ${record.guild_id}_${record.channel_id}`,
          );
          execute(
            `UPDATE lobby_sessions SET status = 'closed' WHERE id = ?`,
            { id: record.id },
          );
        }
      }
    } catch (error) {
      logger.error({ err: error }, 'Failed to recover game sessions.');
    }
  }

  static async cleanupStaleEntries() {
    try {
      const staleCutoff = Date.now() - 24 * 60 * 60 * 1000;
      const result = execute(
        `DELETE FROM lobby_sessions WHERE phase_start_timestamp IS NOT NULL AND phase_start_timestamp < ? AND status != 'open'`,
        { cutoff: staleCutoff },
      );
      if (result.changes > 0) {
        logger.info(`Cleaned up ${result.changes} stale entries.`);
      }
    } catch (error) {
      logger.error({ err: error }, 'Failed to clean stale entries.');
    }
  }

  static async saveLobbyToDb(lobby) {
    try {
      const existing = query(
        `SELECT id FROM lobby_sessions WHERE guild_id = ? AND channel_id = ?`,
        { guild_id: lobby.guildId, channel_id: lobby.channelId },
      );

      const playersJson = JSON.stringify(lobby.players.map(p => ({
        userId: p.userId,
        username: p.username,
        displayAvatarURL: p.displayAvatarURL || '',
      })));

      if (existing.length > 0) {
        execute(
          `UPDATE lobby_sessions SET status = ?, players = ?, message_id = ?, host_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
          {
            status: lobby.status || 'open',
            players: playersJson,
            message_id: lobby.messageId || '',
            host_id: lobby.hostId,
            id: existing[0].id,
          },
        );
      } else {
        execute(
          `INSERT INTO lobby_sessions (guild_id, channel_id, message_id, host_id, players, status, phase_start_timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          {
            guild_id: lobby.guildId,
            channel_id: lobby.channelId,
            message_id: lobby.messageId || '',
            host_id: lobby.hostId,
            players: playersJson,
            status: lobby.status || 'open',
            phase_start_timestamp: lobby.phaseStartTimestamp || null,
          },
        );
      }
    } catch (error) {
      logger.error({ err: error }, 'Failed to save lobby to database.');
    }
  }

  static async markSessionInGame(guildId, channelId) {
    execute(
      `UPDATE lobby_sessions SET status = 'in_game' WHERE guild_id = ? AND channel_id = ?`,
      { guild_id: guildId, channel_id: channelId },
    );
  }

  static async closeSession(guildId, channelId) {
    execute(
      `UPDATE lobby_sessions SET status = 'closed' WHERE guild_id = ? AND channel_id = ?`,
      { guild_id: guildId, channel_id: channelId },
    );
  }
}

module.exports = RecoveryService;
