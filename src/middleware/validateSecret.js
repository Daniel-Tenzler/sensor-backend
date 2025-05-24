import config from '../config/index.js';
import { sha256 } from '../utils/hash.js';

export const validateSecret = (req, res, next) => {
    const userSecretHash = req.query.secret;

    if (!config.SECRET_KEY || config.SECRET_KEY === '') {
        return res.send(`<h1>Secret Key Not Set</h1>`);
    }

    const expectedSecretHash = sha256(config.SECRET_KEY);

    if (!userSecretHash || userSecretHash !== expectedSecretHash) {
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

    next();
};