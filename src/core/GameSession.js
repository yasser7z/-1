const { StateMachine, STATES } = require('./StateMachine');
const logger = require('../utils/logger');

class GameSession {
  constructor(guildId, channelId, players = []) {
    this.sessionKey = `${guildId}_${channelId}`;
    this.guildId = guildId;
    this.channelId = channelId;
    this.players = new Map();
    this.roles = [];
    this.stateMachine = new StateMachine(STATES.LOBBY_WAITING);
    this.phaseStartTimestamp = Date.now();
    this.nightActions = new Map();
    this.timers = [];
    this.isActive = true;
    this.winner = null;
    this.round = 0;

    for (const p of players) {
      this.addPlayer(p);
    }
  }

  addPlayer(playerData) {
    const id = playerData.userId || playerData.id;
    this.players.set(id, {
      userId: id,
      username: playerData.username || 'Unknown',
      displayAvatarURL: playerData.displayAvatarURL || playerData.avatarURL || '',
      role: playerData.role || null,
      isAlive: playerData.isAlive !== undefined ? playerData.isAlive : true,
      isVoted: false,
      voteTarget: null,
      nightActionTarget: null,
      protectedBy: null,
      silencedBy: null,
      investigatedBy: null,
      isLynched: false,
      isKilled: false,
    });
  }

  getPlayer(userId) {
    return this.players.get(userId) || null;
  }

  removePlayer(userId) {
    this.players.delete(userId);
  }

  getAlivePlayers() {
    return Array.from(this.players.values()).filter(p => p.isAlive);
  }

  getDeadPlayers() {
    return Array.from(this.players.values()).filter(p => !p.isAlive);
  }

  getPlayerCount() {
    return this.players.size;
  }

  getAliveCount() {
    return this.getAlivePlayers().length;
  }

  getPlayersByRole(role) {
    return Array.from(this.players.values()).filter(p => p.role === role);
  }

  setPlayerRole(userId, role) {
    const player = this.players.get(userId);
    if (player) player.role = role;
  }

  killPlayer(userId) {
    const player = this.players.get(userId);
    if (player) {
      player.isAlive = false;
      player.isKilled = true;
      logger.info(`Player ${player.username} was killed.`);
    }
  }

  lynchPlayer(userId) {
    const player = this.players.get(userId);
    if (player) {
      player.isAlive = false;
      player.isLynched = true;
      logger.info(`Player ${player.username} was lynched.`);
    }
  }

  recordNightAction(userId, targetId, actionType) {
    const key = `${this.round}_${userId}`;
    this.nightActions.set(key, {
      round: this.round,
      userId,
      targetId,
      actionType,
      timestamp: Date.now(),
    });
  }

  getNightActionsForRound(round) {
    const actions = [];
    for (const [key, action] of this.nightActions) {
      if (action.round === (round || this.round)) {
        actions.push(action);
      }
    }
    return actions;
  }

  resolveNightActions() {
    const actions = this.getNightActionsForRound();
    let killTarget = null;
    let saveTarget = null;
    let blockTarget = null;

    for (const action of actions) {
      switch (action.actionType) {
        case 'KILL':
          killTarget = action.targetId;
          break;
        case 'SAVE':
          saveTarget = action.targetId;
          break;
        case 'BLOCK':
          blockTarget = action.targetId;
          break;
        case 'INVESTIGATE':
          break;
        case 'PROTECT':
          break;
      }
    }

    if (killTarget && killTarget !== saveTarget) {
      return { killed: killTarget, blocked: blockTarget };
    }

    return { killed: null, blocked: blockTarget };
  }

  setTimer(name, callback, delay) {
    const timer = setTimeout(() => {
      this.timers = this.timers.filter(t => t.name !== name);
      try {
        callback();
      } catch (err) {
        logger.error({ err }, `Timer error: ${name}`);
      }
    }, delay);
    this.timers.push({ name, timer, delay });
    return timer;
  }

  clearTimer(name) {
    const index = this.timers.findIndex(t => t.name === name);
    if (index !== -1) {
      clearTimeout(this.timers[index].timer);
      this.timers.splice(index, 1);
    }
  }

  clearAllTimers() {
    for (const t of this.timers) {
      clearTimeout(t.timer);
    }
    this.timers = [];
  }

  toJSON() {
    return {
      sessionKey: this.sessionKey,
      guildId: this.guildId,
      channelId: this.channelId,
      players: Array.from(this.players.values()),
      roles: this.roles,
      phase: this.stateMachine.getState(),
      phaseStartTimestamp: this.phaseStartTimestamp,
      nightActions: Array.from(this.nightActions.values()),
      isActive: this.isActive,
      winner: this.winner,
      round: this.round,
    };
  }

  static fromJSON(data) {
    const session = new GameSession(data.guildId, data.channelId, data.players || []);
    session.sessionKey = data.sessionKey || `${data.guildId}_${data.channelId}`;
    session.roles = data.roles || [];
    session.stateMachine = new StateMachine(data.phase || STATES.LOBBY_WAITING);
    session.phaseStartTimestamp = data.phaseStartTimestamp || Date.now();
    session.isActive = data.isActive !== undefined ? data.isActive : true;
    session.winner = data.winner || null;
    session.round = data.round || 0;

    if (data.nightActions) {
      for (const action of data.nightActions) {
        const key = `${action.round}_${action.userId}`;
        session.nightActions.set(key, action);
      }
    }

    return session;
  }

  destroy() {
    this.clearAllTimers();
    this.isActive = false;
    this.players.clear();
    this.nightActions.clear();
    logger.info(`GameSession destroyed: ${this.sessionKey}`);
  }
}

module.exports = GameSession;
