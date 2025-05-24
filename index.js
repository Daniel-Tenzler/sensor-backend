import express from 'express';
import db from './database.js';

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY;

app.use(express.json());

// POST /submit: Accepts JSON and stores it
app.post('/submit', (req, res) => {
    const { sensorId, value, secret } = req.body;

    if (secret !== SECRET_KEY) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

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
    const userSecret = req.query.secret;
    const expectedSecret = process.env.SECRET_KEY;

    if (SECRET_KEY === undefined || SECRET_KEY === '') {
        return res.send(`
        <html>
        <head><title>Secret Key Not Set</title></head>
        <body>
        <h1>Secret Key Not Set</h1>
        </body>
        </html>
        `);
    }

    if (!userSecret || userSecret !== expectedSecret) {
        // Show input form if no valid secret provided
        return res.send(` <
            html >
            <
            head > < title > Auth Required < /title></head >
            <
            body >
            <
            h1 > Enter Secret Key < /h1> <
            form method = "GET"
            action = "/" >
            <
            input type = "password"
            name = "secret"
            placeholder = "Secret key"
            required / >
            <
            button type = "submit" > Submit < /button> <
            /form> <
            /body> <
            /html>
            `);
    }

    // If secret matches, show the data table
    db.all('SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT 100', (err, rows) => {
        if (err) {
            return res.status(500).send('Database error');
        }

        const tableRows = rows.map(row =>
            ` < tr > < td > $ { row.id } < /td><td>${row.sensor_id}</td > < td > $ { row.value } < /td><td>${row.timestamp}</td > < /tr>`
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