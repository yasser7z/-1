const WinConditionChecker = require('../game/WinConditionChecker');
const PhaseManager = require('../game/PhaseManager');
const logger = require('../utils/logger');

class DisconnectHandler {
    constructor(client) {
        this.client = client;
    }

    async handle(member) {
        const sessions = this.client.sessionManager.getAll();
        for (const session of sessions) {
            if (session.guildId !== member.guild.id) continue;

            const player = session.players.get(member.id);
            if (!player || !player.isAlive) continue;

            player.isAlive = false;
            session.nightActions.delete(member.id);

            try {
                const channel = await this.client.channels.fetch(session.channelId);
                if (channel) {
                    await channel.send(`❌ **${member.user.username}** غادر السيرفر وتم إقصاؤه من اللعبة.`);
                }
            } catch (err) {
                logger.error(`Disconnect announcement failed: ${err.message}`);
            }

            const checker = new WinConditionChecker();
            const winner = checker.check(session);
            if (winner) {
                const pm = new PhaseManager(this.client);
                await pm.endGame(session, winner);
            }

            logger.info(`Player ${member.id} disconnected and was eliminated from ${session.guildId}_${session.channelId}`);
        }
    }
}

module.exports = DisconnectHandler;
