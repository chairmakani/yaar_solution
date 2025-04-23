// cart-manager.js

document.addEventListener('DOMContentLoaded', () => {
    window.cartManager = new CartManager();
});

class CartManager {
    constructor() {
        this.csrfToken = this.getCSRFToken();
        this.initializeEventListeners();
        this.setupStockMonitoring();
    }

    getCSRFToken() {
        return document.querySelector('meta[name="csrf-token"]')?.content 
            || document.querySelector('[name=csrfmiddlewaretoken]')?.value 
            || this.getCookie('csrftoken');
    }

    initializeEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            this.initQuantityControls();
            this.initAddToCartButtons();
            this.initVariantSelectors();
        });
    }

    initQuantityControls() {
        document.querySelectorAll('.quantity-selector').forEach(selector => {
            const input = selector.querySelector('.quantity-input');
            const decreaseBtn = selector.querySelector('.decrease');
            const increaseBtn = selector.querySelector('.increase');
            
            if (!input) return;
            
            const maxStock = parseInt(input.dataset.maxStock) || 1;
            
            if (decreaseBtn) {
                decreaseBtn.addEventListener('click', () => {
                    if (parseInt(input.value) > 1) {
                        this.updateQuantity(input, -1, maxStock);
                    }
                });
            }
            
            if (increaseBtn) {
                increaseBtn.addEventListener('click', () => {
                    this.updateQuantity(input, 1, maxStock);
                });
            }

            input.addEventListener('change', () => {
                this.validateQuantity(input, maxStock);
            });
        });
    }

    initVariantSelectors() {
        document.querySelectorAll('.variant-choice input').forEach(input => {
            input.addEventListener('change', (e) => {
                this.handleVariantSelection(e.target);
            });
        });
    }

    handleVariantSelection(variantInput) {
        const variantId = variantInput.value;
        const price = variantInput.dataset.price;
        const stock = parseInt(variantInput.dataset.stock);

        // Update UI elements
        this.updatePriceDisplay(price);
        this.updateQuantityLimits(stock);
        this.updateAddToCartButton(variantId, stock);
    }

    initAddToCartButtons() {
        document.querySelectorAll('.add-to-cart-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleAddToCart(button);
            });
        });
    }

    async handleAddToCart(button) {
        try {
            const productId = button.dataset.productId;
            const productName = button.dataset.productName;
            const variantId = button.dataset.variantId;
            const requiresVariant = button.dataset.requiresVariant === 'true';
            
            // Get quantity input and validate
            const quantityInput = document.querySelector(`.quantity-input[data-product-id="${productId}"]`) || 
                                document.getElementById('quantity');
            const quantity = parseInt(quantityInput?.value || 1);
            const maxStock = parseInt(quantityInput?.dataset.maxStock || 0);

            if (requiresVariant && !variantId) {
                this.showNotification('Please select a variant first', 'warning');
                return;
            }

            if (quantity > maxStock) {
                this.showNotification(`Only ${maxStock} items available`, 'warning');
                return;
            }

            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

            const response = await fetch('/api/cart/add/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.csrfToken
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    product_id: productId,
                    quantity: quantity,
                    variant_id: variantId || null
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showNotification(`Added ${quantity} × ${productName} to cart`, 'success');
                this.updateCartDisplay(result.cart);
                button.innerHTML = '<i class="fas fa-check"></i> Added!';
            } else {
                throw new Error(result.message || 'Failed to add to cart');
            }
        } catch (error) {
            this.showNotification(error.message, 'error');
            button.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
        } finally {
            setTimeout(() => {
                button.disabled = false;
                button.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
            }, 2000);
        }
    }

    async addToCart(button, data) {
        try {
            button.disabled = true;
            this.setButtonLoading(button);

            const response = await this.makeRequest('/api/cart/add/', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            if (response.success) {
                await this.handleSuccessfulAdd(button, response);
            } else {
                throw new Error(response.message);
            }
        } catch (error) {
            this.handleError(button, error);
        } finally {
            this.resetButton(button);
        }
    }

    async makeRequest(url, options = {}) {
        try {
            const defaultOptions = {
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.csrfToken,
                    'Accept': 'application/json'
                },
                credentials: 'same-origin'
            };

            const response = await fetch(url, { ...defaultOptions, ...options });
            
            if (response.status === 403) {
                console.warn('Authentication required or permission denied');
                return { success: false, message: 'Permission denied' };
            }

            if (!response.ok) {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.includes('text/html')) {
                    // Handle HTML response (likely an error page)
                    return { success: false, message: 'Server returned an error page' };
                }
                if (contentType && contentType.includes('application/json')) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Server error');
                }
                throw new Error('Network response was not ok');
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                return { success: false, message: 'Invalid response format' };
            }

            return await response.json();
        } catch (error) {
            console.error('Request failed:', error);
            return { success: false, message: error.message || 'Request failed' };
        }
    }

    updateQuantity(input, change, maxStock) {
        if (!input) return;
        
        const currentValue = parseInt(input.value) || 1;
        const newValue = Math.max(1, Math.min(currentValue + change, maxStock));
        
        if (currentValue !== newValue) {
            input.value = newValue;
            
            // Add visual feedback
            input.classList.add('quantity-changed');
            setTimeout(() => input.classList.remove('quantity-changed'), 300);
            
            // Update button states
            this.updateQuantityButtonStates(input);
            
            // Trigger change event
            input.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }

    validateQuantity(input, maxStock) {
        if (!input) return;
        
        let value = parseInt(input.value) || 1;
        value = Math.max(1, Math.min(value, maxStock));
        input.value = value;
        
        this.updateQuantityButtonStates(input);
    }

    updateQuantityButtonStates(input) {
        const container = input.closest('.quantity-selector');
        if (!container) return;
        
        const decreaseBtn = container.querySelector('.decrease');
        const increaseBtn = container.querySelector('.increase');
        const currentValue = parseInt(input.value);
        const maxStock = parseInt(input.dataset.maxStock);
        
        if (decreaseBtn) {
            decreaseBtn.disabled = currentValue <= 1;
        }
        if (increaseBtn) {
            increaseBtn.disabled = currentValue >= maxStock;
        }
    }

    // ... Helper methods ...

    updatePriceDisplay(price) {
        const display = document.getElementById('display-price');
        if (display) {
            display.textContent = `₹${price}`;
        }
    }

    updateQuantityLimits(stock) {
        const input = document.querySelector('.quantity-input');
        if (input) {
            input.dataset.maxStock = stock;
            input.value = Math.min(parseInt(input.value) || 1, stock);
            
            const decreaseBtn = input.parentElement.querySelector('.decrease');
            const increaseBtn = input.parentElement.querySelector('.increase');
            
            if (decreaseBtn) decreaseBtn.disabled = input.value <= 1;
            if (increaseBtn) increaseBtn.disabled = input.value >= stock;
        }
    }

    updateAddToCartButton(variantId, stock) {
        const button = document.querySelector('.add-to-cart-btn');
        if (button) {
            button.dataset.variantId = variantId;
            button.disabled = stock <= 0;
        }
    }

    // ... UI Helper methods ...

    setButtonLoading(button) {
        button.classList.add('loading');
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
    }

    resetButton(button) {
        setTimeout(() => {
            button.disabled = false;
            button.classList.remove('loading');
            button.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
        }, 2000);
    }

    showNotification(message, type = 'success') {
        const container = document.getElementById('cart-notifications');
        if (!container) return;

        // Remove existing notifications of the same type
        const existingNotifications = container.querySelectorAll(`.cart-notification.${type}`);
        existingNotifications.forEach(note => {
            note.classList.remove('show');
            setTimeout(() => note.remove(), 300);
        });

        const notification = document.createElement('div');
        notification.className = `cart-notification ${type}`;
        
        // Select icon based on type
        const icon = type === 'success' ? 'check-circle' :
                    type === 'error' ? 'times-circle' :
                    type === 'warning' ? 'exclamation-triangle' : 'info-circle';
        
        notification.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <p class="notification-message">${message}</p>
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
        notification.addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        });
    }

    async handleSuccessfulAdd(button, response) {
        this.updateCartDisplay(response.cart);
        await this.animateAddToCart(button);
        this.showNotification('Added to cart successfully', 'success');
    }

    handleError(button, error) {
        button.classList.add('cart-error');
        button.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
        this.showNotification(error.message || 'Failed to add item to cart', 'error');
    }

    updateCartDisplay(cartData) {
        const cartCount = document.getElementById('cart-count');
        const cartTotal = document.getElementById('cart-total');
        const cartItems = document.querySelector('.cart-items');
        
        // Update count and total
        if (cartCount) cartCount.textContent = cartData.total_items;
        if (cartTotal) cartTotal.textContent = `₹${cartData.total_amount}`;
        
        // Update cart items if we're on the cart page
        if (cartItems && cartData.items) {
            cartItems.innerHTML = cartData.items.map(item => this.generateCartItemHtml(item)).join('');
            this.initQuantityControls(); // Reinitialize controls for new items
        }

        // Dispatch cart updated event
        document.dispatchEvent(new CustomEvent('cartUpdated', { detail: cartData }));
    }

    generateCartItemHtml(item) {
        return `
            <div class="cart-item" data-item-id="${item.id}" data-product-id="${item.product_id}">
                <div class="item-image">
                    ${item.image ? `<img src="${item.image}" alt="${item.name}">` : ''}
                </div>
                <div class="item-details">
                    <div class="item-info">
                        <h3>${item.name}</h3>
                        ${item.variant ? `
                            <div class="variant-info">
                                <span class="variant-value">${item.variant.value}</span>
                                <span class="variant-unit">${item.variant.unit}</span>
                            </div>
                        ` : ''}
                        <span class="item-price">₹${item.price}</span>
                    </div>
                    <div class="item-controls">
                        <div class="quantity-controls">
                            <button class="qty-btn decrease" ${item.quantity <= 1 ? 'disabled' : ''}>
                                <i class="fas fa-minus"></i>
                            </button>
                            <input type="number" 
                                   class="quantity-input" 
                                   value="${item.quantity}" 
                                   min="1"
                                   max="${item.max_quantity}"
                                   readonly>
                            <button class="qty-btn increase" ${item.quantity >= item.max_quantity ? 'disabled' : ''}>
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <div class="price-group">
                            <span class="item-total">₹${item.total}</span>
                        </div>
                        <button class="remove-btn" title="Remove item">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    animateElement(element) {
        element.classList.remove('bounce');
        void element.offsetWidth; // Trigger reflow
        element.classList.add('bounce');
        setTimeout(() => element.classList.remove('bounce'), 300);
    }

    getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.startsWith(name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    setupStockMonitoring() {
        const pollInterval = 30000; // 30 seconds
        let timeoutId = null;

        const checkStock = async () => {
            try {
                const productElements = document.querySelectorAll('[data-product-id]');
                if (productElements.length === 0) {
                    return; // No products to check
                }

                const response = await this.makeRequest('/api/stock/check/', {
                    method: 'POST',
                    body: JSON.stringify({ 
                        product_ids: Array.from(productElements)
                            .map(el => el.dataset.productId)
                    })
                });

                if (response.success && Array.isArray(response.stock_data)) {
                    this.updateStockUI(response.stock_data);
                }
            } catch (error) {
                console.warn('Stock check failed:', error);
            } finally {
                // Schedule next check only if page is visible
                if (document.visibilityState === 'visible') {
                    timeoutId = setTimeout(checkStock, pollInterval);
                }
            }
        };

        // Start monitoring only if products exist on page
        if (document.querySelectorAll('[data-product-id]').length > 0) {
            checkStock();

            // Handle page visibility changes
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') {
                    if (!timeoutId) {
                        checkStock();
                    }
                } else {
                    if (timeoutId) {
                        clearTimeout(timeoutId);
                        timeoutId = null;
                    }
                }
            });
        }
    }

    async checkStockUpdates() {
        try {
            const response = await this.makeRequest('/api/stock/check/', {
                method: 'POST',
                body: JSON.stringify({ 
                    product_ids: Array.from(document.querySelectorAll('[data-product-id]'))
                        .map(el => el.dataset.productId)
                })
            });

            if (response.success && Array.isArray(response.stock_data)) {
                // Filter out duplicates
                const uniqueStockData = [];
                const seen = new Set();

                response.stock_data.forEach(item => {
                    const key = `${item.product_id}-${item.variant_id || ''}`;
                    if (!seen.has(key)) {
                        seen.add(key);
                        uniqueStockData.push(item);
                    }
                });

                this.updateStockUI(uniqueStockData);
            } else {
                console.warn('Invalid stock data received:', response);
            }
        } catch (error) {
            console.error('Failed to check stock:', error);
        }
    }

    updateStockUI(stockData) {
        if (!Array.isArray(stockData)) {
            console.warn('Stock data is not an array:', stockData);
            return;
        }

        stockData.forEach(({ product_id, stock, variant_id = null }) => {
            const selector = variant_id 
                ? `[data-product-id="${product_id}"][data-variant-id="${variant_id}"]`
                : `[data-product-id="${product_id}"]:not([data-variant-id])`;
            
            const elements = document.querySelectorAll(selector);
            
            elements.forEach(element => {
                this.updateElementStock(element, stock);
            });
        });
    }

    updateElementStock(element, stock) {
        const stockInfo = element.querySelector('.stock-info');
        const addToCartBtn = element.querySelector('.add-to-cart-btn');
        const quantityControls = element.querySelector('.quantity-controls');
        
        if (stockInfo) {
            stockInfo.className = 'stock-info ' + this.getStockClass(stock);
            stockInfo.innerHTML = this.getStockHTML(stock);
        }

        if (addToCartBtn) {
            addToCartBtn.disabled = stock <= 0;
            addToCartBtn.title = stock <= 0 ? 'Out of stock' : 'Add to cart';
        }

        if (quantityControls) {
            const input = quantityControls.querySelector('.quantity-input');
            const increase = quantityControls.querySelector('.increase');
            
            if (input) {
                input.max = stock;
                if (parseInt(input.value) > stock) {
                    input.value = stock;
                }
            }
            
            if (increase) {
                increase.disabled = parseInt(input?.value || 0) >= stock;
            }
        }

        // Update data attribute
        element.dataset.maxStock = stock;
    }

    getStockClass(stock) {
        if (stock <= 0) return 'out-of-stock';
        if (stock <= 5) return 'low-stock';
        return 'in-stock';
    }

    getStockHTML(stock) {
        const indicator = '<span class="stock-indicator"></span>';
        if (stock <= 0) {
            return `${indicator}<span>Out of Stock</span>`;
        }
        if (stock <= 5) {
            return `${indicator}<span>Only ${stock} left</span>`;
        }
        return `${indicator}<span>In Stock</span>`;
    }
}

// Initialize cart manager
window.cartManager = new CartManager();
