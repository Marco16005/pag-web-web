"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const db_1 = require("../db");
const router = express_1.default.Router();
// Rate limiter for contact form: 5 requests per hour from the same IP
const contactLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many contact form submissions from this IP, please try again after an hour.' },
    statusCode: 429,
});
// Basic email validation
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}
router.post('/contact', contactLimiter, async (req, res, next) => {
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
        await db_1.poolConnect;
        const request = db_1.pool.request();
        request.input('p_name', db_1.sql.VarChar, name);
        request.input('p_email', db_1.sql.VarChar, email);
        request.input('p_message', db_1.sql.NVarChar, message); // Use NVarChar for potentially unicode messages
        const result = await request.execute('insert_contact_message');
        if (result.recordset[0]?.new_id) {
            res.status(201).json({ message: "Message sent successfully! We will get back to you soon." });
        }
        else {
            console.error('Failed to get new_id from insert_contact_message procedure');
            res.status(500).json({ message: "Failed to send message due to a database error." });
        }
    }
    catch (err) {
        console.error('Error sending contact message:', err.message);
        if (!res.headersSent) {
            if (err.statusCode === 429) {
                res.status(429).json({ message: err.message || 'Too many requests.' });
            }
            else {
                res.status(500).json({ message: "Server error while sending message." });
            }
        }
    }
});
exports.default = router;
