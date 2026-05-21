const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../utils/logger');

class ReplayHandler {
    addReplayButton(embed) {
        return embed;
    }

    getReplayRow() {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('replay_game')
                .setLabel('🔄 لعب مرة أخرى')
                .setStyle(ButtonStyle.Primary)
        );
    }

    async handleReplay(interaction) {
        const lobbyManager = interaction.client.lobbyManager;
        const key = `${interaction.guildId}_${interaction.channelId}`;

        if (lobbyManager.lobbies.has(key)) {
            return interaction.reply({ content: '❌ يوجد لوبي نشط بالفعل.', ephemeral: true });
        }

        try {
            const lobby = await lobbyManager.createLobby(interaction.channel);
            await lobbyManager.addPlayer(interaction.user, lobby);
            await interaction.reply({ content: '✅ تم إنشاء لوبي جديد!', ephemeral: true });
        } catch (err) {
            logger.error(`Replay create lobby failed: ${err.message}`);
            await interaction.reply({ content: '❌ حدث خطأ أثناء إنشاء اللوبي.', ephemeral: true });
        }
    }
}

module.exports = new ReplayHandler();
