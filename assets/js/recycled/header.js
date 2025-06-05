document.addEventListener("DOMContentLoaded", () => {
    const userData = JSON.parse(sessionStorage.getItem("user")); 
    const targetPlaceholder = document.getElementById("header-placeholder");

    if (!targetPlaceholder) {
        console.error("Header placeholder 'header-placeholder' not found on this page.");
        return; 
    }

    let headerPath;

    // Determine the correct header path
    if (document.body.classList.contains('admin-page-body')) {
        // Admin page always gets the admin header
        headerPath = "/assets/js/recycled/header3.html";
    } else if (userData && userData.rol === "admin") {
        // This covers an admin user on the profile page
        headerPath = "/assets/js/recycled/header3.html";
    } else if (userData) {
        // Logged-in non-admin user 
        headerPath = "/assets/js/recycled/header2.html";
    } else {
        // Not logged in 
        headerPath = "/assets/js/recycled/header.html";
    }

    // Fetch and inject the determined header
    fetch(headerPath)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Failed to fetch header ${headerPath}: ${response.status} ${response.statusText}`);
            }
            return response.text();
        })
        .then((data) => {
            targetPlaceholder.innerHTML = data;
            if (typeof window.initializeHeaderInteractivity === 'function') {
                window.initializeHeaderInteractivity(targetPlaceholder);
            } else {
                // Fallback interactivity if global function isn't found
                const hamburger = targetPlaceholder.querySelector('.hamburger');
                const navLinks = targetPlaceholder.querySelector('.nav-links');
                if (hamburger && navLinks) {
                    hamburger.addEventListener('click', () => {
                        navLinks.classList.toggle('show');
                    });
                }
            }
        })
        .catch((error) => console.error("Error al cargar el encabezado:", error));
});