// cart-manager.js

class CartManager {
    constructor() {
        this.csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
        this.setupCartElements();
        this.setupEventListeners();
    }

    setupCartElements() {
        this.cartCount = document.getElementById('cart-count');
        this.mobileCartCount = document.getElementById('mobile-cart-count');
        this.cartTotal = document.getElementById('cart-total');
        this.notificationContainer = document.getElementById('cart-notifications');
    }

    setupEventListeners() {
        document.addEventListener('click', async (e) => {
            // Handle Add to Cart
            const addToCartBtn = e.target.closest('.add-to-cart-btn:not(.disabled)');
            if (addToCartBtn) {
                e.preventDefault();
                await this.handleAddToCart(addToCartBtn);
            }

            // Handle Select Options
            const selectOptionsBtn = e.target.closest('.select-options-btn');
            if (selectOptionsBtn) {
                e.preventDefault();
                window.location.href = selectOptionsBtn.href;
            }
        });

        // Update quantity control handler
        document.addEventListener('click', e => {
            const qtyBtn = e.target.closest('.qty-btn');
            if (qtyBtn && !qtyBtn.disabled) {
                e.preventDefault();
                this.handleQuantityChange(qtyBtn);
            }
        });
    }

    async handleAddToCart(button) {
        if (button.dataset.processing === 'true') return;

        try {
            button.dataset.processing = 'true';
            button.disabled = true;
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

            const productId = button.dataset.productId;
            const variantId = button.dataset.variantId;
            const quantity = this.getQuantity(productId);

            // Check stock first
            const stockResponse = await this.checkStock(productId, quantity, variantId);
            
            if (!stockResponse.success || !stockResponse.inStock) {
                this.showNotification(stockResponse.message || 'Not enough stock', 'error');
                if (stockResponse.available === 0) {
                    this.updateToOutOfStock(button.closest('.product-card'));
                }
                return;
            }

            // Add to cart
            const response = await this.addToCart(productId, quantity, variantId);
            
            if (response.success) {
                this.updateCartUI(response.cart);
                this.showNotification('Added to cart successfully', 'success');
                
                if (response.remaining_stock !== undefined) {
                    this.updateStockUI(button.closest('.product-card'), response.remaining_stock);
                }
            } else {
                throw new Error(response.message || 'Failed to add to cart');
            }

        } catch (error) {
            this.showNotification(error.message || 'Failed to add to cart', 'error');
        } finally {
            button.disabled = false;
            button.dataset.processing = 'false';
            button.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
        }
    }

