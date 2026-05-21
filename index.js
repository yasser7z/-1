require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const logger = require('./src/utils/logger');
const db = require('./database/db');
const SessionManager = require('./src/core/SessionManager');
const LobbyManager = require('./src/lobby/LobbyManager');
const DisconnectHandler = require('./src/handlers/DisconnectHandler');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.sessionManager = new SessionManager();
client.lobbyManager = new LobbyManager(client);
client.slashCommands = new Collection();
client.prefixCommands = new Collection();

const disconnectHandler = new DisconnectHandler(client);

client.on('guildMemberRemove', async (member) => {
    await disconnectHandler.handle(member);
});

const eventFiles = fs.readdirSync(path.join(__dirname, 'events')).filter(f => f.endsWith('.js'));
for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

const slashFiles = fs.readdirSync(path.join(__dirname, 'src/commands/slash')).filter(f => f.endsWith('.js'));
for (const file of slashFiles) {
    const cmd = require(`./src/commands/slash/${file}`);
    client.slashCommands.set(cmd.data.name, cmd);
}

process.on('SIGINT', async () => {
    logger.info('Shutting down gracefully...');
    for (const session of client.sessionManager.getAll()) {
        session.clearPhaseTimer();
    }
    db.close();
    client.destroy();
    process.exit(0);
});

process.on('unhandledRejection', (err) => {
    logger.error(`Unhandled rejection: ${err.message}`);
});

client.login(process.env.DISCORD_TOKEN).catch(err => {
    logger.error(`Failed to login: ${err.message}`);
    process.exit(1);
});
