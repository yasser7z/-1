const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db;

function getDb() {
  if (db) return db;

  const dbPath = process.env.DB_PATH || './database/vale.db';
  const dir = path.dirname(dbPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  return db;
}

function initDb() {
  const database = getDb();
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  database.exec(schema);
  return database;
}

function _bind(sql, params) {
  if (Array.isArray(params)) return params;
  if (params && typeof params === 'object' && sql.includes('?')) {
    return Object.values(params);
  }
  return params;
}

function query(sql, params = {}) {
  const database = getDb();
  const stmt = database.prepare(sql);
  const bind = _bind(sql, params);
  if (sql.trim().toUpperCase().startsWith('SELECT')) {
    return stmt.all(bind);
  }
  return stmt.run(bind);
}

function queryOne(sql, params = {}) {
  const database = getDb();
  const stmt = database.prepare(sql);
  return stmt.get(_bind(sql, params));
}

function execute(sql, params = {}) {
  const database = getDb();
  const stmt = database.prepare(sql);
  return stmt.run(_bind(sql, params));
}

function transaction(fn) {
  const database = getDb();
  const tx = database.transaction(fn);
  return tx();
}

function close() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { getDb, initDb, query, queryOne, execute, transaction, close };
