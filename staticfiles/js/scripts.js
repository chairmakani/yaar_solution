const searchBar = document.getElementById('search-bar-big');
const searchResultsBig = document.getElementById('search-results-big');

async function showSuggestions(query) {
    const trimmedQuery = query.trim();

    searchResultsBig.innerHTML = ''; // Clear previous suggestions

    if (trimmedQuery) {
        try {
            const response = await fetch(`/search-products/?q=${encodeURIComponent(trimmedQuery)}`);
            const data = await response.json();

            if (data.results.length > 0) {
                data.results.forEach(product => {
                    const suggestion = document.createElement('div');
                    suggestion.className = 'suggestion-item';

                    suggestion.innerHTML = `
                        <div class="suggestion-img">
                            <img src="${product.img || '/static/default-product.png'}" alt="${product.name}">
                        </div>
                        <div class="suggestion-details">
                            <h4>${product.name}</h4>
                            <p>${product.description}</p>
                            <span>₹${product.rate}</span>
                        </div>
                    `;

                    suggestion.onclick = () => {
                        searchBar.value = product.name;
                        searchResultsBig.classList.remove('visible');
                    };

                    searchResultsBig.appendChild(suggestion);
                });

                searchResultsBig.classList.add('visible');
            } else {
                const noResult = document.createElement('p');
                noResult.textContent = "No results found";
                searchResultsBig.appendChild(noResult);
                searchResultsBig.classList.add('visible');
            }
        } catch (error) {
            console.error("Error fetching product data:", error);
        }
    } else {
        searchResultsBig.classList.remove('visible');
    }
}

// Hide suggestions when clicking outside the search container
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
        searchResultsBig.classList.remove('visible');
    }
});

