CREATE TABLE IF NOT EXISTS active_games (guild_id TEXT, channel_id TEXT, PRIMARY KEY (guild_id, channel_id));
CREATE TABLE IF NOT EXISTS players (id INTEGER PRIMARY KEY, game_id INTEGER, user_id TEXT, role TEXT, is_alive INTEGER);
CREATE TABLE IF NOT EXISTS game_state (game_id INTEGER PRIMARY KEY, phase TEXT, turn_count INTEGER);
CREATE TABLE IF NOT EXISTS phase_version (game_id INTEGER, version INTEGER);
CREATE TABLE IF NOT EXISTS action_locks (game_id INTEGER, user_id TEXT);
CREATE TABLE IF NOT EXISTS lobby_data (guild_id TEXT, channel_id TEXT, player_count INTEGER);
CREATE TABLE IF NOT EXISTS player_stats (user_id TEXT PRIMARY KEY, wins INTEGER, losses INTEGER, games_played INTEGER, roles_played TEXT);
CREATE TABLE IF NOT EXISTS game_history (game_id INTEGER PRIMARY KEY, players TEXT, winner_team TEXT, duration INTEGER, date TEXT);
CREATE TABLE IF NOT EXISTS guild_config (guild_id TEXT PRIMARY KEY, night_duration INTEGER, day_duration INTEGER, voting_duration INTEGER, auto_absent_vote INTEGER, narrator_style TEXT);
