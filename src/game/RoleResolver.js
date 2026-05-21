const logger = require('../utils/logger');

class RoleResolver {
  static getNightActionRole(actionType) {
    const map = {
      KILL: 'Werewolf',
      INVESTIGATE: 'Investigator',
      PROTECT: 'Bodyguard',
      SAVE: 'Doctor',
      BLOCK: 'Seductress',
      SILENCE: 'Um-Zaki',
    };
    return map[actionType] || null;
  }

  static canAct(role, phase) {
    if (phase === 'NIGHT') {
      return ['Werewolf', 'Investigator', 'Bodyguard', 'Doctor', 'Seductress', 'Um-Zaki'].includes(role);
    }
    if (phase === 'DAY_VOTE') {
      return true;
    }
    if (phase === 'DAY_DISCUSSION') {
      return true;
    }
    return false;
  }

  static getVoteWeight(role) {
    if (role === 'King') return 2;
    return 1;
  }

  static canBreakTie(role) {
    return role === 'Mayor';
  }

  static getNightDescription(role) {
    const descriptions = {
      Werewolf: 'اختر ضحية مع بقية الذئاب.',
      Investigator: 'اختر لاعباً لتعرف ما إذا كان ذئباً.',
      Bodyguard: 'اختر لاعباً لحمايته هذه الليلة.',
      Doctor: 'اختر لاعباً لإنقاذه.',
      Seductress: 'اختر لاعباً لمنعه من استخدام قدرته.',
      'Um-Zaki': 'اختر لاعباً لإسكاته في اليوم التالي.',
    };
    return descriptions[role] || 'ليس لديك قدرة خاصة.';
  }

  static isValidTarget(actor, target) {
    if (!actor || !target) return false;
    if (!actor.isAlive || !target.isAlive) return false;
    if (actor.userId === target.userId) return false;
    return true;
  }

  static getRoleTeam(role) {
    if (role === 'Werewolf') return 'werewolves';
    return 'villagers';
  }

  static getRoleEmoji(role) {
    const emoji = require('../constants/emojis');
    const map = {
      Werewolf: emoji.ROLES.WEREWOLF,
      Villager: emoji.ROLES.VILLAGER,
      Investigator: emoji.ROLES.INVESTIGATOR,
      Bodyguard: emoji.ROLES.BODYGUARD,
      King: emoji.ROLES.KING,
      Mayor: emoji.ROLES.MAYOR,
      Doctor: emoji.ROLES.DOCTOR,
      Seductress: emoji.ROLES.SEDUCTRESS,
      'Um-Zaki': emoji.ROLES.UM_ZAKI,
    };
    return map[role] || '❓';
  }

  static shouldShowRoleToPlayer(role) {
    return role === 'Werewolf';
  }
}

module.exports = RoleResolver;
