import express from 'express';
import db from './database.js';
import crypto from 'crypto';

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
    const userSecretHash = req.query.secret;

    if (!SECRET_KEY || SECRET_KEY === '') {
        return res.send(`<h1>Secret Key Not Set</h1>`);
    }

    // Hash the plain secret key from env at runtime
    const expectedSecretHash = crypto.createHash('sha256').update(SECRET_KEY).digest('hex');

    if (!userSecretHash || userSecretHash !== expectedSecretHash) {
        // Serve the HTML form with client-side hashing JS
        return res.send(`
        <html>
        <head><title>Auth Required</title></head>
        <body>
          <h1>Enter Secret Key</h1>
          <form id="secretForm" method="GET" action="/">
            <input type="password" id="secretInput" placeholder="Secret key" required />
            <input type="hidden" name="secret" id="secretHashed" />
            <button type="submit">Submit</button>
          </form>
  
          <script>
            async function sha256(message) {
              const msgBuffer = new TextEncoder().encode(message);
              const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
              const hashArray = Array.from(new Uint8Array(hashBuffer));
              const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
              return hashHex;
            }
  
            const form = document.getElementById('secretForm');
            form.addEventListener('submit', async (e) => {
              e.preventDefault();
              const secret = document.getElementById('secretInput').value;
              const hashed = await sha256(secret);
              document.getElementById('secretHashed').value = hashed;
              document.getElementById('secretInput').value = '';
              form.submit();
            });
          </script>
        </body>
        </html>
      `);
    }

    // Secret correct, proceed to show data
    db.all('SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT 100', (err, rows) => {
        if (err) return res.status(500).send('Database error');

        const tableRows = rows.map(row =>
            `<tr><td>${row.id}</td><td>${row.sensor_id}</td><td>${row.value}</td><td>${row.timestamp}</td></tr>`
        ).join('');

        res.send(`
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
      `);
    });
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});