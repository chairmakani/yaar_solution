document.addEventListener('DOMContentLoaded', function() {
    const productInfo = document.querySelector('.product-info');
    if (!productInfo) return;
    
    const hasVariants = productInfo.dataset.hasVariants === 'true';
    const variantButtons = document.querySelectorAll('.variant-btn');
    const quantityInput = document.getElementById('quantity');
    const decreaseQtyBtn = document.getElementById('decrease-qty');
    const increaseQtyBtn = document.getElementById('increase-qty');
    const addToCartBtn = document.getElementById('add-to-cart');
    const addToWishlistBtn = document.getElementById('add-to-wishlist');
    const thumbnails = document.querySelectorAll('.thumbnail');
    const mainImage = document.getElementById('main-product-image');
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Variables to track state
    let selectedVariantId = null;
    let maxStockQuantity = quantityInput ? (parseInt(quantityInput.max) || 1) : 1;
    const stockThreshold = productInfo.dataset.stockThreshold ? parseInt(productInfo.dataset.stockThreshold) : 10;
    
    // INITIALIZE TAB SYSTEM - Set initial tab state
    const initializeTabs = () => {
        // Make the first tab active by default
        if (tabButtons.length > 0 && tabContents.length > 0) {
            // Get the first tab's data-tab value
            const firstTabId = tabButtons[0].dataset.tab + '-tab';
            
            // Activate the first tab
            tabButtons[0].classList.add('active');
            
            // Find and show the corresponding content
            tabContents.forEach(content => {
                if (content.id === firstTabId) {
                    content.classList.add('active');
                }
            });
        }
    };
    
    // Initialize with default selected variant if product has variants
    if (hasVariants && variantButtons.length > 0) {
        const defaultSelected = document.querySelector('.variant-btn.selected');
        if (defaultSelected) {
            selectedVariantId = defaultSelected.dataset.variantId;
            updateVariantInfo(defaultSelected);
        }
    }

    // Variant button click handlers
    variantButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update selected state
            variantButtons.forEach(btn => btn.classList.remove('selected'));
            this.classList.add('selected');
            
            // Update variant info
            selectedVariantId = this.dataset.variantId;
            updateVariantInfo(this);
        });
    });
    
    // Function to update variant information display
    function updateVariantInfo(variantButton) {
        if (!variantButton) return;
        
        const price = variantButton.dataset.price;
        const stock = parseInt(variantButton.dataset.stock);
        const sku = variantButton.dataset.sku;
        
        // Update price display - Fix for priceDisplay error
        const priceDisplays = [
            document.getElementById('variant-price'),
            document.querySelector('.product-pricing .price')
        ];
        
        priceDisplays.forEach(display => {
            if (display) {
                display.textContent = `₹${price}`;
            }
        });
        
        // Update stock status
        const stockStatus = document.getElementById('variant-stock-status');
        if (stockStatus) {
            if (stock > 0) {
                const threshold = productInfo?.dataset.stockThreshold || 10;
                if (stock <= threshold) {
                    stockStatus.textContent = `Only ${stock} left!`;
                    stockStatus.className = 'low-stock';
                } else {
                    stockStatus.textContent = 'In Stock';
                    stockStatus.className = 'in-stock';
                }
            } else {
                stockStatus.textContent = 'Out of Stock';
                stockStatus.className = 'out-of-stock';
            }
        }
        
        // Update SKU and other info
        const skuDisplay = document.getElementById('variant-sku');
        if (skuDisplay) {
            skuDisplay.textContent = sku;
        }
        
        // Update add to cart button state and quantity limits
        maxStockQuantity = stock;
        if (addToCartBtn) {
            addToCartBtn.disabled = stock <= 0;
        }
        
        if (quantityInput) {
            quantityInput.max = stock;
            const currentQty = parseInt(quantityInput.value);
            if (currentQty > stock) {
                quantityInput.value = Math.max(1, stock);
            }
            updateQuantityButtonStates();
        }
    }
    
    // Add helper function for quantity button states
    function updateQuantityButtonStates() {
        if (!quantityInput) return;
        
        const currentValue = parseInt(quantityInput.value);
        
        if (decreaseQtyBtn) {
            decreaseQtyBtn.disabled = currentValue <= 1;
        }
        if (increaseQtyBtn) {
            increaseQtyBtn.disabled = currentValue >= maxStockQuantity;
        }
    }
    
    // Quantity adjustment handlers
    if (decreaseQtyBtn) {
        decreaseQtyBtn.addEventListener('click', function() {
            if (!quantityInput) return;
            const currentValue = parseInt(quantityInput.value);
            if (currentValue > 1) {
                quantityInput.value = currentValue - 1;
            }
            updateQuantityButtonStates();
        });
    }
    
    if (increaseQtyBtn) {
        increaseQtyBtn.addEventListener('click', function() {
            if (!quantityInput) return;
            const currentValue = parseInt(quantityInput.value);
            const maxValue = parseInt(quantityInput.max) || maxStockQuantity;
            if (currentValue < maxValue) {
                quantityInput.value = currentValue + 1;
            }
            updateQuantityButtonStates();
        });
    }
    
    // Direct input validation for quantity
    if (quantityInput) {
        quantityInput.addEventListener('change', function() {
            const currentValue = parseInt(this.value);
            const minValue = parseInt(this.min) || 1;
            const maxValue = parseInt(this.max) || maxStockQuantity;
            
            if (isNaN(currentValue) || currentValue < minValue) {
                this.value = minValue;
            } else if (currentValue > maxValue) {
                this.value = maxValue;
            }
            updateQuantityButtonStates();
        });
    }
    
    // Product image gallery
    thumbnails.forEach(thumbnail => {
        thumbnail.addEventListener('click', function() {
            if (!mainImage) return;
            
            // Update active state
            thumbnails.forEach(thumb => thumb.classList.remove('active'));
            this.classList.add('active');
            
            // Get new image URL
            const imageUrl = this.dataset.image;
            
            // Add loading class to main image container
            mainImage.classList.add('loading');
            mainImage.classList.add('fade-out');
            
            // Create new image object to preload
            const newImage = new Image();
            newImage.onload = function() {
                // Once new image is loaded, update main image
                mainImage.src = imageUrl;
                mainImage.classList.remove('fade-out');
                mainImage.classList.add('fade-in');
                
                // Clean up classes after transition
                mainImage.addEventListener('transitionend', function handler() {
                    mainImage.classList.remove('fade-in', 'loading');
                    mainImage.removeEventListener('transitionend', handler);
                });
            };
            newImage.src = imageUrl;
        });
    });

    // Add image loading handler
    if (mainImage) {
        mainImage.addEventListener('load', function() {
            this.classList.remove('loading');
        });
    }

    // Tab system
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.dataset.tab + '-tab';
            
            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Update active tab content
            tabContents.forEach(content => {
                content.style.display = 'none';
                content.classList.remove('active');
                if (content.id === tabId) {
                    content.style.display = 'block';
                    content.classList.add('active');
                }
            });
        });
    });
    
    // Add to cart functionality

    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', function() {
            if (this.disabled) return;
            
            const quantity = quantityInput ? parseInt(quantityInput.value) : 1;
            const productId = productInfo.dataset.productId;
            
            // Add to cart logic
            addToCart(productId, selectedVariantId, quantity);
        });
    }
    
    // Add to Wishlist functionality
    if (addToWishlistBtn) {
        addToWishlistBtn.addEventListener('click', function() {
            const productId = productInfo.dataset.productId;
            addToWishlist(productId, selectedVariantId);
        });
    }
    
    function addToWishlist(productId, variantId) {
        const csrfToken = getCookie('csrftoken');
        
        // Prepare data
        const data = {
            product_id: productId
        };
        
        if (variantId) {
            data.variant_id = variantId;
        }
        
        // Make AJAX request to add to wishlist
        fetch('/wishlist/add/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
                'Accept': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            // Check if redirected to login page
            if (response.redirected || response.url.includes('login')) {
                window.location.href = '/login/?next=' + encodeURIComponent(window.location.pathname);
                return;
            }
            
            // Check content type
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return response.json();
            }
            throw new Error('Invalid response format');
        })
        .then(data => {
            if (data && data.success) {
                showNotification('Product saved to your wishlist!', 'success');
            } else {
                throw new Error(data.message || 'Failed to add product to wishlist.');
            }
        })
        .catch(error => {
            console.error('Error adding to wishlist:', error);
            if (error.message.includes('Invalid response format')) {
                showNotification('Please login to add items to wishlist', 'warning');
            } else {
                showNotification(error.message || 'There was a problem saving this item.', 'error');
            }
        });
    }
    
    function addToCart(productId, variantId, quantity) {
        const csrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]')?.value || getCookie('csrftoken');
        const data = {
            product_id: parseInt(productId),
            quantity: parseInt(quantity),
            variant_id: variantId ? parseInt(variantId) : null
        };

        fetch('/api/cart/add/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
                'Accept': 'application/json'
            },
            body: JSON.stringify(data),
            credentials: 'same-origin'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Dispatch cart update event
                const event = new CustomEvent('cartUpdated', {
                    detail: {
                        total_items: data.cart.total_items,
                        total_amount: data.cart.total_amount,
                        items: data.cart.items
                    }
                });
                document.dispatchEvent(event);
                
                showNotification('Product added to cart!', 'success');
                updateCartDisplay(data.cart.total_items, data.cart.total_amount);
            } else {
                throw new Error(data.message || 'Failed to add product to cart.');
            }
        })
        .catch(error => {
            console.error('Error adding to cart:', error);
            showNotification(error.message || 'There was a problem adding this item to your cart.', 'error');
        });
    }

    // Function to update both cart count and total in navbar
    function updateCartIndicators(count, total) {
        // Update count
        const cartCountElement = document.querySelector('.cart-count');
        if (cartCountElement) {
            cartCountElement.textContent = count;
            cartCountElement.classList.add('cart-count-updated');
            
            setTimeout(() => {
                cartCountElement.classList.remove('cart-count-updated');
            }, 1000);
        }
        
        // Update total amount
        const cartTotalElement = document.querySelector('.cart-total');
        if (cartTotalElement) {
            // Format the total with currency symbol
            cartTotalElement.textContent = `₹${parseFloat(total).toFixed(2)}`;
            cartTotalElement.classList.add('cart-total-updated');
            
            setTimeout(() => {
                cartTotalElement.classList.remove('cart-total-updated');
            }, 1000);
        }
        
        // Add highlight animation to the entire cart indicator
        const cartIndicator = document.querySelector('.cart-indicator');
        if (cartIndicator) {
            cartIndicator.classList.add('cart-updated');
            
            setTimeout(() => {
                cartIndicator.classList.remove('cart-updated');
            }, 1000);
        }
    }

    function updateCartDisplay(count, total) {
        // Update cart count
        const cartCount = document.querySelector('.cart-count');
        if (cartCount) {
            cartCount.textContent = count;
            cartCount.classList.remove('cart-count-updated');
            void cartCount.offsetWidth; // Force reflow
            cartCount.classList.add('cart-count-updated');
        }

        // Update cart total with proper formatting
        const cartTotal = document.querySelector('.cart-total');
        if (cartTotal) {
            const formattedTotal = typeof total === 'string' ? total : `₹${parseFloat(total).toFixed(2)}`;
            cartTotal.textContent = formattedTotal;
            cartTotal.classList.remove('cart-total-updated');
            void cartTotal.offsetWidth; // Force reflow
            cartTotal.classList.add('cart-total-updated');
        }

        // Update cart indicator animation
        const cartIndicator = document.querySelector('.cart-indicator');
        if (cartIndicator) {
            cartIndicator.classList.remove('cart-updated');
            void cartIndicator.offsetWidth; // Force reflow
            cartIndicator.classList.add('cart-updated');
        }
    }

    // Add global event listener for cart updates
    document.addEventListener('cartUpdated', (event) => {
        const { total_items, total_amount } = event.detail;
        updateCartDisplay(total_items, total_amount);
    });

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

    // Function to show notification
    function showNotification(message, type = 'info') {
        // Check if a notification container exists, create if not
        let notificationContainer = document.querySelector('.notification-container');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.className = 'notification-container';
            document.body.appendChild(notificationContainer);
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        // Create notification content
        notification.innerHTML = `
            <div class="notification-icon">
                ${getNotificationIcon(type)}
            </div>
            <div class="notification-content">
                <p>${message}</p>
            </div>
            <button class="notification-close">&times;</button>
        `;
        
        // Add to container
        notificationContainer.appendChild(notification);
        
        // Trigger animation after a small delay
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });
        
        // Close button handler
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => removeNotification(notification));
        
        // Auto remove after delay
        setTimeout(() => removeNotification(notification), 4000);
    }

    function removeNotification(notification) {
        if (!notification) return;
        
        notification.classList.add('hide');
        notification.addEventListener('animationend', () => {
            notification.remove();
        });
    }

    function getNotificationIcon(type) {
        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class "fas fa-exclamation-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };
        return icons[type] || icons.info;
    }
    
    // Initialize the tabs on page load
    initializeTabs();
});

