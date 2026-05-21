const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config/config');
const locales = require('../locales/ar');

class LobbyButtons {
    static createActionRow() {
        const join = new ButtonBuilder()
            .setCustomId('lobby_join')
            .setLabel('انضمام')
            .setStyle(ButtonStyle.Success)
            .setEmoji('✅');

        const leave = new ButtonBuilder()
            .setCustomId('lobby_leave')
            .setLabel('مغادرة')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌');

        const cancel = new ButtonBuilder()
            .setCustomId('lobby_cancel')
            .setLabel('إلغاء')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('⛔');

        return new ActionRowBuilder().addComponents(join, leave, cancel);
    }

    static async handleInteraction(interaction, lobbyManager) {
        const key = `${interaction.guildId}_${interaction.channelId}`;
        const lobby = lobbyManager.lobbies.get(key);

        if (!lobby) {
            return interaction.reply({ content: 'لا يوجد لوبي في هذه القناة.', ephemeral: true });
        }

        switch (interaction.customId) {
            case 'lobby_join': {
                const result = await lobbyManager.addPlayer(interaction.user, lobby);
                if (result.success) {
                    await interaction.reply({ content: '✅ تم الانضمام إلى اللوبي!', ephemeral: true });
                } else {
                    const msg = result.reason === 'max_players' ? locales.max_players
                        : result.reason === 'already_joined' ? 'أنت بالفعل في اللوبي.'
                        : result.reason === 'already_started' ? 'اللعبة بدأت بالفعل.'
                        : 'حدث خطأ.';
                    await interaction.reply({ content: msg, ephemeral: true });
                }
                break;
            }
            case 'lobby_leave': {
                const result = await lobbyManager.removePlayer(interaction.user, lobby);
                if (result.success) {
                    await interaction.reply({ content: '✅ تمت المغادرة من اللوبي.', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'أنت لست في اللوبي.', ephemeral: true });
                }
                break;
            }
            case 'lobby_cancel': {
                if (!interaction.memberPermissions?.has('Administrator')) {
                    return interaction.reply({ content: '❌ هذا الأمر مخصص للمشرفين فقط.', ephemeral: true });
                }
                await lobbyManager.deleteLobby(lobby, 'cancelled');
                await interaction.reply({ content: '✅ تم إلغاء اللوبي.', ephemeral: true });
                break;
            }
        }
    }
}

module.exports = LobbyButtons;
