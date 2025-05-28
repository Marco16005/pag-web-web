document.addEventListener("DOMContentLoaded", () => {
    const emailInput = document.querySelector("#email");

    if (emailInput) {
        emailInput.addEventListener("input", () => {
            if (emailInput.validity.typeMismatch) {
                emailInput.setCustomValidity("Please enter a valid email address.");
            } else {
                emailInput.setCustomValidity("");
            }
        });
    }
});

// Utility function to show an error message for a given input field
window.showError = function(inputElement, message) {
    if (!inputElement) return;
    inputElement.classList.add("input-error");
    let errorSpan = inputElement.nextElementSibling;
    if (!errorSpan || !errorSpan.classList.contains("error-message")) {
        errorSpan = document.createElement("span");
        errorSpan.classList.add("error-message"); 
        if (inputElement.parentNode) {
            inputElement.parentNode.insertBefore(errorSpan, inputElement.nextSibling);
        }
    }
    errorSpan.textContent = message;
};

// Utility function to clear an error message for a given input field
window.clearError = function(inputElement) {
    if (!inputElement) return;
    inputElement.classList.remove("input-error");
    const errorSpan = inputElement.nextElementSibling;
    if (errorSpan && errorSpan.classList.contains("error-message")) {
        errorSpan.textContent = "";
    }
};

// Utility function to validate email format
window.validateEmail = function(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
};

// Returns an object with the status of each password criterion
window.validatePasswordCriteria = function(password) {
    const criteria = {
        length: password.length >= 8,
        lowercase: /(?=.*[a-z])/.test(password),
        uppercase: /(?=.*[A-Z])/.test(password),
        number: /(?=.*\d)/.test(password),
        special: /(?=.*[@$!%*?&])/.test(password) // Common special characters
    };
    // Overall validity based on all criteria being true
    criteria.allValid = Object.values(criteria).every(Boolean);
    return criteria;
};

// Returns a single error message string based on criteria, for form submission validation
window.getPasswordValidationErrorMessage = function(password) {
    const criteria = window.validatePasswordCriteria(password);
    if (criteria.allValid) return ""; // No error

    if (!criteria.length) return "Password must be at least 8 characters long.";
    if (!criteria.lowercase) return "Password must include at least one lowercase letter.";
    if (!criteria.uppercase) return "Password must include at least one uppercase letter.";
    if (!criteria.number) return "Password must include at least one number.";
    if (!criteria.special) return "Password must include at least one special character (e.g., @, $, !, %, *, ?, &).";
    return "Password does not meet all strength requirements."; // Fallback
};

// Utility function to validate password strength (for overall form validation on submit)
window.validatePassword = function(password) {
    return window.getPasswordValidationErrorMessage(password);
};