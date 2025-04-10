// class QuantityManager {
//     constructor(config = {}) {
//         this.container = document.querySelector('.quantity-manager');
//         this.input = this.container?.querySelector('.quantity-input');
//         this.decreaseBtn = this.container?.querySelector('.qty-btn.decrease');
//         this.increaseBtn = this.container?.querySelector('.qty-btn.increase');
//         this.addToCartBtn = document.querySelector('.add-to-cart-btn');
        
//         this.productType = this.container?.dataset.type || 'standard';
//         this.variantSelected = false;
//         this.config = {
//             thresholds: { low: 5, critical: 2 },
//             ...config
//         };

//         this.productId = this.addToCartBtn?.dataset.productId;
//         this.maxStock = parseInt(this.input?.dataset.maxStock || 0);
//         this.currentValue = 1;
//         this.selectedVariant = null;
//         this.isAddingToCart = false;

//         // Update product type handling
//         this.isVariantProduct = this.container?.dataset.type === 'variant';
//         this.mode = this.isVariantProduct ? 'variant' : 'standard';

//         // Add new properties for better type handling
//         this.stockVerified = false;
//         this.lastStockCheck = null;
//         this.stockCheckInterval = 5000; // 5 seconds

//         // Add variant-specific state tracking
//         this.variantState = {
//             isSelected: false,
//             selectedVariant: null,
//             maxStock: 0,
//             originalPrice: null
//         };

//         // Initialize container with correct mode class
//         if (this.container) {
//             this.container.classList.add(`${this.mode}-mode`);
//             this.init();
//         }
//     }

//     init() {
//         this.setupEventListeners();
//         this.initializeBasedOnType();
//     }

//     initializeBasedOnType() {
//         if (this.mode === 'variant') {
//             this.disableQuantityControls();
//             this.updateAddToCartButton({ state: 'select' });
//             this.container?.classList.add('awaiting-selection');
//         } else {
//             this.checkInitialStock();
//         }
//     }

//     checkInitialStock() {
//         const initialStock = parseInt(this.input?.dataset.maxStock || 0);
//         if (initialStock > 0) {
//             this.enableQuantityControls();
//             this.updateAddToCartButton({ state: 'ready', stock: initialStock });
//         } else {
//             this.disableQuantityControls();
//             this.updateAddToCartButton({ state: 'out-of-stock' });
//         }
//     }

//     setupEventListeners() {
//         this.decreaseBtn?.addEventListener('click', () => this.handleQuantityChange(-1));
//         this.increaseBtn?.addEventListener('click', () => this.handleQuantityChange(1));
//         this.input?.addEventListener('input', () => this.validateInput());
//         this.input?.addEventListener('blur', () => this.validateInput());

//         if (this.productType === 'variant') {
//             document.querySelectorAll('input[name="variant"]').forEach(radio => {
//                 radio.addEventListener('change', (e) => this.handleVariantChange(e));
//             });
//         }

//         this.addToCartBtn?.addEventListener('click', (e) => this.handleAddToCart(e));
//     }

//     handleQuantityChange(delta) {
//         if (this.input.disabled) return;

//         const newValue = this.currentValue + delta;
//         if (this.isValidQuantity(newValue)) {
//             this.currentValue = newValue;
//             this.input.value = newValue;
//             this.animateQuantityChange(delta > 0 ? 'increase' : 'decrease');
//             this.updateControls();
//             this.checkStockWarning(newValue);
            
//             // Reset stock verification
//             this.stockVerified = false;
//             this.lastStockCheck = null;
//         }
//     }

//     validateInput() {
//         const value = parseInt(this.input.value) || 1;
//         const validValue = Math.min(Math.max(1, value), this.maxStock);

//         if (value !== validValue) {
//             this.showError(value > this.maxStock);
//             this.currentValue = validValue;
//             this.input.value = validValue;
//         }

//         this.updateControls();
//     }

//     handleVariantChange(e) {
//         if (this.mode !== 'variant') return;

//         const variant = e.target;
//         const stock = parseInt(variant.dataset.stock);
//         const price = parseFloat(variant.dataset.price);

//         this.variantState = {
//             isSelected: true,
//             selectedVariant: {
//                 id: variant.value,
//                 stock: stock,
//                 price: price
//             },
//             maxStock: stock,
//             originalPrice: this.variantState.originalPrice || price
//         };