    handleQuantityChange(button) {
        const container = button.closest('.quantity-selector');
        if (!container) return;

        const input = container.querySelector('.quantity-input');
        if (!input) return;

        const currentValue = parseInt(input.value) || 1;
        const maxStock = parseInt(input.dataset.maxStock) || 0;
        const isIncrease = button.classList.contains('increase');
        
        let newValue = currentValue;

        if (isIncrease) {
            if (currentValue < maxStock) {
                newValue = currentValue + 1;
            } else {
                this.showNotification(`Only ${maxStock} items available`, 'warning');
                return;
            }
        } else {
            if (currentValue > 1) {
                newValue = currentValue - 1;
            }
        }

        // Update input value
        input.value = newValue;

        // Update button states
        this.updateQuantityButtonStates(container, newValue, maxStock);

        // Dispatch change event
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    updateQuantityButtonStates(container, currentValue, maxStock) {
        const decreaseBtn = container.querySelector('.qty-btn.decrease');
        const increaseBtn = container.querySelector('.qty-btn.increase');

        if (decreaseBtn) {
            decreaseBtn.disabled = currentValue <= 1;
            decreaseBtn.classList.toggle('disabled', currentValue <= 1);
        }

        if (increaseBtn) {
            increaseBtn.disabled = currentValue >= maxStock;
            increaseBtn.classList.toggle('disabled', currentValue >= maxStock);
        }
    }

    getQuantity(productId) {
        const input = document.querySelector(`.quantity-input[data-product-id="${productId}"]`);
        const value = parseInt(input?.value);
        return !isNaN(value) && value > 0 ? value : 1;
    }

    async checkStock(productId, quantity, variantId) {
        try {
            const response = await fetch('/api/stock/check/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.csrfToken
                },
                body: JSON.stringify({
                    product_id: productId,
                    quantity: quantity,
                    variant_id: variantId
                })
            });

            return await response.json();
        } catch (error) {
            console.error('Stock check failed:', error);
            throw error;
        }
    }

    async addToCart(productId, quantity, variantId) {
        try {
            const response = await fetch('/api/cart/add/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.csrfToken
                },
                body: JSON.stringify({
                    product_id: productId,
                    quantity: quantity,
                    variant_id: variantId
                })
            });

            return await response.json();
        } catch (error) {
            console.error('Add to cart failed:', error);
            throw error;
        }
    }

    updateCartUI(cartData) {
        if (!cartData) return;

        // Update cart count
        if (this.cartCount) {
            this.cartCount.textContent = cartData.total_items;
            this.cartCount.classList.add('bounce');
            setTimeout(() => this.cartCount.classList.remove('bounce'), 300);
        }

        // Update mobile cart count
        if (this.mobileCartCount) {
            this.mobileCartCount.textContent = cartData.total_items;
        }

        // Update cart total
        if (this.cartTotal) {
            this.cartTotal.textContent = `₹${cartData.total_amount}`;
        }

        // Dispatch cart update event
        document.dispatchEvent(new CustomEvent('cartUpdated', { 
            detail: cartData 
        }));
    }

    updateStockUI(productCard, stock) {
        if (!productCard) return;

        const quantityControls = productCard.querySelector('.quantity-controls');
        const addToCartBtn = productCard.querySelector('.add-to-cart-btn');
        const stockStatus = productCard.querySelector('.stock-status');
        const quantityInput = productCard.querySelector('.quantity-input');

        if (stock <= 0) {
            this.updateToOutOfStock(productCard);
        } else {
            // Update quantity controls
            if (quantityInput) {
                quantityInput.dataset.maxStock = stock;
                const currentQty = parseInt(quantityInput.value);
                if (currentQty > stock) {
                    quantityInput.value = stock;
                }
            }

            // Update stock status
            if (stockStatus) {
                const lowStockThreshold = 5;
                if (stock <= lowStockThreshold) {
                    stockStatus.className = 'stock-status low-stock';
                    stockStatus.innerHTML = `
                        <span class="stock-indicator"></span>
                        <span class="stock-text">Only ${stock} left</span>
                    `;
                } else {
                    stockStatus.className = 'stock-status in-stock';
                    stockStatus.innerHTML = `
                        <span class="stock-indicator"></span>
                        <span class="stock-text">In Stock</span>
                    `;
                }
            }

            // Enable/disable controls
            if (addToCartBtn) {
                addToCartBtn.disabled = false;
                addToCartBtn.classList.remove('disabled');
            }
            if (quantityControls) {
                quantityControls.style.display = 'block';
            }
        }
    }

    updateToOutOfStock(productCard) {
        const quantityControls = productCard.querySelector('.quantity-controls');
        const addToCartBtn = productCard.querySelector('.add-to-cart-btn');
        const stockStatus = productCard.querySelector('.stock-status');

        // Update button
        if (addToCartBtn) {
            addToCartBtn.classList.add('disabled');
            addToCartBtn.disabled = true;
            addToCartBtn.innerHTML = '<i class="fas fa-times"></i> Out of Stock';
        }

        // Hide quantity controls
        if (quantityControls) {
            quantityControls.style.display = 'none';
        }

        // Update stock status
        if (stockStatus) {
            stockStatus.className = 'stock-status out-of-stock';
            stockStatus.innerHTML = `
                <span class="stock-indicator"></span>
                <span class="stock-text">Out of Stock</span>
            `;
        }

        // Add out of stock message if not exists
        if (!productCard.querySelector('.out-of-stock-message')) {
            const message = document.createElement('div');
            message.className = 'out-of-stock-message';
            message.innerHTML = '<i class="fas fa-exclamation-circle"></i>Out of Stock';
            addToCartBtn.parentElement.insertBefore(message, addToCartBtn);
        }
    }

    showNotification(message, type = 'success') {
        if (!this.notificationContainer) return;

        const notification = document.createElement('div');
        notification.className = `cart-notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 
                          type === 'warning' ? 'exclamation-triangle' : 
                          'exclamation-circle'}"></i>
            <span>${message}</span>
        `;

        this.notificationContainer.appendChild(notification);
        requestAnimationFrame(() => notification.classList.add('show'));

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    window.cartManager = new CartManager();
});
