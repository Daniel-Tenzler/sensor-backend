import sqlite3 from 'sqlite3';
sqlite3.verbose();

const db = new sqlite3.Database('./sensor_data.db');

db.run(`
  CREATE TABLE IF NOT EXISTS sensor_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sensor_id TEXT,
    value REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);


export default db;