//         // Update input constraints
//         this.input.dataset.maxStock = stock.toString();
//         this.maxStock = stock;
        
//         // Reset quantity when changing variants
//         this.currentValue = 1;
//         this.input.value = 1;

//         // Enable/disable controls based on stock
//         if (stock > 0) {
//             this.enableControls();
//             this.container.classList.remove('disabled');
//             this.container.classList.add('variant-selected');
//             this.updateStockDisplay(stock);
//         } else {
//             this.disableControls();
//             this.container.classList.add('disabled');
//             this.container.classList.remove('variant-selected');
//         }

//         this.updatePrice(price);
//         this.validateQuantity();
//         this.updateControls();
//         this.showStockIndicator(stock);

//         // Update mode-specific classes
//         this.container?.classList.remove('awaiting-selection');
//         this.container?.classList.add('variant-selected');
//     }

//     async handleAddToCart(e) {
//         e.preventDefault();
        
//         if (this.isAddingToCart) return;

//         // Verify stock before proceeding
//         if (!await this.verifyStock()) {
//             return;
//         }

//         try {
//             // Handle based on product type
//             if (this.isVariantProduct) {
//                 if (!this.selectedVariant) {
//                     this.showNotification('Please select a variant first', 'warning');
//                     return;
//                 }
//                 await this.addVariantToCart();
//             } else {
//                 await this.addStandardProductToCart();
//             }

//             // Redirect to cart page on success
//             window.location.href = '/cart/';
//         } catch (error) {
//             this.showNotification('Failed to add to cart', 'error');
//             console.error('Add to cart error:', error);
//         }
//     }

//     async verifyStock() {
//         const now = Date.now();
//         if (this.lastStockCheck && (now - this.lastStockCheck < this.stockCheckInterval)) {
//             return this.stockVerified;
//         }

//         try {
//             const response = await fetch('/api/stock/check/', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'X-CSRFToken': this.getCsrfToken()
//                 },
//                 body: JSON.stringify({
//                     product_id: this.productId,
//                     variant_id: this.selectedVariant?.id
//                 })
//             });

//             const data = await response.json();
//             if (!data.success) {
//                 throw new Error(data.message);
//             }

//             const stockInfo = data.stock_data[0];
//             this.stockVerified = this.validateStockAmount(stockInfo.stock);
//             this.lastStockCheck = now;

//             return this.stockVerified;
//         } catch (error) {
//             this.showNotification('Failed to verify stock', 'error');
//             return false;
//         }
//     }

//     validateStockAmount(availableStock) {
//         if (this.currentValue > availableStock) {
//             this.showNotification(`Only ${availableStock} items available`, 'error');
//             this.updateQuantity(availableStock);
//             return false;
//         }
//         return true;
//     }

//     async addVariantToCart() {
//         this.setLoadingState(true);
        
//         const response = await this.addToCartRequest({
//             product_id: this.productId,
//             variant_id: this.selectedVariant.id,
//             quantity: this.currentValue
//         });

//         if (response.success) {
//             this.showNotification('Added to cart successfully!', 'success');
//             this.updateCartUI(response.cart);
//         } else {
//             throw new Error(response.message);
//         }
//     }

//     async addStandardProductToCart() {
//         this.setLoadingState(true);
        
//         const response = await this.addToCartRequest({
//             product_id: this.productId,
//             quantity: this.currentValue
//         });

//         if (response.success) {
//             this.showNotification('Added to cart successfully!', 'success');
//             this.updateCartUI(response.cart);
//         } else {
//             throw new Error(response.message);
//         }
//     }

//     async addToCartRequest(data) {
//         const response = await fetch('/api/cart/add/', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'X-CSRFToken': this.getCsrfToken()
//             },
//             body: JSON.stringify(data)
//         });

//         return response.json();
//     }

//     handleAddToCartResponse(response) {
//         if (response.success) {
//             this.showNotification('Added to cart successfully!', 'success');
//             this.updateCartUI(response.cart);
            
//             if (this.productType === 'variant') {
//                 this.resetQuantity();
//             }
//         } else {
//             this.showNotification(response.message || 'Failed to add to cart', 'error');
//         }
//     }

//     isValidQuantity(value) {
//         return value >= 1 && value <= this.maxStock;
//     }

