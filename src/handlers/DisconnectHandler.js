const { EmbedBuilder } = require('discord.js');
const colors = require('../constants/colors');
const emojis = require('../constants/emojis');
const logger = require('../utils/logger');
const sessionManager = require('../core/SessionManager');
const WinConditionChecker = require('../game/WinConditionChecker');
const PhaseManager = require('../game/PhaseManager');

class DisconnectHandler {
  async handleMemberRemove(member) {
    const guildId = member.guild.id;
    const userId = member.user.id;
    const sessions = sessionManager.getByGuild(guildId);

    for (const session of sessions) {
      if (!session.isActive) continue;

      const player = session.getPlayer(userId);
      if (!player || !player.isAlive) continue;

      player.isAlive = false;

      session.nightActions.forEach((action, key) => {
        if (action.userId === userId || action.targetId === userId) {
          session.nightActions.delete(key);
        }
      });

      logger.info(`Player ${player.username} disconnected and died in session ${session.sessionKey}`);

      const channel = member.guild.channels.cache.get(session.channelId);
      if (channel) {
        const embed = new EmbedBuilder()
          .setColor(colors.DEATH_GRAY)
          .setTitle(`${emojis.MISC.BROKEN_HEART} لاعب غادر`)
          .setDescription(
            `<@${userId}> **${player.username}** غادر السيرفر.\n` +
            `تم اعتباره ميتاً. كان دوره: **${player.role}**`
          )
          .setTimestamp();
        await channel.send({ embeds: [embed] }).catch(() => {});
      }

      const winner = WinConditionChecker.check(session);
      if (winner) {
        await PhaseManager.endGame(session, winner);
      }
    }
  }
}

module.exports = new DisconnectHandler();
