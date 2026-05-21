const logger = require('../utils/logger');

const ACTION_ORDER = ['PROTECT', 'SAVE', 'BLOCK', 'KILL'];

class NightResolver {
  constructor() {
    this.lastHealed = new Map();
  }

  resolve(gameSession) {
    const round = gameSession.round;
    const actions = gameSession.getNightActionsForRound(round);
    const alivePlayers = gameSession.getAlivePlayers();
    const werewolves = gameSession.getPlayersByRole('Werewolf').filter(p => p.isAlive);

    const result = {
      killed: null,
      saved: null,
      blocked: null,
      investigated: null,
      protected: null,
      silenced: null,
      autoAttack: false,
    };

    const actionMap = {};
    for (const action of actions) {
      if (!actionMap[action.actionType]) {
        actionMap[action.actionType] = [];
      }
      actionMap[action.actionType].push(action);
    }

    const sessionKey = gameSession.sessionKey;

    if (actionMap['PROTECT']) {
      const protectAction = actionMap['PROTECT'][0];
      const protector = gameSession.getPlayer(protectAction.userId);
      if (protector && protector.isAlive) {
        result.protected = protectAction.targetId;
        logger.debug(`Bodyguard ${protectAction.userId} protects ${protectAction.targetId}`);
      }
    }

    if (actionMap['SAVE']) {
      const saveAction = actionMap['SAVE'][0];
      const doctor = gameSession.getPlayer(saveAction.userId);
      if (doctor && doctor.isAlive) {
        const targetKey = `${sessionKey}_${saveAction.targetId}`;
        const lastHealedRound = this.lastHealed.get(targetKey) || 0;

        if (lastHealedRound === round) {
          logger.debug(`Doctor cannot heal ${saveAction.targetId} twice in a row.`);
        } else {
          result.saved = saveAction.targetId;
          this.lastHealed.set(targetKey, round);
          logger.debug(`Doctor ${saveAction.userId} saves ${saveAction.targetId}`);
        }
      }
    }

    if (actionMap['BLOCK']) {
      const blockAction = actionMap['BLOCK'][0];
      const seductress = gameSession.getPlayer(blockAction.userId);
      if (seductress && seductress.isAlive) {
        result.blocked = blockAction.targetId;
        logger.debug(`Seductress ${blockAction.userId} blocks ${blockAction.targetId}`);
      } else if (seductress && !seductress.isAlive) {
        logger.debug(`Seductress is dead, block action fails.`);
      }
    }

    let wolfTarget = null;
    if (actionMap['KILL'] && actionMap['KILL'].length > 0) {
      const killActions = actionMap['KILL'];
      const targetCounts = {};
      for (const ka of killActions) {
        const wolf = gameSession.getPlayer(ka.userId);
        if (wolf && wolf.isAlive) {
          if (result.blocked === ka.userId) {
            logger.debug(`Wolf ${ka.userId} is blocked by Seductress, skipping.`);
            continue;
          }
          targetCounts[ka.targetId] = (targetCounts[ka.targetId] || 0) + 1;
        }
      }

      const entries = Object.entries(targetCounts);
      if (entries.length > 0) {
        entries.sort((a, b) => b[1] - a[1]);
        wolfTarget = entries[0][0];
      }
    }

    if (!wolfTarget) {
      const nonWolves = alivePlayers.filter(p => p.role !== 'Werewolf');
      if (nonWolves.length > 0) {
        const randomTarget = nonWolves[Math.floor(Math.random() * nonWolves.length)];
        wolfTarget = randomTarget.userId;
        result.autoAttack = true;
        logger.debug(`Auto-attack: random target ${wolfTarget}`);
      }
    }

    if (wolfTarget) {
      if (result.blocked === wolfTarget) {
        logger.debug(`Attack target ${wolfTarget} is blocked by Seductress, attack fails.`);
        result.killed = null;
      } else if (result.protected === wolfTarget) {
        logger.debug(`Attack target ${wolfTarget} is protected by Bodyguard.`);
        result.killed = null;
      } else if (result.saved === wolfTarget) {
        logger.debug(`Attack target ${wolfTarget} is saved by Doctor.`);
        result.killed = null;
      } else {
        result.killed = wolfTarget;
      }
    }

    if (actionMap['INVESTIGATE'] && actionMap['INVESTIGATE'].length > 0) {
      const invAction = actionMap['INVESTIGATE'][0];
      const investigator = gameSession.getPlayer(invAction.userId);
      if (investigator && investigator.isAlive) {
        const target = gameSession.getPlayer(invAction.targetId);
        result.investigated = {
          investigatorId: invAction.userId,
          targetId: invAction.targetId,
          isWerewolf: target && target.role === 'Werewolf',
        };
        logger.debug(`Investigator ${invAction.userId} checks ${invAction.targetId}: ${target ? target.role : 'unknown'}`);
      }
    }

    if (actionMap['SILENCE'] && actionMap['SILENCE'].length > 0) {
      const silenceAction = actionMap['SILENCE'][0];
      const umZaki = gameSession.getPlayer(silenceAction.userId);
      if (umZaki && umZaki.isAlive) {
        const target = gameSession.getPlayer(silenceAction.targetId);
        if (target && target.isAlive) {
          result.silenced = silenceAction.targetId;
          logger.debug(`Um-Zaki ${silenceAction.userId} silences ${silenceAction.targetId}`);
        }
      }
    }

    logger.info(
      `Night resolved for round ${round}: killed=${result.killed}, saved=${result.saved}, blocked=${result.blocked}, auto=${result.autoAttack}`,
    );

    return result;
  }

  resetLastHealed() {
    this.lastHealed.clear();
  }
}

module.exports = new NightResolver();
