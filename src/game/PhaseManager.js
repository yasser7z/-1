const { STATES } = require('../core/StateMachine');
const config = require('../../config');
const logger = require('../utils/logger');
const nightResolver = require('../night/NightResolver');
const WinConditionChecker = require('./WinConditionChecker');
const interactionVersioning = require('../security/InteractionVersioning');
const actionLockManager = require('../security/ActionLockManager');
const sessionManager = require('../core/SessionManager');

class PhaseManager {
  static async runNight(gameSession) {
    const phase = gameSession.stateMachine.getState();
    if (phase !== 'NIGHT') {
      logger.warn(`Cannot run night: current phase is ${phase}`);
      return false;
    }

    const duration = config.PHASE_DURATIONS.NIGHT;
    gameSession.phaseStartTimestamp = Date.now();

    interactionVersioning.incrementVersion(gameSession.sessionKey, 'NIGHT');

    gameSession.setTimer('night_phase', () => {
      PhaseManager.endNight(gameSession);
    }, duration);

    logger.info(`Night ${gameSession.round} started. Duration: ${duration}ms`);
    return true;
  }

  static async endNight(gameSession) {
    logger.info(`Night ${gameSession.round} ending...`);

    gameSession.clearTimer('night_phase');

    const result = nightResolver.resolve(gameSession);

    if (result.killed) {
      gameSession.killPlayer(result.killed);
    }

    if (result.silenced) {
      const silenced = gameSession.getPlayer(result.silenced);
      if (silenced) {
        logger.info(`Player ${silenced.username} is silenced today.`);
      }
    }

    gameSession.stateMachine.transitionTo('DAY_DISCUSSION', 'Night ended');
    gameSession.phaseStartTimestamp = Date.now();

    interactionVersioning.incrementVersion(gameSession.sessionKey, 'DAY_DISCUSSION');

    gameSession.setTimer('day_discussion', async () => {
      await PhaseManager.startVote(gameSession);
    }, config.PHASE_DURATIONS.DAY);

    logger.info(`Day discussion started for round ${gameSession.round}.`);
    return result;
  }

  static async startVote(gameSession) {
    gameSession.stateMachine.transitionTo('DAY_VOTE', 'Discussion ended');
    gameSession.phaseStartTimestamp = Date.now();

    interactionVersioning.incrementVersion(gameSession.sessionKey, 'DAY_VOTE');

    gameSession.setTimer('vote_phase', async () => {
      await PhaseManager.endVote(gameSession);
    }, config.PHASE_DURATIONS.VOTE);

    logger.info(`Vote phase started for round ${gameSession.round}.`);
  }

  static async endVote(gameSession) {
    const votes = PhaseManager.tallyVotes(gameSession);

    if (votes.length === 0) {
      logger.info(`No votes cast. Skipping trial.`);
      await PhaseManager.afterTrial(gameSession, null);
      return;
    }

    const highestVote = votes[0];
    const tied = votes.filter(v => v.count === highestVote.count);

    let lynched = null;
    if (tied.length > 1) {
      const mayor = gameSession.getPlayersByRole('Mayor')[0];
      if (mayor && mayor.isAlive) {
        lynched = mayor;
        logger.info(`Mayor breaks tie: ${mayor.username}`);
      }
    } else {
      lynched = highestVote;
    }

    if (lynched) {
      gameSession.stateMachine.transitionTo('DAY_TRIAL', 'Vote ended');
      gameSession.lynchPlayer(lynched.userId);

      const player = gameSession.getPlayer(lynched.userId);
      logger.info(`Player ${player ? player.username : lynched.userId} was lynched.`);
    }

    await PhaseManager.afterTrial(gameSession, lynched);
  }

  static tallyVotes(gameSession) {
    const voteMap = {};
    const alivePlayers = gameSession.getAlivePlayers();

    for (const player of alivePlayers) {
      if (player.voteTarget && player.isVoted) {
        const weight = player.role === 'King' ? 2 : 1;
        voteMap[player.voteTarget] = (voteMap[player.voteTarget] || 0) + weight;
      }
    }

    return Object.entries(voteMap)
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count);
  }

  static async afterTrial(gameSession, lynched) {
    const winner = WinConditionChecker.check(gameSession);

    if (winner) {
      await PhaseManager.endGame(gameSession, winner);
      return;
    }

    gameSession.round++;
    gameSession.stateMachine.transitionTo('NIGHT', 'Trial ended');
    gameSession.phaseStartTimestamp = Date.now();

    actionLockManager.resetForNight(gameSession.round - 1);

    await PhaseManager.runNight(gameSession);
  }

  static async endGame(gameSession, winner) {
    gameSession.winner = winner;
    gameSession.clearAllTimers();

    gameSession.stateMachine.transitionTo('GAME_OVER', winner);
    interactionVersioning.removeSession(gameSession.sessionKey);

    const { StatsManager } = require('../stats/StatsManager');
    await StatsManager.recordGameEnd(gameSession, winner);

    sessionManager.delete(gameSession.guildId, gameSession.channelId);
    gameSession.isActive = false;

    logger.info(`Game over in ${gameSession.sessionKey}. Winner: ${winner}`);
    return winner;
  }

  static async startGame(gameSession) {
    gameSession.stateMachine.transitionTo('NIGHT', 'Game started');
    gameSession.phaseStartTimestamp = Date.now();
    gameSession.round = 1;

    interactionVersioning.initSession(gameSession.sessionKey, 'NIGHT');

    await PhaseManager.runNight(gameSession);
    return true;
  }
}

module.exports = PhaseManager;
