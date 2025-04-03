document.addEventListener('DOMContentLoaded', function () {
    const cartManager = new CartManager();
    
    // Handle variant selection
    document.querySelectorAll('.variant-choice input').forEach(input => {
        input.addEventListener('change', (e) => {
            const variantData = {
                variantId: e.target.value,
                price: e.target.dataset.price,
                stock: e.target.dataset.stock
            };
            cartManager.updateVariantSelection(variantData);
        });
    });

    // Handle add to cart
    document.querySelector('.add-to-cart-btn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        const button = e.currentTarget;
        const productId = button.dataset.productId;
        const variantId = button.dataset.variantId;
        const quantity = parseInt(document.querySelector('.quantity-input')?.value || 1);

        if (button.dataset.requiresVariant === 'true' && !variantId) {
            cartManager.showNotification('Please select a variant first', 'warning');
            return;
        }

        const data = {
            product_id: productId,
            quantity: quantity,
            variant_id: variantId
        };

        await cartManager.addToCart(button, data);
    });

    // Image zoom functionality
    const mainImage = document.getElementById('mainImage');
    const zoomContainer = document.querySelector('.main-image');

    if (mainImage && zoomContainer) {
        zoomContainer.addEventListener('mousemove', function (e) {
            const { left, top, width, height } = this.getBoundingClientRect();
            const x = ((e.clientX - left) / width) * 100;
            const y = ((e.clientY - top) / height) * 100;
            mainImage.style.transform = 'scale(1.5)';
            mainImage.style.transformOrigin = `${x}% ${y}%`;
        });

        zoomContainer.addEventListener('mouseleave', function () {
            mainImage.style.transform = 'scale(1)';
        });
    }

    // Image switching functionality
    const thumbnails = document.querySelectorAll('.thumbnails-vertical .thumb');

    function switchImage(thumbnail) {
        if (mainImage.src === thumbnail.src) return;

        // Apply fade effect
        mainImage.style.opacity = '0'; // Fade out effect
        setTimeout(() => {
            mainImage.src = thumbnail.src; // Change the main image source
            mainImage.style.opacity = '1'; // Fade in effect
        }, 200);

        // Update active state of thumbnails
        thumbnails.forEach(t => t.classList.remove('active'));
        thumbnail.classList.add('active');
    }

    // Add click handlers to thumbnails
    thumbnails.forEach(thumbnail => {
        thumbnail.addEventListener('click', function () {
            switchImage(this);
        });

        // Optional hover effect: switch image when hovering on a thumbnail
        thumbnail.addEventListener('mouseenter', function () {
            switchImage(this);
        });
    });

    // Initialize first thumbnail as active
    if (thumbnails.length > 0) {
        thumbnails[0].classList.add('active');
        mainImage.src = thumbnails[0].src;
    }

    // Quantity controls
    const quantityInput = document.getElementById('quantity');
    const decreaseBtn = document.getElementById('decrease');
    const increaseBtn = document.getElementById('increase');

    function updateQuantity(delta) {
        const currentVal = parseInt(quantityInput.value) || 1;
        const newVal = Math.max(1, Math.min(currentVal + delta, 10)); // Max 10 items
        quantityInput.value = newVal;
    }

    decreaseBtn?.addEventListener('click', () => updateQuantity(-1));
    increaseBtn?.addEventListener('click', () => updateQuantity(1));

    // Pin code checker
    const pincodeInput = document.getElementById('pincode');
    const checkDeliveryBtn = document.querySelector('.pincode-checker button');

    async function checkDelivery() {
        if (!pincodeInput?.value) return;

        try {
            const response = await fetch('/api/check-delivery/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({ pincode: pincodeInput.value })
            });

            const data = await response.json();
            if (data.success) {
                document.getElementById('delivery-date').textContent = data.delivery_date;
                document.getElementById('delivery-info').classList.remove('hidden');
            }
        } catch (error) {
            NotificationManager.show('Failed to check delivery', 'error');
        }
    }

    checkDeliveryBtn?.addEventListener('click', checkDelivery);

    // Add to cart with loading state
    const addToCartBtn = document.querySelector('.add-to-cart-btn');
    if (addToCartBtn) {
        window.cartManager.setupAddToCartButtons();
    }

    // Dynamic wishlist functionality
    const wishlistBtn = document.querySelector('.wishlist-btn');
    wishlistBtn.addEventListener('click', async function () {
        try {
            const response = await fetch('/toggle-wishlist/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    product_id: addToCartBtn.dataset.productId
                })
            });

            if (response.ok) {
                this.classList.toggle('active');
                const icon = this.querySelector('i');
                icon.classList.toggle('far');
                icon.classList.toggle('fas');
            }
        } catch (error) {
            showNotification('Failed to update wishlist', 'error');
        }
    });

    // Helper functions
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

    function updateCartCount(count) {
        const cartCount = document.querySelector('.cart-count');
        if (cartCount) {
            cartCount.textContent = count;
        }
    }

    function updateCartTotal(total) {
        const cartTotal = document.getElementById('cart-total');
        if (cartTotal) {
            cartTotal.textContent = `₹${total}`;
        }
    }

    // Variant selection functionality
    const variantInputs = document.querySelectorAll('input[name="variant"]');
    const priceDisplay = document.querySelector('.current-price');
    const stockDisplay = document.querySelector('.stock-status');

    function updateProductInfo(variant) {
        // Update price
        priceDisplay.textContent = `₹${variant.dataset.price}`;
        
        // Update stock status
        const stock = parseInt(variant.dataset.stock);
        if (stock <= 0) {
            addToCartBtn.disabled = true;
            addToCartBtn.innerHTML = '<i class="fas fa-times"></i> Out of Stock';
            stockDisplay.className = 'stock-status out_of_stock';
        } else {
            addToCartBtn.disabled = false;
            addToCartBtn.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
            stockDisplay.className = 'stock-status in_stock';
        }

        // Update quantity max
        quantityInput.max = stock;
        if (parseInt(quantityInput.value) > stock) {
            quantityInput.value = stock;
        }
    }

    variantInputs.forEach(input => {
        input.addEventListener('change', function() {
            updateProductInfo(this);
        });
    });

    // Update add to cart functionality
    const originalAddToCart = addToCartBtn.onclick;
    addToCartBtn.onclick = async function(e) {
        e.preventDefault();
        const selectedVariant = document.querySelector('input[name="variant"]:checked');
        if (!selectedVariant) return;

        try {
            const response = await fetch('/api/cart/add/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    productId: this.dataset.productId,
                    variantId: selectedVariant.value,
                    quantity: parseInt(quantityInput.value)
                })
            });
            // ...rest of the add to cart logic...
        } catch (error) {
            console.error('Error:', error);
        }
    };

    // Add to cart functionality
    async function addToCart(productId, productName, price) {
        const quantity = parseInt(document.getElementById('quantity').value) || 1;
        const button = event.target.closest('.add-to-cart-btn');
        
        try {
            // Disable button and show loading state
            button.disabled = true;
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

            const response = await fetch('/api/cart/add/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    product_id: productId,
                    quantity: quantity,
                    variant_id: button.dataset.variantId || null
                })
            });

            const data = await response.json();

            if (response.ok) {
                NotificationManager.show(`Added ${quantity} × ${productName} to cart`, 'success');
                
                // Update cart count if available
                const cartCount = document.querySelector('.cart-count');
                if (cartCount && data.cart_count) {
                    cartCount.textContent = data.cart_count;
                    cartCount.classList.add('pulse');
                    setTimeout(() => cartCount.classList.remove('pulse'), 300);
                }
            } else {
                throw new Error(data.message || 'Failed to add to cart');
            }
        } catch (error) {
            NotificationManager.show(error.message, 'error');
        } finally {
            // Restore button state
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
        }
    }

    // Initialize quantity manager for each quantity selector
    document.querySelectorAll('.quantity-selector').forEach(container => {
        const productId = container.closest('.product-actions')
            .querySelector('.add-to-cart-btn').dataset.productId;
        
        new QuantityManager(container, {
            onChange: (value) => {
                // Update any UI elements that depend on quantity
                updateProductTotal(container, value);
            },
            onUpdate: async (value) => {
                // If this is in a cart, update the server
                if (container.closest('.cart-item')) {
                    await updateCartQuantity(productId, value);
                }
            }
        });
    });

    // Initialize quantity manager with cart state integration
    document.querySelectorAll('.quantity-selector').forEach(container => {
        const productId = container.closest('.product-actions')
            .querySelector('.add-to-cart-btn').dataset.productId;
        
        new QuantityManager(container, {
            onChange: (value) => {
                updateProductTotal(container, value);
            }
        });
    });

    // Subscribe to cart state changes
    window.cartState.subscribe(updateUIFromCartState);

    function updateUIFromCartState(cartData) {
        // Update cart count
        const cartCount = document.querySelector('.cart-count');
        if (cartCount) {
            cartCount.textContent = cartData.total_items;
            cartCount.classList.add('pulse');
            setTimeout(() => cartCount.classList.remove('pulse'), 300);
        }

        // Update cart total
        const cartTotal = document.querySelector('.cart-total');
        if (cartTotal) {
            cartTotal.textContent = `₹${cartData.total_amount}`;
        }

        // Update product quantity if it exists in cart
        const quantityInput = document.querySelector('.quantity-input');
        if (quantityInput && cartData.items) {
            const productId = quantityInput.closest('.product-actions')
                .querySelector('.add-to-cart-btn').dataset.productId;
            
            const cartItem = cartData.items.find(item => item.product_id === productId);
            if (cartItem) {
                quantityInput.value = cartItem.quantity;
            }
        }
    }

    function updateProductTotal(container, quantity) {
        const priceEl = container.closest('.product-actions')
            .querySelector('.current-price');
        if (!priceEl) return;

        const basePrice = parseFloat(priceEl.dataset.basePrice);
        const total = basePrice * quantity;
        
        const totalEl = container.closest('.product-actions')
            .querySelector('.product-total');
        if (totalEl) {
            totalEl.textContent = `₹${total.toFixed(2)}`;
        }
    }

    async function updateCartQuantity(productId, quantity) {
        try {
            const response = await fetch('/api/cart/update/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    product_id: productId,
                    quantity: quantity
                })
            });

            const data = await response.json();
            if (response.ok) {
                // Update cart totals and UI
                updateCartUI(data);
            } else {
                throw new Error(data.message || 'Failed to update cart');
            }
        } catch (error) {
            NotificationManager.show(error.message, 'error');
        }
    }

    function updateCartUI(data) {
        // Update cart count
        const cartCount = document.querySelector('.cart-count');
        if (cartCount) {
            cartCount.textContent = data.total_items;
            cartCount.classList.add('pulse');
            setTimeout(() => cartCount.classList.remove('pulse'), 300);
        }

        // Update cart total
        const cartTotal = document.querySelector('.cart-total');
        if (cartTotal) {
            cartTotal.textContent = `₹${data.total_amount}`;
        }

        // Update item subtotal if in cart
        const cartSubtotal = document.querySelector('.cart-subtotal');
        if (cartSubtotal) {
            cartSubtotal.textContent = `₹${data.subtotal}`;
        }
    }

    // Initialize quantity managers
    document.querySelectorAll('.quantity-selector').forEach(container => {
        new QuantityManager(container);
    });

    function validateAndAddToCart(productId, productName, price) {
        const quantityInput = document.getElementById('quantity');
        const quantity = parseInt(quantityInput.value);
        
        if (isNaN(quantity) || quantity < 1) {
            NotificationManager.show('Please enter a valid quantity', 'error');
            quantityInput.value = 1;
            return;
        }
        
        // If validation passes, proceed with adding to cart
        addToCart(productId, productName, price);
    }

    // Update the quantity input validation
    document.getElementById('quantity').addEventListener('change', function() {
        let value = parseInt(this.value);
        
        if (isNaN(value) || value < 1) {
            value = 1;
            NotificationManager.show('Quantity cannot be less than 1', 'error');
        }
        
        this.value = value;
    });
});
