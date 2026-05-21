const StateMachine = require('./StateMachine');
const NightResolver = require('../night/NightResolver');
const NightActionCollector = require('../night/NightActionCollector');
const WinConditionChecker = require('./WinConditionChecker');
const GuildConfigManager = require('../config/GuildConfigManager');
const InteractionVersioning = require('../security/InteractionVersioning');
const ActionLockManager = require('../security/ActionLockManager');
const logger = require('../utils/logger');
const config = require('../../config/config');

class PhaseManager {
    constructor(client) {
        this.client = client;
        this.versioning = new InteractionVersioning();
        this.actionLockManager = new ActionLockManager();
        this.guildConfig = new GuildConfigManager();
    }

    async startNight(session) {
        session.transitionTo(StateMachine.states.NIGHT);
        this.versioning.incrementVersion(`${session.guildId}_${session.channelId}`);
        this.actionLockManager.resetLocksAtPhaseStart(`${session.guildId}_${session.channelId}`);

        const guildCfg = this.guildConfig.get(session.guildId);
        const durationMs = (guildCfg.night_duration || config.PHASE_DURATIONS.NIGHT) * 1000;

        const collector = new NightActionCollector(this.client);
        await collector.collect(session);

        session.startPhaseTimer(durationMs, async () => {
            await this.processNight(session);
        });

        logger.info(`Night phase started for ${session.guildId}_${session.channelId}`);
    }

    async processNight(session) {
        session.transitionTo(StateMachine.states.PROCESS_NIGHT);
        session.endPhase();

        const result = NightResolver.resolve(session);
        const checker = new WinConditionChecker();

        for (const deathId of result.deaths) {
            const player = session.players.get(deathId);
            if (player) {
                player.isAlive = false;
                logger.info(`Player ${player.username} (${player.role}) died during night`);
            }
        }

        const winner = checker.check(session);
        if (winner) {
            await this.endGame(session, winner);
            return;
        }

        await this.startDay(session, result.deaths, result.umZakiTriggered);
    }

    async startDay(session, deaths, umZakiTriggered) {
        session.transitionTo(StateMachine.states.DAY);
        this.versioning.incrementVersion(`${session.guildId}_${session.channelId}`);
        this.actionLockManager.resetLocksAtPhaseStart(`${session.guildId}_${session.channelId}`);

        const guildCfg = this.guildConfig.get(session.guildId);
        const durationMs = (guildCfg.day_duration || config.PHASE_DURATIONS.DAY) * 1000;

        session.startPhaseTimer(durationMs, async () => {
            await this.startVoting(session);
        });

        logger.info(`Day phase started for ${session.guildId}_${session.channelId}`);
    }

    async startVoting(session) {
        session.transitionTo(StateMachine.states.VOTING);
        this.versioning.incrementVersion(`${session.guildId}_${session.channelId}`);

        const guildCfg = this.guildConfig.get(session.guildId);
        const durationMs = (guildCfg.voting_duration || config.PHASE_DURATIONS.VOTING) * 1000;

        session.startPhaseTimer(durationMs, async () => {
            await this.processVotes(session);
        });

        logger.info(`Voting phase started for ${session.guildId}_${session.channelId}`);
    }

    async processVotes(session) {
        session.transitionTo(StateMachine.states.PROCESS_VOTES);
        session.endPhase();

        const guildCfg = this.guildConfig.get(session.guildId);
        const aliveCount = Array.from(session.players.values()).filter(p => p.isAlive).length;

        if (guildCfg.auto_absent_vote) {
            for (const [id, player] of session.players) {
                if (player.isAlive && !session.votes.has(id)) {
                    const targets = Array.from(session.players.values()).filter(p => p.isAlive && p.id !== id);
                    if (targets.length > 0) {
                        const random = targets[Math.floor(Math.random() * targets.length)];
                        session.votes.set(id, random.id);
                        logger.info(`Absent vote: ${id} -> ${random.id}`);
                    }
                }
            }
        }

        const tally = new Map();
        for (const [, targetId] of session.votes) {
            tally.set(targetId, (tally.get(targetId) || 0) + 1);
        }

        let maxVotes = 0;
        let eliminated = null;
        for (const [targetId, count] of tally) {
            if (count > maxVotes) {
                maxVotes = count;
                eliminated = targetId;
            }
        }

        if (eliminated) {
            const player = session.players.get(eliminated);
            if (player) {
                player.isAlive = false;
                logger.info(`Player ${player.username} eliminated by vote`);
            }
        }

        if (session.vetoTarget && session.vetoTarget === eliminated) {
            const player = session.players.get(eliminated);
            if (player) player.isAlive = true;
            eliminated = null;
            logger.info('King veto used, execution cancelled');
        }

        const checker = new WinConditionChecker();
        const winner = checker.check(session);
        if (winner) {
            await this.endGame(session, winner);
            return;
        }

        await this.startNight(session);
    }

    async endGame(session, winner) {
        session.transitionTo(StateMachine.states.GAME_OVER);
        session.endPhase();

        const StatsManager = require('../stats/StatsManager');
        await StatsManager.recordGame(session, winner);

        logger.info(`Game over in ${session.guildId}_${session.channelId}, winner: ${winner}`);
    }
}

module.exports = PhaseManager;
