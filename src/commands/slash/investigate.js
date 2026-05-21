const { SlashCommandBuilder } = require('discord.js');
const db = require('../../database/db');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('investigate')
        .setDescription('تحقيق في أحد اللاعبين (استخدام لمرة واحدة)')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('اللاعب المستهدف')
                .setRequired(true)),
    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const session = interaction.client.sessionManager.get(
            `${interaction.guildId}_${interaction.channelId}`
        );

        if (!session) {
            return interaction.reply({ content: '❌ لا توجد لعبة نشطة.', ephemeral: true });
        }

        const player = session.players.get(interaction.user.id);
        if (!player || player.role !== 'investigator') {
            return interaction.reply({ content: '❌ هذا الأمر مخصص للمحقق فقط.', ephemeral: true });
        }

        const lock = db.prepare(
            'SELECT locked FROM action_locks WHERE game_id = ? AND user_id = ? AND action = ? AND permanent = 1'
        ).get(`${interaction.guildId}_${interaction.channelId}`, interaction.user.id, 'night_investigate');

        if (lock) {
            return interaction.reply({ content: '❌ لقد استخدمت قدرة التحقيق مسبقاً.', ephemeral: true });
        }

        const targetPlayer = session.players.get(target.id);
        if (!targetPlayer) {
            return interaction.reply({ content: '❌ هذا اللاعب ليس في اللعبة.', ephemeral: true });
        }

        db.prepare(
            'INSERT INTO action_locks (game_id, user_id, action, permanent) VALUES (?, ?, ?, 1)'
        ).run(`${interaction.guildId}_${interaction.channelId}`, interaction.user.id, 'night_investigate');

        const role = targetPlayer.role === 'werewolf' ? 'ذئب' : 'قروي';
        await interaction.reply({
            content: `🔍 نتيجة التحقيق: **${target.username}** هو **${role}**.`,
            ephemeral: true
        });
    }
};
