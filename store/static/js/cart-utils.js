window.cartUtils = {
    getCsrfToken() {
        return document.querySelector('meta[name="csrf-token"]')?.content;
    },

    updateCartUI(cartData) {
        // Get all cart elements
        const desktopCount = document.getElementById('cart-count');
        const desktopTotal = document.getElementById('cart-total');
        const mobileCount = document.getElementById('mobile-cart-count');
        
        const totalItems = cartData.total_items || 0;
        const totalAmount = cartData.total_amount || '0.00';
        const formattedTotal = `₹${totalAmount}`;

        // Update cart counts with animation
        [desktopCount, mobileCount].forEach(element => {
            if (element) {
                element.textContent = totalItems;
                this.animateElement(element, 'bounce');
            }
        });

        // Update cart total with animation
        if (desktopTotal) {
            desktopTotal.textContent = formattedTotal;
            this.animateElement(desktopTotal, 'highlight');
        }
    },

    animateElement(element, className) {
        if (!element) return;
        element.classList.remove(className);
        void element.offsetWidth; // Trigger reflow
        element.classList.add(className);
        setTimeout(() => element.classList.remove(className), 300);
    },

    updateCartButton(button, isLoading, success = false) {
        if (!button) return;
        const originalText = button.dataset.originalText || 'Add to Cart';
        
        if (isLoading) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
        } else if (success) {
            button.innerHTML = '<i class="fas fa-check"></i> Added!';
            setTimeout(() => {
                button.innerHTML = `<i class="fas fa-cart-plus"></i> ${originalText}`;
                button.disabled = false;
            }, 2000);
        } else {
            button.innerHTML = `<i class="fas fa-cart-plus"></i> ${originalText}`;
            button.disabled = false;
        }
    },

    async addToCart(productId, quantity) {
        try {
            // Validate quantity before sending request
            const quantitySelector = document.querySelector(`.quantity-selector[data-product-id="${productId}"]`);
            if (quantitySelector) {
                const input = quantitySelector.querySelector('.quantity-input');
                const maxStock = parseInt(input.dataset.maxStock);
                quantity = Math.min(Math.max(1, quantity), maxStock);
            }

            const response = await fetch('/add-to-cart/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCsrfToken()
                },
                body: JSON.stringify({ product_id: productId, quantity: quantity })
            });

            const data = await response.json();
            if (data.success) {
                this.updateCartUI(data.cart);
                return data;
            }
            throw new Error(data.message || 'Failed to add to cart');
        } catch (error) {
            console.error('Error adding to cart:', error);
            throw error;
        }
    },

    initQuantityControls() {
        document.querySelectorAll('.quantity-selector').forEach(selector => {
            const input = selector.querySelector('.quantity-input');
            const decreaseBtn = selector.querySelector('.decrease');
            const increaseBtn = selector.querySelector('.increase');
            
            if (!input || !decreaseBtn || !increaseBtn) return;
            
            const maxStock = parseInt(input.dataset.maxStock) || 1;
            
            // Decrease button handler
            decreaseBtn.addEventListener('click', () => {
                let value = parseInt(input.value);
                if (value > 1) {
                    input.value = value - 1;
                    this.updateQuantityState(selector);
                }
            });
            
            // Increase button handler
            increaseBtn.addEventListener('click', () => {
                let value = parseInt(input.value);
                if (value < maxStock) {
                    input.value = value + 1;
                    this.updateQuantityState(selector);
                }
            });
            
            // Input change handler
            input.addEventListener('change', () => {
                let value = parseInt(input.value);
                if (isNaN(value) || value < 1) {
                    input.value = 1;
                } else if (value > maxStock) {
                    input.value = maxStock;
                }
                this.updateQuantityState(selector);
            });
        });
    },

    updateQuantityState(selector) {
        const input = selector.querySelector('.quantity-input');
        const decreaseBtn = selector.querySelector('.decrease');
        const increaseBtn = selector.querySelector('.increase');
        const currentValue = parseInt(input.value);
        const maxStock = parseInt(input.dataset.maxStock);

        // Update buttons state
        if (decreaseBtn) {
            decreaseBtn.disabled = currentValue <= 1;
        }
        if (increaseBtn) {
            increaseBtn.disabled = currentValue >= maxStock;
        }
    }
};

// Initialize styles for animations
const style = document.createElement('style');
style.textContent = `
    .bounce {
        animation: bounce 0.3s ease;
    }
    
    .highlight {
        animation: highlight 0.3s ease;
    }
    
    @keyframes bounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
    }
    
    @keyframes highlight {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }
`;
document.head.appendChild(style);

// Initialize quantity controls when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    cartUtils.initQuantityControls();
});
