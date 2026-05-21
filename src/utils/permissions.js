const { PermissionsBitField } = require('discord.js');

function checkBotPermissions(channel) {
    const required = [
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.EmbedLinks,
        PermissionsBitField.Flags.ManageMessages,
        PermissionsBitField.Flags.UseButtons,
        PermissionsBitField.Flags.UseSelectMenus,
        PermissionsBitField.Flags.ViewChannel
    ];
    
    const botPermissions = channel.permissionsFor(channel.guild.members.me);
    return required.every(p => botPermissions.has(p));
}

module.exports = { checkBotPermissions };
