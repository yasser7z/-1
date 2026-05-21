const MESSAGE_POOLS = require('./messagePools');
const logger = require('../utils/logger');

const SUSPENSE_EMOJI = '⏳';
const SUSPENSE_CHANCE = 0.25;
const MAX_HISTORY = 5;
const MIN_GAP = 10;

const NIGHT_CATEGORIES = ['NIGHT_START'];

class NarratorEngine {
  constructor() {
    this.usageHistory = new Map();
    for (const category of Object.keys(MESSAGE_POOLS)) {
      this.usageHistory.set(category, []);
    }
  }

  getMessage(category, playerName = '') {
    const pool = MESSAGE_POOLS[category];
    if (!pool || pool.length === 0) {
      logger.warn(`No messages in pool: ${category}`);
      return `حدث غير متوقع في ${category}.`;
    }

    const history = this.usageHistory.get(category) || [];
    const lastFive = history.slice(-MAX_HISTORY);

    const recentCount = new Map();
    for (const msg of history) {
      recentCount.set(msg, (recentCount.get(msg) || 0) + 1);
    }

    const available = pool.filter(msg => {
      if (lastFive.includes(msg)) return false;
      const lastIndex = history.lastIndexOf(msg);
      if (lastIndex === -1) return true;
      const messagesSince = history.length - 1 - lastIndex;
      return messagesSince >= MIN_GAP;
    });

    let selected;
    if (available.length === 0) {
      logger.debug(`Pool exhausted for ${category}, reusing any message.`);
      const nonRecent = pool.filter(msg => !lastFive.includes(msg));
      if (nonRecent.length === 0) {
        selected = pool[Math.floor(Math.random() * pool.length)];
      } else {
        selected = nonRecent[Math.floor(Math.random() * nonRecent.length)];
      }
    } else {
      selected = available[Math.floor(Math.random() * available.length)];
    }

    history.push(selected);
    this.usageHistory.set(category, history);

    let message = selected;

    if (playerName) {
      message = message.replace('{player}', playerName);
    }

    if (NIGHT_CATEGORIES.includes(category) && Math.random() < SUSPENSE_CHANCE) {
      message = `${SUSPENSE_EMOJI} ${message}`;
    }

    return message;
  }

  getNightStart(playerName = '') {
    return this.getMessage('NIGHT_START', playerName);
  }

  getDayStart(playerName = '') {
    return this.getMessage('DAY_START', playerName);
  }

  getDeathWolf(playerName = '') {
    return this.getMessage('DEATH_WOLF', playerName);
  }

  getDeathVillager(playerName = '') {
    return this.getMessage('DEATH_VILLAGER', playerName);
  }

  getCloseVote(playerName = '') {
    return this.getMessage('CLOSE_VOTE', playerName);
  }

  getWolfWin(playerName = '') {
    return this.getMessage('WOLF_WIN', playerName);
  }

  getVillagerWin(playerName = '') {
    return this.getMessage('VILLAGER_WIN', playerName);
  }

  getLobbyCountdownStart() {
    return this.getMessage('LOBBY_COUNTDOWN_START');
  }

  getLobbyCountdownCancel() {
    return this.getMessage('LOBBY_COUNTDOWN_CANCEL');
  }

  getLobbyFull() {
    return this.getMessage('LOBBY_FULL');
  }

  getInsufficientPlayers() {
    return this.getMessage('INSUFFICIENT_PLAYERS');
  }

  getAutoAttack(playerName = '') {
    return this.getMessage('AUTO_ATTACK', playerName);
  }

  getAbsentVote(playerName = '') {
    return this.getMessage('ABSENT_VOTE_ANNOUNCEMENT', playerName);
  }

  getEmergencyReset(playerName = '') {
    return this.getMessage('EMERGENCY_RESET', playerName);
  }

  getHistorySize(category) {
    const history = this.usageHistory.get(category);
    return history ? history.length : 0;
  }

  resetHistory(category) {
    if (category) {
      this.usageHistory.set(category, []);
    } else {
      for (const key of this.usageHistory.keys()) {
        this.usageHistory.set(key, []);
      }
    }
  }
}

module.exports = new NarratorEngine();
