import db from '../db/sqlite.js';

export const insertSensorReading = (sensorId, value) => {
    return new Promise((resolve, reject) => {
        let stmt;
        try {
            stmt = db.prepare('INSERT INTO sensor_readings (sensor_id, value) VALUES (?, ?)');
            stmt.run(sensorId, value, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, id: this.lastID });
                }
            });
        } catch (err) {
            reject(err);
        } finally {
            if (stmt) {
                stmt.finalize();
            }
        }
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