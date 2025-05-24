import { app, PORT } from './src/config/app.js';
import sensorRoutes from './src/routes/sensorRoutes.js';

// Register routes
app.use('/', sensorRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});