"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../db"); // Import mssql specific exports
const router = express_1.default.Router();
// GET global leaderboard (top 5)
router.get('/leaderboard/global', async (req, res, next) => {
    try {
        await db_1.poolConnect;
        const request = db_1.pool.request();
        request.input('p_limit', db_1.sql.Int, 5); // Pass the limit to the procedure
        const result = await request.execute('get_global_leaderboard');
        res.status(200).json(result.recordset);
    }
    catch (err) {
        console.error('Error fetching global leaderboard:', err.message);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Failed to fetch global leaderboard.' });
        }
    }
});
// GET specific user's score
router.get('/leaderboard/user/:userId', async (req, res, next) => {
    const { userId } = req.params;
    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericUserId)) {
        res.status(400).json({ message: 'Invalid user ID format.' });
        return;
    }
    try {
        await db_1.poolConnect;
        const request = db_1.pool.request();
        request.input('p_user_id', db_1.sql.Int, numericUserId);
        const result = await request.execute('get_user_score');
        if (result.recordset.length > 0) {
            res.status(200).json(result.recordset[0]);
        }
        else {
            res.status(200).json({ puntuacion_total: 0 });
        }
    }
    catch (err) {
        console.error(`Error fetching score for user ${userId}:`, err.message);
        if (!res.headersSent) {
            res.status(500).json({ message: `Failed to fetch score for user ${userId}.` });
        }
    }
});
exports.default = router;
