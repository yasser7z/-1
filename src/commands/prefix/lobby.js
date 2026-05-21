const logger = require('../../utils/logger');

module.exports = {
    name: 'لوبي',
    execute: async (message, args, client) => {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ هذا الأمر مخصص للمشرفين فقط.');
        }

        const lobbyManager = client.lobbyManager;
        const key = `${message.guildId}_${message.channelId}`;

        if (lobbyManager.lobbies.has(key)) {
            return message.reply('❌ يوجد بالفعل لوبي نشط في هذه القناة.');
        }

        try {
            await lobbyManager.createLobby(message.channel);
            logger.info(`Lobby created via command by ${message.author.tag} in ${message.guildId}_${message.channelId}`);
        } catch (err) {
            logger.error(`Failed to create lobby: ${err.message}`);
            message.reply('❌ حدث خطأ أثناء إنشاء اللوبي.');
        }
    }
};
