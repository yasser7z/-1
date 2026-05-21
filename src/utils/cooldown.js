const cooldowns = new Map();

function checkCooldown(userId, cooldownMs = 500) {
    const now = Date.now();
    const last = cooldowns.get(userId) || 0;
    if (now - last < cooldownMs) return true;
    cooldowns.set(userId, now);
    return false;
}

module.exports = { checkCooldown };
