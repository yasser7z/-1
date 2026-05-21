const { ActivityType } = require('discord.js');
const logger = require('../src/utils/logger');
const { initDb } = require('../database/db');
const { startCleanupJob } = require('../src/jobs/cleanupJob');
const RecoveryService = require('../src/core/RecoveryService');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    logger.info(`✅ Bot logged in as ${client.user.tag}`);

    initDb();
    logger.info('✅ Database initialized.');

    startCleanupJob();
    logger.info('✅ Cleanup job started.');

    await RecoveryService.recoverAll(client);
    logger.info('✅ Recovery completed.');

    client.user.setPresence({
      activities: [{
        name: 'Vale Community',
        type: ActivityType.Playing,
      }],
      status: 'online',
    });

    const guild = client.guilds.cache.get(process.env.GUILD_ID);
    if (guild) {
      try {
        const commands = Array.from(
          client.commands?.slash?.values() || [],
        );
        if (commands.length > 0) {
          await guild.commands.set(commands);
          logger.info(`✅ Registered ${commands.length} slash commands.`);
        }
      } catch (err) {
        logger.error({ err }, 'Failed to register slash commands.');
      }
    }

    logger.info(`🎉 Vale Community bot is ready! Serving ${client.guilds.cache.size} guilds.`);
  },
};
