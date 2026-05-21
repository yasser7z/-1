const logger = require('../../utils/logger');

module.exports = {
    name: 'حالة',
    execute: async (message, args, client) => {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply({ content: '❌ هذا الأمر مخصص للمشرفين فقط.', ephemeral: true });
        }

        const key = `${message.guildId}_${message.channelId}`;
        const session = client.sessionManager.get(key);

        if (!session) {
            return message.reply('❌ لا توجد لعبة نشطة في هذه القناة.');
        }

        const alivePlayers = Array.from(session.players.values()).filter(p => p.isAlive);
        const deadPlayers = Array.from(session.players.values()).filter(p => !p.isAlive);

        const aliveList = alivePlayers.map(p => `🟢 ${p.username} (${p.role})`).join('\n') || 'لا يوجد';
        const deadList = deadPlayers.map(p => `🔴 ${p.username} (${p.role})`).join('\n') || 'لا يوجد';

        const embed = {
            title: '📋 حالة اللعبة',
            color: 0x8B5CF6,
            fields: [
                { name: '🔄 المرحلة', value: session.state, inline: true },
                { name: '👥 الأحياء', value: `${alivePlayers.length}`, inline: true },
                { name: '💀 الموتى', value: `${deadPlayers.length}`, inline: true },
                { name: '🟢 قائمة الأحياء', value: aliveList, inline: false },
                { name: '🔴 قائمة الموتى', value: deadList, inline: false }
            ],
            timestamp: new Date().toISOString()
        };

        await message.reply({ embeds: [embed] });
    }
};
