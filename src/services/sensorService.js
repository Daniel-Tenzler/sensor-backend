import db from '../db/sqlite.js';

export const insertSensorReading = (sensorId, value) => {
    return new Promise((resolve, reject) => {
        const stmt = db.prepare('INSERT INTO sensor_readings (sensor_id, value) VALUES (?, ?)');
        stmt.run(sensorId, value, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ success: true, id: this.lastID });
            }
        });
    });
};

export const getLatestReadings = (limit = 100) => {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT ?', [limit], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};