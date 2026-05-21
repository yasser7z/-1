module.exports = {
    name: 'game',
    execute: async (message, args, client) => {
        const subcommand = args[0]?.toLowerCase();

        if (subcommand === 'مطور') {
            return message.reply({
                embeds: [{
                    title: '👨‍💻 المطور',
                    description: 'تم تطوير هذا البوت بواسطة **Vale Community**.\nجميع الحقوق محفوظة.',
                    color: 0x8B5CF6
                }]
            });
        }

        if (subcommand === 'قوانين') {
            return message.reply({
                embeds: [{
                    title: '📜 قوانين اللعبة',
                    description: [
                        '1. احترام جميع اللاعبين.',
                        '2. لا يوجد غش أو تنسيق خارج اللعبة.',
                        '3. اتباع تعليمات المشرف.',
                        '4. الاستمتاع باللعبة! 🎉'
                    ].join('\n'),
                    color: 0x8B5CF6
                }]
            });
        }

        return message.reply('❌ أمر غير معروف. استخدم `-ذيب مطور` أو `-ذيب قوانين`.');
    }
};
