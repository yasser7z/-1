const logger = require('../src/utils/logger');
const guildConfigManager = require('../src/config/GuildConfigManager');

const PREFIX = '-ذيب';

const prefixCommands = new Map();

function registerPrefixCommands() {
  const fs = require('fs');
  const path = require('path');
  const commandsDir = path.join(__dirname, '../src/commands/prefix');

  if (!fs.existsSync(commandsDir)) return;

  const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));
  for (const file of files) {
    try {
      const cmd = require(path.join(commandsDir, file));
      prefixCommands.set(cmd.name, cmd);
      if (cmd.aliases) {
        for (const alias of cmd.aliases) {
          prefixCommands.set(alias, cmd);
        }
      }
    } catch (err) {
      logger.error({ err }, `Failed to load prefix command: ${file}`);
    }
  }

  logger.info(`Loaded ${prefixCommands.size} prefix command aliases.`);
}

registerPrefixCommands();

module.exports = {
  name: 'messageCreate',
  once: false,
  execute(message) {
    if (message.author.bot) return;

    const content = message.content.trim();
    if (!content.startsWith(PREFIX)) return;

    const args = content.slice(PREFIX.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();
    if (!commandName) return;

    const command = prefixCommands.get(commandName);
    if (!command) return;

    try {
      command.execute(message, args);
    } catch (error) {
      logger.error({ err: error }, `Prefix command error: ${commandName}`);
      message.reply({ content: '❌ حدث خطأ أثناء تنفيذ الأمر.' }).catch(() => {});
    }
  },
};
