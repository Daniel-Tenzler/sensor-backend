# Sensor Backend

A Node.js/Express application for collecting and displaying sensor data collected by Adafruit DHT22.

## Features

- **Secure Authentication**: Session-based authentication with HTTP-only cookies
- **API/Frontend Separation**: JSON API endpoints and HTML frontend
- **Real-time Dashboard**: Web interface for viewing sensor readings
- **Data Validation**: input validation and error handling
- **PostgreSQL Integration**: Persistent data storage with Supabase

## Architecture

The application follows a layered architecture:

- **API Layer** (`/api/*`): JSON-only endpoints for data operations
- **Frontend Layer** (`/`): HTML pages and static assets
- **Shared Services**: Common business logic and session management

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or Supabase account)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   DATABASE_URL=your_postgresql_connection_string
   SESSION_SECRET=your_session_secret_key
	 NODE_ENV=development
   PORT=3000
   ```

4. Start the application:
   ```bash
   npm start
   ```

### Development

Run in development mode with auto-reload:
```bash
npm run dev
```

Run tests:
```bash
npm test
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with credentials
- `POST /api/auth/logout` - Logout and clear session
- `GET /api/auth/status` - Get current session status

### Sensors
- `POST /api/sensors/submit` - Submit sensor reading
- `GET /api/sensors/readings` - Get latest sensor readings
- `GET /api/sensors/stats/:sensorId` - Get statistics for a sensor

## Frontend Routes

- `GET /` - Dashboard (requires authentication)
- `GET /login` - Login page
- `POST /login` - Process login form
- `POST /logout` - Logout and redirect

## Security Features

- HTTP-only secure cookies
- CSRF protection with SameSite cookies
- XSS protection headers
- Input validation and sanitization
- Session expiration and cleanup

## License

AGPL License - see LICENSE.md for details