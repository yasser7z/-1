const logger = require('../utils/logger');

class SafeCollector {
  static async create(channel, filter, options = {}) {
    const {
      time = 60000,
      max = 1,
      onCollect = null,
      onEnd = null,
      idle = 30000,
    } = options;

    try {
      const collector = channel.createMessageComponentCollector({
        filter,
        time,
        max,
        idle,
      });

      let collectedCount = 0;

      collector.on('collect', async (interaction) => {
        try {
          collectedCount++;
          if (onCollect) {
            await onCollect(interaction);
          }
        } catch (err) {
          logger.error({ err }, 'SafeCollector: onCollect error.');
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: '❌ حدث خطأ أثناء معالجة طلبك.',
              ephemeral: true,
            }).catch(() => {});
          }
        }
      });

      collector.on('end', async (collected, reason) => {
        try {
          if (onEnd) {
            await onEnd(collected, reason);
          }
        } catch (err) {
          logger.error({ err }, 'SafeCollector: onEnd error.');
        }
        logger.debug(`Collector ended. Reason: ${reason}, Collected: ${collected.size}`);
      });

      collector.on('error', (err) => {
        logger.error({ err }, 'SafeCollector: collector error.');
      });

      return collector;
    } catch (err) {
      logger.error({ err }, 'SafeCollector: failed to create collector.');
      return null;
    }
  }

  static async createButtonCollector(channel, filter, options = {}) {
    return SafeCollector.create(channel, filter, {
      ...options,
      componentType: 2,
    });
  }

  static async createModalCollector(channel, filter, options = {}) {
    return SafeCollector.create(channel, filter, {
      ...options,
      componentType: 5,
    });
  }

  static async awaitOne(channel, filter, time = 60000) {
    return new Promise((resolve) => {
      const collector = channel.createMessageComponentCollector({
        filter,
        time,
        max: 1,
      });

      collector.on('collect', (interaction) => {
        collector.stop('collected');
        resolve(interaction);
      });

      collector.on('end', (collected, reason) => {
        if (reason !== 'collected') {
          resolve(null);
        }
      });
    });
  }
}

module.exports = SafeCollector;
