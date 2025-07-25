/**
 * Dashboard JavaScript
 * Handles dynamic data loading, form submission, and user interactions
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const sensorForm = document.getElementById('sensorForm');
    const submitMessage = document.getElementById('submitMessage');
    const refreshBtn = document.getElementById('refreshBtn');
    const limitSelect = document.getElementById('limitSelect');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const readingsContainer = document.getElementById('readingsContainer');
    const errorMessage = document.getElementById('errorMessage');

    // Initialize dashboard
    init();

    /**
     * Initialize dashboard functionality
     */
    function init() {
        // Load initial readings
        loadReadings();

        // Set up event listeners
        setupEventListeners();

        // Set up auto-refresh (every 30 seconds)
        setInterval(loadReadings, 30000);
    }

    /**
     * Set up event listeners
     */
    function setupEventListeners() {
        // Sensor form submission
        sensorForm.addEventListener('submit', handleSensorSubmission);

        // Refresh button
        refreshBtn.addEventListener('click', () => {
            loadReadings();
        });

        // Limit selection change
        limitSelect.addEventListener('change', () => {
            loadReadings();
        });

        // Form input validation
        const inputs = sensorForm.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('blur', validateInput);
            input.addEventListener('input', clearInputError);
        });
    }

    /**
     * Handle sensor form submission
     * @param {Event} e - Form submission event
     */
    async function handleSensorSubmission(e) {
        e.preventDefault();

        // Validate form
        if (!validateForm()) {
            return;
        }

        const formData = new FormData(sensorForm);
        const sensorData = {
            sensorId: formData.get('sensorId').trim(),
            humidity: parseFloat(formData.get('humidity')),
            temperature: parseFloat(formData.get('temperature'))
        };

        // Show loading state
        const submitBtn = sensorForm.querySelector('.submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        try {
            // Submit to API
            const response = await fetch('/api/sensors/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(sensorData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                showMessage('Sensor reading submitted successfully!', 'success');
                sensorForm.reset();
                // Reload readings to show the new data
                setTimeout(loadReadings, 1000);
            } else {
                showMessage(result.error || 'Failed to submit sensor reading', 'error');
            }
        } catch (error) {
            console.error('Error submitting sensor reading:', error);
            showMessage('Network error. Please try again.', 'error');
        } finally {
            // Reset button state
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    /**
     * Load sensor readings from API
     */
    async function loadReadings() {
        showLoadingState();

        try {
            const limit = limitSelect.value;
            const response = await fetch(`/api/sensors/readings?limit=${limit}`);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (result.success && result.data) {
                displayReadings(result.data);
            } else {
                throw new Error(result.error || 'Failed to load readings');
            }
        } catch (error) {
            console.error('Error loading readings:', error);
            showError('Failed to load sensor readings. Please try again.');
        }
    }

    /**
     * Display sensor readings in table format
     * @param {Array} readings - Array of sensor readings
     */
    function displayReadings(readings) {
        hideLoadingState();
        hideError();

        if (!readings || readings.length === 0) {
            readingsContainer.innerHTML = '<div class="no-readings">No sensor readings found.</div>';
            readingsContainer.style.display = 'block';
            return;
        }

        const tableHTML = `
            <table class="readings-table">
                <thead>
                    <tr>
                        <th>Sensor ID</th>
                        <th>Temperature (°C)</th>
                        <th>Humidity (%)</th>
                        <th>Timestamp</th>
                    </tr>
                </thead>
                <tbody>
                    ${readings.map(reading => `
                        <tr>
                            <td>${escapeHtml(reading.sensor_id)}</td>
                            <td>${reading.temperature}°C</td>
                            <td>${reading.humidity}%</td>
                            <td>${formatTimestamp(reading.timestamp)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        readingsContainer.innerHTML = tableHTML;
        readingsContainer.style.display = 'block';
    }

    /**
     * Show loading state
     */
    function showLoadingState() {
        loadingIndicator.style.display = 'flex';
        readingsContainer.style.display = 'none';
        hideError();
    }

    /**
     * Hide loading state
     */
    function hideLoadingState() {
        loadingIndicator.style.display = 'none';
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    function showError(message) {
        hideLoadingState();
        readingsContainer.style.display = 'none';
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    /**
     * Hide error message
     */
    function hideError() {
        errorMessage.style.display = 'none';
    }

    /**
     * Show form submission message
     * @param {string} message - Message text
     * @param {string} type - Message type ('success' or 'error')
     */
    function showMessage(message, type) {
        submitMessage.textContent = message;
        submitMessage.className = `message ${type}`;
        submitMessage.style.display = 'block';

        // Auto-hide after 5 seconds
        setTimeout(() => {
            submitMessage.style.display = 'none';
        }, 5000);
    }

    /**
     * Validate entire form
     * @returns {boolean} True if form is valid
     */
    function validateForm() {
        const sensorId = document.getElementById('sensorId');
        const humidity = document.getElementById('humidity');
        const temperature = document.getElementById('temperature');

        let isValid = true;

        isValid = validateInput({ target: sensorId }) && isValid;
        isValid = validateInput({ target: humidity }) && isValid;
        isValid = validateInput({ target: temperature }) && isValid;

        return isValid;
    }

    /**
     * Validate individual input field
     * @param {Event} e - Input event
     * @returns {boolean} True if input is valid
     */
    function validateInput(e) {
        const input = e.target;
        const value = input.value.trim();
        let isValid = true;
        let errorMessage = '';

        // Clear previous error
        clearInputError(e);

        switch (input.id) {
            case 'sensorId':
                if (!value) {
                    errorMessage = 'Sensor ID is required';
                    isValid = false;
                } else if (value.length < 3) {
                    errorMessage = 'Sensor ID must be at least 3 characters';
                    isValid = false;
                }
                break;

            case 'humidity':
                const humidity = parseFloat(value);
                if (!value) {
                    errorMessage = 'Humidity is required';
                    isValid = false;
                } else if (isNaN(humidity)) {
                    errorMessage = 'Humidity must be a number';
                    isValid = false;
                } else if (humidity < 0 || humidity > 100) {
                    errorMessage = 'Humidity must be between 0 and 100';
                    isValid = false;
                }
                break;

            case 'temperature':
                const temperature = parseFloat(value);
                if (!value) {
                    errorMessage = 'Temperature is required';
                    isValid = false;
                } else if (isNaN(temperature)) {
                    errorMessage = 'Temperature must be a number';
                    isValid = false;
                } else if (temperature < -50 || temperature > 100) {
                    errorMessage = 'Temperature must be between -50 and 100';
                    isValid = false;
                }
                break;
        }

        if (!isValid) {
            showInputError(input, errorMessage);
        }

        return isValid;
    }

    /**
     * Show input field error
     * @param {HTMLElement} input - Input element
     * @param {string} message - Error message
     */
    function showInputError(input, message) {
        input.style.borderColor = '#e74c3c';
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        errorDiv.style.color = '#e74c3c';
        errorDiv.style.fontSize = '12px';
        errorDiv.style.marginTop = '5px';
        
        input.parentNode.appendChild(errorDiv);
    }

    /**
     * Clear input field error
     * @param {Event} e - Input event
     */
    function clearInputError(e) {
        const input = e.target;
        input.style.borderColor = '#e1e5e9';
        
        const existingError = input.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }

    /**
     * Format timestamp for display
     * @param {string} timestamp - ISO timestamp string
     * @returns {string} Formatted timestamp
     */
    function formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});