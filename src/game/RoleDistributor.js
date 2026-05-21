const config = require('../../config');
const logger = require('../utils/logger');

class RoleDistributor {
  static distribute(playerCount) {
    if (playerCount < 4) {
      throw new Error('Minimum 4 players required.');
    }
    if (playerCount > config.MAX_PLAYERS) {
      throw new Error(`Maximum ${config.MAX_PLAYERS} players allowed.`);
    }

    const wolfCount = config.WEREWOLF_COUNTS[playerCount] || 2;
    const uniqueRoles = [...config.UNIQUE_ROLES_LIST];
    const shuffledUnique = RoleDistributor.shuffle(uniqueRoles);

    const roles = [];
    for (let i = 0; i < wolfCount; i++) {
      roles.push('Werewolf');
    }

    const remaining = playerCount - wolfCount;
    const uniqueCount = Math.min(remaining, shuffledUnique.length);

    for (let i = 0; i < uniqueCount; i++) {
      roles.push(shuffledUnique[i]);
    }

    const villagerCount = remaining - uniqueCount;
    for (let i = 0; i < villagerCount; i++) {
      roles.push('Villager');
    }

    const shuffledRoles = RoleDistributor.shuffle(roles);

    logger.info(
      `Distributed ${playerCount} roles: ${wolfCount} wolves, ${uniqueCount} unique, ${villagerCount} villagers.`,
    );

    return shuffledRoles;
  }

  static distributeToPlayers(players) {
    const roles = RoleDistributor.distribute(players.length);
    const shuffledPlayers = RoleDistributor.shuffle([...players]);

    const assignments = [];
    for (let i = 0; i < shuffledPlayers.length; i++) {
      assignments.push({
        userId: shuffledPlayers[i].userId || shuffledPlayers[i].id,
        username: shuffledPlayers[i].username,
        displayAvatarURL: shuffledPlayers[i].displayAvatarURL || shuffledPlayers[i].avatarURL || '',
        role: roles[i],
        isAlive: true,
      });
    }

    return assignments;
  }

  static getUniqueAssignedCount(playerCount) {
    const wolfCount = config.WEREWOLF_COUNTS[playerCount] || 2;
    const remaining = playerCount - wolfCount;
    return Math.min(remaining, config.UNIQUE_ROLES_LIST.length);
  }

  static shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

module.exports = RoleDistributor;
