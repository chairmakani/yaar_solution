const cartAnimations = {
    async addToCart(button, productId, productName, price) {
        try {
            button.disabled = true;
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

            const response = await fetch('/api/cart/add/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCookie('csrftoken')
                },
                body: JSON.stringify({
                    productId: productId
                })
            });

            const data = await response.json();

            if (data.success) {
                button.innerHTML = '<i class="fas fa-check"></i> Added!';
                
                // Update both count and total in navbar
                this.updateCartNavbar(data.cart);
                
                this.showNotification(`Added ${productName} to cart!`, 'success');
            } else {
                throw new Error(data.message || 'Failed to add item');
            }
        } catch (error) {
            button.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
            this.showNotification(error.message, 'error');
        } finally {
            setTimeout(() => {
                button.innerHTML = originalText;
                button.disabled = false;
            }, 1500);
        }
    },

    updateCartNavbar(cartData) {
        // Update cart count with animation
        const cartCount = document.querySelector('.cart-count');
        if (cartCount) {
            cartCount.textContent = cartData.total_items;
            cartCount.classList.add('bounce');
            setTimeout(() => cartCount.classList.remove('bounce'), 300);
        }

        // Update cart total with animation
        const cartTotal = document.querySelector('.cart-total');
        if (cartTotal) {
            cartTotal.style.opacity = '0';
            setTimeout(() => {
                cartTotal.textContent = `₹${cartData.total_amount}`;
                cartTotal.style.opacity = '1';
            }, 150);
        }
    },

    updateCartCount(count) {
        const cartCount = document.querySelector('.cart-count');
        if (cartCount) {
            // Add bounce animation
            cartCount.style.transform = 'scale(1.3)';
            cartCount.textContent = count;
            
            setTimeout(() => {
                cartCount.style.transform = 'scale(1)';
                cartCount.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            }, 50);
        }
    },

    animateCartIcon() {
        const cartIcon = document.querySelector('.cart-icon');
        if (cartIcon) {
            cartIcon.classList.add('shake');
            setTimeout(() => cartIcon.classList.remove('shake'), 500);
        }
    },

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `cart-notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Trigger entrance animation
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        // Remove notification
        setTimeout(() => {
            notification.classList.remove('show');
            notification.addEventListener('transitionend', () => notification.remove());
        }, 2000);
    },

    getCookie(name) {
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
};
