const CartUtils = {
    async checkStock(productId, quantity, variantId = null) {
        try {
            const response = await fetch('/api/stock/check/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                },
                body: JSON.stringify({
                    product_id: productId,
                    variant_id: variantId,
                    quantity: quantity
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Stock check failed:', error);
            throw error;
        }
    },

    updateCartUI(cartData) {
        const elements = {
            counts: document.querySelectorAll('.cart-count'),
            totals: document.querySelectorAll('.cart-total'),
            mobileCount: document.getElementById('mobile-cart-count')
        };

        // Format currency
        const formattedTotal = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(cartData.total_amount);

        // Update counts with animation
        elements.counts.forEach(count => {
            count.textContent = cartData.total_items;
            count.classList.add('bounce');
            setTimeout(() => count.classList.remove('bounce'), 300);
        });

        // Update totals
        elements.totals.forEach(total => {
            total.textContent = formattedTotal;
        });

        // Update mobile count if exists
        if (elements.mobileCount) {
            elements.mobileCount.textContent = cartData.total_items;
        }

        // Dispatch event for other components
        document.dispatchEvent(new CustomEvent('cartUpdated', {
            detail: cartData
        }));
    },

    showNotification(message, type = 'success') {
        const container = document.getElementById('cart-notifications');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = `cart-notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 
                          type === 'warning' ? 'exclamation-triangle' : 
                          'exclamation-circle'}"></i>
            <span>${message}</span>
        `;

        container.appendChild(notification);
        requestAnimationFrame(() => notification.classList.add('show'));

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
};

window.CartUtils = CartUtils;
