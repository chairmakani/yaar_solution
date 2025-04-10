// Remove all previous toggle view code and replace with this:
document.addEventListener('DOMContentLoaded', function() {
    const toggleButton = document.getElementById("toggle-view");
    const productGrid = document.getElementById("product-grid");
    const gridIcon = toggleButton.querySelector(".fa-th-large");
    const listIcon = toggleButton.querySelector(".fa-list");

    function toggleView(e) {
        e.preventDefault();
        const products = Array.from(productGrid.children);

        // Fade out products
        products.forEach(product => {
            product.style.opacity = '0';
            product.style.transform = 'scale(0.95)';
        });

        // Switch view after fade out
        setTimeout(() => {
            // Toggle grid/list classes
            productGrid.classList.toggle("grid-view");
            productGrid.classList.toggle("list-view");

            // Toggle icons active state
            gridIcon.classList.toggle("active");
            listIcon.classList.toggle("active");

            // Fade in products
            products.forEach((product, index) => {
                setTimeout(() => {
                    product.style.transition = 'all 0.3s ease';
                    product.style.opacity = '1';
                    product.style.transform = 'scale(1)';
                }, index * 50);
            });
        }, 300);
    }

    toggleButton.addEventListener("click", toggleView);
});

// Sorting Products
document.getElementById("sort-options").addEventListener("change", (e) => {
  const sortValue = e.target.value;
  sortProducts(sortValue);
});

function sortProducts(option) {
    const productContainer = document.getElementById("product-grid");
    const productsArray = Array.from(productContainer.children);

    // Add exit animation
    productsArray.forEach((product, index) => {
        product.style.transition = `all 0.3s ease ${index * 0.05}s`;
        product.style.opacity = '0';
        product.style.transform = 'translateY(20px)';
    });

    setTimeout(() => {
        // Sort based on selected option
        productsArray.sort((a, b) => {
            switch(option) {
                case 'price-low-high':
                    return parseFloat(a.dataset.price) - parseFloat(b.dataset.price);
                case 'price-high-low':
                    return parseFloat(b.dataset.price) - parseFloat(a.dataset.price);
                case 'name-a-z':
                    return a.dataset.name.localeCompare(b.dataset.name);
                case 'name-z-a':
                    return b.dataset.name.localeCompare(a.dataset.name);
                case 'newest':
                    return new Date(b.dataset.dateAdded) - new Date(a.dataset.dateAdded);
                case 'popularity':
                    return parseInt(b.dataset.popularity) - parseInt(a.dataset.popularity);
                default:
                    return 0;
            }
        });

        // Clear container
        productContainer.innerHTML = '';

        // Add entrance animation
        productsArray.forEach((product, index) => {
            setTimeout(() => {
                product.style.opacity = '0';
                product.style.transform = 'translateY(20px)';
                productContainer.appendChild(product);

                // Trigger reflow
                product.offsetHeight;

                // Add entrance animation
                requestAnimationFrame(() => {
                    product.style.transition = `all 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.1}s`;
                    product.style.opacity = '1';
                    product.style.transform = 'translateY(0)';
                });
            }, index * 50);
        });
    }, 300);
}

// Add hover effect to sort options
const sortSelect = document.getElementById("sort-options");
sortSelect.addEventListener('mouseover', (e) => {
    if (e.target.tagName === 'OPTION') {
        e.target.style.backgroundColor = '#f0f0f0';
    }
});

sortSelect.addEventListener('mouseout', (e) => {
    if (e.target.tagName === 'OPTION') {
        e.target.style.backgroundColor = '';
    }
});

// Filter by Price

// Get elements
const minPriceInput = document.getElementById("min-price");
const maxPriceInput = document.getElementById("max-price");
const minPriceDisplay = document.getElementById("min-price-display");
const maxPriceDisplay = document.getElementById("max-price-display");

document.addEventListener('DOMContentLoaded', function () {
    const priceSlider = document.getElementById('price-slider');
    const maxProductPrice = parseInt(priceSlider.getAttribute('data-max-price'));

    if (priceSlider) {
        noUiSlider.create(priceSlider, {
            start: [parseInt(minPriceInput.value), parseInt(maxPriceInput.value)],
            connect: true,
            range: {
                'min': 0,
                'max': maxProductPrice
            },
            tooltips: [true, true],
            format: {
                to: function (value) {
                    return Math.round(value);
                },
                from: function (value) {
                    return Math.round(value);
                }
            }
        });

        priceSlider.noUiSlider.on('update', function (values, handle) {
            const value = values[handle];
            if (handle === 0) {
                minPriceInput.value = value;
                minPriceDisplay.innerText = value;
            } else {
                maxPriceInput.value = value;
                maxPriceDisplay.innerText = value;
            }
        });
    }
});

