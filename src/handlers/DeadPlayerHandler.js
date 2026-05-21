const logger = require('../utils/logger');

class DeadPlayerHandler {
    async handleDeath(player, session, channel) {
        try {
            const dm = await channel.client.users.fetch(player.id).catch(() => null);
            if (dm) {
                await dm.send({
                    embeds: [{
                        title: '💀 لقد مت!',
                        description: `دورك كان **${player.role}**.\nشكراً لمشاركتك في اللعبة.`,
                        color: 0xFF0000,
                        timestamp: new Date().toISOString()
                    }]
                }).catch(() => {});
            }
        } catch (err) {
            logger.error(`Failed to send death message to ${player.id}: ${err.message}`);
        }

        logger.info(`Death message sent to ${player.id} (${player.role})`);
    }
}

module.exports = new DeadPlayerHandler();
