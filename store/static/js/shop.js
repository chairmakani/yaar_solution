class ShopManager {
    constructor() {
        // Wait for cart utils to be available
        this.waitForDependencies().then(() => {
            this.initializeShop();
        });
    }

    async waitForDependencies() {
        // Wait for cartUtils to be defined
        while (!window.cartUtils) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    initializeShop() {
        document.addEventListener('DOMContentLoaded', () => {
            this.initPriceSlider();
            this.initSortSelect();
            this.initViewToggle();
            this.initLazyLoading();
            this.initSearchHandlers();
            this.initDropdowns();
            this.setupCartHandlers();
        });
    }

    initPriceSlider() {
        const priceSlider = document.getElementById('price-slider');
        if (!priceSlider || priceSlider.noUiSlider) return;

        const maxPrice = parseFloat(priceSlider.dataset.maxPrice) || 10000;
        
        noUiSlider.create(priceSlider, {
            start: [0, maxPrice],
            connect: true,
            range: {
                'min': 0,
                'max': maxPrice
            }
        });

        this.setupPriceInputs(priceSlider);
    }

    setupPriceInputs(slider) {
        const minInput = document.getElementById('min-price');
        const maxInput = document.getElementById('max-price');
        
        if (minInput && maxInput) {
            slider.noUiSlider.on('update', (values) => {
                minInput.value = Math.round(values[0]);
                maxInput.value = Math.round(values[1]);
            });
        }
    }

    initSortSelect() {
        const sortSelect = document.getElementById('sort-options');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                document.getElementById('sort-form')?.submit();
            });
        }
    }

    initViewToggle() {
        const toggleView = document.getElementById('toggle-view');
        const productGrid = document.getElementById('product-grid');
        
        if (toggleView && productGrid) {
            // Load saved view preference
            const savedView = localStorage.getItem('shop-view') || 'grid';
            this.updateViewState(productGrid, toggleView, savedView);
            
            // Handle view toggle
            toggleView.addEventListener('click', () => {
                const currentView = productGrid.classList.contains('grid-view') ? 'list' : 'grid';
                this.updateViewState(productGrid, toggleView, currentView);
                localStorage.setItem('shop-view', currentView);
            });
        }
    }

    updateViewState(grid, toggle, view) {
        grid.classList.toggle('grid-view', view === 'grid');
        grid.classList.toggle('list-view', view === 'list');
        
        const icons = toggle.querySelectorAll('i');
        icons.forEach(icon => {
            icon.classList.toggle('active',
                (icon.classList.contains('fa-th-large') && view === 'grid') ||
                (icon.classList.contains('fa-list') && view === 'list')
            );
        });
    }

    initLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy-image');
                        observer.unobserve(img);
                    }
                });
            });

            document.querySelectorAll('.lazy-image').forEach(img => {
                imageObserver.observe(img);
            });
        }
    }

    initSearchHandlers() {
        const searchForm = document.getElementById('search-form');
        if (searchForm) {
            searchForm.addEventListener('submit', this.handleSearchSubmit);
        }
    }

    handleSearchSubmit(e) {
        const input = e.target.querySelector('input[type="text"]');
        if (!input.value.trim()) {
            e.preventDefault();
            input.classList.add('shake');
            setTimeout(() => input.classList.remove('shake'), 500);
        }
    }

    initDropdowns() {
        document.querySelectorAll('.dropdown').forEach(dropdown => {
            this.setupDropdown(dropdown);
        });
    }

    setupDropdown(dropdown) {
        const trigger = dropdown.querySelector('.dropdown-toggle');
        const menu = dropdown.querySelector('.dropdown-menu');
        let timeoutId;

        if (trigger && menu) {
            trigger.addEventListener('mouseenter', () => {
                clearTimeout(timeoutId);
                this.showDropdown(dropdown, menu);
            });

            dropdown.addEventListener('mouseleave', () => {
                timeoutId = setTimeout(() => {
                    this.hideDropdown(menu);
                }, 200);
            });
        }
    }

    showDropdown(dropdown, menu) {
        // Hide other dropdowns first
        document.querySelectorAll('.dropdown-menu.show').forEach(openMenu => {
            if (!dropdown.contains(openMenu)) {
                openMenu.classList.remove('show');
            }
        });
        menu.classList.add('show');
    }

    hideDropdown(menu) {
        menu.classList.remove('show');
    }

    setupCartHandlers() {
        if (!window.cartUtils) {
            console.error('cartUtils not found');
            return;
        }

        document.querySelectorAll('.add-to-cart-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                const btn = e.currentTarget;
                const productId = btn.dataset.productId;
                const quantityInput = btn.closest('.product-actions')
                    .querySelector('.quantity-input');
                const quantity = quantityInput ? parseInt(quantityInput.value) : 1;

                try {
                    window.cartUtils.updateCartButton(btn, true);
                    const response = await window.cartUtils.addToCart(productId, quantity);
                    window.cartUtils.updateCartButton(btn, false, true);
                    
                    if (response.success) {
                        window.showNotification('Added to cart successfully', 'success');
                    }
                } catch (error) {
                    window.cartUtils.updateCartButton(btn, false);
                    window.showNotification(error.message || 'Failed to add to cart', 'error');
                }
            });
        });
    }
}

// Initialize shop manager only after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.shopManager = new ShopManager();
});