// Enhanced Price Slider Implementation
document.addEventListener('DOMContentLoaded', function () {
    const priceSlider = document.getElementById('price-slider');
    if (priceSlider) {
        const maxPrice = parseInt(priceSlider.getAttribute('data-max-price'));
        const minPriceDisplay = document.getElementById('min-price-display');
        const maxPriceDisplay = document.getElementById('max-price-display');
        const minPriceInput = document.getElementById('min-price');
        const maxPriceInput = document.getElementById('max-price');
        let updateTimeout;

        noUiSlider.create(priceSlider, {
            start: [
                parseInt(minPriceInput.value || 0),
                parseInt(maxPriceInput.value || maxPrice)
            ],
            connect: true,
            range: {
                'min': 0,
                'max': maxPrice
            },
            step: 1,
            animate: true,
            animationDuration: 300,
            behaviour: 'smooth-steps',
            format: {
                to: function (value) {
                    return '₹' + Math.round(value);
                },
                from: function (value) {
                    return Number(value.replace('₹', ''));
                }
            }
        });

        // Throttled update function
        function throttledUpdate(values, handle) {
            clearTimeout(updateTimeout);
            updateTimeout = setTimeout(() => {
                const value = values[handle].replace('₹', '');
                const display = handle === 0 ? minPriceDisplay : maxPriceDisplay;
                const input = handle === 0 ? minPriceInput : maxPriceInput;

                // Smooth animation for display update
                animateValue(display, parseInt(display.innerText), parseInt(value), 200);
                input.value = value;
            }, 10);
        }

        // Smooth value animation
        function animateValue(element, start, end, duration) {
            element.style.transform = 'scale(1.1)';
            const range = end - start;
            const startTime = performance.now();

            function updateValue(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);

                // Easing function for smooth animation
                const easeOutQuad = 1 - Math.pow(1 - progress, 2);
                const current = Math.round(start + (range * easeOutQuad));

                element.innerText = current;

                if (progress < 1) {
                    requestAnimationFrame(updateValue);
                } else {
                    element.style.transform = 'scale(1)';
                }
            }

            requestAnimationFrame(updateValue);
        }

        // Handle slider events
        priceSlider.noUiSlider.on('slide', throttledUpdate);

        // Add smooth drag animation
        priceSlider.noUiSlider.on('start', function() {
            priceSlider.classList.add('sliding');
        });

        priceSlider.noUiSlider.on('end', function() {
            priceSlider.classList.remove('sliding');
        });
    }
});

// Pagination and Initial Loading
const productsPerPage = 9;
let currentPage = parseInt(document.getElementById("page-info").dataset.currentPage, 10);
const totalPages = parseInt(document.getElementById("page-info").dataset.totalPages, 10);

// Populate Products
function populateProducts() {
  // This function can be used to dynamically load products if needed
  updatePagination();
}

// Update Pagination Information
function updatePagination() {
  document.getElementById("page-info").textContent = `Page ${currentPage} of ${totalPages}`;
  document.getElementById("prev-page").disabled = currentPage === 1;
  document.getElementById("next-page").disabled = currentPage === totalPages;
}

// Pagination Event Listeners
document.getElementById("prev-page").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    updatePage();
  }
});

document.getElementById("next-page").addEventListener("click", () => {
  if (currentPage < totalPages) {
    currentPage++;
    updatePage();
  }
});

function updatePage() {
  const minPrice = minPriceInput.value;
  const maxPrice = maxPriceInput.value;
  const sortOption = document.getElementById("sort-options").value;
  window.location.search = `?page=${currentPage}&min_price=${minPrice}&max_price=${maxPrice}&sort=${sortOption}`;
}

// Initial Load
populateProducts();

// Toggle sort options for small screens
const sortContainer = document.querySelector('.sort-container');
const sortDropdown = document.querySelector('.sort-container .dropdown');

sortContainer.addEventListener('click', () => {
  if (window.innerWidth <= 767) {
    sortDropdown.classList.toggle('show');
  }
});

