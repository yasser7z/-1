const { EmbedBuilder } = require('discord.js');

class NarratorFormatter {
    format(message, context = {}) {
        return new EmbedBuilder()
            .setColor('#8B5CF6')
            .setDescription(`━━\n\n${message}\n\n━━`)
            .setTimestamp();
    }
}

module.exports = new NarratorFormatter();
