const db = require('../../database/db');
const logger = require('../../utils/logger');

module.exports = {
    name: 'ايقاف',
    execute: async (message, args, client) => {
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ هذا الأمر مخصص للمشرفين فقط.');
        }

        const key = `${message.guildId}_${message.channelId}`;
        const lobbyManager = client.lobbyManager;
        const sessionManager = client.sessionManager;

        const lobby = lobbyManager.lobbies.get(key);
        const session = sessionManager.get(key);

        if (!lobby && !session) {
            return message.reply('❌ لا يوجد لوبي أو لعبة نشطة في هذه القناة.');
        }

        if (lobby) {
            lobbyManager.cancelCountdown(lobby);
            if (lobby.inactivityTimer) clearTimeout(lobby.inactivityTimer);
            lobbyManager.lobbies.delete(key);
            db.prepare('DELETE FROM lobby_data WHERE guild_id = ? AND channel_id = ?').run(message.guildId, message.channelId);
            try { await lobby.message.delete().catch(() => {}); } catch (e) {}
        }

        if (session) {
            session.clearPhaseTimer();
            sessionManager.delete(key);
            db.prepare('DELETE FROM active_games WHERE guild_id = ? AND channel_id = ?').run(message.guildId, message.channelId);
            db.prepare('DELETE FROM game_state WHERE game_id = ?').run(key);
            db.prepare('DELETE FROM players WHERE game_id = ?').run(key);
            db.prepare('DELETE FROM action_locks WHERE game_id = ?').run(key);
            db.prepare('DELETE FROM phase_version WHERE game_id = ?').run(key);
        }

        try {
            await message.channel.send('✅ تم إيقاف اللوبي/اللعبة بنجاح.');
        } catch (err) {
            logger.error(`Failed to send stop confirmation: ${err.message}`);
        }

        logger.info(`Session stopped in ${key} by ${message.author.tag}`);
    }
};
