document.addEventListener('DOMContentLoaded', function() {
    const checkoutForm = document.getElementById('checkout-form');
    
    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const selectedAddress = checkoutForm.querySelector('input[name="address_id"]:checked');
            
            if (!selectedAddress) {
                showMessage('Please select a delivery address', 'error');
                return;
            }
            
            try {
                const submitBtn = checkoutForm.querySelector('button[type="submit"]');
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                
                const formData = new FormData(checkoutForm);
                
                const response = await fetch(checkoutForm.action, {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken')
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const data = await response.json();
                    if (data.error) {
                        throw new Error(data.error);
                    }
                    // Handle JSON response if needed
                } else {
                    // Handle HTML response (payment page)
                    document.open();
                    document.write(await response.text());
                    document.close();
                }
                
            } catch (error) {
                showMessage(error.message || 'An error occurred', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-lock"></i> Proceed to Payment';
            }
        });
    }
    
    // Helper function to show messages
    function showMessage(message, type = 'error') {
        const messagesDiv = document.querySelector('.messages');
        if (messagesDiv) {
            const alert = document.createElement('div');
            alert.className = `alert alert-${type}`;
            alert.textContent = message;
            messagesDiv.appendChild(alert);
            
            // Auto dismiss after 5 seconds
            setTimeout(() => {
                alert.remove();
            }, 5000);
        }
    }
    
    // Helper function to get CSRF token
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('checkout-form');
    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
    
    if (form) {
        form.addEventListener('submit', function(e) {
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
            }
        });
    }
});
