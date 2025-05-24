import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import process from 'process';
import path from 'path';
import fs from 'fs';

let db = null;
let isInitialized = false;

const getDatabasePath = () => {
    // Use environment variable for database path if available (for cloud environments)
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'sensor_data.db');

    // Ensure the directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    return dbPath;
};

const initializeDatabase = async() => {
    if (isInitialized) return db;

    try {
        const dbPath = getDatabasePath();
        console.log('Initializing database at:', dbPath);

        // Create database with verbose mode for better error reporting
        db = new sqlite3.Database(dbPath, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
            if (err) {
                console.error('Error opening database:', err);
                throw err;
            }
        });

        // Enable foreign keys and better error handling
        await promisify(db.run.bind(db))('PRAGMA foreign_keys = ON');
        await promisify(db.run.bind(db))('PRAGMA journal_mode = WAL');

        // Create table
        await promisify(db.run.bind(db))(`
            CREATE TABLE IF NOT EXISTS sensor_readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sensor_id TEXT NOT NULL,
                value REAL NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

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

// Initialize database and export a function to get the database instance
const getDatabase = async() => {
    if (!db || !isInitialized) {
        await initializeDatabase();
    }
    return db;
};

// Handle process termination
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

// Handle uncaught errors
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