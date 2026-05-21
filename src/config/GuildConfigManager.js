const { query, queryOne, execute } = require('../../database/db');
const logger = require('../utils/logger');

class GuildConfigManager {
  constructor() {
    this.cache = new Map();
  }

  get(guildId) {
    if (this.cache.has(guildId)) {
      return { ...this.cache.get(guildId) };
    }

    try {
      const row = queryOne(
        `SELECT * FROM guild_config WHERE guild_id = ?`,
        { guild_id: guildId },
      );

      if (row) {
        const config = {
          guildId: row.guild_id,
          prefix: row.prefix || '!',
          lang: row.lang || 'ar',
          lobbyChannelId: row.lobby_channel_id || null,
          gameChannelId: row.game_channel_id || null,
          roleChannelId: row.role_channel_id || null,
        };
        this.cache.set(guildId, config);
        return { ...config };
      }
    } catch (error) {
      logger.error({ err: error }, `Failed to get config for guild ${guildId}`);
    }

    return null;
  }

  getOrDefault(guildId) {
    const config = this.get(guildId);
    if (config) return config;

    return {
      guildId,
      prefix: '!',
      lang: 'ar',
      lobbyChannelId: null,
      gameChannelId: null,
      roleChannelId: null,
    };
  }

  set(guildId, updates) {
    try {
      const existing = queryOne(
        `SELECT * FROM guild_config WHERE guild_id = ?`,
        { guild_id: guildId },
      );

      if (existing) {
        const fields = [];
        const params = { guild_id: guildId };

        if (updates.prefix !== undefined) {
          fields.push('prefix = @prefix');
          params.prefix = updates.prefix;
        }
        if (updates.lang !== undefined) {
          fields.push('lang = @lang');
          params.lang = updates.lang;
        }
        if (updates.lobbyChannelId !== undefined) {
          fields.push('lobby_channel_id = @lobby_channel_id');
          params.lobby_channel_id = updates.lobbyChannelId;
        }
        if (updates.gameChannelId !== undefined) {
          fields.push('game_channel_id = @game_channel_id');
          params.game_channel_id = updates.gameChannelId;
        }
        if (updates.roleChannelId !== undefined) {
          fields.push('role_channel_id = @role_channel_id');
          params.role_channel_id = updates.roleChannelId;
        }
        fields.push('updated_at = CURRENT_TIMESTAMP');

        if (fields.length > 1) {
          execute(
            `UPDATE guild_config SET ${fields.join(', ')} WHERE guild_id = @guild_id`,
            params,
          );
        }
      } else {
        execute(
          `INSERT INTO guild_config (guild_id, prefix, lang, lobby_channel_id, game_channel_id, role_channel_id) VALUES (@guild_id, @prefix, @lang, @lobby_channel_id, @game_channel_id, @role_channel_id)`,
          {
            guild_id: guildId,
            prefix: updates.prefix || '!',
            lang: updates.lang || 'ar',
            lobby_channel_id: updates.lobbyChannelId || null,
            game_channel_id: updates.gameChannelId || null,
            role_channel_id: updates.roleChannelId || null,
          },
        );
      }

      this.cache.delete(guildId);
      logger.info(`Guild config updated for ${guildId}`);

      return this.get(guildId);
    } catch (error) {
      logger.error({ err: error }, `Failed to set config for guild ${guildId}`);
      return null;
    }
  }

  invalidateCache(guildId) {
    this.cache.delete(guildId);
  }

  clearCache() {
    this.cache.clear();
  }

  getAllGuilds() {
    try {
      const rows = query(`SELECT guild_id FROM guild_config`);
      return rows.map(r => r.guild_id);
    } catch (error) {
      logger.error({ err: error }, 'Failed to get all guilds.');
      return [];
    }
  }
}

module.exports = new GuildConfigManager();
