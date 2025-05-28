import express, { Router, Request, Response, NextFunction } from 'express';
import { sql, poolConnect, pool } from '../db'; // Import mssql specific exports

const router: Router = express.Router();

interface LeaderboardEntry {
    rank: number; 
    nombre_usuario: string;
    puntuacion_total: number;
}

interface UserScore {
    puntuacion_total: number;
}

// GET global leaderboard (top 5)
router.get('/leaderboard/global', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        await poolConnect;
        const request = pool.request();
        request.input('p_limit', sql.Int, 5); // Pass the limit to the procedure
        const result = await request.execute<LeaderboardEntry>('get_global_leaderboard');
        res.status(200).json(result.recordset);
    } catch (err) {
        console.error('Error fetching global leaderboard:', (err as Error).message);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Failed to fetch global leaderboard.' });
        }
    }
});

// GET specific user's score
router.get('/leaderboard/user/:userId', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { userId } = req.params;
    const numericUserId = parseInt(userId, 10);

    if (isNaN(numericUserId)) {
        res.status(400).json({ message: 'Invalid user ID format.' });
        return;
    }

    try {
        await poolConnect;
        const request = pool.request();
        request.input('p_user_id', sql.Int, numericUserId);
        const result = await request.execute<UserScore>('get_user_score');

        if (result.recordset.length > 0) {
            res.status(200).json(result.recordset[0]);
        } else {
            res.status(200).json({ puntuacion_total: 0 });
        }
    } catch (err) {
        console.error(`Error fetching score for user ${userId}:`, (err as Error).message);
        if (!res.headersSent) {
            res.status(500).json({ message: `Failed to fetch score for user ${userId}.` });
        }
    }
});

export default router;