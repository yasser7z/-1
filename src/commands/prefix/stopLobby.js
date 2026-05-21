const { PermissionsBitField } = require('discord.js');
const lobbyManager = require('../../lobby/LobbyManager');
const sessionManager = require('../../core/SessionManager');
const RecoveryService = require('../../core/RecoveryService');
const logger = require('../../utils/logger');
const colors = require('../../constants/colors');
const { EmbedBuilder } = require('discord.js');

const COMMAND_NAME = 'ايقاف';
const COMMAND_ALIASES = ['ايقاف', 'وقف', 'stop', 'end'];

async function execute(message, args) {
  const guildId = message.guildId;
  const channelId = message.channelId;
  const member = message.member;

  if (!member) return;

  const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
  if (!isAdmin) {
    return message.reply('⚠️ هذا الأمر مخصص للمشرفين فقط.');
  }

  const targetLobby = lobbyManager.getLobby(guildId, channelId);
  const targetSession = sessionManager.get(guildId, channelId);

  if (!targetLobby && !targetSession) {
    return message.reply('✅ لا يوجد لوبي أو لعبة نشطة في هذه القناة.');
  }

  const results = [];

  if (targetLobby) {
    lobbyManager.cancelLobby(guildId, channelId);
    await RecoveryService.closeSession(guildId, channelId);
    results.push('✅ تم إلغاء اللوبي.');
    logger.info(`Lobby cancelled in #${channelId} by ${message.author.tag}`);
  }

  if (targetSession && targetSession.isActive) {
    targetSession.clearAllTimers();
    targetSession.isActive = false;
    sessionManager.delete(guildId, channelId);
    await RecoveryService.closeSession(guildId, channelId);
    results.push('✅ تم إنهاء الجلسة.');
    logger.info(`Session ended in #${channelId} by ${message.author.tag}`);
  }

  const embed = new EmbedBuilder()
    .setColor(colors.WARNING)
    .setTitle('🛑 إيقاف')
    .setDescription(results.join('\n'))
    .setFooter({ text: `بواسطة ${message.author.tag}` })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

module.exports = {
  name: COMMAND_NAME,
  aliases: COMMAND_ALIASES,
  description: '[مشرف فقط] إيقاف اللوبي أو إنهاء اللعبة',
  execute,
};
