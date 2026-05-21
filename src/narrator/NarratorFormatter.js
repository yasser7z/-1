const { EmbedBuilder } = require('discord.js');
const colors = require('../constants/colors');
const emojis = require('../constants/emojis');

const CATEGORY_STYLES = {
  NIGHT_START: {
    color: colors.DARK_BLUE,
    title: `${emojis.PHASES.NIGHT} الليل يبدأ`,
    border: '▬▬▬▬▬▬▬▬▬▬▬▬▬▬',
  },
  DAY_START: {
    color: colors.GOLD,
    title: `${emojis.PHASES.DAY} الفجر يبزغ`,
    border: '════════════════',
  },
  DEATH_WOLF: {
    color: colors.WEREWOLF_RED,
    title: `${emojis.STATUS.DEAD} ذئب سقط`,
    border: '▄▄▄▄▄▄▄▄▄▄▄▄▄▄',
  },
  DEATH_VILLAGER: {
    color: colors.DEATH_GRAY,
    title: `${emojis.MISC.SKULL} قروي رحل`,
    border: '━━━━━━━━━━━━━━',
  },
  CLOSE_VOTE: {
    color: colors.WARNING,
    title: `${emojis.PHASES.VOTE} التصويت مشتعل`,
    border: '▀▀▀▀▀▀▀▀▀▀▀▀▀▀',
  },
  WOLF_WIN: {
    color: colors.WEREWOLF_RED,
    title: `${emojis.MISC.FIRE} انتصار الذئاب`,
    border: '▬▬▬▬▬▬▬▬▬▬▬▬▬▬',
  },
  VILLAGER_WIN: {
    color: colors.VILLAGER_GREEN,
    title: `${emojis.MISC.STAR} انتصار القرية`,
    border: '▄▄▄▄▄▄▄▄▄▄▄▄▄▄',
  },
  LOBBY_COUNTDOWN_START: {
    color: colors.NEON_GREEN,
    title: `${emojis.MISC.LOADING} العد التنازلي`,
    border: '════════════════',
  },
  LOBBY_COUNTDOWN_CANCEL: {
    color: colors.WARNING,
    title: `${emojis.MISC.BROKEN_HEART} أُلغي العد`,
    border: '━━━━━━━━━━━━━━',
  },
  LOBBY_FULL: {
    color: colors.ERROR,
    title: `${emojis.MISC.LOCK} اللوبي ممتلئ`,
    border: '▀▀▀▀▀▀▀▀▀▀▀▀▀▀',
  },
  INSUFFICIENT_PLAYERS: {
    color: colors.WARNING,
    title: `${emojis.STATUS.WAITING} عدد غير كافٍ`,
    border: '▄▄▄▄▄▄▄▄▄▄▄▄▄▄',
  },
  AUTO_ATTACK: {
    color: colors.WEREWOLF_RED,
    title: `${emojis.ROLES.WEREWOLF} هجوم عشوائي`,
    border: '▬▬▬▬▬▬▬▬▬▬▬▬▬▬',
  },
  ABSENT_VOTE_ANNOUNCEMENT: {
    color: colors.DEATH_GRAY,
    title: `${emojis.MISC.SNOWFLAKE} صوت غائب`,
    border: '━━━━━━━━━━━━━━',
  },
  EMERGENCY_RESET: {
    color: colors.ERROR,
    title: `${emojis.BUTTONS.CANCEL} طارئ - إعادة تعيين`,
    border: '▀▀▀▀▀▀▀▀▀▀▀▀▀▀',
  },
};

class NarratorFormatter {
  static formatMessage(category, message, extraFields = {}) {
    const style = CATEGORY_STYLES[category] || {
      color: colors.PRIMARY,
      title: category,
      border: '───────────────',
    };

    const embed = new EmbedBuilder()
      .setColor(style.color)
      .setTitle(style.title)
      .setDescription(
        `${style.border}\n\n${message}\n\n${style.border}`,
      )
      .setTimestamp();

    if (extraFields.playerName) {
      embed.setFooter({
        text: `🎭 ${extraFields.playerName}`,
      });
    }

    if (extraFields.round) {
      embed.addFields({
        name: 'الجولة',
        value: `🔄 ${extraFields.round}`,
        inline: true,
      });
    }

    if (extraFields.countdown) {
      embed.addFields({
        name: 'الوقت المتبقي',
        value: `⏱️ ${extraFields.countdown}`,
        inline: true,
      });
    }

    if (extraFields.playerCount !== undefined) {
      embed.addFields({
        name: 'اللاعبون',
        value: `👥 ${extraFields.playerCount}`,
        inline: true,
      });
    }

    if (extraFields.roleName) {
      embed.addFields({
        name: 'الدور',
        value: extraFields.roleName,
        inline: true,
      });
    }

    if (extraFields.thumbnail) {
      embed.setThumbnail(extraFields.thumbnail);
    }

    return embed;
  }

  static formatNightMessage(message, round) {
    return NarratorFormatter.formatMessage('NIGHT_START', message, { round });
  }

  static formatDayMessage(message, round) {
    return NarratorFormatter.formatMessage('DAY_START', message, { round });
  }

  static formatDeathMessage(role, message, playerName, round) {
    const category = role === 'Werewolf' ? 'DEATH_WOLF' : 'DEATH_VILLAGER';
    return NarratorFormatter.formatMessage(category, message, {
      playerName,
      round,
    });
  }

  static formatVoteMessage(message, round) {
    return NarratorFormatter.formatMessage('CLOSE_VOTE', message, { round });
  }

  static formatWinMessage(winner, message, round) {
    const category = winner === 'werewolves' ? 'WOLF_WIN' : 'VILLAGER_WIN';
    return NarratorFormatter.formatMessage(category, message, { round });
  }

  static formatLobbyMessage(category, message, countdown) {
    return NarratorFormatter.formatMessage(category, message, {
      countdown,
      playerCount: undefined,
    });
  }

  static getCategoryStyle(category) {
    return CATEGORY_STYLES[category] || CATEGORY_STYLES.EMERGENCY_RESET;
  }
}

module.exports = NarratorFormatter;
