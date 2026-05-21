const config = require('../../config');
const { getDb, execute } = require('../../database/db');
const logger = require('../utils/logger');
const LobbyUIManager = require('./LobbyUIManager');
const GameInitializer = require('../core/GameInitializer');
const sessionManager = require('../core/SessionManager');
const RecoveryService = require('../core/RecoveryService');
const { botCanSend, botCanEmbed } = require('../utils/permissions');
const locale = require('../locales/ar');

class LobbyManager {
  constructor() {
    this.lobbies = new Map();
    this.countdownTimers = new Map();
    this.updateQueues = new Map();
  }

  async createLobby(guildId, channelId, hostId, channel, persist = true) {
    const key = this._key(guildId, channelId);

    if (this.lobbies.has(key)) {
      logger.warn(`Lobby already exists: ${key}`);
      return this.lobbies.get(key);
    }

    const lobby = {
      guildId,
      channelId,
      hostId,
      players: [],
      status: 'open',
      countdownActive: false,
      countdownTimeLeft: config.PHASE_DURATIONS.LOBBY_COUNTDOWN,
      messageId: null,
      message: null,
      channel,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      phaseStartTimestamp: null,
      cancelled: false,

      markAsUpdated() {
        this.lastActivity = Date.now();
      },
    };

    lobby.players.push({
      userId: hostId,
      username: channel.guild.members.me?.user?.username || 'Host',
      displayAvatarURL: '',
    });

    this.lobbies.set(key, lobby);

    if (persist) {
      await RecoveryService.saveLobbyToDb(lobby);
    }

    logger.info(`Lobby created: ${key}`);
    return lobby;
  }

  getLobby(guildId, channelId) {
    return this.lobbies.get(this._key(guildId, channelId)) || null;
  }

  async updateLobbyEmbed(guildId, channelId) {
    const lobby = this.getLobby(guildId, channelId);
    if (!lobby || !lobby.channel) return;

    if (!botCanSend(lobby.channel) || !botCanEmbed(lobby.channel)) {
      logger.warn(`Cannot update embed - missing permissions in #${channelId}`);
      return;
    }

    const isAdmin = false;
    const embed = LobbyUIManager.buildEmbed(lobby);
    const components = LobbyUIManager.buildComponents(lobby, isAdmin);

    try {
      if (lobby.message) {
        await lobby.message.edit({ embeds: [embed], components });
      } else if (lobby.messageId) {
        try {
          const msg = await lobby.channel.messages.fetch(lobby.messageId);
          lobby.message = msg;
          await msg.edit({ embeds: [embed], components });
        } catch {
          const msg = await lobby.channel.send({ embeds: [embed], components });
          lobby.message = msg;
          lobby.messageId = msg.id;
          await RecoveryService.saveLobbyToDb(lobby);
        }
      } else {
        const msg = await lobby.channel.send({ embeds: [embed], components });
        lobby.message = msg;
        lobby.messageId = msg.id;
        await RecoveryService.saveLobbyToDb(lobby);
      }
    } catch (error) {
      logger.error({ err: error }, `Failed to update lobby embed in #${channelId}`);
    }
  }

  async checkAutoStart(guildId, channelId) {
    const lobby = this.getLobby(guildId, channelId);
    if (!lobby) return;

    if (lobby.players.length >= 4 && !lobby.countdownActive && !lobby.cancelled) {
      await this.startCountdown(guildId, channelId);
    }
  }

  async startCountdown(guildId, channelId) {
    const lobby = this.getLobby(guildId, channelId);
    if (!lobby || lobby.countdownActive) return;

    lobby.countdownActive = true;
    lobby.countdownTimeLeft = config.PHASE_DURATIONS.LOBBY_COUNTDOWN;
    lobby.markAsUpdated();

    logger.info(`Countdown started for lobby: ${this._key(guildId, channelId)}`);

    const key = this._key(guildId, channelId);

    if (this.countdownTimers.has(key)) {
      clearInterval(this.countdownTimers.get(key));
    }

    const interval = setInterval(async () => {
      const currentLobby = this.getLobby(guildId, channelId);
      if (!currentLobby || !currentLobby.countdownActive) {
        clearInterval(interval);
        this.countdownTimers.delete(key);
        return;
      }

      currentLobby.countdownTimeLeft -= 1000;
      currentLobby.markAsUpdated();

      if (currentLobby.players.length < 4) {
        clearInterval(interval);
        this.countdownTimers.delete(key);
        await this.cancelCountdown(guildId, channelId, 'العدد غير مكتمل');
        return;
      }

      if (currentLobby.countdownTimeLeft <= 0) {
        clearInterval(interval);
        this.countdownTimers.delete(key);
        await this.endCountdown(guildId, channelId);
        return;
      }

      if (currentLobby.countdownTimeLeft % 10000 === 0 || currentLobby.countdownTimeLeft <= 10000) {
        await this.updateLobbyEmbed(guildId, channelId);
      }
    }, 1000);

    this.countdownTimers.set(key, interval);
    await this.updateLobbyEmbed(guildId, channelId);
  }

