import { Pool } from 'pg';

const pool = new Pool({
    // eslint-disable-next-line no-undef
    connectionString: process.env.DATABASE_URL, // Set this in Render
    ssl: { rejectUnauthorized: false } // Required for Supabase
});

export const insertReading = async(sensorId, humidity, temperature) => {
    const query = `
    INSERT INTO sensor_readings (sensor_id, humidity, temperature)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
    const result = await pool.query(query, [sensorId, humidity, temperature]);
    return result.rows[0];
};