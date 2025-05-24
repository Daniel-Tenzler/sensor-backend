import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import process from 'process';
import path from 'path';
import fs from 'fs';

let db = null;
let isInitialized = false;

const getDatabasePath = () => {
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'sensor_data.db');
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    return dbPath;
};

const openDatabase = (dbPath) => {
    return new Promise((resolve, reject) => {
        const database = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(database);
            }
        });
    });
};

const initializeDatabase = async() => {
    if (isInitialized) return db;

    try {
        const dbPath = getDatabasePath();
        console.log('Initializing database at:', dbPath);

        db = await openDatabase(dbPath);

        // Promisify run
        const run = promisify(db.run.bind(db));

        await run('PRAGMA foreign_keys = ON');
        await run('PRAGMA journal_mode = WAL');

        await run(`CREATE TABLE IF NOT EXISTS sensor_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sensor_id TEXT NOT NULL,
      humidity REAL,
      temperature REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

        isInitialized = true;
        console.log('Database initialized successfully');
        return db;
    } catch (error) {
        console.error('Database initialization error:', error);
        if (db) {
            db.close();
            db = null;
        }
        throw error;
    }
};

const getDatabase = async() => {
    if (!db || !isInitialized) {
        await initializeDatabase();
    }
    return db;
};

process.on('SIGINT', async() => {
    if (db) {
        try {
            await promisify(db.close.bind(db))();
            console.log('Database connection closed');
        } catch (err) {
            console.error('Error closing database:', err);
        }
    }
    process.exit(0);
});

process.on('uncaughtException', async(error) => {
    console.error('Uncaught Exception:', error);
    if (db) {
        try {
            await promisify(db.close.bind(db))();
        } catch (err) {
            console.error('Error closing database during crash:', err);
        }
    }
    process.exit(1);
});

export default getDatabase;