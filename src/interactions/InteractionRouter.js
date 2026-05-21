const logger = require('../utils/logger');
const ActionLockManager = require('../security/ActionLockManager');
const InteractionVersioning = require('../security/InteractionVersioning');
const RateLimitGuard = require('../security/RateLimitGuard');

const roleActionMapping = {
    werewolf: ['night_kill'],
    investigator: ['night_investigate'],
    bodyguard: ['night_protect'],
    doctor: ['night_heal'],
    seductress: ['night_seduce'],
    umzaki: ['night_umzaki'],
    king: ['day_veto'],
    mayor: ['day_vote'],
    villager: ['day_vote']
};

class InteractionRouter {
    constructor(client) {
        this.client = client;
        this.actionLockManager = new ActionLockManager();
        this.interactionVersioning = new InteractionVersioning();
        this.rateLimitGuard = new RateLimitGuard();
    }

    async route(interaction) {
        if (!interaction.customId) return;

        const parts = interaction.customId.split('_');
        if (parts.length < 4) return;

        const sessionId = parts[0];
        const phaseVersion = parseInt(parts[1], 10);
        const action = parts[2];
        const target = parts.slice(3).join('_');

        const userId = interaction.user.id;

        if (this.rateLimitGuard.isRateLimited(userId)) {
            return interaction.reply({ content: '❌ أنت مقيد مؤقتاً بسبب النقرات المتكررة.', ephemeral: true });
        }

        const session = this.client.sessionManager.get(sessionId);
        if (!session) {
            this.rateLimitGuard.recordFailure(userId);
            return interaction.reply({ content: '❌ الجلسة غير موجودة.', ephemeral: true });
        }

        if (!this.interactionVersioning.isValid(sessionId, phaseVersion)) {
            this.rateLimitGuard.recordFailure(userId);
            return interaction.reply({ content: '❌ انتهت صلاحية هذا الإجراء.', ephemeral: true });
        }

        const player = session.players.get(userId);
        if (!player) {
            this.rateLimitGuard.recordFailure(userId);
            return interaction.reply({ content: '❌ أنت لست في هذه اللعبة.', ephemeral: true });
        }

        if (!player.isAlive) {
            return interaction.reply({ content: '❌ أنت ميت ولا يمكنك تنفيذ إجراءات.', ephemeral: true });
        }

        const allowed = roleActionMapping[player.role] || [];
        if (!allowed.includes(action)) {
            this.rateLimitGuard.recordFailure(userId);
            return interaction.reply({ content: '❌ دورك لا يسمح بهذا الإجراء.', ephemeral: true });
        }

        if (this.actionLockManager.isLocked(sessionId, userId, action)) {
            return interaction.reply({ content: '❌ لقد قمت بالفعل بهذا الإجراء.', ephemeral: true });
        }

        const handler = this.getHandler(action);
        if (!handler) {
            logger.error(`No handler for action: ${action}`);
            return interaction.reply({ content: '❌ حدث خطأ.', ephemeral: true });
        }

        try {
            await handler(interaction, session, userId, target);
            this.actionLockManager.acquireLock(sessionId, userId, action);
            this.rateLimitGuard.resetFailures(userId);
        } catch (err) {
            logger.error(`Action handler error: ${err.message}`);
            if (!interaction.replied) {
                await interaction.reply({ content: '❌ حدث خطأ أثناء تنفيذ الإجراء.', ephemeral: true });
            }
        }
    }

    getHandler(action) {
        const handlers = {
            night_kill: async (i, s, uid, t) => {
                s.nightActions.set(uid, t);
                await i.reply({ content: '✅ تم تحديد هدفك لهذه الليلة.', ephemeral: true });
            },
            night_investigate: async (i, s, uid, t) => {
                s.nightActions.set(uid, t);
                await i.reply({ content: '✅ جاري التحقيق في الهدف.', ephemeral: true });
            },
            night_protect: async (i, s, uid, t) => {
                s.nightActions.set(uid, t);
                await i.reply({ content: '✅ يتم حماية الهدف الآن.', ephemeral: true });
            },
            night_heal: async (i, s, uid, t) => {
                s.nightActions.set(uid, t);
                await i.reply({ content: '✅ تم شفاء الهدف.', ephemeral: true });
            },
            night_seduce: async (i, s, uid, t) => {
                s.nightActions.set(uid, t);
                await i.reply({ content: '✅ تم إغراء الهدف.', ephemeral: true });
            },
            night_umzaki: async (i, s, uid, t) => {
                s.nightActions.set(uid, t);
                await i.reply({ content: '✅ تم تنفيذ قدرة أم زاكي.', ephemeral: true });
            },
            day_veto: async (i, s, uid, t) => {
                s.vetoTarget = t;
                await i.reply({ content: '✅ تم استخدام حق النقض.', ephemeral: true });
            },
            day_vote: async (i, s, uid, t) => {
                s.votes.set(uid, t);
                await i.reply({ content: '✅ تم تسجيل صوتك.', ephemeral: true });
            }
        };
        return handlers[action];
    }
}

module.exports = InteractionRouter;
