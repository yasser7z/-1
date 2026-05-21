const { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ActionLockManager = require('../security/ActionLockManager');
const logger = require('../utils/logger');

class KingVetoHandler {
    constructor() {
        this.lockManager = new ActionLockManager();
    }

    async showVetoButton(session, channel) {
        const king = Array.from(session.players.values()).find(p => p.role === 'king' && p.isAlive);
        if (!king) return;

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('king_veto')
                .setLabel('👑 فيتو')
                .setStyle(ButtonStyle.Danger)
        );

        try {
            const msg = await channel.send({ content: `<@${king.id}>`, components: [row] });
            setTimeout(() => {
                msg.delete().catch(() => {});
            }, 30000);
        } catch (err) {
            logger.error(`Failed to show veto button: ${err.message}`);
        }
    }

    async handleVeto(interaction, session) {
        const userId = interaction.user.id;
        const player = session.players.get(userId);

        if (!player || player.role !== 'king') {
            return interaction.reply({ content: '❌ هذا الأمر مخصص للملك فقط.', ephemeral: true });
        }

        const key = `${session.guildId}_${session.channelId}`;
        if (this.lockManager.isLocked(key, userId, 'day_veto')) {
            return interaction.reply({ content: '❌ لقد استخدمت حق النقض مسبقاً.', ephemeral: true });
        }

        const alivePlayers = Array.from(session.players.values()).filter(p => p.isAlive && p.id !== userId);
        const options = alivePlayers.map(p => ({
            label: p.username,
            value: p.id
        }));

        if (options.length === 0) {
            return interaction.reply({ content: '❌ لا يوجد لاعبون أحياء لاستهدافهم.', ephemeral: true });
        }

        const select = new StringSelectMenuBuilder()
            .setCustomId('veto_select')
            .setPlaceholder('اختر اللاعب لإقصائه')
            .addOptions(options.slice(0, 25));

        const row = new ActionRowBuilder().addComponents(select);
        await interaction.reply({ content: '👑 اختر اللاعب الذي تريد إقصاءه:', components: [row], ephemeral: true });

        this.lockManager.acquireLock(key, userId, 'day_veto');
    }

    async handleVetoSelect(interaction, session) {
        const targetId = interaction.values[0];
        const target = session.players.get(targetId);

        if (target) {
            target.isAlive = false;
            session.endPhase();

            if (session.voteMessage) {
                try {
                    await session.voteMessage.edit({ components: [] });
                } catch (e) {}
            }

            const StateMachine = require('../core/StateMachine');
            session.transitionTo(StateMachine.states.NIGHT);
        }

        await interaction.reply({ content: `👑 تم إقصاء ${target?.username || targetId} بأمر الملك.`, ephemeral: true });
    }
}

module.exports = new KingVetoHandler();
