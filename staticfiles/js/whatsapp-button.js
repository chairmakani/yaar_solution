document.addEventListener('DOMContentLoaded', function() {
    const whatsappBtn = document.querySelector('.whatsapp-btn');
    let lastScrollPosition = 0;
    const scrollThreshold = 200;

    function handleScroll() {
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
        
        if (currentScroll > scrollThreshold) {
            whatsappBtn.classList.remove('hidden');
        } else {
            whatsappBtn.classList.add('hidden');
        }
        
        lastScrollPosition = currentScroll;
    }

    // Initial check
    handleScroll();

    // Add scroll event listener
    window.addEventListener('scroll', handleScroll, { passive: true });
});
