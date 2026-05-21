const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const colors = require('../constants/colors');
const emojis = require('../constants/emojis');
const logger = require('../utils/logger');
const lobbyManager = require('../lobby/LobbyManager');
const sessionManager = require('../core/SessionManager');

class ReplayHandler {
  async sendReplayButton(gameSession, channel, winner) {
    const embed = new EmbedBuilder()
      .setColor(winner === 'werewolves' ? colors.WEREWOLF_RED : colors.VILLAGER_GREEN)
      .setTitle('🏁 انتهت اللعبة!')
      .setDescription(
        winner === 'werewolves'
          ? `${emojis.ROLES.WEREWOLF} **انتصار الذئاب!** القطيع يزمجر منتصراً.`
          : `${emojis.STATUS.WIN} **انتصار القرية!** الخير ينتصر دائماً.`
      )
      .addFields(
        { name: '👥 إجمالي اللاعبين', value: `${gameSession.getPlayerCount()}`, inline: true },
        { name: '🔄 عدد الجولات', value: `${gameSession.round}`, inline: true },
        { name: '🏆 الفائز', value: winner === 'werewolves' ? 'الذئاب 🐺' : 'القرويون 👤', inline: true },
      )
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('replay_create')
        .setLabel('🔄 لعب مرة أخرى')
        .setStyle(ButtonStyle.Primary),
    );

    await channel.send({ embeds: [embed], components: [row] });
    logger.info(`Replay button sent for session ${gameSession.sessionKey}`);
  }

  async handleReplay(interaction) {
    const guildId = interaction.guildId;
    const channelId = interaction.channelId;
    const userId = interaction.user.id;
    const channel = interaction.channel;

    if (sessionManager.has(guildId, channelId)) {
      return interaction.reply({ content: '❌ توجد لعبة نشطة حالياً.', ephemeral: true });
    }

    if (lobbyManager.hasActiveLobby(guildId, channelId)) {
      return interaction.reply({ content: '❌ يوجد لوبي نشط في هذه القناة.', ephemeral: true });
    }

    const lobby = await lobbyManager.createLobby(guildId, channelId, userId, channel);
    await lobbyManager.updateLobbyEmbed(guildId, channelId);

    await interaction.reply({ content: '✅ تم إنشاء لوبي جديد! يمكن للجميع الانضمام بالأزرار أعلاه.', ephemeral: true });

    logger.info(`Replay: new lobby created by ${interaction.user.tag} in #${channel.name}`);
  }
}

module.exports = new ReplayHandler();
