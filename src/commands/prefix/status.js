const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const colors = require('../../constants/colors');
const lobbyManager = require('../../lobby/LobbyManager');
const sessionManager = require('../../core/SessionManager');

const COMMAND_NAME = 'حالة';
const COMMAND_ALIASES = ['case', 'status', 'state'];

async function execute(message, args) {
  const member = message.member;
  if (!member) return;

  const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
  if (!isAdmin) {
    return message.reply({ content: '⚠️ هذا الأمر للمشرفين فقط.' });
  }

  const guildId = message.guildId;
  const channelId = message.channelId;

  const embed = new EmbedBuilder()
    .setColor(colors.INFO)
    .setTitle('📋 حالة السيرفر')
    .setTimestamp();

  const lobby = lobbyManager.getLobby(guildId, channelId);
  const session = sessionManager.get(guildId, channelId);

  if (lobby) {
    embed.addFields({
      name: '🔄 اللوبي',
      value:
        `**الحالة:** ${lobby.countdownActive ? 'عد تنازلي' : 'انتظار'}\n` +
        `**اللاعبون:** ${lobby.players.length}/16\n` +
        `**المضيف:** <@${lobby.hostId}>\n` +
        `**تاريخ الإنشاء:** <t:${Math.floor(lobby.createdAt / 1000)}:R>`,
      inline: false,
    });
  }

  if (session && session.isActive) {
    const alive = session.getAlivePlayers();
    const dead = session.getDeadPlayers();
    const phase = session.stateMachine.getState();

    const phaseNames = {
      NIGHT: '🌙 ليل',
      DAY_DISCUSSION: '☀️ نقاش',
      DAY_VOTE: '🗳️ تصويت',
      DAY_TRIAL: '⚖️ محاكمة',
      GAME_OVER: '🏁 انتهت',
      CANCELLED: '🚫 ملغية',
    };

    embed.addFields(
      {
        name: '🎮 اللعبة',
        value:
          `**المرحلة:** ${phaseNames[phase] || phase}\n` +
          `**الجولة:** ${session.round}\n` +
          `**الأحياء:** ${alive.length}\n` +
          `**الأموات:** ${dead.length}\n` +
          `**المدة:** ${Math.floor((Date.now() - session.phaseStartTimestamp) / 1000)}ث`,
        inline: false,
      },
      {
        name: '✅ الأحياء',
        value: alive.length > 0
          ? alive.map(p => `• <@${p.userId}> (${p.role})`).join('\n')
          : 'لا يوجد',
        inline: true,
      },
      {
        name: '💀 الأموات',
        value: dead.length > 0
          ? dead.map(p => `• <@${p.userId}> (${p.role})`).join('\n')
          : 'لا يوجد',
        inline: true,
      },
    );
  } else if (!lobby) {
    embed.setDescription('❌ لا توجد لعبة أو لوبي نشط في هذه القناة.');
  }

  await message.reply({ embeds: [embed] });
}

module.exports = {
  name: COMMAND_NAME,
  aliases: COMMAND_ALIASES,
  description: '[مشرف] عرض حالة اللعبة',
  execute,
};