//     updatePrice(price) {
//         const priceDisplay = document.querySelector('.current-price');
//         if (priceDisplay) {
//             priceDisplay.textContent = `₹${price}`;
//             priceDisplay.classList.add('price-update');
//             setTimeout(() => priceDisplay.classList.remove('price-update'), 300);
//         }
//     }

//     updateStockStatus() {
//         const status = this.getStockStatus();
//         const display = document.querySelector('.stock-status-display');
//         if (display) {
//             display.className = `stock-status-display ${status.type}`;
//             display.innerHTML = `<i class="fas fa-${this.getStockIcon(status.type)}"></i> ${status.message}`;
//         }
//     }

//     getStockStatus() {
//         if (this.productType === 'variant' && !this.selectedVariant) {
//             return { type: 'select-variant', message: 'Please select an option' };
//         }

//         const stock = this.maxStock;
//         if (stock <= 0) return { type: 'out-of-stock', message: 'Out of Stock' };
//         if (stock <= 5) return { type: 'low-stock', message: `Only ${stock} left` };
//         return { type: 'in-stock', message: 'In Stock' };
//     }

//     getStockIcon(type) {
//         const icons = {
//             'out-of-stock': 'times-circle',
//             'low-stock': 'exclamation-triangle',
//             'in-stock': 'check-circle',
//             'select-variant': 'hand-pointer'
//         };
//         return icons[type] || 'info-circle';
//     }

//     updateAddToCartButton({ state, stock = 0 }) {
//         if (!this.addToCartBtn) return;

//         switch (state) {
//             case 'select':
//                 this.addToCartBtn.innerHTML = '<i class="fas fa-list"></i> Select Option';
//                 this.addToCartBtn.disabled = false;
//                 this.addToCartBtn.classList.remove('ready', 'out-of-stock');
//                 this.addToCartBtn.classList.add('select-variant');
//                 break;

//             case 'ready':
//                 this.addToCartBtn.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
//                 this.addToCartBtn.disabled = false;
//                 this.addToCartBtn.classList.remove('select-variant', 'out-of-stock');
//                 this.addToCartBtn.classList.add('ready');
//                 break;

//             case 'out-of-stock':
//                 this.addToCartBtn.innerHTML = '<i class="fas fa-times"></i> Out of Stock';
//                 this.addToCartBtn.disabled = true;
//                 this.addToCartBtn.classList.remove('ready', 'select-variant');
//                 this.addToCartBtn.classList.add('out-of-stock');
//                 break;

//             case 'loading':
//                 this.addToCartBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
//                 this.addToCartBtn.disabled = true;
//                 break;
//         }
//     }

//     validateQuantity() {
//         if (!this.isVariantProduct) return true;

//         const { isSelected, maxStock } = this.variantState;
//         if (!isSelected) return false;

//         const isValid = this.currentValue >= 1 && this.currentValue <= maxStock;
        
//         if (!isValid) {
//             this.showError(this.currentValue > maxStock);
//             this.currentValue = Math.min(Math.max(1, this.currentValue), maxStock);
//             this.input.value = this.currentValue;
//         }

//         return isValid;
//     }

//     setLoadingState(loading) {
//         if (this.addToCartBtn) {
//             this.addToCartBtn.disabled = loading;
//             this.addToCartBtn.innerHTML = loading ? 
//                 '<i class="fas fa-spinner fa-spin"></i> Adding...' :
//                 '<i class="fas fa-cart-plus"></i> Add to Cart';
//         }
//     }

//     showStockWarning(stock) {
//         const warningEl = document.querySelector('.stock-warning-message');
//         if (!warningEl) return;

//         if (stock <= this.config.thresholds.critical) {
//             warningEl.innerHTML = `<span class="critical">Only ${stock} items left!</span>`;
//             warningEl.classList.add('show', 'critical');
//         } else if (stock <= this.config.thresholds.low) {
//             warningEl.innerHTML = `<span class="warning">Low stock: ${stock} remaining</span>`;
//             warningEl.classList.add('show', 'warning');
//         } else {
//             warningEl.classList.remove('show', 'critical', 'warning');
//         }
//     }

//     updateControls() {
//         if (!this.input || !this.isVariantProduct) return;

//         const { isSelected, maxStock } = this.variantState;

