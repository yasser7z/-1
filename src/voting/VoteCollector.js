const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config');
const colors = require('../constants/colors');
const emojis = require('../constants/emojis');
const locale = require('../locales/ar');
const logger = require('../utils/logger');
const sessionManager = require('../core/SessionManager');
const guildConfigManager = require('../config/GuildConfigManager');
const nightResolver = require('../night/NightResolver');
const SafeCollector = require('../collectors/SafeCollector');
const PhaseManager = require('../game/PhaseManager');
const cooldown = require('../utils/cooldown');

class VoteCollector {
  constructor() {
    this.activeCollectors = new Map();
  }

  async startVote(gameSession, channel) {
    const sessionKey = gameSession.sessionKey;
    if (this.activeCollectors.has(sessionKey)) return;

    const embed = this._buildVoteEmbed(gameSession);
    const components = this._buildVoteButtons(gameSession);
    const msg = await channel.send({ embeds: [embed], components });

    const guildConfig = guildConfigManager.getOrDefault(gameSession.guildId);
    const autoAbsent = guildConfig.auto_absent_vote || false;

    const collector = channel.createMessageComponentCollector({
      filter: i => i.customId.startsWith('vote_'),
      time: config.PHASE_DURATIONS.VOTE,
    });

    const state = { gameSession, channel, collector, msg, autoAbsent, resolved: false };
    this.activeCollectors.set(sessionKey, state);

    collector.on('collect', async (interaction) => {
      if (state.resolved) return;
      await this._handleVote(interaction, gameSession, channel);
    });

    collector.on('end', async () => {
      if (state.resolved) return;
      state.resolved = true;
      this.activeCollectors.delete(sessionKey);
      await this._resolveVote(gameSession, channel, msg, autoAbsent);
    });

    logger.info(`Vote started for session ${sessionKey}.`);
    return state;
  }

  _buildVoteEmbed(gameSession) {
    const alive = gameSession.getAlivePlayers();
    const embed = new EmbedBuilder()
      .setColor(colors.WARNING)
      .setTitle(`${emojis.PHASES.VOTE} التصويت على الإعدام`)
      .setDescription(
        `${locale.GAME.VOTE_INSTRUCTION}\n` +
        `⏱️ الوقت المتبقي: ${config.PHASE_DURATIONS.VOTE / 1000} ثانية\n\n` +
        alive.map((p, i) => `\`${i + 1}\` 👤 <@${p.userId}>`).join('\n')
      )
      .setFooter({ text: `Vale Community • الجولة ${gameSession.round}` })
      .setTimestamp();
    return embed;
  }

  _buildVoteButtons(gameSession) {
    const alive = gameSession.getAlivePlayers();
    const rows = [];
    let currentRow = new ActionRowBuilder();

    for (const player of alive) {
      const label = player.username.length > 20 ? player.username.slice(0, 18) + '..' : player.username;
      const button = new ButtonBuilder()
        .setCustomId(`vote_${player.userId}`)
        .setLabel(label)
        .setStyle(ButtonStyle.Secondary);

      if (currentRow.components.length >= 5) {
        rows.push(currentRow);
        currentRow = new ActionRowBuilder();
      }
      currentRow.addComponents(button);
    }

    if (currentRow.components.length > 0) rows.push(currentRow);
    return rows;
  }

  async _handleVote(interaction, gameSession, channel) {
    const customId = interaction.customId;
    const userId = interaction.user.id;
    const targetId = customId.replace('vote_', '');

    if (cooldown.check(userId, customId, 500)) {
      return interaction.reply({ content: '⏳ تمهل.', ephemeral: true });
    }
    cooldown.set(userId, customId);

    const voter = gameSession.getPlayer(userId);
    if (!voter || !voter.isAlive) {
      return interaction.reply({ content: '❌ أنت ميت.', ephemeral: true });
    }

    if (targetId === userId) {
      return interaction.reply({ content: '❌ لا يمكنك التصويت على نفسك.', ephemeral: true });
    }

    const target = gameSession.getPlayer(targetId);
    if (!target || !target.isAlive) {
      return interaction.reply({ content: '❌ الهدف ميت.', ephemeral: true });
    }

    voter.voteTarget = targetId;
    voter.isVoted = true;

    await interaction.reply({ content: `✅ صوتك مسجل لـ <@${targetId}>.`, ephemeral: true });
    logger.debug(`${voter.username} voted for ${target.username}`);
  }

  async _resolveVote(gameSession, channel, msg, autoAbsent) {
    let voteMap = {};
    const alivePlayers = gameSession.getAlivePlayers();

    for (const p of alivePlayers) {
      if (p.voteTarget && p.isVoted) {
        const weight = p.role === 'King' ? 2 : 1;
        voteMap[p.voteTarget] = (voteMap[p.voteTarget] || 0) + weight;
      } else if (autoAbsent && p.isAlive) {
        const others = alivePlayers.filter(t => t.userId !== p.userId);
        if (others.length > 0) {
          const randomTarget = others[Math.floor(Math.random() * others.length)].userId;
          voteMap[randomTarget] = (voteMap[randomTarget] || 0) + 1;
        }
      }
    }

    const entries = Object.entries(voteMap);
    if (entries.length === 0 || entries.every(([, c]) => c === 0)) {
      const embed = new EmbedBuilder()
        .setColor(colors.WARNING)
        .setTitle('🚫 لا أحد يُعدم')
        .setDescription(locale.GAME.NO_LYNCH)
        .setTimestamp();
      await msg.edit({ embeds: [embed], components: [] }).catch(() => {});
      return PhaseManager.afterTrial(gameSession, null);
    }

    entries.sort((a, b) => b[1] - a[1]);
    const highestCount = entries[0][1];
    const tied = entries.filter(([, c]) => c === highestCount);

    let lynchedId;
    if (tied.length > 1) {
      const mayor = gameSession.getPlayersByRole('Mayor')[0];
      if (mayor && mayor.isAlive) {
        lynchedId = tied.find(([id]) => id === mayor.userId)
          ? mayor.userId
          : tied[Math.floor(Math.random() * tied.length)][0];
      } else {
        lynchedId = tied[Math.floor(Math.random() * tied.length)][0];
      }
    } else {
      lynchedId = entries[0][0];
    }

    gameSession.lynchPlayer(lynchedId);
    const lynched = gameSession.getPlayer(lynchedId);

    const embed = new EmbedBuilder()
      .setColor(colors.WEREWOLF_RED)
      .setTitle(`⚖️ حكم الإعدام`)
      .setDescription(
        `**<@${lynchedId}>** تم إعدامه!\n` +
        `كان دوره: **${lynched ? lynched.role : '???'}**`
      )
      .setTimestamp();
    await msg.edit({ embeds: [embed], components: [] }).catch(() => {});

    return PhaseManager.afterTrial(gameSession, lynchedId);
  }

  cancelVote(sessionKey) {
    const state = this.activeCollectors.get(sessionKey);
    if (state) {
      state.resolved = true;
      state.collector.stop('cancelled');
      this.activeCollectors.delete(sessionKey);
    }
  }
}

module.exports = new VoteCollector();
