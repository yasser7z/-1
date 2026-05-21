const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { StatsManager } = require('../../stats/StatsManager');
const colors = require('../../constants/colors');
const emojis = require('../../constants/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('أفضل 10 لاعبين من حيث الانتصارات'),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const leaderboard = await StatsManager.getLeaderboard(guildId, 10);

    const embed = new EmbedBuilder()
      .setColor(colors.GOLD)
      .setTitle(`${emojis.MISC.CROWN} لوحة المتصدرين`)
      .setDescription('أفضل اللاعبين في هذه السيرفر')
      .setTimestamp();

    if (leaderboard.length === 0) {
      embed.setDescription('لا توجد إحصائيات بعد.');
      embed.setColor(colors.WARNING);
    } else {
      const medalEmojis = ['🥇', '🥈', '🥉'];
      const entries = leaderboard.map((entry, index) => {
        const medal = medalEmojis[index] || `${index + 1}.`;
        return `${medal} <@${entry.userId}> — 🏆 ${entry.gamesWon} فوز (${entry.winRate}%) — 🎮 ${entry.gamesPlayed} لعب`;
      });

      embed.addFields({
        name: '📋 الترتيب',
        value: entries.join('\n'),
        inline: false,
      });

      embed.setFooter({ text: 'آخر تحديث' });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