document.addEventListener("DOMContentLoaded", () => {
    // Search toggle functionality
    const searchToggle = document.getElementById("search-toggle");
    const searchBar = document.getElementById("search-bar");
    const searchBarMobile = document.getElementById("search-bar-mobile");
    const cancelSearch = document.getElementById("cancel-search");
    const searchResultsMobile = document.getElementById("search-results-mobile");

    if (searchToggle && searchBar) {
        searchToggle.addEventListener("click", () => {
            searchBar.classList.add("visible");
            searchBarMobile?.focus();
        });
    }

    if (cancelSearch && searchBar) {
        cancelSearch.addEventListener("click", () => {
            searchBar.classList.remove("visible");
            if (searchBarMobile) {
                searchBarMobile.value = "";
                searchResultsMobile?.classList.remove("visible");
            }
        });
    }

    // Menu sidebar functionality
    const menuToggle = document.getElementById("menu-toggle");
    const menuSidebar = document.getElementById("menu-sidebar");
    const closeSidebar = document.getElementById("close-sidebar");

    if (menuToggle && menuSidebar) {
        menuToggle.addEventListener("click", () => {
            menuSidebar.classList.add("open");
        });
    }

    if (closeSidebar && menuSidebar) {
        closeSidebar.addEventListener("click", () => {
            menuSidebar.classList.remove("open");
        });

        // Close sidebar when clicking outside
        document.addEventListener("click", (e) => {
            if (!menuSidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                menuSidebar.classList.remove("open");
            }
        });
    }

    // Improved dropdown functionality
    const dropdowns = document.querySelectorAll('.dropdown, .dropdown-ngos');
    
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle') || dropdown.querySelector('a');
        const menu = dropdown.querySelector('.dropdown-menu, .dropdown-menu-ngos');
        let timeoutId;

        if (toggle && menu) {
            dropdown.addEventListener('mouseenter', () => {
                clearTimeout(timeoutId);
                dropdowns.forEach(other => {
                    if (other !== dropdown) {
                        const otherMenu = other.querySelector('.dropdown-menu, .dropdown-menu-ngos');
                        otherMenu?.classList.remove('show');
                    }
                });
                menu.classList.add('show');
            });

            dropdown.addEventListener('mouseleave', () => {
                timeoutId = setTimeout(() => {
                    if (!menu.matches(':hover')) {
                        menu.classList.remove('show');
                    }
                }, 150);
            });
        }
    });

    // Tab switching in sidebar
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.id.replace('-tab', '-content');
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            button.classList.add('active');
            document.getElementById(targetId)?.classList.add('active');
        });
    });

    // Search functionality for small screens
    searchBarMobile.addEventListener("input", async () => {
        const query = searchBarMobile.value.trim();
        searchResultsMobile.innerHTML = "";

        if (query) {
            try {
                const response = await fetch(`/store/api/search-products/?query=${encodeURIComponent(query)}`);
                const data = await response.json();

                if (data.suggestions.length > 0) {
                    data.suggestions.forEach((suggestion) => {
                        const item = document.createElement("div");
                        item.className = "suggestion-item";
                        item.innerHTML = `<a href="${suggestion.url}">${suggestion.name}</a>`;
                        searchResultsMobile.appendChild(item);
                    });
                } else {
                    searchResultsMobile.innerHTML = "<p>No results found</p>";
                }
                searchResultsMobile.classList.add("visible");
            } catch (err) {
                console.error("Error fetching search suggestions:", err);
            }
        } else {
            searchResultsMobile.classList.remove("visible");
        }
    });

    // Close search bar when clicking outside
    document.addEventListener("click", (e) => {
        if (!e.target.closest("#search-bar") && !e.target.closest("#search-toggle")) {
            searchBar.classList.remove("visible");
            searchResultsMobile.classList.remove("visible");
        }
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const searchWrapper = document.querySelector(".search-wrapper");
    const searchToggle = document.getElementById("search-toggle");
    const searchBox = document.getElementById("search-box");
    const searchResults = document.getElementById("search-results");

    searchToggle.addEventListener("click", () => {
        // Toggle the open class to expand or collapse the search box
        searchWrapper.classList.toggle("open");

        // Focus the input field if it's expanded
        if (searchWrapper.classList.contains("open")) {
            searchBox.focus();
        } else {
            searchBox.blur();
        }
    });

    searchBox.addEventListener("input", async () => {
        const query = searchBox.value.trim();
        searchResults.innerHTML = ''; // Clear previous suggestions

        if (query) {
            try {
                const response = await fetch(`/store/api/search-products/?query=${encodeURIComponent(query)}`);
                const data = await response.json();

                if (data.suggestions.length > 0) {
                    data.suggestions.forEach(suggestion => {
                        const suggestionItem = document.createElement('div');
                        suggestionItem.className = 'suggestion-item';
                        suggestionItem.innerHTML = `
                            <a href="${suggestion.url}">
                                <h4>${suggestion.name}</h4>
                                <p>${suggestion.description}</p>
                            </a>
                        `;
                        searchResults.appendChild(suggestionItem);
                    });
                    searchResults.classList.add('visible');
                } else {
                    const noResult = document.createElement('p');
                    noResult.textContent = "No results found";
                    searchResults.appendChild(noResult);
                    searchResults.classList.add('visible');
                }
            } catch (error) {
                console.error("Error fetching search suggestions:", error);
            }
        } else {
            searchResults.classList.remove('visible');
        }
    });

    // Hide suggestions when clicking outside the search container
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            searchResults.classList.remove('visible');
        }
    });

    // Sidebar Toggle
    const menuToggle = document.getElementById("menu-toggle");
    const menuSidebar = document.getElementById("menu-sidebar");
    const closeSidebar = document.getElementById("close-sidebar");

    if (menuToggle && menuSidebar && closeSidebar) {
        menuToggle.addEventListener("click", () => {
            menuSidebar.classList.toggle("open");
        });

        closeSidebar.addEventListener("click", () => {
            menuSidebar.classList.remove("open");
        });
    }

    // Tab Switching
    const categoriesTab = document.getElementById("categories-tab");
    const profileTab = document.getElementById("profile-tab");
    const categoriesContent = document.getElementById("categories-content");
    const profileContent = document.getElementById("profile-content");

    function switchTab(tabName) {
        if (tabName === "categories") {
            categoriesTab.classList.add("active");
            profileTab.classList.remove("active");
            categoriesContent.classList.add("active");
            profileContent.classList.remove("active");
        } else {
            profileTab.classList.add("active");
            categoriesTab.classList.remove("active");
            profileContent.classList.add("active");
            categoriesContent.classList.remove("active");
        }
    }

    if (categoriesTab && profileTab) {
        categoriesTab.addEventListener("click", () => switchTab("categories"));
        profileTab.addEventListener("click", () => switchTab("profile"));
    }

    // Simplified dropdown handling
    function handleDropdown(element, show = true) {
        const menu = element.querySelector('.dropdown-menu') || 
                    element.querySelector('.dropdown-menu-ngos') ||
                    element.querySelector('.sub-dropdown-menu');
        const icon = element.querySelector('.dropdown-icon');
        
        if (menu) {
            if (show) {
                menu.classList.add('show');
                if (icon) icon.innerHTML = '&#x25B2;';
            } else {
                menu.classList.remove('show');
                if (icon) icon.innerHTML = '&#x25BC;';
            }
        }
    }

    // Handle all dropdowns
    document.querySelectorAll('.dropdown, .dropdown-ngos').forEach(dropdown => {
        let timeoutId;

        dropdown.addEventListener('mouseenter', () => {
            clearTimeout(timeoutId);
            // Hide other dropdowns
            document.querySelectorAll('.show').forEach(menu => {
                if (!dropdown.contains(menu)) {
                    menu.classList.remove('show');
                }
            });
            handleDropdown(dropdown, true);
        });

        dropdown.addEventListener('mouseleave', () => {
            timeoutId = setTimeout(() => {
                if (!dropdown.matches(':hover')) {
                    handleDropdown(dropdown, false);
                }
            }, 300);
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown, .dropdown-ngos')) {
            document.querySelectorAll('.show').forEach(menu => {
                menu.classList.remove('show');
                const icon = menu.parentElement.querySelector('.dropdown-icon');
                if (icon) icon.innerHTML = '&#x25BC;';
            });
        }
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const searchBoxBig = document.getElementById('search-box-big');
    const searchBoxMobile = document.getElementById('search-bar-mobile');
    const searchResultsBig = document.getElementById('search-results-big');
    const searchResultsMobile = document.getElementById('search-results-mobile');

    async function performSearch(query, resultsContainer) {
        resultsContainer.innerHTML = '';

        if (query.trim()) {
            try {
                // Update the URL to match the correct endpoint from urls.py
                const response = await fetch(`/api/search-products/?query=${encodeURIComponent(query)}`);
                const data = await response.json();

                if (data.products && data.products.length > 0) {
                    data.products.forEach(product => {
                        const suggestionItem = document.createElement('div');
                        suggestionItem.className = 'suggestion-item';
                        
                        // Create the HTML for the suggestion
                        suggestionItem.innerHTML = `
                            <div class="suggestion-img">
                                <img src="${product.image || '/static/images/no-image.jpg'}" alt="${product.name}">
                            </div>
                            <div class="suggestion-details">
                                <h4>${product.name}</h4>
                                <p>${product.description ? product.description.substring(0, 50) + '...' : ''}</p>
                                <span>₹${product.price}</span>
                            </div>
                        `;

                        // Add click handler
                        suggestionItem.addEventListener('click', () => {
                            if (product.url) {
                                window.location.href = product.url;
                            }
                        });

                        resultsContainer.appendChild(suggestionItem);
                    });

                    resultsContainer.classList.add('visible');
                } else {
                    // Enhanced no results message
                    const noResultsDiv = document.createElement('div');
                    noResultsDiv.className = 'no-results-message';
                    noResultsDiv.innerHTML = `
                        <div class="no-results-content">
                            <i class="fas fa-search-minus"></i>
                            <h3>No Products Found</h3>
                            <p>We couldn't find any products matching "${query}"</p>
                            <p class="suggestion-text">Try:</p>
                            <ul>
                                <li>Checking your spelling</li>
                                <li>Using more general terms</li>
                                <li>Using fewer keywords</li>
                            </ul>
                        </div>
                    `;
                    resultsContainer.appendChild(noResultsDiv);
                    resultsContainer.classList.add('visible');
                }
            } catch (error) {
                console.error('Search error:', error);
                const errorDiv = document.createElement('div');
                errorDiv.className = 'search-error-message';
                errorDiv.innerHTML = `
                    <div class="error-content">
                        <i class="fas fa-exclamation-circle"></i>
                        <h3>Oops! Something went wrong</h3>
                        <p>Please try again later</p>
                    </div>
                `;
                resultsContainer.appendChild(errorDiv);
                resultsContainer.classList.add('visible');
            }
        } else {
            resultsContainer.classList.remove('visible');
        }
    }

    // Debounce function to limit API calls
    function debounce(func, wait) {
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

    // Add event listeners for both search boxes
    const debouncedSearch = debounce((query, resultsContainer) => {
        performSearch(query, resultsContainer);
    }, 300);

    if (searchBoxBig) {
        searchBoxBig.addEventListener('input', (e) => {
            debouncedSearch(e.target.value, searchResultsBig);
        });
    }

    if (searchBoxMobile) {
        searchBoxMobile.addEventListener('input', (e) => {
            debouncedSearch(e.target.value, searchResultsMobile);
        });
    }

    // Close search results when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container') && !e.target.closest('.search-bar-container')) {
            searchResultsBig?.classList.remove('visible');
            searchResultsMobile?.classList.remove('visible');
        }
    });

    // Improved dropdown handling
    const dropdowns = document.querySelectorAll('.dropdown');
    
    dropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        const menu = dropdown.querySelector('.dropdown-menu');
        let timeoutId;

        if (toggle && menu) {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                const isActive = dropdown.classList.contains('active');
                
                // Close all other dropdowns
                dropdowns.forEach(other => {
                    if (other !== dropdown) {
                        other.classList.remove('active');
                        const otherMenu = other.querySelector('.dropdown-menu');
                        if (otherMenu) otherMenu.classList.remove('show');
                    }
                });

                // Toggle current dropdown
                dropdown.classList.toggle('active');
                menu.classList.toggle('show');
            });

            // Handle hover states
            dropdown.addEventListener('mouseenter', () => {
                clearTimeout(timeoutId);
                if (!dropdown.classList.contains('active')) {
                    dropdown.classList.add('active');
                    menu.classList.add('show');
                }
            });

            dropdown.addEventListener('mouseleave', () => {
                timeoutId = setTimeout(() => {
                    dropdown.classList.remove('active');
                    menu.classList.remove('show');
                }, 200);
            });
        }
    });
});

