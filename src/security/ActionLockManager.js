const logger = require('../utils/logger');

const SINGLE_USE_ROLES = ['Um-Zaki'];

class ActionLockManager {
  constructor() {
    this.locks = new Map();
  }

  _key(playerId, round) {
    return `${playerId}_${round}`;
  }

  isLocked(playerId, round) {
    const key = this._key(playerId, round);
    return this.locks.has(key);
  }

  lock(playerId, actionType, round) {
    const key = this._key(playerId, round);
    this.locks.set(key, {
      playerId,
      actionType,
      round,
      timestamp: Date.now(),
    });
    logger.debug(`Action locked: ${playerId} -> ${actionType} (round ${round})`);
    return true;
  }

  unlock(playerId, round) {
    const key = this._key(playerId, round);
    const removed = this.locks.delete(key);
    if (removed) {
      logger.debug(`Action unlocked: ${playerId} (round ${round})`);
    }
    return removed;
  }

  resetForNight(currentRound) {
    const newRound = currentRound + 1;
    const previousRound = currentRound;

    for (const [key, lock] of this.locks) {
      if (lock.round === previousRound) {
        const role = lock.actionType;
        if (!this.isSingleUseRole(role)) {
          this.locks.delete(key);
        }
      }
    }

    logger.debug(`Action locks reset for round ${newRound}.`);
  }

  getLock(playerId, round) {
    return this.locks.get(this._key(playerId, round)) || null;
  }

  getLocksForRound(round) {
    const results = [];
    for (const lock of this.locks.values()) {
      if (lock.round === round) {
        results.push(lock);
      }
    }
    return results;
  }

  getCompletedPlayers(round) {
    return this.getLocksForRound(round).map(l => l.playerId);
  }

  isRoundComplete(players, round) {
    const completed = this.getCompletedPlayers(round);
    return players.every(p => completed.includes(p.userId));
  }

  isSingleUseRole(role) {
    return SINGLE_USE_ROLES.includes(role);
  }

  clear() {
    this.locks.clear();
  }
}

module.exports = new ActionLockManager();
