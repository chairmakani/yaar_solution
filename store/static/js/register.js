class RegisterForm {
    constructor() {
        this.form = document.getElementById('register-form');
        this.nameInput = document.getElementById('name');
        this.emailInput = document.getElementById('email');
        this.phoneInput = document.getElementById('phone');
        this.passwordInput = document.getElementById('password');
        this.termsCheckbox = document.getElementById('terms');
        this.submitButton = this.form.querySelector('button[type="submit"]');
        this.passwordModal = document.getElementById('password-requirements');
        this.csrfToken = getCSRFToken();
        
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Real-time validation
        this.nameInput?.addEventListener('input', () => this.validateName());
        this.emailInput?.addEventListener('input', () => this.validateEmail());
        this.phoneInput?.addEventListener('input', () => this.validatePhone());
        this.passwordInput?.addEventListener('input', () => this.validatePassword());
        
        // Password strength meter
        this.passwordInput?.addEventListener('input', (e) => this.updatePasswordStrength(e.target.value));
        
        // Form submission
        this.form?.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Password toggle
        const togglePassword = document.querySelector('.toggle-password');
        togglePassword?.addEventListener('click', () => this.togglePasswordVisibility());
    }

    validateName() {
        const name = this.nameInput.value.trim();
        const nameRegex = /^[A-Za-z\s]{3,50}$/;
        
        if (!name) {
            this.showError(this.nameInput, 'Name is required');
            return false;
        }
        if (!nameRegex.test(name)) {
            this.showError(this.nameInput, 'Name should only contain letters and spaces (3-50 characters)');
            return false;
        }
        
        this.removeError(this.nameInput);
        return true;
    }

    validateEmail() {
        const email = this.emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!email) {
            this.showError(this.emailInput, 'Email is required');
            return false;
        }
        if (!emailRegex.test(email)) {
            this.showError(this.emailInput, 'Please enter a valid email address');
            return false;
        }
        
        this.removeError(this.emailInput);
        return true;
    }

    validatePhone() {
        const phone = this.phoneInput.value.trim();
        const phoneRegex = /^[0-9]{10}$/;
        
        if (!phone) {
            this.showError(this.phoneInput, 'Phone number is required');
            return false;
        }
        if (!phoneRegex.test(phone)) {
            this.showError(this.phoneInput, 'Please enter a valid 10-digit phone number');
            return false;
        }
        
        this.removeError(this.phoneInput);
        return true;
    }

    validatePassword() {
        const password = this.passwordInput.value;
        const requirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*]/.test(password)
        };
        
        const requirementsList = document.querySelectorAll('.requirements-list li');
        requirementsList.forEach(item => {
            const requirement = item.dataset.requirement;
            if (requirements[requirement]) {
                item.classList.add('valid');
            } else {
                item.classList.remove('valid');
            }
        });
        
        const isValid = Object.values(requirements).every(Boolean);
        if (!isValid) {
            this.showError(this.passwordInput, 'Password does not meet requirements');
            return false;
        }
        
        this.removeError(this.passwordInput);
        return true;
    }

    updatePasswordStrength(password) {
        const strengthMeter = document.querySelector('.strength-meter');
        const strengthText = document.querySelector('.strength-text');
        
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[!@#$%^&*]/.test(password)) strength++;
        
        strengthMeter.className = 'strength-meter';
        switch (true) {
            case (strength <= 2):
                strengthMeter.classList.add('weak');
                strengthText.textContent = 'Weak';
                break;
            case (strength <= 4):
                strengthMeter.classList.add('medium');
                strengthText.textContent = 'Medium';
                break;
            default:
                strengthMeter.classList.add('strong');
                strengthText.textContent = 'Strong';
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        if (!this.validateForm()) {
            return;
        }
        
        this.setLoading(true);
        const errorContainer = document.getElementById('error-container');
        const errorMessage = document.getElementById('error-message');
        
        try {
            // Get CSRF token from cookie
            const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;
            
            // Create form data
            const formData = new FormData(this.form);
            const jsonData = Object.fromEntries(formData.entries());
            
            const response = await fetch(this.form.action, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken,
                    'Accept': 'application/json'
                },
                credentials: 'same-origin',  // Important for CSRF
                body: JSON.stringify(jsonData)
            });

            const data = await response.json();
            
            if (response.ok && data.status === 'success') {
                if (errorContainer) {
                    errorContainer.style.display = 'block';
                    errorContainer.className = 'success-container';
                    if (errorMessage) {
                        errorMessage.textContent = data.message || 'Registration successful! Redirecting...';
                    }
                }
                
                setTimeout(() => {
                    window.location.href = data.redirect_url;
                }, 1500);
            } else {
                throw new Error(data.message || 'Registration failed');
            }
        } catch (error) {
            if (errorContainer && errorMessage) {
                errorContainer.style.display = 'block';
                errorContainer.className = 'error-container';
                errorMessage.textContent = error.message;
            }
            console.error('Registration error:', error);
        } finally {
            this.setLoading(false);
        }
    }

    async checkStockStatus() {
        try {
            const response = await fetch('/api/stock/check/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.csrfToken
                },
                body: JSON.stringify({
                    product_ids: [this.productId]
                })
            });
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error checking stock:', error);
            throw error;
        }
    }

    validateForm() {
        const isNameValid = this.validateName();
        const isEmailValid = this.validateEmail();
        const isPhoneValid = this.validatePhone();
        const isPasswordValid = this.validatePassword();
        const isTermsAccepted = this.termsCheckbox.checked;
        
        if (!isTermsAccepted) {
            this.showError(this.termsCheckbox, 'Please accept the terms and conditions');
        }
        
        return isNameValid && 
               isEmailValid && 
               isPhoneValid && 
               isPasswordValid && 
               isTermsAccepted;
    }

    showError(element, message) {
        const errorSpan = element.nextElementSibling;
        if (errorSpan && errorSpan.classList.contains('error-message')) {
            errorSpan.textContent = message;
            errorSpan.classList.add('show');
        } else {
            const errorElement = document.createElement('span');
            errorElement.className = 'error-message show';
            errorElement.textContent = message;
            element.parentNode.insertBefore(errorElement, element.nextSibling);
        }
        element.classList.add('error');
    }

    removeError(element) {
        const errorSpan = element.nextElementSibling;
        if (errorSpan && errorSpan.classList.contains('error-message')) {
            errorSpan.classList.remove('show');
        }
        element.classList.remove('error');
    }

    togglePasswordVisibility() {
        const type = this.passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        this.passwordInput.setAttribute('type', type);
        document.querySelector('.toggle-password').classList.toggle('fa-eye');
        document.querySelector('.toggle-password').classList.toggle('fa-eye-slash');
    }

    setLoading(isLoading) {
        this.submitButton.disabled = isLoading;
        this.submitButton.classList.toggle('loading', isLoading);
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }
}

