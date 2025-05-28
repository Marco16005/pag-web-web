document.addEventListener('DOMContentLoaded', () => {
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Load footer placeholder
    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder) {
        const basePath = '/assets/js/recycled/'; 
        fetch(`${basePath}footer.html`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} for ${response.url}`);
                }
                return response.text();
            })
            .then(data => {
                footerPlaceholder.innerHTML = data;
            })
            .catch(error => console.error('Error loading footer:', error));
    } else {
        console.warn("Footer placeholder 'footer-placeholder' not found on this page.");
    }

    // Carousel functionality
    const carouselImagesContainer = document.querySelector('.carousel-images');
    const carouselItems = document.querySelectorAll('.carousel-item');
    const prevBtn = document.querySelector('.carousel-btn.prev-btn');
    const nextBtn = document.querySelector('.carousel-btn.next-btn');
    const indicators = document.querySelectorAll('.carousel-indicators .indicator');

    let currentIndex = 0;
    const totalItems = carouselItems.length;
    let autoSlideInterval; 

    function updateCarousel() {
        if (carouselItems.length === 0) return; 

        carouselItems.forEach(item => item.classList.remove('active'));
        carouselItems[currentIndex].classList.add('active');

        if (indicators.length > 0) {
            indicators.forEach(indicator => indicator.classList.remove('active'));
            if (indicators[currentIndex]) { 
                indicators[currentIndex].classList.add('active');
            }
        }
    }

    function showNext() {
        if (totalItems === 0) return;
        currentIndex = (currentIndex + 1) % totalItems;
        updateCarousel();
    }

    function showPrev() {
        if (totalItems === 0) return;
        currentIndex = (currentIndex - 1 + totalItems) % totalItems;
        updateCarousel();
    }

    function startAutoSlide(interval = 5000) { 
        if (totalItems === 0) return;
        stopAutoSlide(); 
        autoSlideInterval = setInterval(showNext, interval);
    }

    function stopAutoSlide() {
        clearInterval(autoSlideInterval);
    }

    if (carouselImagesContainer && carouselItems.length > 0) {
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                showNext();
                stopAutoSlide(); 
                startAutoSlide(); 
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                showPrev();
                stopAutoSlide(); 
                startAutoSlide(); 
            });
        }

        if (indicators.length > 0) {
            indicators.forEach(indicator => {
                indicator.addEventListener('click', (e) => {
                    const index = parseInt(e.target.dataset.index);
                    if (!isNaN(index) && index >= 0 && index < totalItems) {
                        currentIndex = index;
                        updateCarousel();
                        stopAutoSlide(); 
                        startAutoSlide();
                    }
                });
            });
        }

        updateCarousel(); 
        startAutoSlide(4000); 

        const carouselElement = document.querySelector('.carousel');
        if (carouselElement) {
            carouselElement.addEventListener('mouseenter', stopAutoSlide);
            carouselElement.addEventListener('mouseleave', () => startAutoSlide(4000));
        }

    } else {
        if (document.querySelector('.carousel')) { 
             console.warn("Carousel elements (images container or items) not found, but a carousel structure seems to be present.");
        }
    }

    // ScrollReveal animations 
    if (typeof ScrollReveal === 'function') {
        ScrollReveal().reveal('.hero-content, .feature, .testimonial, .cta-section, .form-card, .marg, .welcome-section, .characters-section', {
            delay: 200,
            distance: '50px',
            duration: 800,
            easing: 'ease-in-out',
            origin: 'bottom',
            reset: false
        });
    }
});