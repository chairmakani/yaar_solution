document.addEventListener('DOMContentLoaded', function() {
    // Lazy loading for images
    const lazyImages = document.querySelectorAll('.product img');
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy');
                observer.unobserve(img);
            }
        });
    });

    lazyImages.forEach(img => imageObserver.observe(img));

    // Smooth scroll to active category
    const activeCategory = document.querySelector('.categories li.active');
    if (activeCategory) {
        activeCategory.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Add to cart animation
    const addToCartButtons = document.querySelectorAll('.add-to-cart-btn');
    addToCartButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            const icon = this.querySelector('i');
            icon.classList.remove('fa-cart-plus');
            icon.classList.add('fa-spinner', 'fa-spin');
            
            setTimeout(() => {
                icon.classList.remove('fa-spinner', 'fa-spin');
                icon.classList.add('fa-check');
                
                setTimeout(() => {
                    icon.classList.remove('fa-check');
                    icon.classList.add('fa-cart-plus');
                }, 1500);
            }, 800);
        });
    });

    // Filter animation
    const sortSelect = document.getElementById('sort-options');
    sortSelect.addEventListener('change', function() {
        document.querySelector('.products').classList.add('sort-animation');
    });
});

// Infinite scroll
let page = 1;
const loadMoreProducts = () => {
    const productGrid = document.getElementById('product-grid');
    const loading = document.createElement('div');
    loading.className = 'loading-indicator';
    loading.innerHTML = '<div class="spinner"></div>';
    productGrid.appendChild(loading);

    fetch(`?page=${page + 1}&sort=${currentSort}`)
        .then(response => response.text())
        .then(html => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const newProducts = doc.querySelectorAll('.product-card');
            
            if (newProducts.length) {
                newProducts.forEach(product => {
                    productGrid.appendChild(product);
                });
                page++;
            }
            loading.remove();
        });
};
