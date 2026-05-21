const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const colors = require('../../constants/colors');
const config = require('../../../config');
const guildConfigManager = require('../../config/GuildConfigManager');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set')
    .setDescription('تعديل إعدادات اللعبة (مشرف فقط)')
    .addStringOption(option =>
      option.setName('setting')
        .setDescription('الإعداد')
        .setRequired(true)
        .addChoices(
          { name: '🌙 مدة الليل (ثوان)', value: 'night_duration' },
          { name: '☀️ مدة النهار (ثوان)', value: 'day_duration' },
          { name: '🗳️ مدة التصويت (ثوان)', value: 'voting_duration' },
          { name: '🤖 تصويت الغائبين تلقائي', value: 'auto_absent_vote' },
          { name: '🎭 أسلوب السارد', value: 'narrator_style' },
        ))
    .addStringOption(option =>
      option.setName('value')
        .setDescription('القيمة الجديدة')
        .setRequired(true)),

  async execute(interaction) {
    const member = interaction.member;
    if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return interaction.reply({ content: '⚠️ هذا الأمر للمشرفين فقط.', ephemeral: true });
    }

    const setting = interaction.options.getString('setting');
    const value = interaction.options.getString('value');
    const guildId = interaction.guildId;

    let result;

    switch (setting) {
      case 'night_duration': {
        const sec = parseInt(value, 10);
        if (isNaN(sec) || sec < 10 || sec > 300) {
          return interaction.reply({ content: '❌ يجب أن تكون المدة بين 10 و 300 ثانية.', ephemeral: true });
        }
        config.PHASE_DURATIONS.NIGHT = sec * 1000;
        result = `🌙 مدة الليل → ${sec} ثانية`;
        break;
      }
      case 'day_duration': {
        const sec = parseInt(value, 10);
        if (isNaN(sec) || sec < 10 || sec > 300) {
          return interaction.reply({ content: '❌ يجب أن تكون المدة بين 10 و 300 ثانية.', ephemeral: true });
        }
        config.PHASE_DURATIONS.DAY = sec * 1000;
        result = `☀️ مدة النهار → ${sec} ثانية`;
        break;
      }
      case 'voting_duration': {
        const sec = parseInt(value, 10);
        if (isNaN(sec) || sec < 10 || sec > 300) {
          return interaction.reply({ content: '❌ يجب أن تكون المدة بين 10 و 300 ثانية.', ephemeral: true });
        }
        config.PHASE_DURATIONS.VOTE = sec * 1000;
        result = `🗳️ مدة التصويت → ${sec} ثانية`;
        break;
      }
      case 'auto_absent_vote': {
        const bool = value.toLowerCase() === 'true' || value === '1';
        guildConfigManager.set(guildId, { autoAbsentVote: bool });
        result = `🤖 تصويت الغائبين تلقائي → ${bool ? 'مفعل' : 'معطل'}`;
        break;
      }
      case 'narrator_style': {
        const valid = ['mysterious', 'dramatic', 'sarcastic', 'dark'];
        if (!valid.includes(value.toLowerCase())) {
          return interaction.reply({
            content: `❌ اختر واحداً من: ${valid.join(', ')}`,
            ephemeral: true,
          });
        }
        guildConfigManager.set(guildId, { narratorStyle: value.toLowerCase() });
        result = `🎭 أسلوب السارد → ${value}`;
        break;
      }
      default:
        return interaction.reply({ content: '❌ إعداد غير معروف.', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setColor(colors.SUCCESS)
      .setTitle('⚙️ تم التعديل')
      .setDescription(result)
      .setFooter({ text: `بواسطة ${interaction.user.tag}` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
    logger.info(`Guild ${guildId}: ${result}`);
  },
};