// Add to Cart functionality
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const productId = this.dataset.productId;
            const productName = this.dataset.productName;
            const productPrice = this.dataset.productPrice;

            // Show loading state
            this.disabled = true;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

            // Send request to add item to cart
            fetch('/api/cart/add/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    productId: productId,
                    quantity: 1
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Show success message
                    this.innerHTML = '<i class="fas fa-check"></i> Added!';
                    // Update cart count if you have a cart counter
                    if (data.cart && data.cart.itemCount) {
                        updateCartCount(data.cart.itemCount);
                    }
                } else {
                    throw new Error('Failed to add to cart');
                }
            })
            .catch(error => {
                // Show error state
                this.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
                console.error('Error:', error);
            })
            .finally(() => {
                // Reset button after 2 seconds
                setTimeout(() => {
                    this.disabled = false;
                    this.innerHTML = '<i class="fas fa-cart-plus"></i> Add to Cart';
                }, 2000);
            });
        });
    });
});

// Helper function to get CSRF token
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Function to update cart count in UI
function updateCartCount(count) {
    const cartCountElement = document.querySelector('.cart-count');
    if (cartCountElement) {
        cartCountElement.textContent = count;
        cartCountElement.classList.add('bounce');
        setTimeout(() => cartCountElement.classList.remove('bounce'), 1000);
    }
}