// Initialize form handler when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RegisterForm();
});

async function handleSubmit(e) {
    e.preventDefault();
    
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');
    
    try {
        const form = e.target;
        const formData = new FormData(form);
        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;

        setLoading(true);
        errorContainer.style.display = 'none';

        const response = await fetch(form.action, {
            method: 'POST',
            headers: {
                'X-CSRFToken': csrfToken,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(Object.fromEntries(formData))
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Registration failed');
        }

        if (data.status === 'success') {
            window.location.href = data.redirect_url;
        } else {
            throw new Error(data.message || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        errorContainer.style.display = 'block';
        errorMessage.textContent = error.message || 'Registration failed. Please try again.';
    } finally {
        setLoading(false);
    }
}

function setLoading(isLoading) {
    const submitButton = document.getElementById('register-submit');
    if (!submitButton) return;

    const buttonText = submitButton.querySelector('.button-text');
    const loadingText = submitButton.querySelector('.loading-text');
    
    if (!buttonText || !loadingText) return;

    submitButton.disabled = isLoading;
    buttonText.style.display = isLoading ? 'none' : 'block';
    loadingText.style.display = isLoading ? 'block' : 'none';
}

// Initialize form
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('register-form');
    if (form) {
        form.addEventListener('submit', handleSubmit);
    }
});

class RegistrationHandler {
    constructor() {
        this.form = document.getElementById('register-form');
        this.submitButton = this.form?.querySelector('button[type="submit"]');
        this.initializeForm();
    }

    initializeForm() {
        if (!this.form) return;
        
        this.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleSubmit(e);
        });
    }

    async handleSubmit(e) {
        this.setLoading(true);
        this.showNotification('Sending verification code...', 'loading');

        try {
            const formData = new FormData(this.form);
            const response = await fetch(this.form.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const data = await response.json();

            if (data.status === 'success') {
                this.showNotification('Verification code sent successfully!', 'success');
                setTimeout(() => {
                    window.location.href = data.redirect_url;
                }, 1500);
            } else {
                throw new Error(data.message || 'Registration failed');
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(isLoading) {
        if (!this.submitButton) return;
        
        if (isLoading) {
            this.submitButton.classList.add('btn-loading');
            this.submitButton.disabled = true;
            this.submitButton.dataset.originalText = this.submitButton.textContent;
            this.submitButton.textContent = 'Sending...';
        } else {
            this.submitButton.classList.remove('btn-loading');
            this.submitButton.disabled = false;
            this.submitButton.textContent = this.submitButton.dataset.originalText;
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = document.createElement('i');
        icon.className = `fas fa-${type === 'success' ? 'check-circle' : 
                                  type === 'error' ? 'exclamation-circle' : 
                                  'spinner fa-spin'}`;
        
        const text = document.createElement('span');
        text.textContent = message;
        
        notification.appendChild(icon);
        notification.appendChild(text);
        document.body.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Remove after delay
        if (type !== 'loading') {
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }
        
        return notification;
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    new RegistrationHandler();
});

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('register-form');
    const submitButton = document.getElementById('register-submit');
    const inputs = form.querySelectorAll('input[required]');
    const errorMessages = {
        name: 'Please enter your full name (only letters and spaces)',
        email: 'Please enter a valid email address',
        phone: 'Please enter a valid 10-digit phone number',
        password: 'Password must be at least 8 characters',
        terms: 'You must accept the terms and conditions'
    };

    // Initial button state
    submitButton.classList.remove('active');

    function validateForm() {
        let isValid = true;
        inputs.forEach(input => {
            const isInputValid = validateField(input);
            if (!isInputValid) isValid = false;
        });

        // Special check for terms checkbox
        const termsChecked = document.getElementById('terms').checked;
        if (!termsChecked) isValid = false;

        // Update button state
        if (isValid) {
            submitButton.classList.add('active');
        } else {
            submitButton.classList.remove('active');
        }
    }

    function validateField(input) {
        const formGroup = input.closest('.form-group');
        const errorDisplay = formGroup.querySelector('.error-message');
        let isValid = true;

        // Clear previous error
        formGroup.classList.remove('has-error');
        errorDisplay.textContent = '';

        // Validate based on input type
        switch(input.id) {
            case 'name':
                isValid = /^[A-Za-z\s]{3,50}$/.test(input.value);
                break;
            case 'email':
                isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value);
                break;
            case 'phone':
                isValid = /^[0-9]{10}$/.test(input.value);
                break;
            case 'password':
                isValid = input.value.length >= 8;
                break;
            case 'terms':
                isValid = input.checked;
                break;
        }

        // Show error if invalid
        if (!isValid) {
            formGroup.classList.add('has-error');
            errorDisplay.textContent = errorMessages[input.id];
        }

        return isValid;
    }

    // Add event listeners
    inputs.forEach(input => {
        input.addEventListener('input', validateForm);
        input.addEventListener('change', validateForm);
    });

    // Form submit handling
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const isValid = Array.from(inputs).every(input => validateField(input));
        
        if (!isValid) {
            validateForm();
            return false;
        }

        // If form is valid, show loading state and submit
        const buttonText = submitButton.querySelector('.button-text');
        const loadingText = submitButton.querySelector('.loading-text');
        
        buttonText.style.display = 'none';
        loadingText.style.display = 'block';
        submitButton.disabled = true;

        // Submit the form
        this.submit();
    });

    // Initial validation
    validateForm();
});

// Add utility function to get CSRF token
function getCSRFToken() {
    const cookieValue = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='));
    return cookieValue ? cookieValue.split('=')[1] : null;
}
