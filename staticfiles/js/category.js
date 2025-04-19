document.addEventListener('DOMContentLoaded', function() {
    // Category-specific initialization
    const currentCategory = document.querySelector('.categories li.active');
    
    // Highlight current category
    if (currentCategory) {
        currentCategory.scrollIntoView({ behavior: 'smooth', block: 'center' });
        currentCategory.style.animation = 'highlight 1s ease';
    }

    // Add transition animations for products
    const products = document.querySelectorAll('.product-card');
    products.forEach((product, index) => {
        product.style.animation = `fadeInUp 0.5s ease forwards ${index * 0.1}s`;
    });

    // Initialize AOS for scroll animations
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 800,
            offset: 100,
            once: true
        });
    }

    // Update breadcrumb animation
    const breadcrumb = document.querySelector('.breadcrumb');
    if (breadcrumb) {
        breadcrumb.classList.add('animated');
    }
});

// All other product grid functionality is inherited from shop.js
