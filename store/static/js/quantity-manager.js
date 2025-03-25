// class QuantityManager {
//     constructor(container, options = {}) {
//         this.container = container;
//         this.input = container.querySelector('.quantity-input');
//         this.decreaseBtn = container.querySelector('.decrease');
//         this.increaseBtn = container.querySelector('.increase');
        
//         // Get data attributes
//         this.productId = this.input?.dataset.productId;
//         this.productName = this.input?.dataset.productName;
//         this.basePrice = parseFloat(this.input?.dataset.basePrice) || 0;
//         this.maxStock = parseInt(this.input?.dataset.maxStock) || 10;
//         this.isCartPage = this.container.closest('.cart-item') !== null;
        
//         // Callback options
//         this.onChange = options.onChange || (() => {});
//         this.onUpdate = options.onUpdate || (() => {});
        
//         // Initialize min/max values
//         this.min = 1;
//         this.max = this.maxStock;
        
//         this.isUpdating = false;
//         this.init();
//     }

//     init() {
//         if (!this.input) return;
        
//         // Set initial states
//         this.input.value = Math.min(parseInt(this.input.value) || 1, this.max);
//         this.input.setAttribute('min', this.min);
//         this.input.setAttribute('max', this.max);
        
//         // Bind events
//         this.decreaseBtn?.addEventListener('click', () => this.decrease());
//         this.increaseBtn?.addEventListener('click', () => this.increase());
//         this.input.addEventListener('change', (e) => this.handleManualInput(e));
//         this.input.addEventListener('keydown', (e) => {
//             if (e.key === 'Enter') {
//                 this.handleManualInput(e);
//             }
//         });
        
//         this.updateButtonStates();
//     }

//     async decrease() {
//         if (this.isUpdating) return;
//         const newValue = parseInt(this.input.value) - 1;
//         if (newValue >= this.min) {
//             await this.updateQuantity(newValue);
//         }
//     }

//     async increase() {
//         if (this.isUpdating) return;
//         const newValue = parseInt(this.input.value) + 1;
//         if (newValue <= this.max) {
//             await this.updateQuantity(newValue);
//         }
//     }

//     async handleManualInput(event) {
//         event.preventDefault();
//         let value = parseInt(event.target.value);
        
//         if (isNaN(value) || value < this.min) {
//             value = this.min;
//         } else if (value > this.max) {
//             value = this.max;
//             this.showNotification(`Maximum available stock is ${this.max}`, 'warning');
//         }
        
//         await this.updateQuantity(value);
//     }

//     async updateQuantity(newValue) {
//         if (this.isUpdating) return;
//         this.isUpdating = true;
        
//         if (this.isCartPage) {
//             await this.updateCartQuantity(newValue);
//         } else {
//             this.updateProductQuantity(newValue);
//         }
        
//         this.isUpdating = false;
//     }

//     async updateCartQuantity(newValue) {
//         const loadingOverlay = document.querySelector('.loading-overlay');
//         if (loadingOverlay) loadingOverlay.style.display = 'flex';

//         try {
//             const response = await fetch('/cart/update/', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'X-CSRFToken': this.getCsrfToken()
//                 },
//                 body: JSON.stringify({
//                     productId: this.productId,
//                     quantity: newValue
//                 })
//             });

//             const data = await response.json();
//             if (data.success) {
//                 this.input.value = newValue;
//                 this.updateButtonStates();
//                 this.updateItemTotal(newValue);
//                 this.updateCartSummary(data.cart);
//                 this.showNotification('Cart updated successfully', 'success');
//             } else {
//                 throw new Error(data.message || 'Failed to update cart');
//             }
//         } catch (error) {
//             console.error('Error:', error);
//             this.showNotification(error.message || 'Error updating cart', 'error');
//             this.input.value = this.input.dataset.initialQty || 1;
//         } finally {
//             if (loadingOverlay) loadingOverlay.style.display = 'none';
//         }
//     }

//     updateProductQuantity(newValue) {
//         this.input.value = newValue;
//         this.updateButtonStates();
        
//         // Update any price displays if needed
//         const total = (this.basePrice * newValue).toFixed(2);
//         const totalPriceElement = this.container.querySelector('.total-price');
//         if (totalPriceElement) {
//             totalPriceElement.textContent = `₹${total}`;
//         }
//     }

//     updateButtonStates() {
//         const value = parseInt(this.input.value);
        
//         if (this.decreaseBtn) {
//             this.decreaseBtn.disabled = value <= this.min;
//         }
//         if (this.increaseBtn) {
//             this.increaseBtn.disabled = value >= this.max;
//         }
//     }

//     updateItemTotal(quantity) {
//         const itemTotal = this.container.querySelector('.item-total');
//         if (itemTotal && this.basePrice) {
//             const total = (this.basePrice * quantity).toFixed(2);
//             itemTotal.textContent = `₹${total}`;
//         }
//     }

//     updateCartSummary(cart) {
//         const elements = {
//             subtotal: document.querySelector('.summary-row span:last-child'),
//             total: document.querySelector('.summary-row.total span:last-child'),
//             count: document.querySelector('.cart-count')
//         };

//         if (elements.subtotal) elements.subtotal.textContent = `₹${cart.total_amount}`;
//         if (elements.total) elements.total.textContent = `₹${cart.total_amount}`;
//         if (elements.count) {
//             elements.count.textContent = cart.total_items;
//             elements.count.classList.add('bounce');
//             setTimeout(() => elements.count.classList.remove('bounce'), 300);
//         }
//     }

//     showNotification(message, type = 'success') {
//         const notification = document.createElement('div');
//         notification.className = `alert-notification ${type}`;
//         notification.innerHTML = `
//             <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
//             <span>${message}</span>
//         `;

//         document.body.appendChild(notification);
//         setTimeout(() => notification.classList.add('show'), 10);
//         setTimeout(() => {
//             notification.classList.remove('show');
//             setTimeout(() => notification.remove(), 300);
//         }, 3000);
//     }

//     getCsrfToken() {
//         return document.querySelector('[name=csrfmiddlewaretoken]')?.value 
//             || document.cookie.match(/csrftoken=([^;]+)/)?.[1];
//     }
// }

// // Initialize quantity managers
// document.addEventListener('DOMContentLoaded', () => {
//     document.querySelectorAll('.quantity-selector').forEach(container => {
//         new QuantityManager(container);
//     });
// });

// window.QuantityManager = QuantityManager;
