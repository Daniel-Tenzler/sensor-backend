import { Pool } from 'pg';
import process from 'process';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Handle cleanup on process termination
process.on('SIGINT', async() => {
    try {
        await pool.end();
        console.log('Database connection closed');
    } catch (err) {
        console.error('Error closing database:', err);
    }
    process.exit(0);
});

process.on('uncaughtException', async(error) => {
    console.error('Uncaught Exception:', error);
    try {
        await pool.end();
    } catch (err) {
        console.error('Error closing database during crash:', err);
    }
    process.exit(1);
});

export default pool;