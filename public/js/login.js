/**
 * Login Page JavaScript
 * Handles form validation and user interactions
 */

document.addEventListener('DOMContentLoaded', function () {
  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.querySelector('.login-btn');
  const secretInput = document.getElementById('secret');

  // Form submission handling
  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    
    // Basic client-side validation
    if (!validateForm()) {
      return false;
    }

    // Show loading state
    showLoadingState();

    try {
      // Get the secret from the form
      const secret = secretInput.value;

      // Make API call to login
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ secret })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Login successful - redirect to dashboard
        window.location.href = '/dashboard';
      } else {
        // Login failed - show error
        showLoginError(result.message || 'Login failed. Please check your credentials.');
        resetLoadingState();
      }
    } catch (error) {
      console.error('Login error:', error);
      showLoginError('Network error. Please try again.');
      resetLoadingState();
    }
  });

  // Real-time validation
  secretInput.addEventListener('blur', validateSecret);

  // Enter key handling
  secretInput.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      loginForm.submit();
    }
  });

  /**
   * Validate the entire form
   * @returns {boolean} True if form is valid
   */
  function validateForm() {
    return validateSecret();
  }



  /**
   * Validate secret field
   * @returns {boolean} True if secret is valid
   */
  function validateSecret() {
    const secret = secretInput.value;

    if (!secret) {
      showFieldError(secretInput, 'Secret key is required');
      return false;
    }

    if (secret.trim().length === 0) {
      showFieldError(secretInput, 'Secret key cannot be empty');
      return false;
    }

    clearFieldError(secretInput);
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

  /**
   * Reset loading state
   */
  function resetLoadingState() {
    loginBtn.disabled = false;
    loginBtn.classList.remove('loading');
    loginBtn.textContent = 'Login';
  }

  /**
   * Show login error message
   * @param {string} message - Error message to display
   */
  function showLoginError(message) {
    // Remove any existing error messages
    const existingError = document.querySelector('.login-error');
    if (existingError) {
      existingError.remove();
    }

    // Create error message element
    const errorDiv = document.createElement('div');
    errorDiv.className = 'login-error alert alert-error';
    errorDiv.textContent = message;
    errorDiv.style.marginBottom = '20px';
    errorDiv.style.padding = '12px';
    errorDiv.style.backgroundColor = '#fee';
    errorDiv.style.color = '#c33';
    errorDiv.style.border = '1px solid #fcc';
    errorDiv.style.borderRadius = '4px';

    // Insert error message before the form
    loginForm.parentNode.insertBefore(errorDiv, loginForm);

    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorDiv.style.opacity = '0';
      errorDiv.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        if (errorDiv.parentNode) {
          errorDiv.remove();
        }
      }, 500);
    }, 5000);
  }

  // Auto-hide alerts after 5 seconds
  const alerts = document.querySelectorAll('.alert');
  alerts.forEach((alert) => {
    setTimeout(() => {
      alert.style.opacity = '0';
      alert.style.transition = 'opacity 0.5s ease';
      setTimeout(() => {
        alert.remove();
      }, 500);
    }, 5000);
  });

  // Focus on secret field when page loads
  secretInput.focus();
});
