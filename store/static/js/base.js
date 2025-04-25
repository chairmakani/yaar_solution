// scroll top button function codes
document.addEventListener('DOMContentLoaded', () => {
    // Enhanced Scroll-to-Top Implementation with Progress
    const createScrollTop = () => {
        const button = document.createElement('button');
        button.className = 'scroll-top-btn';
        button.setAttribute('aria-label', 'Scroll to top of page');
        button.setAttribute('title', 'Scroll to top');
        button.setAttribute('role', 'button');
        button.innerHTML = `
            <svg class="progress-ring" width="50" height="50" aria-hidden="true">
                <circle class="progress-ring__circle" stroke="#ffffff" stroke-width="2" fill="transparent" r="18" cx="25" cy="25"/>
            </svg>
            <svg class="arrow-icon" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" role="presentation">
                <path fill="currentColor" d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" transform="rotate(-90 12 12)"/>
            </svg>
            <span class="sr-only">Scroll to top</span>
        `;
        document.body.appendChild(button);

        const circle = button.querySelector('.progress-ring__circle');
        const radius = circle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;

        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        circle.style.strokeDashoffset = circumference;

        function setProgress(percent) {
            const offset = circumference - (percent/100 * circumference);
            circle.style.strokeDashoffset = offset;
        }

        let scrollTimeout;
        const scrollThreshold = document.querySelector('nav') ? 
            document.querySelector('nav').offsetHeight + 100 : 400;

        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            
            // Calculate scroll progress
            const windowHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrolled = window.scrollY;
            const scrollProgress = (scrolled / windowHeight) * 100;
            
            if (window.scrollY > scrollThreshold) {
                button.classList.add('visible');
                button.style.transform = 'scale(1)';
                setProgress(scrollProgress);
            } else {
                button.classList.remove('visible');
                button.style.transform = 'scale(0)';
            }

            // Add active state when scrolling stops
            button.classList.add('scrolling');
            scrollTimeout = setTimeout(() => {
                button.classList.remove('scrolling');
            }, 150);
        });

        button.addEventListener('click', () => {
            button.classList.add('clicked');
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
            setTimeout(() => button.classList.remove('clicked'), 300);
        });
    };

    createScrollTop();
});
