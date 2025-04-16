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
