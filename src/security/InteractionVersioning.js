const logger = require('../utils/logger');

class InteractionVersioning {
  constructor() {
    this.versions = new Map();
  }

  _key(sessionKey) {
    return sessionKey;
  }

  getVersion(sessionKey) {
    const data = this.versions.get(this._key(sessionKey));
    return data ? data.version : -1;
  }

  getPhase(sessionKey) {
    const data = this.versions.get(this._key(sessionKey));
    return data ? data.phase : null;
  }

  incrementVersion(sessionKey, newPhase) {
    const key = this._key(sessionKey);
    const current = this.versions.get(key);
    const nextVersion = current ? current.version + 1 : 1;

    this.versions.set(key, {
      version: nextVersion,
      phase: newPhase,
      updatedAt: Date.now(),
    });

    logger.debug(`Version ${nextVersion} for session ${sessionKey} (phase: ${newPhase})`);
    return nextVersion;
  }

  validateInteraction(sessionKey, expectedPhase, interactionVersion) {
    const data = this.versions.get(this._key(sessionKey));

    if (!data) {
      return { valid: false, reason: 'No version data for this session.' };
    }

    if (data.phase !== expectedPhase) {
      return {
        valid: false,
        reason: `Phase mismatch: expected ${expectedPhase}, current ${data.phase}.`,
      };
    }

    if (data.version !== interactionVersion) {
      return {
        valid: false,
        reason: `Version mismatch: expected ${data.version}, got ${interactionVersion}.`,
        currentVersion: data.version,
      };
    }

    return { valid: true };
  }

  initSession(sessionKey, initialPhase) {
    this.incrementVersion(sessionKey, initialPhase);
  }

  removeSession(sessionKey) {
    this.versions.delete(this._key(sessionKey));
    logger.debug(`Removed versioning for session ${sessionKey}`);
  }

  getAllSessions() {
    return Array.from(this.versions.entries()).map(([key, data]) => ({
      sessionKey: key,
      ...data,
    }));
  }

  clear() {
    this.versions.clear();
  }
}

module.exports = new InteractionVersioning();