//         // Disable controls if no variant selected
//         if (!isSelected) {
//             this.disableControls();
//             this.updateAddToCartButton('select');
//             return;
//         }

//         // Update button states based on stock
//         this.decreaseBtn.disabled = this.currentValue <= 1;
//         this.increaseBtn.disabled = this.currentValue >= maxStock;

//         // Update add to cart button
//         this.updateAddToCartButton(
//             maxStock <= 0 ? 'out-of-stock' : 'ready'
//         );
//     }

//     showStockIndicator(stock) {
//         const indicatorClass = this.getStockIndicatorClass(stock);
//         const message = this.getStockMessage(stock);
        
//         const indicator = document.querySelector('.stock-indicator');
//         if (indicator) {
//             indicator.className = `stock-indicator ${indicatorClass}`;
//             indicator.innerHTML = `<i class="fas fa-${this.getStockIcon(indicatorClass)}"></i> ${message}`;
//         }
//     }

//     getStockIndicatorClass(stock) {
//         if (stock <= 0) return 'out-of-stock';
//         if (stock <= this.config.thresholds.critical) return 'critical-stock';
//         if (stock <= this.config.thresholds.low) return 'low-stock';
//         return 'in-stock';
//     }

//     getStockMessage(stock) {
//         if (stock <= 0) return 'Out of Stock';
//         if (stock <= this.config.thresholds.critical) return `Only ${stock} left!`;
//         if (stock <= this.config.thresholds.low) return `Low Stock: ${stock} remaining`;
//         return 'In Stock';
//     }

//     showError(isOverStock) {
//         const message = isOverStock ? 
//             `Maximum available stock is ${this.variantState.maxStock}` : 
//             'Minimum quantity is 1';

//         this.container.classList.add('error');
//         setTimeout(() => this.container.classList.remove('error'), 500);
        
//         if (window.productNotification) {
//             window.productNotification.show(message, 'warning');
//         }
//     }

//     // Add these styles dynamically
//     addStyles() {
//         const styles = `
//             .quantity-manager.variant-mode:not(.variant-selected) {
//                 opacity: 0.7;
//                 pointer-events: none;
//             }

//             .quantity-manager.disabled {
//                 opacity: 0.5;
//                 pointer-events: none;
//             }

//             .quantity-manager.error {
//                 animation: shake 0.2s ease-in-out;
//             }

//             .quantity-manager .stock-indicator {
//                 font-size: 0.9rem;
//                 margin-top: 0.5rem;
//                 display: flex;
//                 align-items: center;
//                 gap: 0.5rem;
//             }

//             .stock-indicator.critical-stock {
//                 color: #dc3545;
//             }

//             .stock-indicator.low-stock {
//                 color: #ffc107;
//             }

//             .stock-indicator.in-stock {
//                 color: #28a745;
//             }

//             @keyframes shake {
//                 0%, 100% { transform: translateX(0); }
//                 25% { transform: translateX(-5px); }
//                 75% { transform: translateX(5px); }
//             }
//         `;

//         const styleSheet = document.createElement('style');
//         styleSheet.textContent = styles;
//         document.head.appendChild(styleSheet);
//     }

//     resetVariantState() {
//         if (this.mode === 'variant') {
//             this.container?.classList.remove('variant-selected');
//             this.container?.classList.add('awaiting-selection');
//             this.disableControls();
//             this.updateAddToCartButton({ state: 'select' });
//         }
//     }

//     // More helper methods...
// }

// // Add these specific styles for mode handling
// const modeStyles = `
//     .quantity-manager.variant-mode.awaiting-selection {
//         opacity: 0.7;
//         pointer-events: none;
//     }

//     .quantity-manager.variant-mode:not(.variant-selected) .add-to-cart-btn {
//         background-color: #6c757d;
//     }

//     .quantity-manager.standard-mode .variant-controls {
//         display: none;
//     }

//     .quantity-manager.variant-mode .variant-selected {
//         opacity: 1;
//         pointer-events: auto;
//     }
// `;

// // Add styles to document
// document.addEventListener('DOMContentLoaded', () => {
//     const styleSheet = document.createElement('style');
//     styleSheet.textContent = modeStyles;
//     document.head.appendChild(styleSheet);
// });

// // Initialize with styles
// document.addEventListener('DOMContentLoaded', () => {
//     const manager = new QuantityManager();
//     manager.addStyles();
// });
