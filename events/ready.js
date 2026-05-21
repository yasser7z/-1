const { REST, Routes } = require('discord.js');
const logger = require('../src/utils/logger');
const { startCleanupJob } = require('../src/jobs/cleanupJob');
const RecoveryService = require('../src/core/RecoveryService');

const commands = [
    require('../src/commands/slash/stats'),
    require('../src/commands/slash/leaderboard'),
    require('../src/commands/slash/investigate'),
    require('../src/commands/slash/set')
];

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        logger.info(`✅ Bot online as ${client.user.tag}`);

        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        const commandData = commands.map(cmd => cmd.data.toJSON());

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                await rest.put(
                    Routes.applicationCommands(process.env.CLIENT_ID),
                    { body: commandData }
                );
                logger.info('✅ Slash commands registered');
                break;
            } catch (err) {
                logger.error(`Slash command registration attempt ${attempt} failed: ${err.message}`);
                if (attempt < 3) {
                    await new Promise(r => setTimeout(r, 5000));
                }
            }
        }

        const channel = client.channels.cache.get(process.env.WELCOME_CHANNEL);
        if (channel) {
            channel.send('🐺 **Vale Community** – البوت جاهز للعب!');
        }

        startCleanupJob();
        logger.info('✅ Cleanup cron started');

        const recovery = new RecoveryService(client, client.sessionManager);
        await recovery.recoverAll();
        logger.info('✅ Sessions recovered');
    }
};
