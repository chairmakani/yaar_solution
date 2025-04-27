// Only create CartUI if it doesn't exist
if (typeof window.CartUI === 'undefined') {
    window.CartUI = class {
        constructor() {
            this.items = new Map();
            this.modal = document.getElementById('removeModal');
            this.itemToRemove = null;
            this.removeEndpoint = '/remove-from-cart/';  // Update endpoint
            this.initialize();

            // Add debounce for quantity updates
            this.updateDebounced = this.debounce(this.updateCart.bind(this), 500);

            this.initializeNotificationContainer();
        }

        initializeNotificationContainer() {
            if (!document.querySelector('.notification-container')) {
                const container = document.createElement('div');
                container.className = 'notification-container';
                document.body.appendChild(container);
            }
        }

        initialize() {
            this.items = new Map();
            
            // Initialize cart items
            document.querySelectorAll('.cart-item').forEach(item => {
                const itemKey = item.dataset.itemKey;
                const input = item.querySelector('.quantity-input');
                const priceText = item.querySelector('.item-price').textContent;
                
                this.items.set(itemKey, {
                    element: item,
                    quantity: parseInt(input.value),
                    price: parseFloat(priceText.replace('₹', '')),
                    maxStock: parseInt(input.getAttribute('max'))
                });
            });

            this.setupEventListeners();
        }

        setupEventListeners() {
            this.setupQuantityControls();
            this.setupRemoveButtons();
            this.setupCheckoutButton();
        }

        setupQuantityControls() {
            document.querySelectorAll('.quantity-controls').forEach(control => {
                const cartItem = control.closest('.cart-item');
                const input = control.querySelector('.quantity-input');
                const decrease = control.querySelector('.decrease');
                const increase = control.querySelector('.increase');
                
                if (!input || !cartItem) return;
                
                const maxStock = parseInt(cartItem.dataset.maxStock);
                const itemKey = cartItem.dataset.itemKey;
                
                const updateQuantity = async (newQty) => {
                    if (newQty < 1 || newQty > maxStock) return;
                    
                    try {
                        const response = await fetch('/cart/update/', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                            },
                            body: JSON.stringify({
                                item_key: itemKey,
                                quantity: newQty
                            })
                        });

                        const data = await response.json();
                        
                        if (data.success) {
                            // Update quantity input
                            input.value = newQty;
                            
                            // Update item total price
                            const priceElement = cartItem.querySelector('.item-total');
                            if (priceElement) {
                                priceElement.textContent = `₹${data.item_total}`;
                                priceElement.classList.add('flash');
                                setTimeout(() => priceElement.classList.remove('flash'), 300);
                            }
                            
                            // Update cart totals
                            this.updateCartTotals(data.cart);
                            
                            // Update button states
                            decrease.disabled = newQty <= 1;
                            increase.disabled = newQty >= maxStock;
                        } else {
                            throw new Error(data.message || 'Failed to update quantity');
                        }
                    } catch (error) {
                        this.showNotification(error.message, 'error');
                        // Revert input value
                        input.value = currentQty;
                    }
                };

                decrease?.addEventListener('click', () => {
                    const currentQty = parseInt(input.value);
                    if (currentQty > 1) {
                        updateQuantity(currentQty - 1);
                    }
                });

                increase?.addEventListener('click', () => {
                    const currentQty = parseInt(input.value);
                    if (currentQty < maxStock) {
                        updateQuantity(currentQty + 1);
                    }
                });
            });
        }

        async handleQuantityChange(itemKey, change) {
            const cartItem = document.querySelector(`[data-item-key="${itemKey}"]`);
            const input = cartItem.querySelector('.quantity-input');
            const currentQty = parseInt(input.value);
            const maxStock = parseInt(cartItem.dataset.maxStock);
            const basePrice = parseFloat(cartItem.dataset.itemPrice);
            
            const newQty = Math.max(1, Math.min(currentQty + change, maxStock));
            if (newQty === currentQty) return;

            try {
                const response = await this.updateCartItem(itemKey, newQty);
                if (response.success) {
                    input.value = newQty;
                    this.updateItemDisplay(cartItem, newQty, basePrice);
                    this.updateCartTotals(response.cart);
                    this.updateQuantityButtons(cartItem, newQty, maxStock);
                }
            } catch (error) {
                console.error('Failed to update quantity:', error);
                this.showNotification('Failed to update quantity', 'error');
            }
        }

        updateItemDisplay(cartItem, quantity, basePrice) {
            const total = quantity * basePrice;
            const totalElement = cartItem.querySelector('.item-total');
            
            if (totalElement) {
                totalElement.textContent = `₹${total.toFixed(2)}`;
                totalElement.classList.add('flash');
                setTimeout(() => totalElement.classList.remove('flash'), 300);
            }
        }

        updateQuantityButtons(cartItem, quantity, maxStock) {
            const decrease = cartItem.querySelector('.decrease');
            const increase = cartItem.querySelector('.increase');
            
            if (decrease) decrease.disabled = quantity <= 1;
            if (increase) increase.disabled = quantity >= maxStock;
        }

        setupRemoveButtons() {
            document.querySelectorAll('.remove-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const cartItem = button.closest('.cart-item');
                    if (!cartItem) return;
                    
                    const itemKey = cartItem.dataset.itemKey;
                    if (!itemKey) {
                        console.error('No item key found for cart item');
                        return;
                    }
                    
                    this.showRemoveConfirmation(cartItem, itemKey);
                });
            });

            document.getElementById('removeModal')?.addEventListener('click', (e) => {
                if (e.target.id === 'removeModal') {
                    this.hideRemoveConfirmation();
                }
            });

            document.getElementById('cancelRemove')?.addEventListener('click', () => {
                this.hideRemoveConfirmation();
            });

            document.getElementById('confirmRemove')?.addEventListener('click', () => {
                this.removeConfirmedItem();
            });
        }

        showRemoveConfirmation(cartItem, itemKey) {
            if (!itemKey) {
                console.error('No item key provided for removal');
                return;
            }
            
            this.itemToRemove = { element: cartItem, key: itemKey };
            const modal = document.getElementById('removeModal');
            if (modal) {
                modal.classList.add('show');
                modal.removeAttribute('hidden');
            }
        }

        hideRemoveConfirmation() {
            const modal = document.getElementById('removeModal');
            modal.classList.remove('show');
            modal.setAttribute('hidden', 'true');
            this.itemToRemove = null;
        }

        async removeConfirmedItem() {
            if (!this.itemToRemove?.key || !this.itemToRemove?.element) {
                this.showNotification('Invalid item selected for removal', 'error');
                return;
            }

            try {
                const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value;
                if (!csrfToken) throw new Error('CSRF token not found');

                const response = await fetch(this.removeEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': csrfToken
                    },
                    body: JSON.stringify({ item_key: this.itemToRemove.key })
                });

                const data = await response.json();
                
                if (data.success) {
                    // Animate and remove item
                    this.itemToRemove.element.classList.add('removing');
                    
                    // Update cart UI
                    this.updateCartTotals(data.cart);
                    
                    // Remove element after animation
                    setTimeout(() => {
                        if (this.itemToRemove?.element?.parentNode) {
                            this.itemToRemove.element.remove();
                            this.checkEmptyCart();
                        }
                        this.itemToRemove = null;
                    }, 500);

                    this.showNotification('Item removed successfully', 'success');
                } else {
                    throw new Error(data.message || 'Failed to remove item');
                }
            } catch (error) {
                console.error('Error removing item:', error);
                this.showNotification(
                    error.message || 'Failed to remove item. Please try again.',
                    'error'
                );
            } finally {
                this.hideRemoveConfirmation();
            }
        }

        async removeItem(itemKey) {
            if (!itemKey) return;
            
            const cartItem = document.querySelector(`[data-item-key="${itemKey}"]`);
            if (!cartItem) return;

            this.itemToRemove = {
                element: cartItem,
                key: itemKey
            };

            await this.removeConfirmedItem();
        }

        showNotification(message, type = 'info') {
            const container = document.querySelector('.notification-container');
            if (!container) return;

            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            
            notification.innerHTML = `
                <div class="notification-content">
                    <p>${message}</p>
                </div>
                <button class="notification-close">&times;</button>
            `;
            
            container.appendChild(notification);
            
            // Trigger animation
            requestAnimationFrame(() => {
                notification.classList.add('show');
            });

            // Auto remove after delay
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            }, 3000);

            // Add click to dismiss
            notification.querySelector('.notification-close')?.addEventListener('click', () => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 300);
            });
        }

        updateTotals(cartData) {
            const subtotal = document.querySelector('.summary-row:first-child span:last-child');
            const total = document.querySelector('.summary-row.total span:last-child');
            
            if (subtotal) subtotal.textContent = `₹${cartData.subtotal}`;
            if (total) total.textContent = `₹${cartData.total}`;

            // Update header cart count
            const cartCount = document.getElementById('cart-count');
            if (cartCount) {
                cartCount.textContent = cartData.total_items;
            }
        }

        checkEmptyCart() {
            const cartItems = document.querySelectorAll('.cart-item');
            if (cartItems.length === 0) {
                const cartContent = document.querySelector('.cart-content');
                if (cartContent) {
                    cartContent.innerHTML = `
                        <div class="empty-cart">
                            <i class="fas fa-shopping-cart"></i>
                            <h2>Your cart is empty</h2>
                            <p>Browse our products and add items to your cart</p>
                            <a href="/store/" class="start-shopping">Start Shopping</a>
                        </div>
                    `;
                }
            }
        }

        async updateCart(data) {
            const response = await fetch('/api/cart/update/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                },
                credentials: 'same-origin',
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error('Failed to update cart');
            }

            const result = await response.json();
            if (result.success) {
                this.updateCartDisplay(result.cart);
            }
            return result;
        }

        setupCheckoutButton() {
            document.getElementById('checkout-btn')?.addEventListener('click', () => {
                window.location.href = '/checkout/';
            });
        }

        // Add debounce helper
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        async updateCartItem(itemKey, quantity) {
            return await this.makeRequest('/api/cart/update/', {
                method: 'POST',
                body: JSON.stringify({
                    item_key: itemKey,
                    quantity: quantity
                })
            });
        }

        async removeCartItem(itemKey) {
            return await this.makeRequest('/api/cart/remove/', {
                method: 'POST',
                body: JSON.stringify({
                    item_key: itemKey
                })
            });
        }

        updateCartTotals(cartData) {
            if (!cartData) return;

            // Update cart counts
            ['cart-count', 'mobile-cart-count'].forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    element.textContent = cartData.total_items || '0';
                    this.animateElement(element, 'bounce');
                }
            });

            // Update cart total
            const cartTotal = document.getElementById('cart-total');
            if (cartTotal) {
                cartTotal.textContent = `₹${cartData.total_amount || '0.00'}`;
                this.animateElement(cartTotal, 'highlight');
            }

            // Update subtotal and total in cart summary
            const subtotal = document.querySelector('.summary-row:first-child span:last-child');
            const total = document.querySelector('.summary-row.total span:last-child');
            
            if (subtotal) subtotal.textContent = `₹${cartData.subtotal || '0.00'}`;
            if (total) total.textContent = `₹${cartData.total || '0.00'}`;
        }

        animateElement(element, className) {
            if (!element) return;
            element.classList.remove(className);
            void element.offsetWidth; // Trigger reflow
            element.classList.add(className);
            setTimeout(() => element.classList.remove(className), 300);
        }
    }
}

// Initialize cart only if not already initialized
if (!window.cartUI) {
    document.addEventListener('DOMContentLoaded', () => {
        window.cartUI = new CartUI();
    });
}
