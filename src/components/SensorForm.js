// eslint-disable-next-line no-unused-vars
import { insertSensorReading } from '../services/sensorService.js';

export const SensorForm = () => {
    return `
        <div class="form-container">
            <h2>Submit New Reading</h2>
            <form id="sensorForm" onsubmit="submitReading(event)">
                <div class="form-group">
                    <label for="sensorId">Sensor ID:</label>
                    <input type="number" id="sensorId" name="sensorId" required>
                </div>
                <div class="form-group">
                    <label for="humidity">Humidity:</label>
                    <input type="number" id="humidity" name="humidity" step="0.01" required>
                </div>
                <div class="form-group">
                    <label for="temperature">Temperature:</label>
                    <input type="number" id="temperature" name="temperature" step="0.01" required>
                </div>
                <button type="submit">Submit Reading</button>
            </form>
        </div>

        <script>
            async function submitReading(event) {
                event.preventDefault();
                
                const formData = {
                    sensorId: document.getElementById('sensorId').value,
                    humidity: document.getElementById('humidity').value,
                    temperature: document.getElementById('temperature').value
                };

                try {
                    const result = await insertSensorReading(
                        parseInt(formData.sensorId),
                        parseFloat(formData.humidity),
                        parseFloat(formData.temperature)
                    );

                    if (result) {
                        alert('Reading submitted successfully!');
                        window.location.reload();
                    } else {
                        alert('Error: Failed to submit reading');
                    }
                } catch (error) {
                    alert('Error submitting reading: ' + error.message);
                }
            }
        </script>
    `;
};

export const sensorFormStyles = `
    .form-container {
        max-width: 500px;
        margin: 2rem 0;
        padding: 1.5rem;
        border: 1px solid #ddd;
        border-radius: 8px;
        background-color: #f9f9f9;
    }
    .form-group {
        margin-bottom: 1rem;
    }
    label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: bold;
    }
    input {
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-sizing: border-box;
    }
    button {
        background-color: #4CAF50;
        color: white;
        padding: 10px 20px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
    }
    button:hover {
        background-color: #45a049;
    }
    .error-message {
        color: red;
        margin-top: 0.5rem;
    }
`;