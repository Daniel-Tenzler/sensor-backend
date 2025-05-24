import db from '../db/database.js';
import { hashSecret } from '../utils/auth.js';
import { SECRET_KEY } from '../config/app.js';

export const submitSensorReading = async(req, res) => {
    const { sensorId, value, secret } = req.body;

    // Verify the secret matches the expected hash
    const expectedHash = hashSecret(SECRET_KEY);
    const providedHash = hashSecret(secret);

    if (providedHash !== expectedHash) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!sensorId || value === undefined) {
        return res.status(400).json({ error: 'Missing sensorId or value' });
    }

    try {
        const stmt = db.prepare('INSERT INTO sensor_readings (sensor_id, value) VALUES (?, ?)');
        const result = await stmt.run(sensorId, value);
        res.json({ success: true, id: result.lastID });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Failed to insert data' });
    }
};

export const getSensorReadings = async(req, res) => {
    const userSecretHash = req.query.secret;

    if (!userSecretHash) {
        return res.send(getAuthForm());
    }

    try {
        const rows = await db.all('SELECT * FROM sensor_readings ORDER BY timestamp DESC LIMIT 100');
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
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).send('Database error');
    }
};

const getAuthForm = () => {
    return `
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
  `;
};