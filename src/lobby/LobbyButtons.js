const { PermissionsBitField } = require('discord.js');
const lobbyManager = require('./LobbyManager');
const RecoveryService = require('../core/RecoveryService');
const logger = require('../utils/logger');
const locale = require('../locales/ar');
const config = require('../../config');

class LobbyButtons {
  static async handle(interaction) {
    if (!interaction.isButton()) return;

    const customId = interaction.customId;
    if (!customId.startsWith('lobby_')) return;

    await interaction.deferReply({ ephemeral: true });

    const guildId = interaction.guildId;
    const channelId = interaction.channelId;
    const userId = interaction.user.id;
    const member = interaction.member;

    try {
      switch (customId) {
        case 'lobby_join':
          await LobbyButtons.handleJoin(interaction, guildId, channelId, userId, member);
          break;
        case 'lobby_leave':
          await LobbyButtons.handleLeave(interaction, guildId, channelId, userId);
          break;
        case 'lobby_cancel':
          await LobbyButtons.handleCancel(interaction, guildId, channelId, userId, member);
          break;
        default:
          await interaction.editReply({ content: 'إجراء غير معروف.' });
      }
    } catch (error) {
      logger.error({ err: error }, 'Lobby button error.');
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'حدث خطأ أثناء معالجة الطلب.', ephemeral: true });
      } else {
        await interaction.editReply({ content: 'حدث خطأ أثناء معالجة الطلب.' });
      }
    }
  }

  static async handleJoin(interaction, guildId, channelId, userId, member) {
    const lobby = lobbyManager.getLobby(guildId, channelId);
    if (!lobby) {
      return interaction.editReply({ content: 'لا يوجد لوبي نشط في هذه القناة.' });
    }

    if (lobby.players.length >= config.MAX_PLAYERS) {
      return interaction.editReply({ content: locale.ERRORS.LOBBY_FULL });
    }

    if (lobby.players.some(p => p.userId === userId)) {
      return interaction.editReply({ content: locale.ERRORS.ALREADY_IN_LOBBY });
    }

    lobby.players.push({
      userId,
      username: interaction.user.username,
      displayAvatarURL: interaction.user.displayAvatarURL({ size: 64 }),
    });

    lobby.markAsUpdated();

    await RecoveryService.saveLobbyToDb(lobby);
    await lobbyManager.updateLobbyEmbed(guildId, channelId);
    await lobbyManager.checkAutoStart(guildId, channelId);

    logger.info(`${interaction.user.tag} joined lobby in #${channelId}`);
    await interaction.editReply({ content: locale.LOBBY.JOINED });
  }

  static async handleLeave(interaction, guildId, channelId, userId) {
    const lobby = lobbyManager.getLobby(guildId, channelId);
    if (!lobby) {
      return interaction.editReply({ content: 'لا يوجد لوبي نشط في هذه القناة.' });
    }

    const index = lobby.players.findIndex(p => p.userId === userId);
    if (index === -1) {
      return interaction.editReply({ content: locale.ERRORS.NOT_IN_LOBBY });
    }

    lobby.players.splice(index, 1);
    lobby.markAsUpdated();

    lobbyManager.checkPlayerCount(guildId, channelId);

    await RecoveryService.saveLobbyToDb(lobby);
    await lobbyManager.updateLobbyEmbed(guildId, channelId);

    if (userId === lobby.hostId && lobby.players.length > 0) {
      lobby.hostId = lobby.players[0].userId;
    }

    if (lobby.players.length === 0) {
      lobbyManager.deleteLobby(guildId, channelId);
      await RecoveryService.closeSession(guildId, channelId);
      logger.info(`Lobby in #${channelId} deleted (all players left).`);
      return interaction.editReply({ content: 'غادرت اللوبي. اللوبي أُغلق لعدم وجود لاعبين.' });
    }

    logger.info(`${interaction.user.tag} left lobby in #${channelId}`);
    await interaction.editReply({ content: locale.LOBBY.LEFT });
  }

  static async handleCancel(interaction, guildId, channelId, userId, member) {
    const lobby = lobbyManager.getLobby(guildId, channelId);
    if (!lobby) {
      return interaction.editReply({ content: 'لا يوجد لوبي نشط.' });
    }

    const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
    const isHost = userId === lobby.hostId;

    if (!isAdmin && !isHost) {
      return interaction.editReply({ content: locale.ERRORS.NOT_HOST });
    }

    lobbyManager.cancelLobby(guildId, channelId);
    await RecoveryService.closeSession(guildId, channelId);

    logger.info(`Lobby in #${channelId} cancelled by ${interaction.user.tag}`);
    await interaction.editReply({ content: 'تم إلغاء اللوبي.' });
  }
}

module.exports = LobbyButtons;