// Cart Functionality
document.addEventListener('DOMContentLoaded', function() {
    const cartTrigger = document.getElementById('cart-trigger');
    const miniCart = document.getElementById('mini-cart');
    const cartCount = document.getElementById('cart-count');
    const cartTotal = document.getElementById('cart-total');
    const miniCartItems = document.getElementById('mini-cart-items');

    // Toggle mini cart
    cartTrigger.addEventListener('click', () => {
        miniCart.classList.toggle('active');
    });

    // Close mini cart when clicking outside
    document.addEventListener('click', (e) => {
        if (!cartTrigger.contains(e.target) && !miniCart.contains(e.target)) {
            miniCart.classList.remove('active');
        }
    });

    // Add to cart function
    window.addToCart = async function(productId) {
        try {
            const response = await fetch('/api/cart/add/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({ productId, quantity: 1 })
            });

            const data = await response.json();
            if (data.success) {
                // Update cart display
                updateCart({
                    total_items: data.cart.total_items,
                    total_amount: data.cart.total_amount,
                    items: data.cart.items,
                    message: 'Item added to cart successfully'
                });
            } else {
                showCartNotification(data.message || 'Failed to add item to cart', 'error');
            }
        } catch (error) {
            console.error('Error adding to cart:', error);
            showCartNotification('Failed to add item to cart', 'error');
        }
    };

    // Update cart display
    function updateCart(cartData) {
        // Dispatch custom event with cart data
        const event = new CustomEvent('cartUpdated', {
            detail: cartData
        });
        document.dispatchEvent(event);

        // Show notification
        showCartNotification(cartData.message || 'Cart updated successfully', 'success');
    }

    function showCartNotification(message, type = 'success') {
        const notificationContainer = document.getElementById('cart-notifications');
        const notification = document.createElement('div');
        notification.className = `cart-notification ${type}`;
        
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
            </div>
            <div class="notification-content">
                <p class="notification-message">${message}</p>
            </div>
        `;

        notificationContainer.appendChild(notification);

        // Trigger animation
        setTimeout(() => notification.classList.add('show'), 100);

        // Remove notification after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Notification function
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `cart-notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    // Animate cart icon
    function animateCartIcon() {
        cartCount.style.animation = 'none';
        cartCount.offsetHeight; // Trigger reflow
        cartCount.style.animation = 'cartBounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    }

    // Get CSRF token
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
});

// Add to cart function
async function addToCart(productId) {
    try {
        const response = await fetch('/api/cart/add/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ productId, quantity: 1 })
        });

        const data = await response.json();
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

            // Show success notification
            window.showNotification('Item added to cart successfully', 'success');
        } else {
            window.showNotification(data.message || 'Failed to add item', 'error');
        }
    } catch (error) {
        console.error('Error adding to cart:', error);
        window.showNotification('Error adding item to cart', 'error');
    }
}

