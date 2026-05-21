const { EmbedBuilder } = require('discord.js');
const sessionManager = require('../../core/SessionManager');
const colors = require('../../constants/colors');
const emojis = require('../../constants/emojis');
const logger = require('../../utils/logger');

const COMMAND_NAME = 'كشف';
const COMMAND_ALIASES = ['كشف', 'investigate', 'تحقيق'];

async function execute(message, args) {
  const guildId = message.guildId;
  const channelId = message.channelId;
  const userId = message.author.id;

  const targetUser = message.mentions.users.first();
  if (!targetUser) {
    return message.reply('❌ يجب ذكر اللاعب المستهدف. مثال: `-ذيب كشف @player`');
  }

  const session = sessionManager.get(guildId, channelId);
  if (!session || !session.isActive) {
    return message.reply('❌ لا توجد لعبة نشطة.');
  }

  const player = session.getPlayer(userId);
  if (!player || !player.isAlive) {
    return message.reply('❌ أنت ميت أو لست في اللعبة.');
  }

  if (player.role !== 'Investigator') {
    return message.reply('❌ هذا الأمر للمحقق فقط.');
  }

  const phase = session.stateMachine.getState();
  if (phase !== 'NIGHT') {
    return message.reply('❌ يمكنك استخدام هذا الأمر فقط في الليل.');
  }

  const target = session.getPlayer(targetUser.id);
  if (!target || !target.isAlive) {
    return message.reply('❌ الهدف غير صالح أو ميت.');
  }

  if (target.userId === userId) {
    return message.reply('❌ لا يمكنك التحقيق مع نفسك.');
  }

  const key = `${session.round}_${userId}`;
  if (session.nightActions.has(key)) {
    return message.reply('❌ لقد أرسلت إجراءك بالفعل هذه الليلة.');
  }

  const isWerewolf = target.role === 'Werewolf';

  const embed = new EmbedBuilder()
    .setColor(isWerewolf ? colors.WEREWOLF_RED : colors.SUCCESS)
    .setTitle(`${emojis.ROLES.INVESTIGATOR} نتيجة التحقيق`)
    .setDescription(
      isWerewolf
        ? `🔴 **${targetUser.username}** هو **ذئب**!`
        : `🟢 **${targetUser.username}** ليس ذئباً.`,
    )
    .setFooter({ text: `تحقيق الليلة` })
    .setTimestamp();

  try {
    await message.delete().catch(() => {});
  } catch {}

  const reply = await message.channel.send({ embeds: [embed] });

  session.recordNightAction(userId, targetUser.id, 'INVESTIGATE');

  setTimeout(() => {
    reply.delete().catch(() => {});
  }, 15000);

  logger.info(`${message.author.tag} investigated ${targetUser.tag}`);
}

module.exports = {
  name: COMMAND_NAME,
  aliases: COMMAND_ALIASES,
  description: '[المحقق] كشف فئة لاعب (ذئب أو قروي)',
  execute,
};
