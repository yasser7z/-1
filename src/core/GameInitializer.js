const GameSession = require('./GameSession');
const SessionManager = require('./SessionManager');
const StateMachine = require('./StateMachine');
const config = require('../../config/config');
const logger = require('../utils/logger');

class GameInitializer {
    constructor(sessionManager) {
        this.sessionManager = sessionManager;
    }

    async initialize(lobbyPlayers, guildId, channelId) {
        const key = `${guildId}_${channelId}`;

        try {
            let players = lobbyPlayers.map(p => ({
                id: p.id,
                username: p.username,
                role: null,
                isAlive: true
            }));

            players = this._distributeRoles(players);

            const session = new GameSession(guildId, channelId, players, config.DEFAULT_GUILD_CONFIG);
            this.sessionManager.set(key, session);
            this.sessionManager.saveToDB(session);

            session.transitionTo(StateMachine.states.NIGHT);
            logger.info(`Game initialized in ${key} with ${players.length} players`);
            return session;
        } catch (err) {
            logger.error(`Failed to initialize game in ${key}: ${err.message}`);
            this.sessionManager.delete(key);
            throw err;
        }
    }

    _distributeRoles(players) {
        const count = players.length;
        let wolfCount;
        if (count >= 4 && count <= 5) wolfCount = 1;
        else if (count >= 6 && count <= 7) wolfCount = 2;
        else wolfCount = 2;

        const specialRoles = [...config.UNIQUE_ROLES_LIST];
        const availableSpecial = [];

        for (let i = 0; i < Math.min(specialRoles.length, count - wolfCount - 1); i++) {
            availableSpecial.push(specialRoles[i]);
        }

        const roles = [];
        for (let i = 0; i < wolfCount; i++) roles.push('werewolf');
        availableSpecial.forEach(r => roles.push(r));
        while (roles.length < count) roles.push('villager');

        for (let i = roles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [roles[i], roles[j]] = [roles[j], roles[i]];
        }

        players.forEach((p, i) => {
            p.role = roles[i] || 'villager';
        });

        return players;
    }
}

module.exports = GameInitializer;
