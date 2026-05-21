const logger = require('../utils/logger');

class WinConditionChecker {
    check(session) {
        const alivePlayers = Array.from(session.players.values()).filter(p => p.isAlive);
        const aliveWolves = alivePlayers.filter(p => p.role === 'werewolf');
        const aliveNonWolves = alivePlayers.filter(p => p.role !== 'werewolf');

        if (aliveWolves.length === 0) {
            logger.info(`Villagers win in ${session.guildId}_${session.channelId}`);
            return 'villagers';
        }

        if (aliveWolves.length >= aliveNonWolves.length) {
            logger.info(`Wolves win in ${session.guildId}_${session.channelId}`);
            return 'wolves';
        }

        return null;
    }
}

module.exports = WinConditionChecker;
