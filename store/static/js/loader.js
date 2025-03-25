class LoaderManager {
    constructor() {
        this.initializeLoader();
        this.setupLazyLoading();
    }

    initializeLoader() {
        // Create loader element
        this.loader = document.createElement('div');
        this.loader.className = 'page-loader';
        this.loader.innerHTML = `
            <button class="loader-button" disabled>
                <div class="loader-spinner" role="status">
                    <span class="sr-only">Loading...</span>
                </div>
                Loading...
            </button>
        `;
        document.body.appendChild(this.loader);

        // Handle page load
        window.addEventListener('load', () => {
            setTimeout(() => {
                this.loader.classList.add('fade-out');
                document.querySelector('.content-loader').classList.add('loaded');
            }, 500);
        });
    }

    setupLazyLoading() {
        // Lazy load images
        const lazyImages = document.querySelectorAll('.lazy-image');
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.add('loaded');
                    observer.unobserve(img);
                }
            });
        });

        lazyImages.forEach(img => imageObserver.observe(img));
    }

    // Show loader for dynamic content
    static showContentLoader(container) {
        const skeletons = Array(6).fill().map(() => `
            <div class="skeleton-card">
                <div class="skeleton skeleton-image"></div>
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-price"></div>
            </div>
        `).join('');
        
        container.innerHTML = skeletons;
    }

    // Hide loader and show content
    static hideContentLoader(container, content) {
        container.style.opacity = '0';
        setTimeout(() => {
            container.innerHTML = content;
            container.style.opacity = '1';
        }, 300);
    }
}

// Initialize loader
const loader = new LoaderManager();

// Export for use in other scripts
window.LoaderManager = LoaderManager;
