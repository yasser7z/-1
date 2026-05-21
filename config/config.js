module.exports = {
    LOBBY_INACTIVITY_TIMEOUT: 600000,
    CLEANUP_CRON: "0 * * * *",
    MAX_GAME_AGE_HOURS: 24,
    PHASE_DURATIONS: { NIGHT: 60, DAY: 60, VOTING: 60 },
    LOBBY_AUTO_START_DELAY: 60000,
    MAX_PLAYERS: 16,
    WEREWOLF_COUNTS: { "4-5": 1, "6-7": 2, "8-16": 2 },
    UNIQUE_ROLES_LIST: ["investigator", "bodyguard", "king", "mayor", "doctor", "seductress", "umzaki"],
    DEFAULT_GUILD_CONFIG: {
        night_duration: 60,
        day_duration: 60,
        voting_duration: 60,
        auto_absent_vote: false,
        narrator_style: "mysterious"
    }
};
