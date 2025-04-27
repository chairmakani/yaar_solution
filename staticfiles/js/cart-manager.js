// cart-manager.js

class CartManager {
    constructor() {
        this.initializeListeners();
    }

    initializeListeners() {
        // Listen for add to cart button clicks
        document.querySelectorAll('.add-to-cart-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                const productId = button.dataset.productId;
                const quantityInput = button.closest('.product-actions')
                    .querySelector('.quantity-input');
                const quantity = quantityInput ? parseInt(quantityInput.value) : 1;

                try {
                    cartUtils.updateCartButton(button, true);
                    const response = await cartUtils.addToCart(productId, quantity);
                    cartUtils.updateCartButton(button, false, true);
                } catch (error) {
                    cartUtils.updateCartButton(button, false);
                    console.error('Error:', error);
                }
            });
        });
    }
}

// Initialize cart manager when document is ready
document.addEventListener('DOMContentLoaded', () => {
    new CartManager();
});
