import config from '../config/index.js';
import { sha256 } from '../utils/hash.js';

export const validateSecret = (req, res, next) => {
    console.log('validateSecret middleware called');

    // Get the secret from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        console.log('No Authorization header found');

        // If it's the root route, show the login form
        if (req.path === '/' && req.method === 'GET') {
            return res.send(`
                <html>
                <head>
                    <title>Auth Required</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 40px; }
                        form { max-width: 300px; margin: 20px auto; }
                        input { width: 100%; padding: 8px; margin: 10px 0; }
                        button { width: 100%; padding: 10px; background: #007bff; color: white; border: none; cursor: pointer; }
                        button:hover { background: #0056b3; }
                    </style>
                </head>
                <body>
                    <h1>Enter Secret Key</h1>
                    <form id="secretForm">
                        <input type="password" id="secretInput" name="secret" placeholder="Secret key" required />
                        <button type="submit">Submit</button>
                    </form>
                    <script>
                        document.getElementById('secretForm').addEventListener('submit', async (e) => {
                            e.preventDefault();
                            const secret = document.getElementById('secretInput').value;
                            try {
                                const response = await fetch('/login', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({ secret })
                                });
                                const data = await response.json();
                                if (data.token) {
                                    sessionStorage.setItem('authToken', data.token);
                                    window.location.reload();
                                } else {
                                    alert('Invalid secret key');
                                }
                            } catch (error) {
                                alert('Authentication failed');
                            }
                        });
                    </script>
                </body>
                </html>
            `);
        }

        // For API routes, return JSON error
        return res.status(401).json({ error: 'Authentication required' });
    }

    const userSecret = authHeader.replace('Bearer ', '');
    const expectedSecretHash = sha256(config.SECRET_KEY);
    const userSecretHash = sha256(userSecret);

    if (userSecretHash === expectedSecretHash) {
        console.log('Authentication successful');
        return next();
    }

    console.log('Authentication failed');
    return res.status(401).json({ error: 'Invalid secret key' });
};