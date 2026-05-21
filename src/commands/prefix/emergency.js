const { PermissionsBitField } = require('discord.js');
const lobbyManager = require('../../lobby/LobbyManager');
const sessionManager = require('../../core/SessionManager');
const RecoveryService = require('../../core/RecoveryService');
const logger = require('../../utils/logger');
const colors = require('../../constants/colors');
const { EmbedBuilder } = require('discord.js');

const COMMAND_NAME = 'حل';
const COMMAND_ALIASES = ['حل', 'انهاء', 'forceend', 'emergency'];

async function execute(message, args) {
  const guildId = message.guildId;
  const channelId = message.channelId;
  const member = message.member;

  if (!member) return;

  const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
  if (!isAdmin) {
    return message.reply({
      content: '⚠️ هذا الأمر مخصص للمشرفين فقط.',
    });
  }

  let resolvedGuildId = guildId;
  let resolvedChannelId = channelId;
  let targetLobby = lobbyManager.getLobby(guildId, channelId);
  let targetSession = sessionManager.get(guildId, channelId);

  if (!targetLobby && !targetSession) {
    return message.reply({
      content: '✅ لا توجد لعبة أو لوبي عالق في هذه القناة.',
    });
  }

  const results = [];

  if (targetLobby) {
    lobbyManager.cancelLobby(resolvedGuildId, resolvedChannelId);
    results.push('✅ تم إلغاء اللوبي.');
    logger.info(`Emergency: Lobby cancelled in #${channelId} by ${message.author.tag}`);
  }

  if (targetSession && targetSession.isActive) {
    targetSession.clearAllTimers();
    targetSession.isActive = false;
    sessionManager.delete(resolvedGuildId, resolvedChannelId);

    await RecoveryService.closeSession(resolvedGuildId, resolvedChannelId);
    results.push('✅ تم إنهاء الجلسة.');
    logger.info(`Emergency: Session ended in #${channelId} by ${message.author.tag}`);
  }

  const embed = new EmbedBuilder()
    .setColor(colors.WARNING)
    .setTitle('🚨 أمر طوارئ - تم التطبيق')
    .setDescription(results.join('\n'))
    .setFooter({ text: `بواسطة ${message.author.tag}` })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

module.exports = {
  name: COMMAND_NAME,
  aliases: COMMAND_ALIASES,
  description: '[مشرف فقط] إنهاء أي لعبة أو لوبي عالق',
  execute,
};
