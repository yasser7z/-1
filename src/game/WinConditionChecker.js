const logger = require('../utils/logger');

class WinConditionChecker {
  static check(gameSession) {
    const alivePlayers = gameSession.getAlivePlayers();
    const aliveWolves = alivePlayers.filter(p => p.role === 'Werewolf');
    const aliveVillagers = alivePlayers.filter(p => p.role !== 'Werewolf');

    const wolfCount = aliveWolves.length;
    const villagerCount = aliveVillagers.length;

    logger.debug(
      `Win check: ${wolfCount} wolves vs ${villagerCount} villagers alive.`,
    );

    if (wolfCount >= villagerCount && wolfCount > 0) {
      logger.info('Werewolves win condition met.');
      return 'werewolves';
    }

    if (wolfCount === 0) {
      logger.info('Villagers win condition met.');
      return 'villagers';
    }

    return null;
  }

  static isGameOver(gameSession) {
    return WinConditionChecker.check(gameSession) !== null;
  }
}

module.exports = WinConditionChecker;