// Update quantity function
async function updateQuantity(itemId, newQuantity) {
    if (newQuantity < 1) return;
    
    try {
        const response = await fetch('/api/cart/update/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ itemId, quantity: newQuantity })
        });

        const data = await response.json();
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
        }
    } catch (error) {
        console.error('Error updating quantity:', error);
        window.showNotification('Error updating cart', 'error');
    }
}

// Remove from cart function
async function removeFromCart(itemId) {
    try {
        const response = await fetch('/api/cart/remove/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ itemId })
        });

        const data = await response.json();
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
            
            window.showNotification('Item removed from cart', 'success');
        }
    } catch (error) {
        console.error('Error removing item:', error);
        window.showNotification('Error removing item from cart', 'error');
    }
}

// Get CSRF token function
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

// Make functions globally available
window.addToCart = addToCart;
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;

// Enhanced search container functionality
document.addEventListener('DOMContentLoaded', () => {
    const searchContainer = document.querySelector('.search-container');
    const searchForm = document.querySelector('.search-form');
    const searchInput = document.querySelector('.search-form input[type="text"]');
    const searchResults = document.querySelector('.search-results');
    let searchTimeout;

    // Handle input focus
    searchInput.addEventListener('focus', () => {
        searchContainer.classList.add('active');
        searchForm.classList.add('active');
        if (searchInput.value.trim().length > 0) {
            searchResults.classList.add('visible');
        }
    });

    // Handle input changes
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();

        if (query.length > 0) {
            searchTimeout = setTimeout(() => {
                showSuggestions(query);
            }, 300);
        } else {
            searchResults.classList.remove('visible');
        }
    });

    // Handle clicks outside search container
    document.addEventListener('click', (e) => {
        if (!searchContainer.contains(e.target)) {
            searchContainer.classList.remove('active');
            searchForm.classList.remove('active');
            searchResults.classList.remove('visible');
        }
    });

    // Prevent form submission on enter
    searchForm.addEventListener('submit', (e) => {
        const query = searchInput.value.trim();
        if (!query) {
            e.preventDefault();
        }
    });

    // Handle suggestion clicks
    searchResults.addEventListener('click', (e) => {
        const suggestionItem = e.target.closest('.suggestion-item');
        if (suggestionItem) {
            const productUrl = suggestionItem.dataset.url;
            if (productUrl) {
                window.location.href = productUrl;
            }
        }
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const searchContainer = document.querySelector('.search-container');
    const searchInput = searchContainer.querySelector('input[type="text"]');

    // Make entire container clickable
    searchContainer.addEventListener('click', () => {
        searchInput.focus();
    });

    // Prevent input click from bubbling
    searchInput.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    /* ...existing event handlers... */
});

