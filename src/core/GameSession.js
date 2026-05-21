const StateMachine = require('./StateMachine');
const db = require('../../database/db');
const logger = require('../utils/logger');

class GameSession {
    constructor(guildId, channelId, players, config) {
        this.guildId = guildId;
        this.channelId = channelId;
        this.state = StateMachine.states.LOBBY;
        this.players = new Map();
        this.nightActions = new Map();
        this.phaseTimer = null;
        this.phaseStartTimestamp = Date.now();
        this.config = config;
        this.votes = new Map();
        this.absentPlayers = new Set();

        players.forEach(p => {
            this.players.set(p.id, { ...p, isAlive: true });
        });

        this._saveToDB();
    }

    transitionTo(newState) {
        const valid = StateMachine.isValidTransition(this.state, newState);
        if (!valid) {
            logger.error(`Invalid state transition from ${this.state} to ${newState}`);
            throw new Error(`Invalid state transition: ${this.state} -> ${newState}`);
        }
        logger.info(`Session ${this.guildId}_${this.channelId}: ${this.state} -> ${newState}`);
        this.state = newState;
        this.phaseStartTimestamp = Date.now();
        this._savePhaseState();
    }

    startPhaseTimer(durationMs, onEnd) {
        this.clearPhaseTimer();
        this.phaseTimer = setTimeout(() => {
            logger.info(`Phase timer ended for ${this.guildId}_${this.channelId} at state ${this.state}`);
            if (onEnd) onEnd();
        }, durationMs);
    }

    clearPhaseTimer() {
        if (this.phaseTimer) {
            clearTimeout(this.phaseTimer);
            this.phaseTimer = null;
        }
    }

    endPhase() {
        this.clearPhaseTimer();
    }

    _saveToDB() {
        const db = require('../../database/db');
        const stmt = db.prepare(
            'INSERT OR REPLACE INTO active_games (guild_id, channel_id) VALUES (?, ?)'
        );
        stmt.run(this.guildId, this.channelId);
    }

    _savePhaseState() {
        const stmt = db.prepare(
            'INSERT OR REPLACE INTO game_state (game_id, phase, turn_count) VALUES (?, ?, COALESCE((SELECT turn_count FROM game_state WHERE game_id = ?) + 1, 1))'
        );
        stmt.run(`${this.guildId}_${this.channelId}`, this.state, `${this.guildId}_${this.channelId}`);
    }
}

module.exports = GameSession;
