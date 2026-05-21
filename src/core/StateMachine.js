const logger = require('../utils/logger');

const STATES = {
  LOBBY_WAITING: 'LOBBY_WAITING',
  LOBBY_COUNTDOWN: 'LOBBY_COUNTDOWN',
  NIGHT: 'NIGHT',
  DAY_DISCUSSION: 'DAY_DISCUSSION',
  DAY_VOTE: 'DAY_VOTE',
  DAY_TRIAL: 'DAY_TRIAL',
  GAME_OVER: 'GAME_OVER',
  CANCELLED: 'CANCELLED',
};

const TRANSITIONS = {
  [STATES.LOBBY_WAITING]: [STATES.LOBBY_COUNTDOWN, STATES.CANCELLED],
  [STATES.LOBBY_COUNTDOWN]: [STATES.NIGHT, STATES.LOBBY_WAITING, STATES.CANCELLED],
  [STATES.NIGHT]: [STATES.DAY_DISCUSSION, STATES.CANCELLED],
  [STATES.DAY_DISCUSSION]: [STATES.DAY_VOTE, STATES.CANCELLED],
  [STATES.DAY_VOTE]: [STATES.DAY_TRIAL, STATES.NIGHT, STATES.CANCELLED],
  [STATES.DAY_TRIAL]: [STATES.NIGHT, STATES.GAME_OVER, STATES.CANCELLED],
  [STATES.GAME_OVER]: [],
  [STATES.CANCELLED]: [],
};

const TERMINAL_STATES = [STATES.GAME_OVER, STATES.CANCELLED];

class StateMachine {
  constructor(initialState = STATES.LOBBY_WAITING) {
    this.currentState = initialState;
    this.listeners = new Map();
  }

  getState() {
    return this.currentState;
  }

  canTransitionTo(targetState) {
    const allowed = TRANSITIONS[this.currentState];
    if (!allowed) return false;
    return allowed.includes(targetState);
  }

  transitionTo(targetState, reason = '') {
    if (!this.canTransitionTo(targetState)) {
      logger.warn(
        `Invalid state transition: ${this.currentState} -> ${targetState}${reason ? ` (${reason})` : ''}`,
      );
      return false;
    }

    const previousState = this.currentState;
    this.currentState = targetState;
    logger.info(
      `State transition: ${previousState} -> ${targetState}${reason ? ` (${reason})` : ''}`,
    );

    this._emit(previousState, targetState, reason);
    return true;
  }

  isTerminal() {
    return TERMINAL_STATES.includes(this.currentState);
  }

  isInGame() {
    return [
      STATES.NIGHT,
      STATES.DAY_DISCUSSION,
      STATES.DAY_VOTE,
      STATES.DAY_TRIAL,
    ].includes(this.currentState);
  }

  onTransition(fromState, toState, callback) {
    const key = `${fromState}_${toState}`;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push(callback);
  }

  _emit(fromState, toState, reason) {
    const key = `${fromState}_${toState}`;
    const wildcardKey = `*_${toState}`;
    const callbacks = [
      ...(this.listeners.get(key) || []),
      ...(this.listeners.get(wildcardKey) || []),
    ];
    for (const cb of callbacks) {
      try {
        cb(fromState, toState, reason);
      } catch (err) {
        logger.error({ err }, 'Error in state transition listener.');
      }
    }
  }

  reset(initialState = STATES.LOBBY_WAITING) {
    this.currentState = initialState;
    logger.info(`State machine reset to ${initialState}.`);
  }
}

module.exports = { StateMachine, STATES };
