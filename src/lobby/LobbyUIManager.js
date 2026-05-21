const { EmbedBuilder } = require('discord.js');
const colors = require('../constants/colors');
const config = require('../../config/config');
const locales = require('../locales/ar');

class LobbyUIManager {
    static buildLobbyEmbed(lobby) {
        const playerCount = lobby.players.length;
        const max = config.MAX_PLAYERS;
        const countdown = lobby.countdown;

        const playerList = lobby.players.length > 0
            ? lobby.players.map((p, i) => `**${i + 1}.** ${p.username}`).join('\n')
            : 'لا يوجد لاعبون بعد...';

        const footerText = countdown !== null
            ? `⏳ يبدأ تلقائياً بعد ${countdown} ثانية`
            : playerCount >= 4 ? '⏳ جاري بدء العد التنازلي...' : locales.insufficient_players;

        const embed = new EmbedBuilder()
            .setTitle('🐺 ذيب - لوبي اللعبة')
            .setColor(colors.PRIMARY)
            .setDescription(`**اللاعبون (${playerCount}/${max})**\n\n${playerList}`)
            .setFooter({ text: footerText })
            .setTimestamp();

        return embed;
    }
}

module.exports = LobbyUIManager;
