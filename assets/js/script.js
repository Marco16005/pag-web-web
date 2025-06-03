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

    // CV Modal Functionality for About Us page
    const cvModal = document.getElementById('cvModal');
    const cvModalName = document.getElementById('cvModalName');
    const cvModalRole = document.getElementById('cvModalRole');
    const cvModalDetails = document.getElementById('cvModalDetails');
    const closeCvModalBtn = document.getElementById('closeCvModal');
    const viewCvButtons = document.querySelectorAll('.view-cv-btn');

    // Placeholder CV Data (replace with actual data or fetch from an API)
    const teamCVs = {
        david: {
            name: "David",
            role: "Game Developer",
            details: `
                <p>David is a passionate game developer with 5 years of experience in Unity and C#. He specializes in gameplay mechanics and AI programming.</p>
                <ul>
                    <li>Lead Developer on 'Pixel Adventure Quest'.</li>
                    <li>Proficient in 3D modeling and animation.</li>
                    <li>Strong believer in iterative design and player feedback.</li>
                </ul>
            `
        },
        marco: {
            name: "Marco",
            role: "Web Developer",
            details: `
                <p>Marco is a full-stack web developer with expertise in Node.js, React, and modern CSS frameworks. He ensures our web presence is top-notch.</p>
                <ul>
                    <li>Developed several e-commerce platforms.</li>
                    <li>Skilled in database management (SQL & NoSQL).</li>
                    <li>Focuses on performance and user experience.</li>
                </ul>
            `
        },
        gustavo: {
            name: "Gustavo",
            role: "Game Developer",
            details: `
                <p>Gustavo brings creativity and technical skill to game development, focusing on level design and narrative.</p>
                <ul>
                    <li>Contributed to indie game 'Galaxy Runner'.</li>
                    <li>Experienced with Unreal Engine and Blueprints.</li>
                    <li>Passionate about creating immersive game worlds.</li>
                </ul>
            `
        },
        enzo: {
            name: "Enzo",
            role: "Game Developer",
            details: `
                <p>Enzo is a versatile game developer, adept at both frontend game logic and backend systems integration for multiplayer experiences.</p>
                <ul>
                    <li>Specializes in network programming for games.</li>
                    <li>Proficient with C++ and Python in game development.</li>
                    <li>Enjoys competitive gaming and eSports.</li>
                </ul>
            `
        },
        angel: {
            name: "Angel",
            role: "Project Manager",
            details: `
                <p>Angel orchestrates the development process, ensuring projects are delivered on time and meet quality standards. He bridges communication between all team members.</p>
                <ul>
                    <li>Certified Scrum Master (CSM).</li>
                    <li>Managed multiple software development projects.</li>
                    <li>Expert in agile methodologies and team coordination.</li>
                </ul>
            `
        }
    };

    if (viewCvButtons.length > 0 && cvModal) {
        viewCvButtons.forEach(button => {
            button.addEventListener('click', () => {
                const memberKey = button.dataset.member;
                const cvData = teamCVs[memberKey];
                if (cvData) {
                    cvModalName.textContent = cvData.name;
                    cvModalRole.textContent = cvData.role;
                    cvModalDetails.innerHTML = cvData.details;
                    cvModal.style.display = 'block';
                }
            });
        });

        if (closeCvModalBtn) {
            closeCvModalBtn.addEventListener('click', () => {
                cvModal.style.display = 'none';
            });
        }

        // Close modal if user clicks outside of the modal content
        window.addEventListener('click', (event) => {
            if (event.target === cvModal) {
                cvModal.style.display = 'none';
            }
        });
    }
});