import express from 'express';
import db from './database.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// POST /submit: Accepts JSON and stores it
app.post('/submit', (req, res) => {
    const { sensorId, value } = req.body;

    if (!sensorId || value === undefined) {
        return res.status(400).json({ error: 'Missing sensorId or value' });
    }

    const stmt = db.prepare('INSERT INTO sensor_readings (sensor_id, value) VALUES (?, ?)');
    stmt.run(sensorId, value, function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to insert data' });
        }
        res.json({ success: true, id: this.lastID });
    });
});

// GET /: Display sensor readings in an HTML table
app.get('/', (req, res) => {
    db.all('SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT 100', (err, rows) => {
        if (err) {
            return res.status(500).send('Database error');
        }

        const tableRows = rows.map(row =>
            `<tr><td>${row.id}</td><td>${row.sensor_id}</td><td>${row.value}</td><td>${row.timestamp}</td></tr>`
        ).join('');

        const html = `
      <html>
      <head><title>Sensor Data</title></head>
      <body>
        <h1>Latest Sensor Readings</h1>
        <table border="1" cellpadding="5" cellspacing="0">
          <tr><th>ID</th><th>Sensor ID</th><th>Value</th><th>Timestamp</th></tr>
          ${tableRows}
        </table>
      </body>
      </html>
    `;

        res.send(html);
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});