// Cart Update Functionality
document.addEventListener('DOMContentLoaded', function() {
    const cartCount = document.getElementById('cart-count');
    const cartTotal = document.getElementById('cart-total');

    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', async function(e) {
            e.preventDefault();
            const productId = this.dataset.productId;
            const productPrice = parseFloat(this.dataset.productPrice);

            // Show loading state
            this.disabled = true;
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

            try {
                const response = await fetch('/api/cart/add/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken')
                    },
                    body: JSON.stringify({
                        productId: productId,
                        quantity: 1
                    })
                });

                const data = await response.json();

                if (data.success) {
                    // Update cart count with bounce animation
                    updateCartCount(data.cart.itemCount);
                    
                    // Update cart total with fade animation
                    updateCartTotal(data.cart.total);
                    
                    // Show success state
                    this.innerHTML = '<i class="fas fa-check"></i> Added!';
                    
                    // Show notification
                    showCartNotification('Item added to cart!');
                } else {
                    throw new Error('Failed to add to cart');
                }
            } catch (error) {
                console.error('Error:', error);
                this.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
                showCartNotification('Failed to add item', 'error');
            } finally {
                // Reset button after delay
                setTimeout(() => {
                    this.disabled = false;
                    this.innerHTML = originalText;
                }, 2000);
            }
        });
    });

    // Helper function to update cart count
    function updateCartCount(count) {
        const oldCount = parseInt(cartCount.textContent);
        cartCount.textContent = count;
        
        // Add bounce animation
        cartCount.classList.remove('bounce');
        void cartCount.offsetWidth; // Trigger reflow
        cartCount.classList.add('bounce');
        
        // Animate cart icon if count increased
        if (count > oldCount) {
            const cartIcon = document.querySelector('.cart-icon i');
            cartIcon.style.transform = 'scale(1.2)';
            setTimeout(() => {
                cartIcon.style.transform = 'scale(1)';
            }, 200);
        }
    }

    // Helper function to update cart total
    function updateCartTotal(total) {
        const totalElement = cartTotal;
        
        // Fade out
        totalElement.style.opacity = '0';
        
        setTimeout(() => {
            totalElement.textContent = `₹${total.toFixed(2)}`;
            
            // Fade in
            totalElement.style.opacity = '1';
        }, 200);
    }

    // Cart notification function
    function showCartNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `cart-notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Remove notification
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
});

// Improved Add to Cart functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get CSRF token from cookie
    function getCSRFToken() {
        const name = 'csrftoken';
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

    // Initialize cart elements
    const cartCount = document.getElementById('cart-count');
    const cartTotal = document.getElementById('cart-total');
    const notificationsContainer = document.getElementById('cart-notifications');

    // Add to cart click handler
    document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', async function(e) {
            e.preventDefault();
            
            // Get product details from data attributes
            const productId = this.getAttribute('data-product-id');
            const productName = this.getAttribute('data-product-name');
            const productPrice = this.getAttribute('data-product-price');

            // Disable button and show loading state
            this.disabled = true;
            const originalText = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';

            try {
                const response = await fetch('/cart/add/', {  // Adjust URL as needed
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCSRFToken(),
                    },
                    body: JSON.stringify({
                        product_id: productId,
                        quantity: 1
                    })
                });

                const data = await response.json();

                if (data.success) {
                    // Update cart display
                    updateCartDisplay(data.cart);
                    
                    // Show success notification
                    showNotification('Item added to cart successfully', 'success');
                    
                    // Update button to show success
                    this.innerHTML = '<i class="fas fa-check"></i> Added';
                    setTimeout(() => {
                        this.innerHTML = originalText;
                        this.disabled = false;
                    }, 2000);
                } else {
                    throw new Error(data.message || 'Failed to add item to cart');
                }
            } catch (error) {
                console.error('Error adding to cart:', error);
                showNotification(error.message || 'Error adding item to cart', 'error');
                this.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
                setTimeout(() => {
                    this.innerHTML = originalText;
                    this.disabled = false;
                }, 2000);
            }
        });
    });

    // Update cart display function
    function updateCartDisplay(cartData) {
        if (cartCount) {
            cartCount.textContent = cartData.total_items || 0;
            cartCount.classList.remove('bounce');
            void cartCount.offsetWidth; // Trigger reflow
            cartCount.classList.add('bounce');
        }
        
        if (cartTotal) {
            cartTotal.style.opacity = '0';
            setTimeout(() => {
                cartTotal.textContent = `₹${(cartData.total_amount || 0).toFixed(2)}`;
                cartTotal.style.opacity = '1';
            }, 200);
        }
    }

    // Show notification function
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `cart-notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            <span>${message}</span>
        `;
        
        notificationsContainer.appendChild(notification);
        
        // Trigger animation
        setTimeout(() => notification.classList.add('show'), 10);
        
        // Remove notification
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const sortForm = document.getElementById('sort-form');
    const sortSelect = document.getElementById('sort-options');

    // Handle sort change
    sortSelect.addEventListener('change', function(e) {
        e.preventDefault();
        
        // Show loading animation
        const products = document.querySelector('.products');
        products.style.opacity = '0.5';
        products.style.pointerEvents = 'none';

        // Get all current URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        
        // Update sort parameter
        urlParams.set('sort', this.value);

        // Submit form with all parameters
        setTimeout(() => {
            sortForm.submit();
        }, 300);
    });
});

document.addEventListener('DOMContentLoaded', function() {
    const sortForm = document.getElementById('sort-form');
    const sortSelect = document.getElementById('sort-options');

    sortSelect.addEventListener('change', function(e) {
        // Get current URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        
        // Update or add the sort parameter
        urlParams.set('sort', this.value);
        
        // Keep the current page if it exists
        const currentPage = urlParams.get('page');
        if (currentPage) {
            urlParams.set('page', currentPage);
        }
        
        // Keep price filter values if they exist
        const minPrice = urlParams.get('min_price');
        const maxPrice = urlParams.get('max_price');
        if (minPrice) urlParams.set('min_price', minPrice);
        if (maxPrice) urlParams.set('max_price', maxPrice);

        // Redirect with new parameters
        window.location.search = urlParams.toString();
    });

    // Add loading animation
    sortSelect.addEventListener('change', function() {
        document.querySelector('.products').classList.add('loading');
    });
});

// Enhanced sort handling
document.addEventListener('DOMContentLoaded', function() {
    const sortForm = document.getElementById('sort-form');
    const sortSelect = document.getElementById('sort-options');
    const productsContainer = document.querySelector('.products');
    
    if (sortSelect) {
        sortSelect.addEventListener('change', async function(e) {
            e.preventDefault();
            
            // Add loading state
            productsContainer.classList.add('sorting');
            sortSelect.disabled = true;
            
            // Get current URL parameters
            const urlParams = new URLSearchParams(window.location.search);
            urlParams.set('sort', this.value);
            
            try {
                // Fade out current products
                productsContainer.style.opacity = '0';
                productsContainer.style.transform = 'translateY(10px)';
                
                // Small delay for animation
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // Submit form
                window.location.search = urlParams.toString();
                
            } catch (error) {
                console.error('Sort error:', error);
                NotificationManager.show('Error applying sort', 'error');
                
                // Reset on error
                productsContainer.classList.remove('sorting');
                sortSelect.disabled = false;
                productsContainer.style.opacity = '1';
                productsContainer.style.transform = 'translateY(0)';
            }
        });
        
        // Add hover effect to select
        sortSelect.addEventListener('mouseover', function() {
            this.parentElement.classList.add('hover');
        });
        
        sortSelect.addEventListener('mouseout', function() {
            this.parentElement.classList.remove('hover');
        });
        
        // Animate products on page load
        window.addEventListener('load', function() {
            const products = document.querySelectorAll('.product-card');
            products.forEach((product, index) => {
                setTimeout(() => {
                    product.style.opacity = '1';
                    product.style.transform = 'translateY(0)';
                }, index * 100);
            });
        });
    }
});