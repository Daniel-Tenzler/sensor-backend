import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const db = await open({
    filename: 'sensor_data.db',
    driver: sqlite3.Database
});

// Initialize the database with required tables
await db.exec(`
    CREATE TABLE IF NOT EXISTS sensor_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sensor_id TEXT NOT NULL,
        value REAL NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

export default db;