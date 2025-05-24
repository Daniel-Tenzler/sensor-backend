import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('sensor_data.db');

db.serialize(() => {
    db.run(`
    CREATE TABLE IF NOT EXISTS sensor_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sensor_id TEXT NOT NULL,
        value REAL NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

export default db;