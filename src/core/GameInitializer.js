const config = require('../../config');
const GameSession = require('./GameSession');
const { StateMachine, STATES } = require('./StateMachine');
const logger = require('../utils/logger');

class GameInitializer {
  static initialize(players, guildId, channelId) {
    const playerCount = players.length;

    if (playerCount < 4) {
      throw new Error('Minimum 4 players required.');
    }
    if (playerCount > config.MAX_PLAYERS) {
      throw new Error(`Maximum ${config.MAX_PLAYERS} players allowed.`);
    }

    const roleAssignments = GameInitializer.distributeRoles(playerCount);
    const shuffledPlayers = GameInitializer.shuffle([...players]);

    const session = new GameSession(guildId, channelId);

    for (let i = 0; i < shuffledPlayers.length; i++) {
      const p = shuffledPlayers[i];
      session.addPlayer({
        userId: p.userId || p.id,
        username: p.username,
        displayAvatarURL: p.displayAvatarURL || p.avatarURL || '',
        role: roleAssignments[i],
        isAlive: true,
      });
    }

    session.roles = roleAssignments;
    session.round = 1;
    session.phaseStartTimestamp = Date.now();
    session.stateMachine = new StateMachine(STATES.NIGHT);

    return session;
  }

  static distributeRoles(playerCount) {
    const wolfCount = config.WEREWOLF_COUNTS[playerCount] || 2;
    const uniqueRoles = config.UNIQUE_ROLES_LIST;
    const roles = [];

    for (let i = 0; i < wolfCount; i++) {
      roles.push('Werewolf');
    }

    const remaining = playerCount - wolfCount;
    const shuffledUnique = GameInitializer.shuffle([...uniqueRoles]);
    const uniqueCount = Math.min(remaining, shuffledUnique.length);

    for (let i = 0; i < uniqueCount; i++) {
      roles.push(shuffledUnique[i]);
    }

    const villagerCount = remaining - uniqueCount;
    for (let i = 0; i < villagerCount; i++) {
      roles.push('Villager');
    }

    return GameInitializer.shuffle(roles);
  }

  static shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  static async startNight(session, channel) {
    try {
      session.stateMachine.transitionTo(STATES.NIGHT, 'Game started');
      session.phaseStartTimestamp = Date.now();

      const alivePlayers = session.getAlivePlayers();
      const werewolves = session.getPlayersByRole('Werewolf');

      logger.info(
        `Night started. ${alivePlayers.length} alive, ${werewolves.length} werewolves.`,
      );

      return true;
    } catch (error) {
      logger.error({ err: error }, 'Failed to start night phase.');
      return false;
    }
  }
}

module.exports = GameInitializer;
