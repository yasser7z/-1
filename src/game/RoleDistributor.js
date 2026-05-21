const config = require('../../config/config');
const logger = require('../utils/logger');

class RoleDistributor {
    distribute(players) {
        const count = players.length;
        let wolfCount = config.WEREWOLF_COUNTS['8-16'];
        if (count >= 6 && count <= 7) wolfCount = config.WEREWOLF_COUNTS['6-7'];
        else if (count >= 4 && count <= 5) wolfCount = config.WEREWOLF_COUNTS['4-5'];

        const availableSpecials = [...config.UNIQUE_ROLES_LIST];
        const assignedSpecials = [];

        const maxSpecials = Math.max(0, count - wolfCount - 1);
        for (let i = 0; i < Math.min(availableSpecials.length, maxSpecials); i++) {
            const idx = Math.floor(Math.random() * availableSpecials.length);
            assignedSpecials.push(availableSpecials.splice(idx, 1)[0]);
        }

        const roles = [];
        for (let i = 0; i < wolfCount; i++) roles.push('werewolf');
        assignedSpecials.forEach(r => roles.push(r));
        while (roles.length < count) roles.push('villager');

        for (let i = roles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [roles[i], roles[j]] = [roles[j], roles[i]];
        }

        const roleMap = new Map();
        players.forEach((p, i) => {
            roleMap.set(p.id, roles[i] || 'villager');
        });

        logger.info(`Roles distributed: ${wolfCount} wolves, ${assignedSpecials.length} specials, ${count - wolfCount - assignedSpecials.length} villagers`);
        return roleMap;
    }
}

module.exports = new RoleDistributor();
