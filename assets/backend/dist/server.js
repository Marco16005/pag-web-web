"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = __importDefault(require("./routes/auth"));
const admin_1 = __importDefault(require("./routes/admin"));
const contact_1 = __importDefault(require("./routes/contact"));
const leaderboard_1 = __importDefault(require("./routes/leaderboard"));
const geminiChat_1 = __importDefault(require("./routes/geminiChat"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middlewares
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Rutas
app.use('/api', auth_1.default);
app.use('/api', admin_1.default);
app.use('/api', contact_1.default);
app.use('/api', leaderboard_1.default);
app.use('/api', geminiChat_1.default);
// Ruta de prueba (opcional)
app.get('/', (req, res) => {
    res.send('Servidor TypeScript funcionando!');
});
// Simple error handler (optional, but good practice)
app.use((err, req, res, next) => {
    console.error(err.stack);
    if (!res.headersSent) {
        res.status(500).send('Something broke!');
    }
});
// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
