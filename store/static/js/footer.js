document.addEventListener('DOMContentLoaded', function() {
    const mobileCartCount = document.getElementById('mobile-cart-count');
    const cartLink = document.getElementById('mobile-cart-trigger');

    // Update mobile cart badge
    function updateMobileCart(count) {
        if (mobileCartCount) {
            // Remove existing animation
            mobileCartCount.classList.remove('bounce');
            
            // Trigger reflow to restart animation
            void mobileCartCount.offsetWidth;
            
            // Update count and add animation
            mobileCartCount.textContent = count;
            mobileCartCount.classList.add('bounce');
            
            // Show/hide badge based on count
            mobileCartCount.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    // Listen for cart updates
    document.addEventListener('cartUpdated', function(e) {
        if (e.detail && e.detail.total_items !== undefined) {
            updateMobileCart(e.detail.total_items);
        }
    });

    // Initial cart count visibility
    if (mobileCartCount && mobileCartCount.textContent === '0') {
        mobileCartCount.style.display = 'none';
    }

    // Add cart animation functionality for mobile
    function animateCartMobile(productId, productImage) {
        const product = document.querySelector(`[data-product-id="${productId}"]`);
        const mobileCartTrigger = document.getElementById('mobile-cart-trigger');
        
        if (!product || !mobileCartTrigger) return;

        const flyingItem = document.createElement('div');
        flyingItem.className = 'flying-item';
        flyingItem.style.backgroundImage = `url(${productImage})`;
        document.body.appendChild(flyingItem);

        const start = product.getBoundingClientRect();
        const end = mobileCartTrigger.getBoundingClientRect();

        flyingItem.style.top = `${start.top}px`;
        flyingItem.style.left = `${start.left}px`;

        requestAnimationFrame(() => {
            flyingItem.style.top = `${end.top + end.height/2}px`;
            flyingItem.style.left = `${end.left + end.width/2}px`;
            flyingItem.style.transform = 'scale(0.1)';
            flyingItem.style.opacity = '0';

            setTimeout(() => {
                document.body.removeChild(flyingItem);
                mobileCartTrigger.classList.add('pulse');
                setTimeout(() => mobileCartTrigger.classList.remove('pulse'), 300);
            }, 1000);
        });
    }

    // Listen for add to cart events
    document.addEventListener('itemAddedToCart', function(e) {
        if (window.innerWidth <= 768) {  // Only for mobile screens
            animateCartMobile(e.detail.productId, e.detail.productImage);
        }
    });
});
