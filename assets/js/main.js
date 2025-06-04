document.addEventListener("DOMContentLoaded", () => {

    ScrollReveal().reveal('.section', {
        delay: 200,
        distance: '50px',
        duration: 1000,
        easing: 'ease-in-out',
        origin: 'bottom',
        reset: true
    });
});

//Fondo dinámico
const canvasElement = document.getElementById('background-canvas');
if (canvasElement) {
    const ctx = canvasElement.getContext('2d');
}

// ---------------- CONFIGURACIÓN ----------------
// const API_URL = 'http://localhost:3000/api'; 
window.API_URL = '/api'; // Use relative path for API calls
// ---------------- UTILIDADES ----------------


// Guardar usuario en localStorage
function saveUserSession(user) { // user is the object { id, nombre, correo, rol }
  localStorage.setItem('user', JSON.stringify(user));
}

// Eliminar sesión
function logoutUser() {
  localStorage.removeItem('user');
  window.location.reload();
}

// ---------------- FORMULARIO REGISTRO ----------------

function setupRegisterForm() {
  const registerForm = document.getElementById('register-form');
  if (!registerForm) return;

  const emailInput = document.getElementById('email');
  const fullnameInput = document.getElementById('fullname');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const genderInput = document.getElementById('gender'); 
  const birthdateInput = document.getElementById('birthdate'); 

  // Password criteria elements
  const lengthCriterion = document.getElementById('length-criterion');
  const lowercaseCriterion = document.getElementById('lowercase-criterion');
  const uppercaseCriterion = document.getElementById('uppercase-criterion');
  const numberCriterion = document.getElementById('number-criterion');
  const specialCriterion = document.getElementById('special-criterion');

  function updatePasswordCriteriaUI(password) {
    if (!window.validatePasswordCriteria) return; // Ensure function exists
    const criteriaStatus = window.validatePasswordCriteria(password);

    lengthCriterion?.classList.toggle('valid', criteriaStatus.length);
    lowercaseCriterion?.classList.toggle('valid', criteriaStatus.lowercase);
    uppercaseCriterion?.classList.toggle('valid', criteriaStatus.uppercase);
    numberCriterion?.classList.toggle('valid', criteriaStatus.number);
    specialCriterion?.classList.toggle('valid', criteriaStatus.special);
  }

  if (passwordInput) {
    passwordInput.addEventListener('input', () => {
      updatePasswordCriteriaUI(passwordInput.value);
    });
    updatePasswordCriteriaUI(passwordInput.value);
  }

  function calculateAge(birthDateString) {
    if (!birthDateString) return NaN;
    const birthDate = new Date(birthDateString);
    if (isNaN(birthDate.getTime())) {
        return NaN;
    }
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
  }


  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    let isValid = true;

    // Clear previous errors
    if (window.clearError) {
        window.clearError(emailInput);
        window.clearError(fullnameInput);
        window.clearError(passwordInput);
        window.clearError(confirmPasswordInput);
        if (genderInput) window.clearError(genderInput);
        if (birthdateInput) window.clearError(birthdateInput); 
    }

    const correo = emailInput.value.trim();
    const nombre_usuario = fullnameInput.value.trim();
    const contraseña = passwordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();
    const genero = genderInput ? genderInput.value : ''; 
    const fecha_nacimiento = birthdateInput ? birthdateInput.value : '';

    // Validate Full Name
    if (!nombre_usuario) {
      if (window.showError) window.showError(fullnameInput, "Full name is required.");
      isValid = false;
    }

    // Validate Email
    if (!correo) {
      if (window.showError) window.showError(emailInput, "Email is required.");
      isValid = false;
    } else if (window.validateEmail && !window.validateEmail(correo)) {
      if (window.showError) window.showError(emailInput, "Please enter a valid email address.");
      isValid = false;
    }

    // Validate Gender
    if (genderInput && !genero) {
        if (window.showError) window.showError(genderInput, "Please select your gender.");
        isValid = false;
    }

    // Validate Birth Date
    if (birthdateInput) {
        if (!fecha_nacimiento) {
            if (window.showError) window.showError(birthdateInput, "Birth date is required.");
            isValid = false;
        } else {
            const age = calculateAge(fecha_nacimiento);
            if (isNaN(age)) {
                if (window.showError) window.showError(birthdateInput, "Invalid birth date format.");
                isValid = false;
            } else if (age < 13) {
                if (window.showError) window.showError(birthdateInput, "You must be at least 13 years old to register.");
                isValid = false;
            } else if (age > 100) { // Sanity check
                if (window.showError) window.showError(birthdateInput, "Invalid birth date (too old).");
                isValid = false;
            }
        }
    }

    // Validate Password using the detailed criteria for the main error message
    if (!contraseña) {
      if (window.showError) window.showError(passwordInput, "Password is required.");
      isValid = false;
    } else if (window.getPasswordValidationErrorMessage) {
        const passwordErrorMessage = window.getPasswordValidationErrorMessage(contraseña);
        if (passwordErrorMessage) {
            if (window.showError) window.showError(passwordInput, passwordErrorMessage);
            isValid = false;
        }
    }

    // Validate Confirm Password
    if (!confirmPassword) {
      if (window.showError) window.showError(confirmPasswordInput, "Please confirm your password.");
      isValid = false;
    } else if (contraseña && contraseña !== confirmPassword) {
      if (window.showError) window.showError(confirmPasswordInput, "Passwords do not match.");
      isValid = false;
    }

    if (!isValid) {
      return;
    }

    try {
      const registerResponse = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, nombre_usuario, contraseña, genero, fecha_nacimiento })
      });

      const registerData = await registerResponse.json();

      if (registerResponse.ok) {
        alert(registerData.message + " Now attempting to log you in...");

        // Attempt to log in automatically
        const loginResponse = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo, contraseña }) 
        });

        const loginData = await loginResponse.json();

        if (loginResponse.ok) {
            saveUserSession(loginData.user);
            window.location.href = "profile.html"; // Redirect to profile or dashboard
        } else {
            alert("Registration successful, but auto-login failed: " + loginData.message + "\nPlease log in manually.");
            window.location.href = "login.html"; // Redirect to login page if auto-login fails
        }

      } else {
        alert(registerData.message); 
        if (registerData.field && registerData.field === 'correo' && window.showError) {
            window.showError(emailInput, registerData.message);
        } else if (registerData.field && registerData.field === 'password' && window.showError) { 
            window.showError(passwordInput, registerData.errors ? registerData.errors.join(' ') : registerData.message);
        } else if (registerData.field && registerData.field === 'birthdate' && window.showError && birthdateInput) {
            window.showError(birthdateInput, registerData.message);
        } else if (registerData.field && registerData.field === 'gender' && window.showError && genderInput) {
            window.showError(genderInput, registerData.message);
        } else {
            alert(registerData.message || "An unknown error occurred during registration.");
        }
      }
    } catch (error) {
      console.error(error);
      alert("Error during registration or auto-login. Please try again.");
    }
  });
}

