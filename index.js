require('dotenv').config();

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('./src/utils/logger');
const { initDb, close: closeDb } = require('./database/db');
const lobbyManager = require('./src/lobby/LobbyManager');
const sessionManager = require('./src/core/SessionManager');
const nightActionCollector = require('./src/night/NightActionCollector');
const rateLimitGuard = require('./src/security/RateLimitGuard');
const interactVersioning = require('./src/security/InteractionVersioning');
const cooldown = require('./src/utils/cooldown');
const actionLockManager = require('./src/security/ActionLockManager');
const nightResolver = require('./src/night/NightResolver');

const express = require('express');
const webApp = express();
const WEB_PORT = process.env.PORT || 3000;
webApp.get('/', (req, res) => res.send('Vale Community Bot is alive'));
webApp.listen(WEB_PORT, () => console.log(`✅ Web server (keep-alive) running on port ${WEB_PORT}`));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
});

client.commands = { slash: new Collection() };

const slashDir = path.join(__dirname, 'src/commands/slash');
if (fs.existsSync(slashDir)) {
  const files = fs.readdirSync(slashDir).filter(f => f.endsWith('.js'));
  for (const file of files) {
    try {
      const cmd = require(path.join(slashDir, file));
      if (cmd.data && cmd.execute) {
        client.commands.slash.set(cmd.data.name, cmd);
        logger.debug(`Loaded slash command: ${cmd.data.name}`);
      }
    } catch (err) {
      logger.error({ err }, `Failed to load slash command: ${file}`);
    }
  }
}

const eventsDir = path.join(__dirname, 'events');
if (fs.existsSync(eventsDir)) {
  const files = fs.readdirSync(eventsDir).filter(f => f.endsWith('.js'));
  for (const file of files) {
    try {
      const event = require(path.join(eventsDir, file));
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
      } else {
        client.on(event.name, (...args) => event.execute(...args));
      }
      logger.debug(`Loaded event: ${event.name}`);
    } catch (err) {
      logger.error({ err }, `Failed to load event: ${file}`);
    }
  }
}

client.login(process.env.DISCORD_TOKEN).catch(err => {
  logger.error({ err }, 'Failed to login.');
  process.exit(1);
});

function cleanup(reason) {
  logger.info(`Shutting down: ${reason}`);

  lobbyManager.cleanup();
  sessionManager.clear();
  nightActionCollector.activeCollections.clear();
  rateLimitGuard.destroy();
  interactVersioning.clear();
  cooldown.clearAll();
  actionLockManager.clear();
  nightResolver.resetLastHealed();

  closeDb();

  client.destroy();

  process.exit(0);
}

process.on('SIGINT', () => cleanup('SIGINT'));
process.on('SIGTERM', () => cleanup('SIGTERM'));
process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception.');
});
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection.');
});
