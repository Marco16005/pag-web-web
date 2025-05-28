"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../db"); // Import mssql specific exports
const router = express_1.default.Router();
// DELETE a user
router.delete('/admin/users/:id_usuario', async (req, res, next) => {
    const { id_usuario } = req.params;
    const numericUserId = parseInt(id_usuario, 10);
    if (isNaN(numericUserId)) {
        res.status(400).json({ message: 'Invalid user ID format.' });
        return;
    }
    try {
        await db_1.poolConnect;
        const request = db_1.pool.request();
        request.input('p_id_usuario', db_1.sql.Int, numericUserId);
        const result = await request.execute('eliminar_usuario_admin');
        const deleteStatus = result.recordset[0]?.status;
        if (deleteStatus === 'OK') {
            res.status(200).json({ message: `User ${id_usuario} deleted successfully.` });
        }
        else if (deleteStatus === 'NOT_FOUND') {
            res.status(404).json({ message: `User ${id_usuario} not found.` });
        }
        else if (deleteStatus === 'NO_DELETE_LAST_ADMIN') {
            res.status(403).json({ message: 'Cannot delete the last administrator.' });
        }
        else {
            console.error('Unexpected delete status:', deleteStatus);
            res.status(500).json({ message: 'Failed to delete user.' });
        }
    }
    catch (err) {
        console.error(`Error deleting user ${id_usuario}:`, err.message);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Server error during user deletion.' });
        }
    }
});
// PUT (update) a user
router.put('/admin/users/:id_usuario', async (req, res, next) => {
    const { id_usuario } = req.params;
    const { nombre_usuario, correo, rol } = req.body;
    const numericUserId = parseInt(id_usuario, 10);
    if (isNaN(numericUserId)) {
        res.status(400).json({ message: 'Invalid user ID format.' });
        return;
    }
    if (!nombre_usuario || !correo || !rol) {
        res.status(400).json({ message: 'All fields (username, email, role) are required.' });
        return;
    }
    if (rol !== 'user' && rol !== 'admin') {
        res.status(400).json({ message: "Invalid role. Must be 'user' or 'admin'." });
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        res.status(400).json({ message: "Invalid email format." });
        return;
    }
    try {
        await db_1.poolConnect;
        const request = db_1.pool.request();
        request.input('p_id_usuario', db_1.sql.Int, numericUserId);
        request.input('p_nombre_usuario', db_1.sql.VarChar, nombre_usuario);
        request.input('p_correo', db_1.sql.VarChar, correo);
        request.input('p_rol', db_1.sql.VarChar, rol);
        const result = await request.execute('actualizar_usuario_admin');
        const updateStatus = result.recordset[0]?.status;
        if (updateStatus === 'OK') {
            res.status(200).json({ message: `User ${id_usuario} updated successfully.` });
        }
        else if (updateStatus === 'NOT_FOUND') {
            res.status(404).json({ message: `User ${id_usuario} not found.` });
        }
        else if (updateStatus === 'EMAIL_EXISTS') {
            res.status(409).json({ message: `Email '${correo}' is already in use.` });
        }
        else if (updateStatus === 'USERNAME_EXISTS') {
            res.status(409).json({ message: `Username '${nombre_usuario}' is already in use.` });
        }
        else if (updateStatus === 'CANNOT_DEMOTE_LAST_ADMIN') {
            res.status(403).json({ message: 'Cannot change the role of the last administrator.' });
        }
        else {
            console.error('Unexpected update status:', updateStatus);
            res.status(500).json({ message: 'Failed to update user.' });
        }
    }
    catch (err) {
        console.error(`Error updating user ${id_usuario}:`, err.message);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Server error during user update.' });
        }
    }
});
// GET all users
router.get('/admin/users', async (req, res, next) => {
    try {
        await db_1.poolConnect;
        const request = db_1.pool.request();
        const result = await request.execute('get_all_users_admin');
        res.status(200).json(result.recordset);
    }
    catch (err) {
        console.error('Error fetching users:', err.message);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Failed to fetch users.' });
        }
    }
});
// GET all statistics
router.get('/admin/statistics', async (req, res, next) => {
    try {
        await db_1.poolConnect;
        const request = db_1.pool.request();
        const result = await request.execute('get_statistics_admin');
        res.status(200).json(result.recordset);
    }
    catch (err) {
        console.error('Error fetching statistics:', err.message);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Failed to fetch statistics.' });
        }
    }
});
// GET all contact messages
router.get('/admin/contact-messages', async (req, res, next) => {
    try {
        await db_1.poolConnect;
        const request = db_1.pool.request();
        const result = await request.execute('get_contact_messages_admin');
        res.status(200).json(result.recordset);
    }
    catch (err) {
        console.error('Error fetching contact messages:', err.message);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Failed to fetch contact messages.' });
        }
    }
});
// PUT (update) status of a contact message
router.put('/admin/contact-messages/:message_id/status', async (req, res, next) => {
    const { message_id } = req.params;
    const { status } = req.body;
    const numericMessageId = parseInt(message_id, 10);
    if (isNaN(numericMessageId)) {
        res.status(400).json({ message: 'Invalid message ID format.' });
        return;
    }
    if (!status || (status !== 'new' && status !== 'read' && status !== 'archived')) {
        res.status(400).json({ message: "Invalid status. Must be 'new', 'read', or 'archived'." });
        return;
    }
    try {
        await db_1.poolConnect;
        const request = db_1.pool.request();
        request.input('p_id_contact_message', db_1.sql.Int, numericMessageId);
        request.input('p_new_status', db_1.sql.VarChar, status);
        const result = await request.execute('update_contact_message_status_admin');
        const updateResult = result.recordset[0]?.status_update_result;
        if (updateResult === 'OK') {
            res.status(200).json({ message: `Message ${message_id} status updated to '${status}'.` });
        }
        else if (updateResult === 'NOT_FOUND') {
            res.status(404).json({ message: `Message ${message_id} not found.` });
        }
        else {
            console.error('Unexpected message status update result:', updateResult);
            res.status(500).json({ message: 'Failed to update message status.' });
        }
    }
    catch (err) {
        console.error(`Error updating status for message ${message_id}:`, err.message);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Server error during message status update.' });
        }
    }
});
// GET Bitacora Logs
router.get('/admin/logs', async (req, res, next) => {
    const { tableName, operationType, startDate, endDate, limit = '100', offset = '0' } = req.query;
    try {
        await db_1.poolConnect;
        const request = db_1.pool.request();
        request.input('p_nombre_tabla', db_1.sql.VarChar(100), tableName ? String(tableName) : null);
        request.input('p_tipo_operacion_filter', db_1.sql.VarChar(50), operationType ? String(operationType) : null);
        request.input('p_fecha_inicio', db_1.sql.DateTime, startDate ? new Date(String(startDate)) : null);
        request.input('p_fecha_fin', db_1.sql.DateTime, endDate ? new Date(String(endDate)) : null);
        const numLimit = parseInt(String(limit), 10);
        const numOffset = parseInt(String(offset), 10);
        request.input('p_limit', db_1.sql.Int, isNaN(numLimit) ? 100 : numLimit);
        request.input('p_offset', db_1.sql.Int, isNaN(numOffset) ? 0 : numOffset);
        const result = await request.execute('sp_get_log_entries');
        res.status(200).json(result.recordset);
    }
    catch (err) {
        console.error('Error fetching logs:', err.message);
        if (!res.headersSent) {
            res.status(500).json({ message: 'Failed to fetch system logs.' });
        }
    }
});
exports.default = router;
