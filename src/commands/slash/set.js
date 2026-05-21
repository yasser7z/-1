const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const GuildConfigManager = require('../../config/GuildConfigManager');
const logger = require('../../utils/logger');

const validKeys = {
    night_duration: { type: 'number', min: 10, max: 300 },
    day_duration: { type: 'number', min: 10, max: 300 },
    voting_duration: { type: 'number', min: 10, max: 300 },
    auto_absent_vote: { type: 'boolean' },
    narrator_style: { type: 'string', values: ['mysterious', 'simple', 'epic'] }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('set')
        .setDescription('تعديل إعدادات السيرفر')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('key')
                .setDescription('الخاصية')
                .setRequired(true)
                .addChoices(
                    { name: 'مدة الليل (ثانية)', value: 'night_duration' },
                    { name: 'مدة النهار (ثانية)', value: 'day_duration' },
                    { name: 'مدة التصويت (ثانية)', value: 'voting_duration' },
                    { name: 'التصويت الغيابي التلقائي', value: 'auto_absent_vote' },
                    { name: 'نمط الراوي', value: 'narrator_style' }
                ))
        .addStringOption(option =>
            option.setName('value')
                .setDescription('القيمة')
                .setRequired(true)),
    async execute(interaction) {
        const key = interaction.options.getString('key');
        const rawValue = interaction.options.getString('value');
        const config = validKeys[key];

        if (!config) {
            return interaction.reply({ content: '❌ خاصية غير صالحة.', ephemeral: true });
        }

        let value;
        if (config.type === 'number') {
            value = parseInt(rawValue, 10);
            if (isNaN(value) || value < config.min || value > config.max) {
                return interaction.reply({
                    content: `❌ القيمة يجب أن تكون رقماً بين ${config.min} و ${config.max}.`,
                    ephemeral: true
                });
            }
        } else if (config.type === 'boolean') {
            if (!['true', 'false'].includes(rawValue)) {
                return interaction.reply({ content: '❌ القيمة يجب أن تكون true أو false.', ephemeral: true });
            }
            value = rawValue === 'true';
        } else if (config.values) {
            if (!config.values.includes(rawValue)) {
                return interaction.reply({
                    content: `❌ القيمة يجب أن تكون أحد: ${config.values.join(', ')}.`,
                    ephemeral: true
                });
            }
            value = rawValue;
        }

        const gm = new GuildConfigManager();
        gm.set(interaction.guildId, key, value);

        logger.info(`Guild config updated: ${interaction.guildId} ${key}=${value}`);
        await interaction.reply({ content: `✅ تم تحديث **${key}** إلى \`${value}\`.`, ephemeral: true });
    }
};
