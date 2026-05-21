const pino = require('pino');
const path = require('path');
const fs = require('fs');

const logDir = path.join(__dirname, '../../logs');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const transport = pino.transport({
  targets: [
    {
      target: 'pino/file',
      level: process.env.LOG_LEVEL || 'info',
      options: {
        destination: path.join(logDir, 'vale.log'),
        mkdir: true,
      },
    },
    {
      target: 'pino/file',
      level: 'error',
      options: {
        destination: path.join(logDir, 'error.log'),
        mkdir: true,
      },
    },
    {
      target: 'pino-pretty',
      level: process.env.LOG_LEVEL || 'info',
      options: {
        colorize: true,
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
        ignore: 'pid,hostname',
      },
    },
  ],
});

const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
  },
  transport,
);

module.exports = logger;
