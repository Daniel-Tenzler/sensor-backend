/**
 * Login Page JavaScript
 * Handles form validation and user interactions
 */

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.querySelector('.login-btn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    // Form submission handling
    loginForm.addEventListener('submit', function(e) {
        // Basic client-side validation
        if (!validateForm()) {
            e.preventDefault();
            return false;
        }

        // Show loading state
        showLoadingState();
    });

    // Real-time validation
    usernameInput.addEventListener('blur', validateUsername);
    passwordInput.addEventListener('blur', validatePassword);

    // Enter key handling
    usernameInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            passwordInput.focus();
        }
    });

    passwordInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loginForm.submit();
        }
    });

    /**
     * Validate the entire form
     * @returns {boolean} True if form is valid
     */
    function validateForm() {
        const isUsernameValid = validateUsername();
        const isPasswordValid = validatePassword();

        return isUsernameValid && isPasswordValid;
    }

    /**
     * Validate username field
     * @returns {boolean} True if username is valid
     */
    function validateUsername() {
        const username = usernameInput.value.trim();

        if (!username) {
            showFieldError(usernameInput, 'Username is required');
            return false;
        }

        if (username.length < 3) {
            showFieldError(usernameInput, 'Username must be at least 3 characters');
            return false;
        }

        clearFieldError(usernameInput);
        return true;
    }

    /**
     * Validate password field
     * @returns {boolean} True if password is valid
     */
    function validatePassword() {
        const password = passwordInput.value;

        if (!password) {
            showFieldError(passwordInput, 'Password is required');
            return false;
        }

        if (password.length < 6) {
            showFieldError(passwordInput, 'Password must be at least 6 characters');
            return false;
        }

        clearFieldError(passwordInput);
        return true;
    }

    /**
     * Show field-specific error
     * @param {HTMLElement} field - Input field element
     * @param {string} message - Error message
     */
    function showFieldError(field, message) {
        clearFieldError(field);

        field.style.borderColor = '#e74c3c';

        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        errorDiv.style.color = '#e74c3c';
        errorDiv.style.fontSize = '12px';
        errorDiv.style.marginTop = '5px';

        field.parentNode.appendChild(errorDiv);
    }

    /**
     * Clear field error
     * @param {HTMLElement} field - Input field element
     */
    function clearFieldError(field) {
        field.style.borderColor = '#e1e5e9';

        const existingError = field.parentNode.querySelector('.field-error');
        if (existingError) {
            existingError.remove();
        }
    }

    /**
     * Show loading state on form submission
     */
    function showLoadingState() {
        loginBtn.disabled = true;
        loginBtn.classList.add('loading');
        loginBtn.textContent = 'Logging in...';
    }

    // Auto-hide alerts after 5 seconds
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            alert.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                alert.remove();
            }, 500);
        }, 5000);
    });

    // Focus on username field when page loads
    usernameInput.focus();
});