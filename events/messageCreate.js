const logger = require('../src/utils/logger');

const prefixCommands = new Map();
const prefix = '-ذيب ';

const loadPrefixCommands = () => {
    const commands = [
        require('../src/commands/prefix/lobby'),
        require('../src/commands/prefix/emergency'),
        require('../src/commands/prefix/stop'),
        require('../src/commands/prefix/game'),
        require('../src/commands/prefix/status')
    ];
    for (const cmd of commands) {
        prefixCommands.set(cmd.name, cmd);
    }
};

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;
        if (!message.content.startsWith(prefix)) return;

        if (prefixCommands.size === 0) loadPrefixCommands();

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift()?.toLowerCase();

        const command = prefixCommands.get(commandName);
        if (command) {
            try {
                await command.execute(message, args, message.client);
            } catch (err) {
                logger.error(`Prefix command error: ${err.message}`);
                message.reply('❌ حدث خطأ أثناء تنفيذ الأمر.').catch(() => {});
            }
        }
    }
};
