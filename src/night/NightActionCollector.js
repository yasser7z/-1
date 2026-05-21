const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const SafeCollector = require('../collectors/SafeCollector');
const InteractionVersioning = require('../security/InteractionVersioning');
const logger = require('../utils/logger');
const config = require('../../config/config');

const nightRoles = {
    werewolf: { action: 'night_kill', label: 'اقتل', emoji: '🔪' },
    investigator: { action: 'night_investigate', label: 'تحقق', emoji: '🔍' },
    bodyguard: { action: 'night_protect', label: 'احم', emoji: '🛡️' },
    doctor: { action: 'night_heal', label: 'عالج', emoji: '💉' },
    seductress: { action: 'night_seduce', label: 'اغو', emoji: '💋' },
    umzaki: { action: 'night_umzaki', label: 'استخدم قدرة', emoji: '🔮' }
};

class NightActionCollector {
    constructor(client) {
        this.client = client;
        this.versioning = new InteractionVersioning();
    }

    async collect(session) {
        const alivePlayers = Array.from(session.players.values()).filter(p => p.isAlive);
        const channel = await this.client.channels.fetch(session.channelId);

        const collector = new SafeCollector(session, {
            timeout: config.PHASE_DURATIONS.NIGHT * 1000
        });

        const actions = [];

        for (const player of alivePlayers) {
            const roleConfig = nightRoles[player.role];
            if (!roleConfig) continue;

            const targets = alivePlayers
                .filter(p => p.id !== player.id)
                .map(p => ({
                    label: p.username,
                    value: p.id,
                    emoji: p.isAlive ? '🟢' : '🔴'
                }));

            if (targets.length === 0) continue;

            const actionName = roleConfig.action;
            const customId = this.versioning.getCustomId(
                `${session.guildId}_${session.channelId}`,
                actionName,
                'select'
            );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(customId)
                .setPlaceholder(roleConfig.label)
                .addOptions(targets.slice(0, 25));

            const row = new ActionRowBuilder().addComponents(selectMenu);

            try {
                const msg = await channel.send({
                    content: `<@${player.id}> ${roleConfig.emoji} دورك: **${player.role}** - اختر هدفك:`,
                    components: [row]
                });

                actions.push({ playerId: player.id, msg, action: actionName });
            } catch (err) {
                logger.error(`Failed to send night action to ${player.id}: ${err.message}`);
            }
        }

        collector.startTimeout(() => {
            this._handleTimeout(session, actions);
        });

        logger.info(`Night actions sent for ${session.guildId}_${session.channelId} (${actions.length} players)`);
        return collector;
    }

    _handleTimeout(session, actions) {
        const alivePlayers = Array.from(session.players.values()).filter(p => p.isAlive);
        const wolfCount = alivePlayers.filter(p => p.role === 'werewolf' && p.isAlive).length;
        const wolfActions = Array.from(session.nightActions.entries())
            .filter(([id]) => alivePlayers.find(p => p.id === id && p.role === 'werewolf'));

        if (wolfCount > 0 && wolfActions.length === 0) {
            const nonWolves = alivePlayers.filter(p => p.role !== 'werewolf');
            if (nonWolves.length > 0) {
                const randomTarget = nonWolves[Math.floor(Math.random() * nonWolves.length)];
                const firstWolf = alivePlayers.find(p => p.role === 'werewolf');
                if (firstWolf) {
                    session.nightActions.set(firstWolf.id, randomTarget.id);
                    logger.info(`Auto-attack: wolf ${firstWolf.id} -> ${randomTarget.id}`);
                }
            }
        }
    }
}

module.exports = NightActionCollector;
