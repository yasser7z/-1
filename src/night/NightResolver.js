const logger = require('../utils/logger');

class NightResolver {
    resolve(session) {
        const actions = session.nightActions;
        const players = session.players;
        const alivePlayers = Array.from(players.values()).filter(p => p.isAlive);

        const protectedSet = new Set();
        const healedSet = new Set();
        let attackTarget = null;
        let seductressTarget = null;
        let seductressId = null;
        let umZakiTriggered = false;

        for (const [playerId, targetId] of actions) {
            const player = players.get(playerId);
            if (!player || !player.isAlive) continue;

            switch (player.role) {
                case 'bodyguard':
                    protectedSet.add(targetId);
                    break;
                case 'doctor':
                    healedSet.add(targetId);
                    break;
                case 'seductress':
                    seductressId = playerId;
                    seductressTarget = targetId;
                    break;
                case 'werewolf':
                    attackTarget = targetId;
                    break;
                case 'umzaki':
                    umZakiTriggered = true;
                    break;
            }
        }

        if (!attackTarget) {
            const nonWolves = alivePlayers.filter(p => p.role !== 'werewolf');
            const wolves = alivePlayers.filter(p => p.role === 'werewolf');
            if (nonWolves.length > 0 && wolves.length > 0) {
                attackTarget = nonWolves[Math.floor(Math.random() * nonWolves.length)].id;
                session.nightActions.set(wolves[0].id, attackTarget);
                logger.info(`Auto-attack: wolf ${wolves[0].id} -> ${attackTarget}`);
            }
        }

        const deaths = [];

        if (seductressId && seductressTarget) {
            const targetPlayer = players.get(seductressTarget);
            if (targetPlayer && targetPlayer.role === 'werewolf' && targetPlayer.isAlive) {
                deaths.push(seductressId);
            } else if (seductressTarget === attackTarget) {
                deaths.push(seductressId);
                attackTarget = null;
            }
        }

        if (attackTarget) {
            if (!protectedSet.has(attackTarget) || !deaths.includes(attackTarget)) {
                if (!healedSet.has(attackTarget)) {
                    if (!deaths.includes(attackTarget)) {
                        deaths.push(attackTarget);
                    }
                }
            }
        }

        return { deaths: [...new Set(deaths)], umZakiTriggered };
    }
}

module.exports = new NightResolver();
