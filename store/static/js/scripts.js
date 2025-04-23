class SiteManager {
    constructor() {
        this.initializeComponents();
    }

    initializeComponents() {
        this.initSidebar();
        this.initTabs();
        this.initNGOAccordions();
    }

    initSidebar() {
        const menuToggle = document.getElementById('menu-toggle');
        const menuSidebar = document.getElementById('menu-sidebar');
        const closeSidebar = document.getElementById('close-sidebar');
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);

        if (menuToggle && menuSidebar) {
            menuToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                menuSidebar.classList.add('open');
                document.body.style.overflow = 'hidden';
                overlay.classList.add('active');
            });

            // Close sidebar handlers
            [closeSidebar, overlay].forEach(elem => {
                if (elem) {
                    elem.addEventListener('click', () => {
                        this.closeSidebar(menuSidebar, overlay);
                    });
                }
            });

            // Close on escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && menuSidebar.classList.contains('open')) {
                    this.closeSidebar(menuSidebar, overlay);
                }
            });
        }
    }

    initTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));

                button.classList.add('active');
                const contentId = button.id.replace('-tab', '-content');
                document.getElementById(contentId)?.classList.add('active');
            });
        });
    }

    initNGOAccordions() {
        const ngoLocations = document.querySelectorAll('.sidebar-ngo-location');
        
        ngoLocations.forEach(location => {
            const toggle = location.querySelector('.ngo-location-toggle');
            
            if (toggle) {
                toggle.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Remove active class from other locations
                    ngoLocations.forEach(otherLocation => {
                        if (otherLocation !== location && otherLocation.classList.contains('active')) {
                            otherLocation.classList.remove('active');
                        }
                    });
                    
                    // Toggle active class on clicked location
                    location.classList.toggle('active');
                });
            }
        });
    }

    closeSidebar(sidebar, overlay) {
        if (sidebar) {
            sidebar.classList.remove('open');
            document.body.style.overflow = '';
            overlay.classList.remove('active');
        }
    }
}

// Initialize site manager
document.addEventListener('DOMContentLoaded', () => {
    window.siteManager = new SiteManager();

    // Defensive programming - check if elements exist before adding listeners
    const element = document.querySelector('.target-element');
    if (element) {
        element.addEventListener('click', function() {
            // ... existing code ...
        });
    }
});

