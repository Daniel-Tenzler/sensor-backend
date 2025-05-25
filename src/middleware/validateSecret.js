import config from '../config/index.js';

export const validateSecret = (req, res, next) => {
    // Check if user is already authenticated via session
    if (req.session && req.session.authenticated) {
        return next();
    }

    if (!config.SECRET_KEY || config.SECRET_KEY === '') {
        return res.send(`<h1>Secret Key Not Set</h1>`);
    }

    // If not authenticated, show the login form
    return res.send(`
        <html>
        <head><title>Auth Required</title></head>
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