const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config');
const colors = require('../constants/colors');
const emojis = require('../constants/emojis');
const locale = require('../locales/ar');
const logger = require('../utils/logger');
const cooldown = require('../utils/cooldown');
const rateLimitGuard = require('../security/RateLimitGuard');
const interactionVersioning = require('../security/InteractionVersioning');
const actionLockManager = require('../security/ActionLockManager');
const { botCanSend } = require('../utils/permissions');

const NIGHT_ACTIONS = {
  Werewolf: { type: 'KILL', label: 'اختر ضحية', emoji: '🐺' },
  Investigator: { type: 'INVESTIGATE', label: 'تحقيق', emoji: '🔍' },
  Bodyguard: { type: 'PROTECT', label: 'حماية', emoji: '🛡️' },
  Doctor: { type: 'SAVE', label: 'إنقاذ', emoji: '💉' },
  Seductress: { type: 'BLOCK', label: 'إغواء', emoji: '💋' },
  Um_Zaki: { type: 'SILENCE', label: 'إسكات', emoji: '🧙' },
};

class NightActionCollector {
  constructor() {
    this.activeCollections = new Map();
  }

  async startCollection(gameSession, channel) {
    const sessionKey = gameSession.sessionKey;
    if (this.activeCollections.has(sessionKey)) {
      logger.warn(`Collection already active for ${sessionKey}`);
      return;
    }

    const version = interactionVersioning.incrementVersion(sessionKey, 'NIGHT');
    actionLockManager.resetForNight(gameSession.round);

    const alivePlayers = gameSession.getAlivePlayers();
    const playersWithAbilities = alivePlayers.filter(p =>
      NIGHT_ACTIONS[p.role] !== undefined,
    );

    const state = {
      sessionKey,
      gameSession,
      channel,
      version,
      playersWithAbilities,
      startTime: Date.now(),
      duration: config.PHASE_DURATIONS.NIGHT,
      timer: null,
      resolved: false,
    };

    this.activeCollections.set(sessionKey, state);

    await this._sendNightEmbeds(gameSession, channel, playersWithAbilities);

    logger.info(
      `Night collection started for ${sessionKey} - ${playersWithAbilities.length} players with abilities`,
    );

    return state;
  }

