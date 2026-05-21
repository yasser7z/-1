const { EmbedBuilder } = require('discord.js');
const colors = require('../../constants/colors');
const config = require('../../../config');

const COMMAND_NAME = 'مطور';
const COMMAND_ALIASES = ['مطور', 'قوانين', 'rules', 'dev', 'about'];

async function execute(message, args) {
  const subcommand = (args[0] || '').toLowerCase();

  if (subcommand === '' || subcommand === 'مطور' || subcommand === 'dev' || subcommand === 'about') {
    await showDevInfo(message);
  } else if (subcommand === 'قوانين' || subcommand === 'rules') {
    await showRules(message);
  } else {
    const embed = new EmbedBuilder()
      .setColor(colors.WARNING)
      .setTitle('❓ أوامر -ذيب')
      .setDescription(
        '`-ذيب مطور` — معلومات عن المطور\n' +
        '`-ذيب قوانين` — قوانين اللعبة\n' +
        '`-ذيب لوبي` — إنشاء لوبي\n' +
        '`-ذيب كشف @player` — [محقق] كشف فئة لاعب\n' +
        '`-ذيب ايقاف` — [مشرف] إيقاف اللوبي أو اللعبة\n' +
        '`-ذيب حل` — [مشرف] إيقاف الطوارئ\n' +
        '`-ذيب اطفاء` — [مشرف] إيقاف البوت',
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }
}

async function showDevInfo(message) {
  const embed = new EmbedBuilder()
    .setColor(colors.NEON_PURPLE)
    .setTitle('🤖 Vale Community Bot')
    .setDescription(
      '**Vale Community** — بوت لعبة المستذئب المتكامل.\n\n' +
      '━━━━━━━━━━━━━━━━━━\n\n' +
      '**المطور:** فريق Vale Community\n' +
      `**الإصدار:** ${require('../../../package.json').version}\n` +
      `**أقصى عدد لاعبين:** ${config.MAX_PLAYERS}\n` +
      `**عدد الأدوار المميزة:** ${config.UNIQUE_ROLES_LIST.length}\n` +
      `**مدة الليل:** ${config.PHASE_DURATIONS.NIGHT / 1000} ثانية\n` +
      `**مدة النهار:** ${config.PHASE_DURATIONS.DAY / 1000} ثانية\n` +
      `**مدة التصويت:** ${config.PHASE_DURATIONS.VOTE / 1000} ثانية\n` +
      '━━━━━━━━━━━━━━━━━━\n\n' +
      '_بوت مطور بالكامل باستخدام Discord.js v14_\n' +
      '_صنع في 🇸🇦 بدقة وإتقان_',
    )
    .setFooter({ text: 'Vale Community © 2026' })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

async function showRules(message) {
  const uniqueRolesList = config.UNIQUE_ROLES_LIST
    .map(r => `• **${r}** — ${getRoleDesc(r)}`)
    .join('\n');

  const embed = new EmbedBuilder()
    .setColor(colors.GOLD)
    .setTitle('📖 قوانين اللعبة')
    .setDescription(
      '**🎯 الهدف من اللعبة:**\n' +
      '• **القرويون:** اكتشاف وإعدام جميع الذئاب.\n' +
      '• **الذئاب:** قتل جميع القرويين.\n\n' +
      '**🔄 سير اللعبة:**\n' +
      '1️⃣️ **الليل** — الذئاب تختار ضحية، والأدوار المميزة تستخدم قدراتها.\n' +
      `   ⏱️ المدة: ${config.PHASE_DURATIONS.NIGHT / 1000} ثانية\n` +
      '2️⃣️ **النهار** — الجميع يناقشون ويتبادلون الشكوك.\n' +
      `   ⏱️ المدة: ${config.PHASE_DURATIONS.DAY / 1000} ثانية\n` +
      '3️⃣️ **التصويت** — يصوت الجميع على إعدام أحد اللاعبين.\n' +
      `   ⏱️ المدة: ${config.PHASE_DURATIONS.VOTE / 1000} ثانية\n` +
      '4️⃣️ **المحاكمة** — يتم إعدام اللاعب صاحب أعلى أصوات.\n\n' +
      '**🔮 الأدوار المميزة:**\n' +
      `${uniqueRolesList}\n\n` +
      '**🏆 شروط الفوز:**\n' +
      '• **انتصار القرية:** إعدام جميع الذئاب.\n' +
      '• **انتصار الذئاب:** عندما يتساوى عدد الذئاب مع القرويين أو يزيد.\n\n' +
      '**⚠️ ملاحظات مهمة:**\n' +
      '• الحد الأدنى لبدء اللعبة: 4 لاعبين.\n' +
      `• الحد الأقصى: ${config.MAX_PLAYERS} لاعباً.\n` +
      '• يجب أن يكون البوت في القناة ولديه صلاحيات كافية.\n' +
      '• يمكن للمشرفين استخدام -ذيب حل لإنهاء أي لعبة عالقة.',
    )
    .setFooter({ text: 'Vale Community © 2026 — العب بنزاهة' })
    .setTimestamp();

  await message.reply({ embeds: [embed] });
}

function getRoleDesc(role) {
  const descs = {
    Investigator: 'يحقق مع لاعب كل ليلة ليعرف إن كان ذئباً.',
    Bodyguard: 'يحمي لاعباً كل ليلة من الذئاب.',
    King: 'صوته يحتسب بصوتين في التصويت.',
    Mayor: 'يفض التعادل في حالة تساوي الأصوات.',
    Doctor: 'ينقذ لاعباً مصاباً كل ليلة.',
    Seductress: 'تغوي لاعباً وتمنعه من استخدام قدرته.',
    'Um-Zaki': 'يسكت لاعباً في اليوم التالي.',
  };
  return descs[role] || 'دور مميز بقدرة خاصة.';
}

module.exports = {
  name: COMMAND_NAME,
  aliases: COMMAND_ALIASES,
  description: 'معلومات المطور وقوانين اللعبة',
  execute,
};
