const lobbyManager = require('../../lobby/LobbyManager');
const sessionManager = require('../../core/SessionManager');
const logger = require('../../utils/logger');
const locale = require('../../locales/ar');
const colors = require('../../constants/colors');
const { EmbedBuilder } = require('discord.js');

const COMMAND_NAME = 'لوبي';
const COMMAND_ALIASES = ['lobby', 'انشاء'];

async function execute(message, args) {
  const guildId = message.guildId;
  const channelId = message.channelId;
  const member = message.member;
  const channel = message.channel;

  if (!member) return;

  if (lobbyManager.hasActiveLobby(guildId, channelId)) {
    return message.reply({
      content: '📋 يوجد لوبي نشط بالفعل في هذه القناة.',
    });
  }

  if (sessionManager.has(guildId, channelId)) {
    const session = sessionManager.get(guildId, channelId);
    if (session.isActive) {
      return message.reply({
        content: '⚠️ توجد لعبة نشطة في هذه القناة. استخدم -ذيب حل لإنهائها.',
      });
    }
  }

  try {
    const lobby = await lobbyManager.createLobby(
      guildId,
      channelId,
      message.author.id,
      channel,
    );

    await lobbyManager.updateLobbyEmbed(guildId, channelId);

    const embed = new EmbedBuilder()
      .setColor(colors.SUCCESS)
      .setDescription(`✅ تم إنشاء اللوبي بنجاح! استخدم الأزرار أدناه للانضمام.`)
      .setTimestamp();

    await message.reply({ embeds: [embed] });

    logger.info(`${message.author.tag} created lobby in #${channel.name}`);
  } catch (error) {
    logger.error({ err: error }, 'Failed to create lobby.');
    await message.reply({ content: '❌ فشل إنشاء اللوبي.' });
  }
}

module.exports = {
  name: COMMAND_NAME,
  aliases: COMMAND_ALIASES,
  description: 'إنشاء لوبي جديد في القناة الحالية',
  execute,
};
