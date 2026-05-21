class DeadPlayerHandler {
  async notifyDeath(gameSession, channel, userId, role) {
  }

  async disableDeadButtons(gameSession, channel) {
    try {
      const messages = await channel.messages.fetch({ limit: 10 });
      for (const msg of messages.values()) {
        if (msg.author.id !== channel.client.user.id) continue;
        if (msg.components.length === 0) continue;

        for (const row of msg.components) {
          for (const comp of row.components) {
            if (comp.type === 2) {
              comp.data.disabled = true;
            }
          }
        }

        await msg.edit({ components: msg.components }).catch(() => {});
      }
    } catch (err) {
      logger.warn('Could not disable dead buttons.');
    }
  }
}

module.exports = new DeadPlayerHandler();
