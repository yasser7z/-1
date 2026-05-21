CREATE TABLE IF NOT EXISTS guild_config (
    guild_id TEXT PRIMARY KEY,
    prefix TEXT NOT NULL DEFAULT '!',
    lang TEXT NOT NULL DEFAULT 'ar',
    lobby_channel_id TEXT,
    game_channel_id TEXT,
    role_channel_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lobby_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL,
    message_id TEXT,
    host_id TEXT NOT NULL,
    players TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'open',
    phase_start_timestamp INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS player_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    guild_id TEXT NOT NULL,
    games_played INTEGER DEFAULT 0,
    games_won INTEGER DEFAULT 0,
    games_lost INTEGER DEFAULT 0,
    total_kills INTEGER DEFAULT 0,
    total_saves INTEGER DEFAULT 0,
    total_investigations INTEGER DEFAULT 0,
    mvps INTEGER DEFAULT 0,
    most_played_role TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, guild_id)
);

CREATE TABLE IF NOT EXISTS game_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT,
    winner TEXT NOT NULL,
    total_players INTEGER NOT NULL,
    duration_seconds INTEGER NOT NULL,
    roles JSON NOT NULL,
    players JSON NOT NULL,
    phase_start_timestamp INTEGER,
    played_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_lobby_guild ON lobby_sessions(guild_id);
CREATE INDEX IF NOT EXISTS idx_lobby_status ON lobby_sessions(status);
CREATE INDEX IF NOT EXISTS idx_player_stats_user ON player_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_guild ON player_stats(guild_id);
CREATE INDEX IF NOT EXISTS idx_game_history_guild ON game_history(guild_id);
CREATE INDEX IF NOT EXISTS idx_game_history_date ON game_history(played_at);
