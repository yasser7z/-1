const logger = require('../src/utils/logger');
const InteractionRouter = require('../src/interactions/InteractionRouter');
const RateLimitGuard = require('../src/security/RateLimitGuard');
const { checkCooldown } = require('../src/utils/cooldown');
const LobbyButtons = require('../src/lobby/LobbyButtons');
const ReplayHandler = require('../src/handlers/ReplayHandler');
const KingVetoHandler = require('../src/voting/KingVetoHandler');
const VoteCollector = require('../src/voting/VoteCollector');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (checkCooldown(interaction.user.id)) return;

        try {
            if (interaction.isButton()) {
                const lobbyManager = interaction.client.lobbyManager;

                if (interaction.customId.startsWith('lobby_')) {
                    return await LobbyButtons.handleInteraction(interaction, lobbyManager);
                }

                if (interaction.customId.startsWith('king_veto')) {
                    const key = `${interaction.guildId}_${interaction.channelId}`;
                    const session = interaction.client.sessionManager.get(key);
                    if (session) return await KingVetoHandler.handleVeto(interaction, session);
                }

                if (interaction.customId.startsWith('vote_')) {
                    const key = `${interaction.guildId}_${interaction.channelId}`;
                    const session = interaction.client.sessionManager.get(key);
                    const voteCollector = new VoteCollector(interaction.client);
                    if (session) {
                        const targetId = interaction.customId.split('_').pop();
                        return await voteCollector.handleVote(interaction, session, targetId);
                    }
                }

                if (interaction.customId === 'replay_game') {
                    return await ReplayHandler.handleReplay(interaction);
                }
            }

            if (interaction.isStringSelectMenu()) {
                if (interaction.customId === 'veto_select') {
                    const key = `${interaction.guildId}_${interaction.channelId}`;
                    const session = interaction.client.sessionManager.get(key);
                    if (session) return await KingVetoHandler.handleVetoSelect(interaction, session);
                }

                const router = new InteractionRouter(interaction.client);
                return await router.route(interaction);
            }

            if (interaction.isChatInputCommand()) {
                const command = interaction.client.slashCommands.get(interaction.commandName);
                if (command) {
                    await command.execute(interaction);
                }
            }

            if (interaction.isButton() || interaction.isStringSelectMenu()) {
                const router = new InteractionRouter(interaction.client);
                await router.route(interaction);
            }
        } catch (err) {
            logger.error(`Interaction error: ${err.message}`);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: '❌ حدث خطأ.', ephemeral: true }).catch(() => {});
            }
        }
    }
};
