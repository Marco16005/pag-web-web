"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/auth.ts
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const db_1 = require("../db"); // Import mssql specific exports
const hash_1 = require("../utils/hash");
const router = express_1.default.Router();
// Rate limiter for registration
const registerLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many registration attempts from this IP, please try again after 15 minutes.' },
    statusCode: 429,
});
// Rate limiter for login
const loginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 login attempts per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many login attempts from this IP, please try again after 15 minutes.' },
    statusCode: 429,
});
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}
function checkPasswordStrength(password) {
    const errors = [];
    if (password.length < 8) {
        errors.push("Password must be at least 8 characters long.");
    }
    if (!/(?=.*[a-z])/.test(password)) {
        errors.push("Password must include at least one lowercase letter.");
    }
    if (!/(?=.*[A-Z])/.test(password)) {
        errors.push("Password must include at least one uppercase letter.");
    }
    if (!/(?=.*\d)/.test(password)) {
        errors.push("Password must include at least one number.");
    }
    if (!/(?=.*[@$!%*?&])/.test(password)) {
        errors.push("Password must include at least one special character (@$!%*?&).");
    }
    return errors;
}
function calculateAge(birthDateString) {
    const birthDate = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}
// REGISTRO usando stored procedure
router.post('/register', registerLimiter, async (req, res, next) => {
    const { correo, nombre_usuario, contraseña, genero, fecha_nacimiento } = req.body;
    if (!correo || !nombre_usuario || !contraseña || !genero || !fecha_nacimiento) {
        res.status(400).json({ message: "All fields (email, fullname, password, gender, birth date) are required." });
        return;
    }
    if (!isValidEmail(correo)) {
        res.status(400).json({ message: "Invalid email format.", field: "email" });
        return;
    }
    const passwordErrors = checkPasswordStrength(contraseña);
    if (passwordErrors.length > 0) {
        res.status(400).json({
            message: "Password does not meet strength requirements.",
            field: "password",
            errors: passwordErrors
        });
        return;
    }
    // Validate gender (example: allow specific values)
    const allowedGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
    if (!allowedGenders.includes(genero.toLowerCase())) {
        res.status(400).json({ message: "Invalid gender selected.", field: "gender" });
        return;
    }
    // Validate birth date format and age
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_nacimiento)) {
        res.status(400).json({ message: "Invalid birth date format. Please use YYYY-MM-DD.", field: "birthdate" });
        return;
    }
    const age = calculateAge(fecha_nacimiento);
    if (isNaN(age)) {
        res.status(400).json({ message: "Invalid birth date provided.", field: "birthdate" });
        return;
    }
    if (age < 10) {
        res.status(400).json({ message: "You must be at least 10 years old to register.", field: "birthdate" });
        return;
    }
    if (age > 120) { // Sanity check for max age
        res.status(400).json({ message: "Invalid birth date (too old).", field: "birthdate" });
        return;
    }
    try {
        await db_1.poolConnect;
        const hashedPassword = await (0, hash_1.hashPassword)(contraseña);
        const request = db_1.pool.request();
        request.input('p_correo', db_1.sql.VarChar, correo);
        request.input('p_nombre_usuario', db_1.sql.VarChar, nombre_usuario);
        request.input('p_contrasena_hash', db_1.sql.VarChar, hashedPassword);
        request.input('p_genero', db_1.sql.VarChar, genero);
        request.input('p_fecha_nacimiento', db_1.sql.Date, fecha_nacimiento);
        const result = await request.execute('registrar_usuario');
        const registrationStatus = result.recordset[0]?.status;
        if (registrationStatus === 'EXISTE') {
            res.status(409).json({ message: "This email is already registered.", field: "correo" });
            return;
        }
        if (registrationStatus === 'USERNAME_EXISTS') {
            res.status(409).json({ message: "This username is already taken.", field: "nombre_usuario" });
            return;
        }
        if (registrationStatus === 'AGE_BELOW_MINIMUM') {
            res.status(400).json({ message: "You must be at least 10 years old to register.", field: "birthdate" });
            return;
        }
        if (registrationStatus === 'OK') {
            res.status(201).json({ message: "User registered successfully." });
        }
        else {
            console.error("Unexpected registration status from DB:", registrationStatus);
            res.status(500).json({ message: "Registration failed due to a database error." });
        }
    }
    catch (err) {
        console.error('Registration Error:', err.message || err);
        if (!res.headersSent) {
            if (err.statusCode === 429) {
                res.status(429).json({ message: err.message || 'Too many requests.' });
            }
            else {
                res.status(500).json({ message: "Server error during registration." });
            }
        }
    }
});
// LOGIN usando stored procedure
router.post('/login', loginLimiter, async (req, res, next) => {
    const { correo, contraseña } = req.body;
    if (!correo || !contraseña) {
        res.status(400).json({ message: "All fields are required." });
        return;
    }
    try {
        await db_1.poolConnect; // Ensures the pool is connected
        const request = db_1.pool.request();
        request.input('p_correo_param', db_1.sql.VarChar, correo);
        const result = await request.execute('login_usuario');
        if (result.recordset.length === 0) {
            res.status(404).json({ message: "User not found." });
            return;
        }
        const user = result.recordset[0];
        const isMatch = await (0, hash_1.comparePassword)(contraseña, user.contrasena_hash);
        if (!isMatch) {
            res.status(401).json({ message: "Invalid credentials." });
            return;
        }
        res.status(200).json({
            message: "Login successful.",
            user: {
                id: user.id_usuario,
                nombre: user.nombre_usuario,
                correo: user.correo,
                rol: user.rol
            }
        });
    }
    catch (err) {
        console.error('Login Error:', err.message || err);
        if (!res.headersSent) {
            if (err.statusCode === 429) {
                res.status(429).json({ message: err.message || 'Too many requests.' });
            }
            else {
                res.status(500).json({ message: "Server error during login." });
            }
        }
    }
});
exports.default = router;