document.addEventListener('DOMContentLoaded', () => {
    const searchContainer = document.querySelector('.search-container');
    const searchIcon = searchContainer.querySelector('.search-icon');
    const searchInput = searchContainer.querySelector('input[type="text"]');

    // Handle icon hover
    searchIcon.addEventListener('mouseenter', () => {
        searchInput.focus();
    });

    // Handle focus/blur events
    searchInput.addEventListener('focus', () => {
        searchContainer.classList.add('active');
    });

    searchInput.addEventListener('blur', (e) => {
        if (!searchContainer.contains(e.relatedTarget)) {
            searchContainer.classList.remove('active');
        }
    });

    /* ...existing code... */
});

// Enhanced Mobile Search Handler
document.addEventListener('DOMContentLoaded', () => {
    const searchBar = document.getElementById('search-bar');
    const searchInput = document.getElementById('search-bar-mobile');
    const cancelBtn = document.getElementById('cancel-search');
    const searchToggle = document.getElementById('search-toggle');
    const searchForm = document.getElementById('search-form-mobile');
    
    let lastScrollPosition = 0;
    let isSearchActive = false;

    // Toggle search bar
    searchToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        searchBar.classList.add('active');
        searchInput.focus();
        isSearchActive = true;
        lastScrollPosition = window.pageYOffset;
        document.body.style.overflow = 'hidden';
    });

    // Handle search form submission
    searchForm.addEventListener('submit', (e) => {
        const query = searchInput.value.trim();
        if (!query) {
            e.preventDefault();
            searchInput.classList.add('shake');
            setTimeout(() => searchInput.classList.remove('shake'), 500);
        }
    });

    // Close search bar
    cancelBtn.addEventListener('click', () => {
        closeSearchBar();
    });

    // Close search when clicking outside
    document.addEventListener('click', (e) => {
        if (isSearchActive && !e.target.closest('#search-bar') && !e.target.closest('#search-toggle')) {
            closeSearchBar();
        }
    });

    // Handle escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && isSearchActive) {
            closeSearchBar();
        }
    });

    function closeSearchBar() {
        searchBar.classList.remove('active');
        searchInput.value = '';
        document.body.style.overflow = '';
        isSearchActive = false;
        
        const searchResults = document.getElementById('search-results-mobile');
        if (searchResults) {
            searchResults.classList.remove('visible');
        }

        // Add closing animation
        searchBar.style.animation = 'slideSearchUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards';
        setTimeout(() => {
            searchBar.style.animation = '';
        }, 300);
    }

    // Add smooth scroll restoration when closing search
    function restoreScroll() {
        window.scrollTo({
            top: lastScrollPosition,
            behavior: 'smooth'
        });
    }
});

