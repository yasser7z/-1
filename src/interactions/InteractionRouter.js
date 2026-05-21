const logger = require('../utils/logger');
const cooldown = require('../utils/cooldown');
const rateLimitGuard = require('../security/RateLimitGuard');
const interactionVersioning = require('../security/InteractionVersioning');
const actionLockManager = require('../security/ActionLockManager');
const lobbyButtons = require('../lobby/LobbyButtons');
const nightActionCollector = require('../night/NightActionCollector');
const sessionManager = require('../core/SessionManager');
const locale = require('../locales/ar');

const BUTTON_COOLDOWN = 500;

class InteractionRouter {
  constructor() {
    this.handlers = new Map();
    this._registerHandlers();
  }

  _registerHandlers() {
    this.handlers.set('lobby_join', {
      handler: (i) => lobbyButtons.handle(i),
      requiresSession: false,
      requiresAlive: false,
    });

    this.handlers.set('lobby_leave', {
      handler: (i) => lobbyButtons.handle(i),
      requiresSession: false,
      requiresAlive: false,
    });

    this.handlers.set('lobby_cancel', {
      handler: (i) => lobbyButtons.handle(i),
      requiresSession: false,
      requiresAlive: false,
    });

    this.handlers.set('night_KILL', {
      handler: (i) => nightActionCollector.handleNightInteraction(i),
      requiresSession: true,
      requiresAlive: true,
      phase: 'NIGHT',
    });

    this.handlers.set('night_INVESTIGATE', {
      handler: (i) => nightActionCollector.handleNightInteraction(i),
      requiresSession: true,
      requiresAlive: true,
      phase: 'NIGHT',
    });

    this.handlers.set('night_PROTECT', {
      handler: (i) => nightActionCollector.handleNightInteraction(i),
      requiresSession: true,
      requiresAlive: true,
      phase: 'NIGHT',
    });

    this.handlers.set('night_SAVE', {
      handler: (i) => nightActionCollector.handleNightInteraction(i),
      requiresSession: true,
      requiresAlive: true,
      phase: 'NIGHT',
    });

    this.handlers.set('night_BLOCK', {
      handler: (i) => nightActionCollector.handleNightInteraction(i),
      requiresSession: true,
      requiresAlive: true,
      phase: 'NIGHT',
    });

    this.handlers.set('night_SILENCE', {
      handler: (i) => nightActionCollector.handleNightInteraction(i),
      requiresSession: true,
      requiresAlive: true,
      phase: 'NIGHT',
    });
  }

  async route(interaction) {
    if (!interaction.isButton()) return;

    const customId = interaction.customId;
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const channelId = interaction.channelId;
    const sessionKey = `${guildId}_${channelId}`;

    if (rateLimitGuard.isMuted(userId)) {
      const timeLeft = Math.ceil(rateLimitGuard.getMutedTimeLeft(userId) / 1000);
      if (interaction.deferred || interaction.replied) return;
      return interaction.reply({
        content: `🛑 أنت مكتوم لمدة ${timeLeft} ثانية.`,
        ephemeral: true,
      });
    }

    if (cooldown.check(userId, customId, BUTTON_COOLDOWN)) {
      return;
    }

    const prefix = customId.split('_').slice(0, 2).join('_');
    const firstPrefix = customId.split('_')[0] === 'night'
      ? customId.split('_').slice(0, 2).join('_')
      : customId.split('_')[0];

    const handlerKey = customId.startsWith('night_')
      ? customId.split('_').slice(0, 2).join('_')
      : customId.split('_')[0];

    const handlerConfig = this.handlers.get(handlerKey) || this.handlers.get(firstPrefix);

    if (!handlerConfig) {
      return;
    }

    cooldown.set(userId, customId);

    if (handlerConfig.requiresSession) {
      const session = sessionManager.get(guildId, channelId);
      if (!session || !session.isActive) {
        rateLimitGuard.recordClick(userId, false);
        return interaction.reply({
          content: '❌ لا توجد جلسة نشطة.',
          ephemeral: true,
        });
      }

      if (handlerConfig.requiresAlive) {
        const player = session.getPlayer(userId);
        if (!player || !player.isAlive) {
          rateLimitGuard.recordClick(userId, false);
          return interaction.reply({
            content: '❌ أنت ميت أو لست في اللعبة.',
            ephemeral: true,
          });
        }
      }

      if (handlerConfig.phase) {
        const currentPhase = session.stateMachine.getState();
        if (currentPhase !== handlerConfig.phase) {
          rateLimitGuard.recordClick(userId, false);
          return interaction.reply({
            content: `❌ هذه الأزرار خاصة بمرحلة ${handlerConfig.phase}، المرحلة الحالية: ${currentPhase}.`,
            ephemeral: true,
          });
        }

        const versionCheck = interactionVersioning.validateInteraction(
          sessionKey,
          handlerConfig.phase,
          -1,
        );

        if (!versionCheck.valid) {
          return interaction.reply({
            content: '❌ هذا التفاعل من مرحلة قديمة. استخدم الأزرار الجديدة.',
            ephemeral: true,
          });
        }
      }
    }

    try {
      await handlerConfig.handler(interaction);
    } catch (error) {
      logger.error({ err: error }, `Interaction routing error for ${customId}`);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ حدث خطأ أثناء معالجة طلبك.',
          ephemeral: true,
        }).catch(() => {});
      } else if (interaction.deferred) {
        await interaction.editReply({
          content: '❌ حدث خطأ أثناء معالجة طلبك.',
        }).catch(() => {});
      }
    }
  }

  registerHandler(pattern, config) {
    this.handlers.set(pattern, config);
  }
}

module.exports = new InteractionRouter();
