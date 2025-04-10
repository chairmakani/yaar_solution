// Notification Manager
const NotificationManager = {
    show: function(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(notification);
        
        // Trigger animation
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        // Auto dismiss
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
};

// Modal Manager
const ModalManager = {
    show: function(content) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal-content">
                ${content}
            </div>
        `;
        
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('show'));
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.close(overlay);
            }
        });
        
        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.close(overlay);
            }
        });
        
        return overlay;
    },
    
    close: function(overlay) {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
    }
};

// Form validation helper
function validateForm(formData) {
    const errors = [];
    
    if (!formData.get('name')?.trim()) {
        errors.push('Name is required');
    }
    
    const phone = formData.get('phone')?.trim();
    if (phone && !/^\d{10}$/.test(phone)) {
        errors.push('Phone number must be 10 digits');
    }
    
    return errors;
}

// Add address form validation
function validateAddressForm(formData) {
    const errors = [];
    const required = ['name', 'phone', 'street', 'city', 'state', 'pincode'];
    
    for (let field of required) {
        if (!formData.get(field)?.trim()) {
            errors.push(`${field.charAt(0).toUpperCase() + field.slice(1)} is required`);
        }
    }
    
    if (!/^\d{10}$/.test(formData.get('phone')?.trim())) {
        errors.push('Phone number must be 10 digits');
    }
    
    if (!/^\d{6}$/.test(formData.get('pincode')?.trim())) {
        errors.push('PIN code must be 6 digits');
    }
    
    return errors;
}

// Address form template
const getAddressFormTemplate = (required = false) => `
    <div class="modal-header">
        <h3><i class="fas fa-map-marker-alt"></i> Add New Address</h3>
        ${!required ? '<button class="modal-close" onclick="ModalManager.close(this.closest(\'.modal-overlay\'))"><i class="fas fa-times"></i></button>' : ''}
    </div>
    ${required ? '<p class="modal-message">Please add at least one delivery address to continue.</p>' : ''}
    <form id="address-form" class="address-form">
        <div class="form-row">
            <div class="form-group">
                <label for="name">Full Name</label>
                <input type="text" id="name" name="name" required>
            </div>
            <div class="form-group">
                <label for="phone">Phone Number</label>
                <input type="tel" id="phone" name="phone" pattern="[0-9]{10}" placeholder="10-digit number" required>
            </div>
        </div>
        <div class="form-group">
            <label for="street">Street Address</label>
            <input type="text" id="street" name="street" required>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label for="city">City</label>
                <input type="text" id="city" name="city" required>
            </div>
            <div class="form-group">
                <label for="state">State</label>
                <input type="text" id="state" name="state" required>
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label for="pincode">PIN Code</label>
                <input type="text" id="pincode" name="pincode" pattern="[0-9]{6}" maxlength="6" required>
            </div>
            <div class="form-group">
                <label for="type">Address Type</label>
                <select id="type" name="type" required>
                    <option value="home">Home</option>
                    <option value="work">Work</option>
                    <option value="other">Other</option>
                </select>
            </div>
        </div>
        <div class="modal-actions">
            ${!required ? '<button type="button" class="btn-cancel" onclick="ModalManager.close(this.closest(\'.modal-overlay\'))">Cancel</button>' : ''}
            <button type="submit" class="btn-save">Add Address</button>
        </div>
    </form>
`;

// Handle address form submission
const handleAddressSubmit = async (form, required = false) => {
    const formData = new FormData(form);
    const errors = validateAddressForm(formData);
    
    if (errors.length) {
        NotificationManager.show(errors[0], 'error');
        return;
    }
    
    const submitBtn = form.querySelector('.btn-save');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/profile/address/add/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken()
            },
            body: JSON.stringify(Object.fromEntries(formData))
        });
        
        const data = await response.json();
        
        if (data.success) {
            NotificationManager.show('Address added successfully');
            window.location.reload();
        } else {
            throw new Error(data.message || 'Failed to add address');
        }
    } catch (error) {
        NotificationManager.show(error.message, 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
};

// Get CSRF token safely
function getCSRFToken() {
    const csrfInput = document.querySelector('[name=csrfmiddlewaretoken]');
    const csrfCookie = document.cookie.match(/csrftoken=([^;]+)/);
    return (csrfInput && csrfInput.value) || (csrfCookie && csrfCookie[1]) || null;
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Profile edit handler
    window.editProfile = function() {
        const nameText = document.querySelector('.profile-name')?.textContent || '';
        const nameParts = nameText.split(' ');
        
        const user = {
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            email: document.querySelector('.profile-email')?.textContent || '',
            phone: document.querySelector('.info-group:nth-child(3) .info-value')?.textContent || ''
        };

        const modalContent = `
            <div class="modal-header">
                <h2><i class="fas fa-user-edit"></i> Edit Profile</h2>
                <button type="button" class="modal-close" onclick="ModalManager.close(this.closest('.modal-overlay'))">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form id="profile-edit-form">
                <div class="form-row">
                    <div class="form-group">
                        <label for="firstName">First Name</label>
                        <input type="text" id="firstName" name="first_name" 
                               value="${user.firstName}" required>
                    </div>
                    <div class="form-group">
                        <label for="lastName">Last Name</label>
                        <input type="text" id="lastName" name="last_name" 
                               value="${user.lastName}">
                    </div>
                </div>
                <div class="form-group">
                    <label for="email">Email Address</label>
                    <input type="email" id="email" name="email" 
                           value="${user.email}" required>
                    <small>Changing email will require re-verification</small>
                </div>
                <div class="form-group">
                    <label for="phone">Phone Number</label>
                    <input type="tel" id="phone" name="phone" 
                           value="${user.phone === 'Not provided' ? '' : user.phone}" 
                           pattern="[0-9]{10}" placeholder="10-digit number">
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-cancel" 
                            onclick="ModalManager.close(this.closest('.modal-overlay'))">
                        Cancel
                    </button>
                    <button type="submit" class="btn-save">Save Changes</button>
                </div>
            </form>
        `;
        
        const modal = ModalManager.show(modalContent);
        const form = modal.querySelector('#profile-edit-form');
        
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                try {
                    const formData = new FormData(form);
                    const submitBtn = form.querySelector('.btn-save');
                    if (!submitBtn) return;

                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
                    
                    const csrfToken = getCSRFToken();
                    if (!csrfToken) {
                        throw new Error('CSRF token not found');
                    }

                    const response = await fetch('/api/profile/update/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': csrfToken
                        },
                        body: JSON.stringify({
                            first_name: formData.get('first_name') || '',
                            last_name: formData.get('last_name') || '',
                            email: formData.get('email') || '',
                            phone: formData.get('phone') || ''
                        })
                    });

                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        // Update UI elements safely
                        const nameDisplay = document.querySelector('.profile-name');
                        const infoValue = document.querySelector('.info-group:first-child .info-value');
                        const emailDisplay = document.querySelector('.profile-email');
                        const phoneDisplay = document.querySelector('.info-group:nth-child(3) .info-value');

                        const fullName = `${formData.get('first_name')} ${formData.get('last_name')}`.trim();
                        
                        if (nameDisplay) nameDisplay.textContent = fullName;
                        if (infoValue) infoValue.textContent = fullName;
                        if (emailDisplay) emailDisplay.textContent = formData.get('email');
                        if (phoneDisplay) phoneDisplay.textContent = formData.get('phone') || 'Not provided';

                        NotificationManager.show('Profile updated successfully', 'success');
                        setTimeout(() => ModalManager.close(modal), 1000);
                    } else {
                        throw new Error(data.message || 'Failed to update profile');
                    }
                } catch (error) {
                    NotificationManager.show(error.message, 'error');
                    const submitBtn = form.querySelector('.btn-save');
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = 'Save Changes';
                    }
                }
            });
        }
    };

    // Check for required address
    const hasAddress = document.querySelector('.address-card');
    const addressRequiredParam = new URLSearchParams(window.location.search).get('address_required');
    
    if (!hasAddress && addressRequiredParam === 'true') {
        const modal = ModalManager.show(getAddressFormTemplate(true));
        modal.classList.add('required-address');
        
        // Prevent closing required address modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal && modal.classList.contains('required-address')) {
                e.preventDefault();
                e.stopPropagation();
                NotificationManager.show('Please add a delivery address to continue', 'error');
            }
        });
        
        // Handle form submission
        const form = modal.querySelector('#address-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleAddressSubmit(form, true);
        });
    }
    
    // Add address button handler
    window.addAddress = function() {
        const modal = ModalManager.show(getAddressFormTemplate(false));
        const form = modal.querySelector('#address-form');
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleAddressSubmit(form, false);
        });
    };
    
    // Add other initialization code here
});

// Add to CSS for required address modal
const style = document.createElement('style');
style.textContent = `
    .modal-overlay.required-address {
        background-color: rgba(0, 0, 0, 0.8);
    }
    .modal-overlay.required-address .modal-content {
        max-width: 600px;
    }
    .modal-message {
        margin: 1rem 0;
        padding: 1rem;
        background-color: #fff3cd;
        border-left: 4px solid #ffc107;
        color: #856404;
    }
`;
document.head.appendChild(style);