// ---------------- FORMULARIO LOGIN ----------------

function setupLoginForm() {
  const loginForm = document.getElementById('login-form');
  if (!loginForm) return;

  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    let isValid = true;

    if(window.clearError) {
        window.clearError(emailInput);
        window.clearError(passwordInput);
    }

    const correo = emailInput.value.trim();
    const contraseña = passwordInput.value.trim();

    if (!correo) {
      if(window.showError) window.showError(emailInput, "Email is required.");
      isValid = false;
    } else if (window.validateEmail && !window.validateEmail(correo)) {
      if(window.showError) window.showError(emailInput, "Please enter a valid email address.");
      isValid = false;
    }

    if (!contraseña) {
      if(window.showError) window.showError(passwordInput, "Password is required.");
      isValid = false;
    }

    if (!isValid) {
        return;
    }

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, contraseña })
      });

      const data = await response.json();

      if (response.ok) {
        saveUserSession(data.user);
        window.location.href = "profile.html";
      } else {
        alert(data.message); // Display error from server (e.g., "Invalid credentials")
        if (data.message.toLowerCase().includes("usuario") || data.message.toLowerCase().includes("correo")) {
            if(window.showError) window.showError(emailInput, data.message);
        } else if (data.message.toLowerCase().includes("contraseña")) {
            if(window.showError) window.showError(passwordInput, data.message);
        }
      }
    } catch (error) {
      console.error(error);
      alert("Error during login. Please try again.");
    }
  });
}

// ---------------- LEADERBOARD PARA INDEX.HTML ----------------
async function fetchAndDisplayIndexLeaderboard() {
    const indexLeaderboardList = document.getElementById('index-leaderboard-list');
    if (!indexLeaderboardList) return; // Only run if the element exists on the current page

    indexLeaderboardList.innerHTML = '<li class="flex justify-between items-center"><span class="font-semibold pixel-font" style="color:rgb(0, 0, 0);">Loading leaderboard...</span></li>';
    try {
        const response = await fetch(`${window.API_URL}/leaderboard/global`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const leaderboardData = await response.json();

        indexLeaderboardList.innerHTML = ''; // Clear loading message
        if (leaderboardData.length === 0) {
            indexLeaderboardList.innerHTML = '<li class="flex justify-between items-center"><span class="font-semibold pixel-font" style="color:rgb(0, 0, 0);">Leaderboard is empty.</span></li>';
        } else {
            leaderboardData.forEach(player => {
                const listItem = document.createElement('li');
                listItem.className = 'flex justify-between items-center';
                listItem.innerHTML = `
                    <span class="font-semibold pixel-font" style="color:rgb(0, 0, 0);">${player.rank}. ${player.nombre_usuario}</span>
                    <span class="pixel-font" style="color:rgb(0, 0, 0);">&nbsp;&nbsp;${player.puntuacion_total.toLocaleString()}</span>`;
                indexLeaderboardList.appendChild(listItem);
            });
        }
    } catch (error) {
      console.error('Failed to fetch index leaderboard:', error);
        indexLeaderboardList.innerHTML = '<li class="flex justify-between items-center"><span class="font-semibold pixel-font" style="color:rgb(0, 0, 0);">Error loading leaderboard.</span></li>';
    }
}

// ---------------- INICIALIZACIÓN GENERAL ----------------

document.addEventListener('DOMContentLoaded', () => {
  // updateNavbar();
  setupRegisterForm();
  setupLoginForm();
  fetchAndDisplayIndexLeaderboard();
});

// This function will be called by header.js after loading any header content
window.initializeHeaderInteractivity = function(headerContainerElement) {
    if (!headerContainerElement) return;

    const hamburger = headerContainerElement.querySelector('.hamburger');
    const navLinks = headerContainerElement.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.replaceWith(hamburger.cloneNode(true)); 
        const newHamburger = headerContainerElement.querySelector('.hamburger'); 

        newHamburger.addEventListener('click', () => {
            navLinks.classList.toggle('show');
        });
    } 
};