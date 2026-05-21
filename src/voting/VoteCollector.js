const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ActionLockManager = require('../security/ActionLockManager');
const InteractionVersioning = require('../security/InteractionVersioning');
const config = require('../../config/config');
const GuildConfigManager = require('../config/GuildConfigManager');
const logger = require('../utils/logger');

class VoteCollector {
    constructor(client) {
        this.client = client;
        this.lockManager = new ActionLockManager();
        this.versioning = new InteractionVersioning();
        this.guildConfig = new GuildConfigManager();
    }

    async startVoting(session) {
        const channel = await this.client.channels.fetch(session.channelId);
        const alivePlayers = Array.from(session.players.values()).filter(p => p.isAlive);
        const guildCfg = this.guildConfig.get(session.guildId);
        const durationMs = (guildCfg.voting_duration || config.PHASE_DURATIONS.VOTING) * 1000;

        const version = this.versioning.getVersion(`${session.guildId}_${session.channelId}`);

        const rows = [];
        for (let i = 0; i < alivePlayers.length; i += 5) {
            const batch = alivePlayers.slice(i, i + 5);
            const row = new ActionRowBuilder();
            for (const player of batch) {
                const customId = `${session.guildId}_${session.channelId}_${version}_vote_${player.id}`;
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(customId)
                        .setLabel(player.username)
                        .setStyle(ButtonStyle.Secondary)
                );
            }
            rows.push(row);
        }

        const embed = {
            title: '🗳️ التصويت',
            description: `اختر من تريد إقصاءه. لديك ${guildCfg.voting_duration || config.PHASE_DURATIONS.VOTING} ثانية.\n\nاللاعبون الأحياء: ${alivePlayers.length}`,
            color: 0x8B5CF6,
            timestamp: new Date().toISOString()
        };

        const msg = await channel.send({ embeds: [embed], components: rows });
        session.voteMessage = msg;

        session.startPhaseTimer(durationMs, async () => {
            await this.finalizeVoting(session);
        });
    }

    async handleVote(interaction, session, targetId) {
        const userId = interaction.user.id;
        const player = session.players.get(userId);

        if (!player || !player.isAlive) {
            return interaction.reply({ content: '❌ لا يمكنك التصويت.', ephemeral: true });
        }

        const key = `${session.guildId}_${session.channelId}_${userId}_vote`;
        if (this.lockManager.isLocked(session.guildId + '_' + session.channelId, userId, 'vote')) {
            return interaction.reply({ content: '❌ لقد صوت بالفعل.', ephemeral: true });
        }

        this.lockManager.acquireLock(session.guildId + '_' + session.channelId, userId, 'vote');

        const voteWeight = player.role === 'mayor' ? 2 : 1;
        const existing = session.votes.get(targetId) || 0;
        session.votes.set(targetId, existing + voteWeight);

        await interaction.reply({ content: '✅ تم تسجيل صوتك!', ephemeral: true });
    }

    async finalizeVoting(session) {
        const guildCfg = this.guildConfig.get(session.guildId);
        const alivePlayers = Array.from(session.players.values()).filter(p => p.isAlive);

        if (guildCfg.auto_absent_vote) {
            for (const player of alivePlayers) {
                const key = `${session.guildId}_${session.channelId}_${player.id}_vote`;
                if (!this.lockManager.isLocked(session.guildId + '_' + session.channelId, player.id, 'vote')) {
                    const targets = alivePlayers.filter(p => p.id !== player.id);
                    if (targets.length > 0) {
                        const random = targets[Math.floor(Math.random() * targets.length)];
                        const voteWeight = player.role === 'mayor' ? 2 : 1;
                        const existing = session.votes.get(random.id) || 0;
                        session.votes.set(random.id, existing + voteWeight);
                        logger.info(`Absent vote: ${player.id} -> ${random.id}`);
                    }
                }
            }
        }

        let maxVotes = 0;
        for (const [, count] of session.votes) {
            if (count > maxVotes) maxVotes = count;
        }

        let eliminated = null;
        if (maxVotes > 0) {
            const topCandidates = Array.from(session.votes.entries())
                .filter(([, count]) => count === maxVotes)
                .map(([id]) => id);

            eliminated = topCandidates[Math.floor(Math.random() * topCandidates.length)];
        }

        if (eliminated) {
            const player = session.players.get(eliminated);
            if (player) player.isAlive = false;

            if (session.voteMessage) {
                try {
                    await session.voteMessage.edit({ components: [] });
                } catch (e) {}
            }
        }

        session.transitionTo(require('../core/StateMachine').states.PROCESS_VOTES);
        session.endPhase();
    }
}

module.exports = VoteCollector;
