const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const sessionManager = require('../../core/SessionManager');
const colors = require('../../constants/colors');
const emojis = require('../../constants/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('investigate')
    .setDescription('عرض نتيجة التحقيق (للمحقق)')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('اللاعب المستهدف')
        .setRequired(true),
    ),

  async execute(interaction) {
    const guildId = interaction.guildId;
    const channelId = interaction.channelId;
    const userId = interaction.user.id;
    const targetUser = interaction.options.getUser('target');

    if (!targetUser) {
      return interaction.reply({ content: '❌ يجب تحديد لاعب.', ephemeral: true });
    }

    const session = sessionManager.get(guildId, channelId);
    if (!session || !session.isActive) {
      return interaction.reply({ content: '❌ لا توجد لعبة نشطة.', ephemeral: true });
    }

    const player = session.getPlayer(userId);
    if (!player || !player.isAlive) {
      return interaction.reply({ content: '❌ أنت ميت أو لست في اللعبة.', ephemeral: true });
    }

    if (player.role !== 'Investigator') {
      return interaction.reply({ content: '❌ هذا الأمر للمحقق فقط.', ephemeral: true });
    }

    const phase = session.stateMachine.getState();
    if (phase !== 'NIGHT') {
      return interaction.reply({ content: '❌ يمكنك استخدام هذا الأمر فقط في الليل.', ephemeral: true });
    }

    const target = session.getPlayer(targetUser.id);
    if (!target || !target.isAlive) {
      return interaction.reply({ content: '❌ الهدف غير صالح أو ميت.', ephemeral: true });
    }

    if (target.userId === userId) {
      return interaction.reply({ content: '❌ لا يمكنك التحقيق مع نفسك.', ephemeral: true });
    }

    const isWerewolf = target.role === 'Werewolf';

    const embed = new EmbedBuilder()
      .setColor(isWerewolf ? colors.WEREWOLF_RED : colors.SUCCESS)
      .setTitle(`${emojis.ROLES.INVESTIGATOR} نتيجة التحقيق`)
      .setDescription(
        isWerewolf
          ? `🔴 **${targetUser.username}** هو **ذئب**!`
          : `🟢 **${targetUser.username}** ليس ذئباً.`,
      )
      .setFooter({ text: `تحقيق الليلة` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });

    session.recordNightAction(userId, targetUser.id, 'INVESTIGATE');
  },
};
