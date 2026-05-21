const db = require('../../database/db');
const logger = require('../../utils/logger');

module.exports = {
    name: 'حل',
    execute: async (message, args, client) => {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ هذا الأمر مخصص للمشرفين فقط.');
        }

        const key = `${message.guildId}_${message.channelId}`;
        const lobbyManager = client.lobbyManager;
        const sessionManager = client.sessionManager;

        const lobby = lobbyManager.lobbies.get(key);
        if (lobby) {
            lobbyManager.cancelCountdown(lobby);
            if (lobby.inactivityTimer) clearTimeout(lobby.inactivityTimer);
            lobbyManager.lobbies.delete(key);
        }

        const session = sessionManager.get(key);
        if (session) {
            session.clearPhaseTimer();
            sessionManager.delete(key);
        }

        db.prepare('DELETE FROM active_games WHERE guild_id = ? AND channel_id = ?').run(message.guildId, message.channelId);
        db.prepare('DELETE FROM lobby_data WHERE guild_id = ? AND channel_id = ?').run(message.guildId, message.channelId);
        db.prepare('DELETE FROM game_state WHERE game_id = ?').run(key);
        db.prepare('DELETE FROM players WHERE game_id = ?').run(key);
        db.prepare('DELETE FROM action_locks WHERE game_id = ?').run(key);
        db.prepare('DELETE FROM phase_version WHERE game_id = ?').run(key);

        try {
            await message.channel.send({
                embeds: [{
                    title: '🐺 تم حل المشكلة',
                    description: 'تم إنهاء الجلسة الحالية بقوة بواسطة المشرف. نأسف للإزعاج.',
                    color: 0xFF0000,
                    timestamp: new Date().toISOString()
                }]
            });
        } catch (err) {
            logger.error(`Failed to send emergency message: ${err.message}`);
        }

        logger.info(`Emergency resolution executed in ${key} by ${message.author.tag}`);
    }
};
