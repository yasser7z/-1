const db = require('../../database/db');
const config = require('../../config/config');
const logger = require('../utils/logger');
const LobbyUIManager = require('./LobbyUIManager');
const LobbyButtons = require('./LobbyButtons');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

class LobbyManager {
    constructor(client) {
        this.client = client;
        this.lobbies = new Map();
    }

    async createLobby(channel) {
        const key = `${channel.guildId}_${channel.id}`;
        if (this.lobbies.has(key)) return null;

        const lobby = {
            channel,
            guildId: channel.guildId,
            channelId: channel.id,
            players: [],
            countdown: null,
            inactivityTimer: null,
            autoStartTimer: null,
            lastActivity: Date.now(),
            message: null,
            started: false
        };

        const embed = LobbyUIManager.buildLobbyEmbed(lobby);
        const row = LobbyButtons.createActionRow();
        const msg = await channel.send({ embeds: [embed], components: [row] });
        lobby.message = msg;

        this.lobbies.set(key, lobby);
        this._resetInactivityTimer(lobby);

        const stmt = db.prepare('INSERT OR REPLACE INTO lobby_data (guild_id, channel_id, player_count) VALUES (?, ?, ?)');
        stmt.run(lobby.guildId, lobby.channelId, 0);

        logger.info(`Lobby created in ${channel.guildId}_${channel.id}`);
        return lobby;
    }

    async addPlayer(user, lobby) {
        const key = `${lobby.guildId}_${lobby.channelId}`;
        if (!this.lobbies.has(key)) return { success: false, reason: 'no_lobby' };
        if (lobby.players.length >= config.MAX_PLAYERS) return { success: false, reason: 'max_players' };
        if (lobby.players.find(p => p.id === user.id)) return { success: false, reason: 'already_joined' };
        if (lobby.started) return { success: false, reason: 'already_started' };

        lobby.players.push({ id: user.id, username: user.username, displayAvatarURL: user.displayAvatarURL() });
        lobby.lastActivity = Date.now();

        this._updateLobbyData(lobby);
        await this.updateEmbed(lobby);
        this._manageAutoStart(lobby);
        this._resetInactivityTimer(lobby);
        return { success: true };
    }

    async removePlayer(user, lobby) {
        const key = `${lobby.guildId}_${lobby.channelId}`;
        if (!this.lobbies.has(key)) return { success: false, reason: 'no_lobby' };
        if (lobby.started) return { success: false, reason: 'already_started' };

        const idx = lobby.players.findIndex(p => p.id === user.id);
        if (idx === -1) return { success: false, reason: 'not_in_lobby' };

        lobby.players.splice(idx, 1);
        lobby.lastActivity = Date.now();

        this._updateLobbyData(lobby);
        await this.updateEmbed(lobby);
        this._manageAutoStart(lobby);
        this._resetInactivityTimer(lobby);
        return { success: true };
    }

    async updateEmbed(lobby) {
        const embed = LobbyUIManager.buildLobbyEmbed(lobby);
        const row = LobbyButtons.createActionRow();
        try {
            await lobby.message.edit({ embeds: [embed], components: [row] });
        } catch (err) {
            logger.error(`Failed to update lobby embed: ${err.message}`);
        }
    }

    startCountdown(lobby) {
        if (lobby.countdown) return;

        lobby.countdown = config.LOBBY_AUTO_START_DELAY / 1000;
        const key = `${lobby.guildId}_${lobby.channelId}`;

        lobby.autoStartTimer = setInterval(async () => {
            lobby.countdown--;
            await this.updateEmbed(lobby);

            if (lobby.countdown <= 0) {
                clearInterval(lobby.autoStartTimer);
                lobby.autoStartTimer = null;
                lobby.countdown = null;
                lobby.started = true;
                this._resetInactivityTimer(lobby);
                logger.info(`Auto-start triggered for lobby ${key}`);
            }
        }, 1000);
    }

    cancelCountdown(lobby) {
        if (lobby.autoStartTimer) {
            clearInterval(lobby.autoStartTimer);
            lobby.autoStartTimer = null;
        }
        lobby.countdown = null;
    }

    async deleteLobby(lobby, reason = 'inactivity') {
        const key = `${lobby.guildId}_${lobby.channelId}`;
        this.cancelCountdown(lobby);
        if (lobby.inactivityTimer) clearTimeout(lobby.inactivityTimer);
        this.lobbies.delete(key);

        const stmt = db.prepare('DELETE FROM lobby_data WHERE guild_id = ? AND channel_id = ?');
        stmt.run(lobby.guildId, lobby.channelId);

        try {
            if (reason === 'inactivity') {
                await lobby.channel.send({ content: 'انتهت صلاحية اللوبي بسبب عدم النشاط.' });
            }
            await lobby.message.delete().catch(() => {});
        } catch (err) {
            logger.error(`Failed to delete lobby message: ${err.message}`);
        }

        logger.info(`Lobby ${key} deleted due to ${reason}`);
    }

    _resetInactivityTimer(lobby) {
        if (lobby.inactivityTimer) clearTimeout(lobby.inactivityTimer);
        lobby.inactivityTimer = setTimeout(() => {
            if (!lobby.started) this.deleteLobby(lobby, 'inactivity');
        }, config.LOBBY_INACTIVITY_TIMEOUT);
    }

    _manageAutoStart(lobby) {
        if (lobby.players.length >= 4) {
            if (!lobby.autoStartTimer) this.startCountdown(lobby);
        } else {
            this.cancelCountdown(lobby);
        }
    }

    _updateLobbyData(lobby) {
        const stmt = db.prepare('INSERT OR REPLACE INTO lobby_data (guild_id, channel_id, player_count) VALUES (?, ?, ?)');
        stmt.run(lobby.guildId, lobby.channelId, lobby.players.length);
    }
}

module.exports = LobbyManager;
