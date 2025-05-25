import config from '../config/index.js';

export const validateSecret = (req, res, next) => {
    console.log('validateSecret middleware called');
    console.log('Session:', req.session);

    // Check if session exists and is authenticated
    if (req.session && req.session.authenticated === true) {
        console.log('User is authenticated, proceeding.');
        return next();
    }

    // Check if secret key is configured
    if (!config.SECRET_KEY || config.SECRET_KEY === '') {
        console.warn('SECRET_KEY not set in config.');
        return res.status(500).send(`<h1>Secret Key Not Set</h1>`);
    }

    // If not authenticated, show the login form
    console.log('User not authenticated, showing login form.');
    return res.status(401).send(`
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
            <form id="secretForm" method="POST" action="/">
                <input type="password" id="secretInput" name="secret" placeholder="Secret key" required />
                <button type="submit">Submit</button>
            </form>
        </body>
        </html>
    `);
};