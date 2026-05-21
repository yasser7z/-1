const { PermissionsBitField } = require('discord.js');
const logger = require('../../utils/logger');
const colors = require('../../constants/colors');
const { EmbedBuilder } = require('discord.js');

const COMMAND_NAME = 'اطفاء';
const COMMAND_ALIASES = ['اطفاء', 'shutdown', 'stop', 'اغلاق'];

async function execute(message, args) {
  const member = message.member;

  if (!member) return;

  const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
  if (!isAdmin) {
    return message.reply({
      content: '⚠️ هذا الأمر مخصص للمشرفين فقط.',
    });
  }

  const embed = new EmbedBuilder()
    .setColor(colors.ERROR)
    .setTitle('🛑 إيقاف البوت')
    .setDescription('جارٍ إيقاف البوت...')
    .setTimestamp();

  await message.reply({ embeds: [embed] });

  logger.warn(`Bot shutdown initiated by ${message.author.tag}`);

  setTimeout(() => {
    process.exit(0);
  }, 2000);
}

module.exports = {
  name: COMMAND_NAME,
  aliases: COMMAND_ALIASES,
  description: '[مشرف فقط] إيقاف تشغيل البوت',
  execute,
};
