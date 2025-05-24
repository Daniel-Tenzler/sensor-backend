import express from 'express';
import db from './database.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post('/submit', (req, res) => {
  const { sensorId, value } = req.body;

  if (!sensorId || value === undefined) {
    return res.status(400).json({ error: 'Missing sensorId or value' });
  }

  const stmt = db.prepare('INSERT INTO sensor_readings (sensor_id, value) VALUES (?, ?)');
  stmt.run(sensorId, value, function (err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to insert data' });
    }
    res.json({ success: true, id: this.lastID });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
