const cron = require('node-cron');
const logger = require('../utils/logger');
const { query, execute } = require('../../database/db');

const CLEANUP_INTERVAL = '0 * * * *';
const SESSION_TIMEOUT = 3600000;
const LOBBY_TIMEOUT = 7200000;

function cleanupOldSessions() {
  const cutoff = Date.now() - SESSION_TIMEOUT;
  const result = execute(
    `DELETE FROM lobby_sessions WHERE phase_start_timestamp IS NOT NULL AND phase_start_timestamp < ?`,
    { timestamp: cutoff },
  );
  if (result.changes > 0) {
    logger.info(`Cleaned up ${result.changes} stale game sessions.`);
  }
}

function cleanupStaleLobbies() {
  const cutoff = Date.now() - LOBBY_TIMEOUT;
  const result = execute(
    `UPDATE lobby_sessions SET status = 'closed' WHERE status = 'open' AND created_at < datetime(?, 'unixepoch')`,
    { cutoff: Math.floor(cutoff / 1000) },
  );
  if (result.changes > 0) {
    logger.info(`Closed ${result.changes} stale lobbies.`);
  }
}

function cleanupOldGameHistory() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString();
  const result = execute(
    `DELETE FROM game_history WHERE played_at < ?`,
    { played_at: thirtyDaysAgo },
  );
  if (result.changes > 0) {
    logger.info(`Cleaned up ${result.changes} old game history records.`);
  }
}

function runCleanup() {
  logger.info('Running scheduled cleanup...');
  try {
    cleanupOldSessions();
    cleanupStaleLobbies();
    cleanupOldGameHistory();
  } catch (error) {
    logger.error({ err: error }, 'Error during cleanup job.');
  }
}

function startCleanupJob() {
  cron.schedule(CLEANUP_INTERVAL, () => {
    runCleanup();
  });
  logger.info('Cleanup cron job scheduled (runs every hour).');
}

module.exports = { startCleanupJob, runCleanup };
