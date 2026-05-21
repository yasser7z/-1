module.exports = {
  MAX_PLAYERS: 16,
  PHASE_DURATIONS: {
    NIGHT: 60000,
    DAY: 60000,
    VOTE: 60000,
    LOBBY_COUNTDOWN: 60000,
  },
  LOBBY_AUTO_START_DELAY: 60000,
  UNIQUE_ROLES_LIST: [
    'Investigator',
    'Bodyguard',
    'King',
    'Mayor',
    'Doctor',
    'Seductress',
    'Um-Zaki',
  ],
  WEREWOLF_COUNTS: {
    4: 1, 5: 1,
    6: 2, 7: 2,
    8: 2, 9: 2, 10: 2, 11: 2, 12: 2, 13: 2, 14: 2, 15: 2, 16: 2,
  },
  DEFAULT_GUILD_CONFIG: {
    prefix: '!',
    lang: 'ar',
    lobbyChannelId: null,
    gameChannelId: null,
    roleChannelId: null,
  },
};
