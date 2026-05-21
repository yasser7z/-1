const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const colors = require('../constants/colors');
const emojis = require('../constants/emojis');
const logger = require('../utils/logger');
const sessionManager = require('../core/SessionManager');
const voteCollector = require('./VoteCollector');
const PhaseManager = require('../game/PhaseManager');

class KingVetoHandler {
  async sendVetoButton(gameSession, channel) {
    const king = gameSession.getPlayersByRole('King')[0];
    if (!king || !king.isAlive) return null;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('king_veto_show')
        .setLabel('👑 فيتو ملكي')
        .setStyle(ButtonStyle.Danger),
    );

    await channel.send({
      content: `👑 <@${king.userId}>، أنت الملك. لديك صلاحية الفيتو!`,
      components: [row],
    });

    return king.userId;
  }

  async handleVetoShow(interaction) {
    const userId = interaction.user.id;
    const guildId = interaction.guildId;
    const channelId = interaction.channelId;

    const gameSession = sessionManager.get(guildId, channelId);
    if (!gameSession) {
      return interaction.reply({ content: '❌ لا توجد لعبة.', ephemeral: true });
    }

    const king = gameSession.getPlayer(userId);
    if (!king || king.role !== 'King' || !king.isAlive) {
      return interaction.reply({ content: '❌ أنت لست الملك أو ميت.', ephemeral: true });
    }

    const phase = gameSession.stateMachine.getState();
    if (phase !== 'DAY_VOTE') {
      return interaction.reply({ content: '❌ يمكنك استخدام الفيتو فقط أثناء التصويت.', ephemeral: true });
    }

    const alive = gameSession.getAlivePlayers().filter(p => p.userId !== userId);
    if (alive.length === 0) {
      return interaction.reply({ content: '❌ لا توجد أهداف متاحة.', ephemeral: true });
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('king_veto_select')
      .setPlaceholder('اختر هدف الإعدام المباشر')
      .addOptions(
        alive.map(p => ({
          label: p.username.slice(0, 100),
          value: p.userId,
          description: `إعدام ${p.username}`,
        })),
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);
    await interaction.reply({ content: '👑 اختر الهدف:', components: [row], ephemeral: true });
  }

  async handleVetoSelect(interaction) {
    const userId = interaction.user.id;
    const targetId = interaction.values[0];
    const guildId = interaction.guildId;
    const channelId = interaction.channelId;

    const gameSession = sessionManager.get(guildId, channelId);
    if (!gameSession) {
      return interaction.reply({ content: '❌ لا توجد لعبة.', ephemeral: true });
    }

    const player = gameSession.getPlayer(targetId);
    if (!player || !player.isAlive) {
      return interaction.reply({ content: '❌ الهدف ميت.', ephemeral: true });
    }

    voteCollector.cancelVote(gameSession.sessionKey);

    gameSession.lynchPlayer(targetId);
    gameSession.clearTimer('vote_phase');

    const embed = new EmbedBuilder()
      .setColor(colors.GOLD)
      .setTitle(`👑 أمر ملكي - إعدام فوري`)
      .setDescription(
        `الملك <@${userId}> استخدم الفيتو!\n` +
        `تم إعدام <@${targetId}> فوراً.\n` +
        `كان دوره: **${player.role}**`
      )
      .setTimestamp();

    const channel = interaction.channel;
    await channel.send({ embeds: [embed] });

    await interaction.update({ content: `✅ تم إعدام <@${targetId}> بأمر ملكي.`, components: [], ephemeral: true });

    logger.info(`King ${userId} vetoed and lynched ${targetId}`);

    const WinConditionChecker = require('../game/WinConditionChecker');
    const winner = WinConditionChecker.check(gameSession);
    if (winner) {
      await PhaseManager.endGame(gameSession, winner);
    } else {
      gameSession.round++;
      gameSession.stateMachine.transitionTo('NIGHT', 'King veto');
      gameSession.phaseStartTimestamp = Date.now();
      const nightActionCollector = require('../night/NightActionCollector');
      if (gameSession.channel) {
        const aliveList = gameSession.getAlivePlayers().map(p => `<@${p.userId}>`).join(' ');
        await gameSession.channel.send({
          content: `🌙 **حل الليل - الليلة ${gameSession.round}**\nأصحاب القدرات يستعدون...\n\n**اللاعبون الأحياء (${gameSession.getAliveCount()})**\n${aliveList}`,
        }).catch(() => {});
        await nightActionCollector.startCollection(gameSession, gameSession.channel);
      }
      await PhaseManager.runNight(gameSession);
    }
  }
}

module.exports = new KingVetoHandler();
