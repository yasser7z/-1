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

    const nightCollector = require('../night/NightActionCollector');
    nightCollector.stopCollection(gameSession.sessionKey);

    const result = nightResolver.resolve(gameSession);

    const killedPlayer = result.killed ? gameSession.getPlayer(result.killed) : null;
    const silencedPlayer = result.silenced ? gameSession.getPlayer(result.silenced) : null;

    if (result.killed) {
      gameSession.killPlayer(result.killed);
    }

    let announcement = `☀️ **الصباح حل - اليوم ${gameSession.round}**\n\n`;
    if (killedPlayer) {
      announcement += `💀 **${killedPlayer.username}** قُتل هذه الليلة!\nكان دوره: **${killedPlayer.role}**\n\n`;
    } else {
      announcement += `✅ لم يمت أحد هذه الليلة.\n\n`;
    }
    if (silencedPlayer) {
      announcement += `🔇 **${silencedPlayer.username}** مسكوت عنه اليوم ولا يمكنه التحدث.\n`;
    }
    announcement += `⏱️ لديكم ${config.PHASE_DURATIONS.DAY / 1000} ثانية للنقاش.`;

    const aliveList = gameSession.getAlivePlayers().map(p => `<@${p.userId}>`).join(' ');
    announcement += `\n\n**اللاعبون الأحياء (${gameSession.getAliveCount()})**\n${aliveList}`;

    if (gameSession.channel) {
      await gameSession.channel.send({ content: announcement }).catch(err => logger.error({ err }, 'Failed to send day announcement'));
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

    if (gameSession.channel) {
      const VoteCollector = require('../voting/VoteCollector');
      await VoteCollector.startVote(gameSession, gameSession.channel);
    }

    logger.info(`Vote phase started for round ${gameSession.round}.`);
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

    if (gameSession.channel) {
      const aliveList = gameSession.getAlivePlayers().map(p => `<@${p.userId}>`).join(' ');
      await gameSession.channel.send({
        content: `🌙 **حل الليل - الليلة ${gameSession.round}**\nأصحاب القدرات يستعدون...\n\n**اللاعبون الأحياء (${gameSession.getAliveCount()})**\n${aliveList}`,
      }).catch(err => logger.error({ err }, 'Failed to send night announcement'));
    }

    const nightActionCollector = require('../night/NightActionCollector');
    await nightActionCollector.startCollection(gameSession, gameSession.channel);

    await PhaseManager.runNight(gameSession);
  }

  static async endGame(gameSession, winner) {
    gameSession.winner = winner;
    gameSession.clearAllTimers();

    gameSession.stateMachine.transitionTo('GAME_OVER', winner);
    interactionVersioning.removeSession(gameSession.sessionKey);

    if (gameSession.channel) {
      await gameSession.channel.send({
        content: `🏆 **انتهت اللعبة!**\n**الفائزون:** ${winner}`,
      }).catch(() => {});
    }

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

    if (gameSession.channel) {
      const aliveList = gameSession.getAlivePlayers().map(p => `<@${p.userId}>`).join(' ');
      await gameSession.channel.send({
        content: `🎮 **بدأت اللعبة!** 👥 **${gameSession.getPlayerCount()} لاعب**\n🌙 **حل الليل - الليلة 1**\nأصحاب القدرات اضغطوا زر **🎭 إجراءاتي** لإرسال إجراءاتكم.\n\n**اللاعبون (${gameSession.getPlayerCount()})**\n${aliveList}`,
      }).catch(err => logger.error({ err }, 'Failed to send game start announcement'));
    }

    await PhaseManager.runNight(gameSession);
    return true;
  }
}

module.exports = PhaseManager;
