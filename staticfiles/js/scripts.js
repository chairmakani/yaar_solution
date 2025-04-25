class SiteManager {
    constructor() {
        this.initializeComponents();
    }

    initializeComponents() {
        this.initSidebar();
        this.initTabs();
        this.initNGOAccordions();
        this.initDropdowns();
        this.initSearchBar();
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

    initDropdowns() {
        const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
        let hoverTimer;
        
        dropdownToggles.forEach(toggle => {
            const dropdown = toggle.closest('.dropdown');
            const dropdownMenu = dropdown.querySelector('.dropdown-menu');
            
            // Handle mouse enter for both toggle and menu
            [toggle, dropdownMenu].forEach(element => {
                element.addEventListener('mouseenter', () => {
                    clearTimeout(hoverTimer);
                    
                    // Close other dropdowns
                    document.querySelectorAll('.dropdown').forEach(otherDropdown => {
                        if (otherDropdown !== dropdown && otherDropdown.classList.contains('active')) {
                            this.closeDropdown(otherDropdown);
                        }
                    });
                    
                    // Open current dropdown
                    dropdown.classList.add('active');
                    dropdownMenu.classList.add('show');
                    toggle.querySelector('.dropdown-icon')?.classList.add('active');
                });
                
                element.addEventListener('mouseleave', () => {
                    hoverTimer = setTimeout(() => {
                        if (!dropdown.matches(':hover')) {
                            this.closeDropdown(dropdown);
                        }
                    }, 200); // 200ms delay before closing
                });
            });
            
            // Keep click handler for mobile support
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                dropdown.classList.toggle('active');
                dropdownMenu.classList.toggle('show');
                toggle.querySelector('.dropdown-icon')?.classList.toggle('active');
            });
        });

        // Only close when clicking outside and not hovering
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown')) {
                document.querySelectorAll('.dropdown').forEach(dropdown => {
                    if (!dropdown.matches(':hover')) {
                        this.closeDropdown(dropdown);
                    }
                });
            }
        });
    }

    initSearchBar() {
        const searchToggle = document.getElementById('search-toggle');
        const searchWrapper = document.getElementById('mobile-search-wrapper');
        const searchInput = document.getElementById('mobile-search-input');
        const closeSearch = document.getElementById('mobile-search-close');
        const searchForm = document.querySelector('.mobile-search-form');

        if (searchToggle && searchWrapper) {
            searchToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                searchWrapper.classList.add('is-active');
                if (searchInput) {
                    setTimeout(() => searchInput.focus(), 300);
                }
                document.body.style.overflow = 'hidden';
            });
        }

        if (closeSearch) {
            closeSearch.addEventListener('click', () => {
                this.closeMobileSearch(searchWrapper);
            });
        }

        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                if (!searchInput.value.trim()) {
                    e.preventDefault();
                }
            });
        }

        // Close on ESC key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && searchWrapper?.classList.contains('is-active')) {
                this.closeMobileSearch(searchWrapper);
            }
        });

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (searchWrapper?.classList.contains('is-active') && 
                !searchWrapper.contains(e.target) && 
                !searchToggle.contains(e.target)) {
                this.closeMobileSearch(searchWrapper);
            }
        });
    }

    closeDropdown(dropdown) {
        if (!dropdown) return;
        dropdown.classList.remove('active');
        dropdown.querySelector('.dropdown-menu')?.classList.remove('show');
        dropdown.querySelector('.dropdown-icon')?.classList.remove('active');
    }

    closeSidebar(sidebar, overlay) {
        if (sidebar) {
            sidebar.classList.remove('open');
            document.body.style.overflow = '';
            overlay.classList.remove('active');
        }
    }

    closeMobileSearch(wrapper) {
        if (!wrapper) return;
        wrapper.classList.remove('is-active');
        document.body.style.overflow = '';
        const searchInput = document.getElementById('mobile-search-input');
        if (searchInput) {
            searchInput.value = '';
            searchInput.blur();
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

