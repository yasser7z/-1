const logger = require('../src/utils/logger');
const interactionRouter = require('../src/interactions/InteractionRouter');
const KingVetoHandler = require('../src/voting/KingVetoHandler');
const ReplayHandler = require('../src/handlers/ReplayHandler');
const lobbyButtons = require('../src/lobby/LobbyButtons');

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction) {
    try {
      if (interaction.isButton()) {
        const customId = interaction.customId;

        if (customId.startsWith('lobby_')) {
          return lobbyButtons.handle(interaction);
        }

        if (customId.startsWith('night_')) {
          return interactionRouter.route(interaction);
        }

        if (customId === 'king_veto_show') {
          return KingVetoHandler.handleVetoShow(interaction);
        }

        if (customId === 'replay_create') {
          return ReplayHandler.handleReplay(interaction);
        }

        if (customId.startsWith('vote_')) {
          return;
        }
      }

      if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'king_veto_select') {
          return KingVetoHandler.handleVetoSelect(interaction);
        }
      }

      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands?.slash?.get(interaction.commandName);
        if (!command) {
          return interaction.reply({ content: '❌ أمر غير معروف.', ephemeral: true });
        }
        await command.execute(interaction);
      }
    } catch (error) {
      logger.error({ err: error }, 'Interaction error.');
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: '❌ حدث خطأ.', ephemeral: true }).catch(() => {});
      }
    }
  },
};