  async _sendNightEmbeds(gameSession, channel, playersWithAbilities) {
    if (!botCanSend(channel)) return;
    if (playersWithAbilities.length === 0) return;

    const embed = new EmbedBuilder()
      .setColor(colors.DARK_BLUE)
      .setTitle(`${emojis.PHASES.NIGHT} حل الليل`)
      .setDescription(
        `🌙 الليل بدأ... أصحاب القدرات الخاصة اضغطوا الزر لإرسال إجراءاتكم.\n` +
        `⏱️ الوقت المتبقي: ${config.PHASE_DURATIONS.NIGHT / 1000} ثانية`,
      )
      .setFooter({ text: `Vale Community • الليل ${gameSession.round}` });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`night_panel_${gameSession.sessionKey}`)
        .setLabel('🎭 إجراءاتي')
        .setStyle(ButtonStyle.Primary),
    );

    await channel.send({ embeds: [embed], components: [row] });
  }

  _buildTargetButtons(targets, actionType, sessionKey) {
    const rows = [];
    let currentRow = new ActionRowBuilder();

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const customId = `night_${actionType}_${target.userId}_${sessionKey}`;

      const button = new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(target.username.length > 20 ? target.username.slice(0, 18) + '..' : target.username)
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('👤');

      if (currentRow.components.length >= 5) {
        rows.push(currentRow);
        currentRow = new ActionRowBuilder();
      }
      currentRow.addComponents(button);
    }

    if (currentRow.components.length > 0) {
      rows.push(currentRow);
    }

    return rows;
  }

  async handleNightInteraction(interaction) {
    const customId = interaction.customId;
    if (!customId.startsWith('night_')) return false;

    const userId = interaction.user.id;
    const sessionKey = interaction.guildId + '_' + interaction.channelId;

    if (cooldown.check(userId, customId, 500)) {
      await interaction.reply({
        content: '⏳ تمهل بين النقرات.',
        ephemeral: true,
      });
      return true;
    }
    cooldown.set(userId, customId);

    if (rateLimitGuard.isMuted(userId)) {
      const timeLeft = Math.ceil(rateLimitGuard.getMutedTimeLeft(userId) / 1000);
      await interaction.reply({
        content: `🛑 أنت مكتوم لمدة ${timeLeft} ثانية بسبب السبام.`,
        ephemeral: true,
      });
      return true;
    }

    const collectionState = this.activeCollections.get(sessionKey);
    if (!collectionState || collectionState.resolved) {
      await interaction.reply({
        content: '❌ انتهت مهلة الليل أو اللعبة غير نشطة.',
        ephemeral: true,
      });
      return true;
    }

    const gameSession = collectionState.gameSession;
    const player = gameSession.getPlayer(userId);

    if (!player || !player.isAlive) {
      rateLimitGuard.recordClick(userId, false);
      await interaction.reply({
        content: '❌ أنت ميت أو لست في اللعبة.',
        ephemeral: true,
      });
      return true;
    }

    if (customId.startsWith('night_panel_')) {
      const action = NIGHT_ACTIONS[player.role];
      if (!action) {
        return interaction.reply({
          content: '❌ ليس لديك قدرة ليلية.',
          ephemeral: true,
        });
      }

      if (actionLockManager.isLocked(userId, gameSession.round)) {
        return interaction.reply({
          content: '❌ لقد أرسلت إجراءك بالفعل هذه الليلة.',
          ephemeral: true,
        });
      }

      const roleName = locale.ROLES[player.role.toUpperCase()] || player.role;
      const roleDesc = locale.ROLES[`${player.role.toUpperCase()}_DESC`] || '';

      const embed = new EmbedBuilder()
        .setColor(colors.DARK_BLUE)
        .setTitle(`${emojis.PHASES.NIGHT} ${roleName} - ${action.label}`)
        .setDescription(
          `${emojis.MISC.STAR} ${roleDesc}\n\n${locale.GAME.NIGHT_ACTION}\n` +
          `⏱️ الوقت المتبقي: ${config.PHASE_DURATIONS.NIGHT / 1000} ثانية`,
        )
        .setFooter({ text: `Vale Community • الليل ${gameSession.round}` });

      const targets = gameSession.getAlivePlayers().filter(t => t.userId !== player.userId);
      const rows = this._buildTargetButtons(targets, action.type, gameSession.sessionKey);

      return interaction.reply({ embeds: [embed], components: rows, ephemeral: true });
    }

    const parts = customId.split('_');
    const actionType = parts[1];
    const targetId = parts[2];

    const expectedAction = NIGHT_ACTIONS[player.role];
    if (!expectedAction || expectedAction.type !== actionType) {
      rateLimitGuard.recordClick(userId, false);
      await interaction.reply({
        content: '❌ ليس لديك هذه القدرة.',
        ephemeral: true,
      });
      return true;
    }

    if (actionLockManager.isLocked(userId, gameSession.round)) {
      await interaction.reply({
        content: '❌ لقد أرسلت إجراءك بالفعل هذه الليلة.',
        ephemeral: true,
      });
      return true;
    }

    if (targetId === userId) {
      await interaction.reply({
        content: '❌ لا يمكنك استهداف نفسك.',
        ephemeral: true,
      });
      return true;
    }

    const target = gameSession.getPlayer(targetId);
    if (!target || !target.isAlive) {
      await interaction.reply({
        content: '❌ الهدف غير صالح أو ميت.',
        ephemeral: true,
      });
      return true;
    }

    gameSession.recordNightAction(userId, targetId, actionType);
    actionLockManager.lock(userId, actionType, gameSession.round);

    await interaction.reply({
      content: '✅ تم تسجيل إجرائك.',
      ephemeral: true,
    });

    logger.info(
      `Night action: ${player.username} (${player.role}) -> ${target.username} (${actionType})`,
    );

    await this._checkAllActionsReceived(collectionState);

    return true;
  }

  async _checkAllActionsReceived(collectionState) {
    const { gameSession, playersWithAbilities } = collectionState;
    const round = gameSession.round;

    const allDone = playersWithAbilities.every(p =>
      actionLockManager.isLocked(p.userId, round),
    );

    if (allDone && playersWithAbilities.length > 0) {
      logger.info(`All night actions received for round ${round}. Ending night early.`);
      collectionState.resolved = true;
      this.activeCollections.delete(collectionState.sessionKey);
      const PhaseManager = require('../game/PhaseManager');
      await PhaseManager.endNight(gameSession);
    }
  }

  stopCollection(sessionKey) {
    const state = this.activeCollections.get(sessionKey);
    if (state) {
      if (state.timer) {
        clearTimeout(state.timer);
      }
      state.resolved = true;
      this.activeCollections.delete(sessionKey);
      logger.info(`Night collection stopped for ${sessionKey}`);
    }
  }

  getActiveCollection(sessionKey) {
    return this.activeCollections.get(sessionKey) || null;
  }

  isCollecting(sessionKey) {
    return this.activeCollections.has(sessionKey);
  }
}

module.exports = new NightActionCollector();
