const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { StatsManager } = require('../../stats/StatsManager');
const colors = require('../../constants/colors');
const emojis = require('../../constants/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('عرض إحصائيات لاعب')
    .addUserOption(option =>
      option.setName('player')
        .setDescription('اللاعب (اختياري)')
        .setRequired(false),
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('player') || interaction.user;
    const guildId = interaction.guildId;

    const stats = await StatsManager.getPlayerStats(target.id, guildId);

    const embed = new EmbedBuilder()
      .setColor(colors.INFO)
      .setTitle(`${emojis.MISC.STAR} إحصائيات ${target.username}`)
      .setThumbnail(target.displayAvatarURL({ size: 128 }))
      .setTimestamp();

    if (!stats) {
      embed.setDescription('لم يتم العثور على إحصائيات لهذا اللاعب بعد.');
      embed.setColor(colors.WARNING);
    } else {
      embed.addFields(
        { name: '🎮 ألعاب ملعوبة', value: `${stats.gamesPlayed}`, inline: true },
        { name: '🏆 انتصارات', value: `${stats.gamesWon}`, inline: true },
        { name: '💔 خسائر', value: `${stats.gamesLost}`, inline: true },
        { name: '📊 نسبة الفوز', value: `${stats.winRate}%`, inline: true },
        { name: '🗡️ قتلات', value: `${stats.totalKills}`, inline: true },
        { name: '💊 إنقاذات', value: `${stats.totalSaves}`, inline: true },
        { name: '🔍 تحقيقات', value: `${stats.totalInvestigations}`, inline: true },
        { name: '⭐ مرات MVP', value: `${stats.mvps}`, inline: true },
        { name: '🎭 الدور الأكثر', value: stats.mostPlayedRole || 'لا يوجد', inline: true },
      );
    }

    await interaction.reply({ embeds: [embed] });
  },
};
