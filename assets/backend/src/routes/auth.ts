// src/routes/auth.ts
import express, { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { sql, poolConnect, pool } from '../db'; // Import mssql specific exports
import { hashPassword, comparePassword } from '../utils/hash';
import { ParsedQs } from 'qs';
import { ParamsDictionary } from 'express-serve-static-core';

const router: Router = express.Router();

// Rate limiter for registration
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5,
  standardHeaders: true, 
  legacyHeaders: false, 
  message: { message: 'Too many registration attempts from this IP, please try again after 15 minutes.' },
  statusCode: 429, 
});

// Rate limiter for login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 login attempts per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many login attempts from this IP, please try again after 15 minutes.' },
    statusCode: 429,
});

interface RegisterRequestBody {
  correo: string;
  nombre_usuario: string;
  contraseña: string;
  genero: string;
  fecha_nacimiento: string;
}

interface LoginRequestBody {
  correo: string;
  contraseña: string;
}

// User type from DB procedure 'login_usuario'
interface UserQueryResult {
  id_usuario: number;
  nombre_usuario: string;
  correo: string;
  rol: string;
  contrasena_hash: string;
}

// Result type from DB procedure 'registrar_usuario'
interface RegisterQueryResult {
  status: 'EXISTE' | 'USERNAME_EXISTS' | 'OK' | 'AGE_BELOW_MINIMUM' | string;
}

interface SuccessResponseMessage {
  message: string;
}

interface ErrorResponseMessage {
  message: string;
}

interface LoginSuccessResponse extends SuccessResponseMessage {
  user: {
    id: number;
    nombre: string; // Frontend expects 'nombre', backend uses 'nombre_usuario'
    correo: string;
    rol: string;
  };
}

function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

function checkPasswordStrength(password: string): string[] {
  const errors: string[] = [];
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

function calculateAge(birthDateString: string): number {
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
router.post('/register', registerLimiter, async ( 
    req: Request<ParamsDictionary, any, RegisterRequestBody, ParsedQs>,
    res: Response<SuccessResponseMessage | ErrorResponseMessage | { message: string, field?: string, errors?: string[] }>,
    next: NextFunction
  ): Promise<void> => {
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
    await poolConnect;
    const hashedPassword = await hashPassword(contraseña);
    const request = pool.request();
    request.input('p_correo', sql.VarChar, correo);
    request.input('p_nombre_usuario', sql.VarChar, nombre_usuario);
    request.input('p_contrasena_hash', sql.VarChar, hashedPassword);
    request.input('p_genero', sql.VarChar, genero);
    request.input('p_fecha_nacimiento', sql.Date, fecha_nacimiento); 

    const result = await request.execute<RegisterQueryResult>('registrar_usuario');
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
    } else {
        console.error("Unexpected registration status from DB:", registrationStatus);
        res.status(500).json({ message: "Registration failed due to a database error." });
    }

  } catch (err) {
    console.error('Registration Error:', (err as Error).message || err);
    if (!res.headersSent) {
        if ((err as any).statusCode === 429) {
             res.status(429).json({ message: (err as any).message || 'Too many requests.' });
        } else {
             res.status(500).json({ message: "Server error during registration." });
        }
    }
  }
});

// LOGIN usando stored procedure
router.post('/login', loginLimiter, async ( 
    req: Request<ParamsDictionary, any, LoginRequestBody, ParsedQs>,
    res: Response<LoginSuccessResponse | ErrorResponseMessage>,
    next: NextFunction
  ): Promise<void> => {
  const { correo, contraseña } = req.body;

  if (!correo || !contraseña) {
    res.status(400).json({ message: "All fields are required." });
    return;
  }

  try {
    await poolConnect; // Ensures the pool is connected
    const request = pool.request();
    request.input('p_correo_param', sql.VarChar, correo);

    const result = await request.execute<UserQueryResult>('login_usuario');

    if (result.recordset.length === 0) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    const user = result.recordset[0];
    const isMatch = await comparePassword(contraseña, user.contrasena_hash);

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

  } catch (err) {
    console.error('Login Error:', (err as Error).message || err);
    if (!res.headersSent) {
        if ((err as any).statusCode === 429) {
             res.status(429).json({ message: (err as any).message || 'Too many requests.' });
        } else {
             res.status(500).json({ message: "Server error during login." });
        }
    }
  }
});

export default router;