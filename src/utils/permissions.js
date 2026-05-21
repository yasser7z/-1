const { PermissionsBitField } = require('discord.js');

function botHasPermission(channel, permission) {
  if (!channel || !channel.guild) return false;

  const botMember = channel.guild.members.me;
  if (!botMember) return false;

  return botMember.permissionsIn(channel).has(permission);
}

function botCanSend(channel) {
  return botHasPermission(channel, PermissionsBitField.Flags.SendMessages);
}

function botCanEmbed(channel) {
  return botHasPermission(channel, PermissionsBitField.Flags.EmbedLinks);
}

function botCanManageMessages(channel) {
  return botHasPermission(channel, PermissionsBitField.Flags.ManageMessages);
}

function botCanReact(channel) {
  return botHasPermission(channel, PermissionsBitField.Flags.AddReactions);
}

function botCanReadHistory(channel) {
  return botHasPermission(channel, PermissionsBitField.Flags.ReadMessageHistory);
}

function checkAllPermissions(channel) {
  return {
    send: botCanSend(channel),
    embed: botCanEmbed(channel),
    manageMessages: botCanManageMessages(channel),
    react: botCanReact(channel),
    readHistory: botCanReadHistory(channel),
  };
}

module.exports = {
  botHasPermission,
  botCanSend,
  botCanEmbed,
  botCanManageMessages,
  botCanReact,
  botCanReadHistory,
  checkAllPermissions,
};
