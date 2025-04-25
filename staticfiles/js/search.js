// Add interactivity and animations
document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.product-card');

    // Add hover effect for product cards
    cards.forEach(card => {
        card.addEventListener('mouseover', () => {
            card.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.2)';
        });
        card.addEventListener('mouseout', () => {
            card.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        });
    });

    // Initialize animations for products
    const productCards = document.querySelectorAll('.product-card');
    
    // Intersection Observer for fade-in animation
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    // Apply initial styles and observe
    productCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'all 0.5s ease-out';
        observer.observe(card);
    });

    // Search form enhancement
    const searchForm = document.querySelector('.search-form');
    const searchInput = searchForm.querySelector('input');
    
    searchInput.addEventListener('focus', () => {
        searchForm.style.transform = 'scale(1.02)';
    });

    searchInput.addEventListener('blur', () => {
        searchForm.style.transform = 'scale(1)';
    });

    // Add loading state to search
    searchForm.addEventListener('submit', (e) => {
        const button = searchForm.querySelector('button');
        button.innerHTML = 'Searching...';
        button.style.opacity = '0.8';
    });
});

// Add search suggestions functionality
document.addEventListener('DOMContentLoaded', () => {
    // Update selectors to match template IDs
    const searchInputs = ['search-box-big', 'mobile-search-input'].map(id => document.getElementById(id));
    const suggestionsContainers = ['search-suggestions-big', 'search-suggestions-mobile'].map(id => document.getElementById(id));
    const minChars = 2; // Minimum characters before triggering suggestions
    const debounceDelay = 300; // Debounce delay in milliseconds

    // Debounce function
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

    // Fetch suggestions from API
    async function fetchSuggestions(query) {
        try {
            const response = await fetch(`/api/search/suggestions/?q=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            // Return null only if there are no suggestions in any category
            return (!data.categories?.length && !data.products?.length && !data.popular?.length) ? null : data;
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            return null;
        }
    }

    // Render suggestions
    function renderSuggestions(suggestions, container, query) {
        if (!container) return;

        let html = '';

        // Check if we have valid suggestions data
        if (suggestions && Object.keys(suggestions).length > 0) {
            // Categories section
            if (suggestions.categories?.length > 0) {
                html += `
                    <div class="suggestion-group">
                        <div class="suggestion-category">Categories</div>
                        ${suggestions.categories.map(category => `
                            <a href="/category/${category.id}/" class="suggestion-item">
                                <i class="fas fa-folder"></i>
                                <span>${highlightMatch(category.name, query)}</span>
                                <span class="suggestion-count">(${category.product_count})</span>
                            </a>
                        `).join('')}
                    </div>
                `;
            }

            // Products section
            if (suggestions.products?.length > 0) {
                html += `
                    <div class="suggestion-group">
                        <div class="suggestion-category">Products</div>
                        ${suggestions.products.map(product => `
                            <a href="/product/${product.id}/" class="suggestion-item">
                                <div class="suggestion-image">
                                    <img src="${product.image_url || '/static/images/no-image.jpg'}" alt="${product.name}">
                                </div>
                                <div class="suggestion-details">
                                    <span class="suggestion-name">${highlightMatch(product.name, query)}</span>
                                    <span class="suggestion-price">₹${product.price}</span>
                                </div>
                            </a>
                        `).join('')}
                    </div>
                `;
            }

            // Popular searches
            if (suggestions.popular?.length > 0) {
                html += `
                    <div class="suggestion-group">
                        <div class="suggestion-category">Popular Searches</div>
                        ${suggestions.popular.map(term => `
                            <a href="/search/?q=${encodeURIComponent(term)}" class="suggestion-item">
                                <i class="fas fa-search"></i>
                                <span>${highlightMatch(term, query)}</span>
                            </a>
                        `).join('')}
                    </div>
                `;
            }
        }

        // Show appropriate message when no results
        if (!html && query) {
            html = `
                <div class="no-suggestions">
                    <p>No matching results found for "${query}"</p>
                    ${query.length > 3 ? `
                        <p class="suggestion-tip">
                            <i class="fas fa-search"></i> 
                            Try searching for similar products or browse categories
                        </p>
                    ` : ''}
                </div>
            `;
        }

        try {
            container.innerHTML = html;
            container.classList?.add('active');
        } catch (error) {
            console.error('Error rendering suggestions:', error);
        }
    }

    // Handle search input - update to position mobile suggestions
    const handleSearchInput = debounce(async (input, container) => {
        if (!input || !container) return;
        
        const query = input.value.trim();
        
        if (query.length < minChars) {
            container.classList?.remove('active');
            return;
        }

        const suggestions = await fetchSuggestions(query);
        renderSuggestions(suggestions, container, query);
        
        // Position mobile suggestions if this is the mobile search
        if (input.id === 'mobile-search-input' && container) {
            const inputRect = input.getBoundingClientRect();
            container.style.top = `${inputRect.bottom}px`;
            container.style.width = '100%';
            container.style.left = '0';
        }
    }, debounceDelay);

    // Setup search inputs
    searchInputs.forEach((input, index) => {
        if (!input || !suggestionsContainers[index]) return;

        input.addEventListener('input', () => {
            handleSearchInput(input, suggestionsContainers[index]);
        });

        // Close suggestions on click outside
        document.addEventListener('click', (e) => {
            const container = suggestionsContainers[index];
            if (!container || !input) return;
            
            if (!input.contains(e.target) && !container.contains(e.target)) {
                container.classList?.remove('active');
            }
        });

        // Handle keyboard navigation
        input.addEventListener('keydown', (e) => {
            const container = suggestionsContainers[index];
            if (!container) return;

            const items = container.querySelectorAll('.suggestion-item');
            if (!items.length) return;

            let currentIndex = Array.from(items).findIndex(item => item.classList.contains('selected'));

            switch(e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    navigateSuggestions(items, currentIndex, 1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    navigateSuggestions(items, currentIndex, -1);
                    break;
                case 'Enter':
                    const selected = container.querySelector('.suggestion-item.selected');
                    if (selected) {
                        e.preventDefault();
                        selected.click();
                    }
                    break;
            }
        });
    });

    function navigateSuggestions(items, currentIndex, direction) {
        if (!items.length) return;

        items.forEach(item => item.classList.remove('selected'));
        
        let newIndex = currentIndex + direction;
        if (newIndex >= items.length) newIndex = 0;
        if (newIndex < 0) newIndex = items.length - 1;

        items[newIndex].classList.add('selected');
        items[newIndex].scrollIntoView({ block: 'nearest' });
    }

    function highlightMatch(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<strong>$1</strong>');
    }

    // Add mobile search functionality
    const mobileSearchInput = document.getElementById('mobile-search-input');
    const mobileSearchResults = document.getElementById('mobile-search-results');
    
    if (mobileSearchInput && mobileSearchResults) {
        const handleMobileSearch = debounce(async () => {
            const query = mobileSearchInput.value.trim();
            
            if (query.length < minChars) {
                mobileSearchResults.innerHTML = '';
                return;
            }

            try {
                const suggestions = await fetchSuggestions(query);
                renderMobileSuggestions(suggestions, mobileSearchResults, query);
            } catch (error) {
                console.error('Error fetching mobile suggestions:', error);
                mobileSearchResults.innerHTML = `
                    <div class="mobile-search-error">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Error loading suggestions. Please try again.</p>
                    </div>
                `;
            }
        }, debounceDelay);

        mobileSearchInput.addEventListener('input', handleMobileSearch);
    }

    function renderMobileSuggestions(suggestions, container, query) {
        if (!suggestions || !container) return;

        // Add positioning class for mobile suggestions
        container.classList.add('mobile-suggestions-container');

        let html = '';

        if (suggestions.products && suggestions.products.length > 0) {
            html += `
                <div class="mobile-suggestion-group">
                    <div class="mobile-suggestion-header">Products</div>
                    ${suggestions.products.map(product => `
                        <a href="${product.url}" class="mobile-suggestion-item">
                            <div class="mobile-suggestion-image">
                                <img src="${product.image_url || '/static/images/no-image.jpg'}" 
                                     alt="${product.name}"
                                     onerror="this.src='/static/images/no-image.jpg'">
                            </div>
                            <div class="mobile-suggestion-details">
                                <span class="mobile-suggestion-name">${highlightMatch(product.name, query)}</span>
                                <span class="mobile-suggestion-price">₹${product.price}</span>
                            </div>
                        </a>
                    `).join('')}
                </div>
            `;
        }

        if (suggestions.categories && suggestions.categories.length > 0) {
            html += `
                <div class="mobile-suggestion-group">
                    <div class="mobile-suggestion-header">Categories</div>
                    ${suggestions.categories.map(category => `
                        <a href="/category/${category.id}/" class="mobile-suggestion-item">
                            <i class="fas fa-folder"></i>
                            <span class="mobile-suggestion-text">${highlightMatch(category.name, query)}</span>
                            <span class="mobile-suggestion-count">(${category.product_count})</span>
                        </a>
                    `).join('')}
                </div>
            `;
        }

        if (!html) {
            html = `
                <div class="mobile-no-results">
                    <i class="fas fa-search"></i>
                    <p>No results found for "${query}"</p>
                    <p class="mobile-search-tip">Try using different keywords or check spelling</p>
                </div>
            `;
        }

        container.innerHTML = html;
    }

    // Add mobile search close handler
    const mobileSearchClose = document.getElementById('mobile-search-close');
    if (mobileSearchClose) {
        mobileSearchClose.addEventListener('click', () => {
            const mobileContainer = document.getElementById('search-suggestions-mobile');
            if (mobileContainer) {
                mobileContainer.classList.remove('active');
            }
            document.getElementById('mobile-search-input').value = '';
        });
    }
});
