const { SlashCommandBuilder } = require('discord.js');
const StatsManager = require('../../stats/StatsManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('إحصائيات اللاعب')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('اللاعب (اختياري)')
                .setRequired(false)),
    async execute(interaction) {
        const user = interaction.options.getUser('user') || interaction.user;
        const stats = StatsManager.getStats(user.id);

        const rolesList = Object.entries(stats.rolesPlayed)
            .map(([role, count]) => `${role}: ${count}`)
            .join('\n') || 'لا يوجد';

        const embed = {
            title: `📊 إحصائيات ${user.username}`,
            color: 0x8B5CF6,
            fields: [
                { name: '🏆 انتصارات', value: `${stats.wins}`, inline: true },
                { name: '💀 خسائر', value: `${stats.losses}`, inline: true },
                { name: '🎮 ألعاب', value: `${stats.gamesPlayed}`, inline: true },
                { name: '🎭 الأدوار', value: rolesList, inline: false }
            ],
            thumbnail: { url: user.displayAvatarURL() },
            timestamp: new Date().toISOString()
        };

        await interaction.reply({ embeds: [embed] });
    }
};
