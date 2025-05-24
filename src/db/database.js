import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import process from 'process';

let db;

const initializeDatabase = async() => {
    try {
        db = new sqlite3.Database('sensor_data.db');

        // Convert db.run to promise-based
        const run = promisify(db.run.bind(db));

        await run(`
            CREATE TABLE IF NOT EXISTS sensor_readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sensor_id TEXT NOT NULL,
                value REAL NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('Database initialized successfully');
        return db;
    } catch (error) {
        console.error('Database initialization error:', error);
        throw error;
    }
};

// Initialize database immediately
initializeDatabase().catch(error => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
    if (db) {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            }
            process.exit(0);
        });
    }
});

export default db;