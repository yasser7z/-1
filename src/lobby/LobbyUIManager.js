const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const colors = require('../constants/colors');
const emojis = require('../constants/emojis');
const locale = require('../locales/ar');
const config = require('../../config');

class LobbyUIManager {
  static buildEmbed(lobby) {
    const playerCount = lobby.players.length;
    const maxPlayers = config.MAX_PLAYERS;
    const isCountdown = lobby.countdownActive;
    const timeLeft = lobby.countdownTimeLeft || config.PHASE_DURATIONS.LOBBY_COUNTDOWN;

    let statusText;
    if (isCountdown) {
      statusText = `${emojis.MISC.LOADING} **عد تنازلي** - ${Math.ceil(timeLeft / 1000)} ثانية`;
    } else if (playerCount >= 4) {
      statusText = `${emojis.STATUS.ALIVE} **جاهز** - العدد مكتمل للانطلاق`;
    } else {
      statusText = `${emojis.STATUS.WAITING} **انتظار** - يلزم ${4 - playerCount} لاعبين إضافيين`;
    }

    const embed = new EmbedBuilder()
      .setColor(isCountdown ? colors.NEON_GREEN : colors.EMBED_BG)
      .setTitle(`${emojis.PHASES.LOBBY} لوبي لعبة المستذئب`)
      .setDescription(
        `**${locale.LOBBY.CREATED}**\n\n` +
        `${emojis.MISC.CROWN} **المضيف:** <@${lobby.hostId}>\n` +
        `${emojis.MISC.USER} **اللاعبون:** ${playerCount}/${maxPlayers}\n\n` +
        `${statusText}`,
      )
      .setThumbnail(lobby.players[0]?.displayAvatarURL || null)
      .setFooter({
        text: `Vale Community • ${lobby.guildId}`,
        iconURL: null,
      })
      .setTimestamp();

    if (playerCount > 0) {
      const playerList = lobby.players
        .map((p, i) => {
          const avatar = p.displayAvatarURL
            ? `[🖼](${p.displayAvatarURL})`
            : '';
          const number = (i + 1).toString().padStart(2, '0');
          return `\`${number}\` ${avatar} <@${p.userId}>`;
        })
        .join('\n');

      embed.addFields({
        name: `📋 قائمة اللاعبين (${playerCount})`,
        value: playerList,
        inline: false,
      });
    }

    if (isCountdown) {
      const progress = Math.min(timeLeft / config.PHASE_DURATIONS.LOBBY_COUNTDOWN, 1);
      const filled = Math.round(10 * progress);
      const empty = 10 - filled;
      const bar = `${'🟢'.repeat(filled)}${'⚫'.repeat(empty)}`;
      embed.addFields({
        name: '⏱️ العد التنازلي',
        value: `${bar} ${Math.ceil(timeLeft / 1000)}s`,
        inline: false,
      });
    }

    return embed;
  }

  static buildComponents(lobby, isAdmin = false) {
    const joinBtn = new ButtonBuilder()
      .setCustomId('lobby_join')
      .setLabel(locale.BUTTONS.JOIN)
      .setEmoji(emojis.BUTTONS.JOIN)
      .setStyle(ButtonStyle.Success);

    const leaveBtn = new ButtonBuilder()
      .setCustomId('lobby_leave')
      .setLabel(locale.BUTTONS.LEAVE)
      .setEmoji(emojis.BUTTONS.LEAVE)
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(joinBtn, leaveBtn);

    if (isAdmin) {
      const cancelBtn = new ButtonBuilder()
        .setCustomId('lobby_cancel')
        .setLabel('إلغاء اللوبي')
        .setEmoji('🚫')
        .setStyle(ButtonStyle.Secondary);
      row.addComponents(cancelBtn);
    }

    return [row];
  }

  static buildCountdownEmbed(lobby, secondsLeft) {
    const embed = this.buildEmbed(lobby);
    embed.setDescription(
      `${emojis.MISC.LOADING} **العد التنازلي لبدء اللعبة!**\n` +
      `سيبدأ التشغيل خلال **${secondsLeft}** ثانية...`,
    );
    return embed;
  }

  static buildIncompleteEmbed(lobby) {
    const playerCount = lobby.players.length;
    const needed = 4 - playerCount;

    const embed = this.buildEmbed(lobby);
    embed.setColor(colors.WARNING);
    embed.setDescription(
      `${emojis.MISC.BROKEN_HEART} **العدد غير مكتمل**\n` +
      `يلزم ${needed} لاعبين إضافيين لبدء اللعبة. (الحد الأدنى: 4)`,
    );
    return embed;
  }

  static buildMaxPlayersEmbed() {
    const embed = new EmbedBuilder()
      .setColor(colors.ERROR)
      .setTitle(`${emojis.MISC.LOCK} اللوبي ممتلئ`)
      .setDescription(locale.ERRORS.LOBBY_FULL)
      .setTimestamp();
    return embed;
  }
}

module.exports = LobbyUIManager;
