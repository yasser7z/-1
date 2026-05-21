const cron = require('node-cron');
const db = require('../../database/db');
const logger = require('../utils/logger');
const config = require('../../config/config');

function startCleanupJob() {
    cron.schedule(config.CLEANUP_CRON, () => {
        logger.info('Running database cleanup...');
        // Placeholder for actual cleanup logic
    });
}

module.exports = { startCleanupJob };
