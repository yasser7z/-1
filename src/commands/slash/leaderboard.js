const { SlashCommandBuilder } = require('discord.js');
const StatsManager = require('../../stats/StatsManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('قائمة الصدارة - أفضل 10 لاعبين'),
    async execute(interaction) {
        const leaderboard = StatsManager.getLeaderboard(10);

        if (leaderboard.length === 0) {
            return interaction.reply({ content: 'لا توجد إحصائيات بعد.', ephemeral: true });
        }

        const lines = leaderboard.map((entry, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            return `${medal} <@${entry.userId}> – **${entry.wins}** فوز (${entry.gamesPlayed} لعبة)`;
        });

        const embed = {
            title: '🏆 قائمة الصدارة',
            description: lines.join('\n'),
            color: 0xFFD700,
            timestamp: new Date().toISOString()
        };

        await interaction.reply({ embeds: [embed] });
    }
};
