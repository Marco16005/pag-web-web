import express, { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { sql, poolConnect, pool } from '../db';

const router: Router = express.Router();

// Rate limiter for contact form: 5 requests per hour from the same IP
const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5, 
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many contact form submissions from this IP, please try again after an hour.' },
    statusCode: 429,
});

interface ContactRequestBody {
  name: string;
  email: string;
  message: string;
}

interface InsertContactResult {
    new_id: number;
}

// Basic email validation
function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

router.post('/contact', contactLimiter, async ( 
    req: Request<{}, {}, ContactRequestBody>,
    res: Response,
    next: NextFunction
): Promise<void> => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    res.status(400).json({ message: "All fields (name, email, message) are required." });
    return;
  }

  if (!isValidEmail(email)) {
    res.status(400).json({ message: "Invalid email format." });
    return;
  }

  if (message.length < 10) {
    res.status(400).json({ message: "Message must be at least 10 characters long." });
    return;
  }
  if (message.length > 5000) { // Max length
    res.status(400).json({ message: "Message is too long (max 5000 characters)." });
    return;
  }

  try {
    await poolConnect;
    const request = pool.request();
    request.input('p_name', sql.VarChar, name);
    request.input('p_email', sql.VarChar, email);
    request.input('p_message', sql.NVarChar, message); // Use NVarChar for potentially unicode messages

    const result = await request.execute<InsertContactResult>('insert_contact_message');

    if (result.recordset[0]?.new_id) {
      res.status(201).json({ message: "Message sent successfully! We will get back to you soon." });
    } else {
      console.error('Failed to get new_id from insert_contact_message procedure');
      res.status(500).json({ message: "Failed to send message due to a database error." });
    }
  } catch (err) {
    console.error('Error sending contact message:', (err as Error).message);
    if (!res.headersSent) {
        if ((err as any).statusCode === 429) {
            res.status(429).json({ message: (err as any).message || 'Too many requests.' });
        } else {
            res.status(500).json({ message: "Server error while sending message." });
        }
    }
  }
});

export default router;