  async cancelCountdown(guildId, channelId, reason = '') {
    const lobby = this.getLobby(guildId, channelId);
    if (!lobby) return;

    lobby.countdownActive = false;
    lobby.countdownTimeLeft = config.PHASE_DURATIONS.LOBBY_COUNTDOWN;
    lobby.markAsUpdated();

    const key = this._key(guildId, channelId);
    if (this.countdownTimers.has(key)) {
      clearInterval(this.countdownTimers.get(key));
      this.countdownTimers.delete(key);
    }

    logger.info(`Countdown cancelled for ${key}${reason ? `: ${reason}` : ''}`);

    const embed = LobbyUIManager.buildIncompleteEmbed(lobby);
    const components = LobbyUIManager.buildComponents(lobby, false);
    if (lobby.message) {
      await lobby.message.edit({ embeds: [embed], components }).catch(() => {});
    }
  }

  async endCountdown(guildId, channelId) {
    const lobby = this.getLobby(guildId, channelId);
    if (!lobby) return;

    lobby.countdownActive = false;
    lobby.markAsUpdated();

    logger.info(`Countdown ended for ${this._key(guildId, channelId)}`);

    if (!botCanSend(lobby.channel) || !botCanEmbed(lobby.channel)) {
      logger.error(`Bot lacks permissions in #${channelId}. Aborting game start.`);
      if (lobby.message) {
        await lobby.message.edit({
          content: `${locale.ERRORS.CHANNEL_PERMISSION} تعذر بدء اللعبة.`,
          embeds: [],
          components: [],
        }).catch(() => {});
      }
      return;
    }

    const playerCount = lobby.players.length;
    if (playerCount < 4 || playerCount > config.MAX_PLAYERS) {
      logger.warn(`Cannot start game: ${playerCount} players (need 4-${config.MAX_PLAYERS})`);
      await this.cancelCountdown(guildId, channelId, 'عدد اللاعبين غير مناسب');
      return;
    }

    if (lobby.message) {
      await lobby.message.delete().catch(() => {});
      lobby.message = null;
      lobby.messageId = null;
    }

    try {
      const players = lobby.players.map(p => ({
        userId: p.userId,
        username: p.username,
        displayAvatarURL: p.displayAvatarURL || '',
      }));

      const session = GameInitializer.initialize(players, guildId, channelId);
      sessionManager.set(session);

      await RecoveryService.markSessionInGame(guildId, channelId);

      this.lobbies.delete(this._key(guildId, channelId));

      const PhaseManager = require('../game/PhaseManager');
      const nightActionCollector = require('../night/NightActionCollector');

      await PhaseManager.startGame(session);
      await nightActionCollector.startCollection(session, channel);

      logger.info(`Game started successfully in #${channelId}`);
    } catch (error) {
      logger.error({ err: error }, 'Failed to initialize game.');
      await channel.send({
        content: `❌ فشل بدء اللعبة: ${error.message}`,
      }).catch(() => {});
    }
  }

  checkPlayerCount(guildId, channelId) {
    const lobby = this.getLobby(guildId, channelId);
    if (!lobby) return;

    if (lobby.players.length < 4 && lobby.countdownActive) {
      this.cancelCountdown(guildId, channelId, 'العدد غير مكتمل');
    }
  }

  async cancelLobby(guildId, channelId) {
    const lobby = this.getLobby(guildId, channelId);
    if (!lobby) return;

    lobby.cancelled = true;
    lobby.countdownActive = false;

    const key = this._key(guildId, channelId);
    if (this.countdownTimers.has(key)) {
      clearInterval(this.countdownTimers.get(key));
      this.countdownTimers.delete(key);
    }

    if (lobby.message) {
      try {
        await lobby.message.edit({
          content: '🚫 تم إلغاء اللوبي.',
          embeds: [],
          components: [],
        });
      } catch {}
    }

    this.lobbies.delete(key);
    await RecoveryService.closeSession(guildId, channelId);
    logger.info(`Lobby cancelled: ${key}`);
  }

  deleteLobby(guildId, channelId) {
    const key = this._key(guildId, channelId);

    if (this.countdownTimers.has(key)) {
      clearInterval(this.countdownTimers.get(key));
      this.countdownTimers.delete(key);
    }

    this.lobbies.delete(key);
    logger.info(`Lobby deleted: ${key}`);
  }

  hasActiveLobby(guildId, channelId) {
    return this.lobbies.has(this._key(guildId, channelId));
  }

  _key(guildId, channelId) {
    return `${guildId}_${channelId}`;
  }

  cleanup() {
    for (const [key, timer] of this.countdownTimers) {
      clearInterval(timer);
    }
    this.countdownTimers.clear();
    this.lobbies.clear();
    logger.info('LobbyManager cleaned up all lobbies.');
  }
}

module.exports = new LobbyManager();
