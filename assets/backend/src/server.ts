import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path'; // Import path module
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import contactRoutes from './routes/contact';
import leaderboardRoutes from './routes/leaderboard';
import geminiChatRoutes from './routes/geminiChat';

const app: Express = express();
const PORT: string | number = process.env.PORT || 3000;

// Middlewares
app.use(express.json()); // Parse JSON bodies

// CORS Configuration
const whitelist = ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:8080', 'http://localhost:3000']; 
if (process.env.NODE_ENV === 'production') {
    const renderExternalUrl = process.env.RENDER_EXTERNAL_URL; 
    const customFrontendUrl = process.env.FRONTEND_URL; 
    if (renderExternalUrl) {
        whitelist.push(renderExternalUrl);
    }
    if (customFrontendUrl && customFrontendUrl !== renderExternalUrl) {
        whitelist.push(customFrontendUrl);
    }
    if (!renderExternalUrl && !customFrontendUrl) {
        console.warn("Production CORS origin not set. FRONTEND_URL or RENDER_EXTERNAL_URL env var is missing.");
    }
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.error(`CORS Error: Origin ${origin} not allowed.`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true 
}));


app.use('/api', authRoutes);
app.use('/api', adminRoutes);
app.use('/api', contactRoutes);
app.use('/api', leaderboardRoutes);
app.use('/api', geminiChatRoutes);

const projectRoot = path.join(__dirname, '..', '..', '..');

// Serve static files with custom header for .br files
app.use(express.static(projectRoot, {
  setHeaders: (res, filePath) => {
    // Check for .br files and set the appropriate Content-Encoding header
    if (filePath.endsWith('.js.br') || filePath.endsWith('.wasm.br') || filePath.endsWith('.data.br') || filePath.endsWith('.symbols.json.br') || filePath.endsWith('.framework.js.br')) {
      res.setHeader('Content-Encoding', 'br');
      // Also, ensure correct Content-Type for common WebGL file types when compressed
      if (filePath.endsWith('.js.br') || filePath.endsWith('.framework.js.br')) {
        res.setHeader('Content-Type', 'application/javascript');
      } else if (filePath.endsWith('.wasm.br')) {
        res.setHeader('Content-Type', 'application/wasm');
      } else if (filePath.endsWith('.symbols.json.br')) {
        res.setHeader('Content-Type', 'application/json');
      }
      // For .data.br, Content-Type is often application/octet-stream,
      // express.static usually infers this correctly if not explicitly set.
    }
  }
}));

app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api/')) { // Don't interfere with API routes
        return next();
    }
    if (path.extname(req.path).length > 0 && !req.path.endsWith('.html')) {
         return next();
    }
    const potentialFile = req.path.endsWith('.html') ? req.path : (req.path === '/' ? 'index.html' : `${req.path}.html`);
    const filePath = path.join(projectRoot, potentialFile.startsWith('/') ? potentialFile.substring(1) : potentialFile);

    if (path.extname(filePath) === '.html' && express.static.mime.lookup(filePath) === 'text/html') {
        res.sendFile(filePath, err => {
            if (err) {
                if (req.path !== '/' || potentialFile !== 'index.html') {
                    res.sendFile(path.join(projectRoot, 'index.html'), (finalErr) => {
                        if (finalErr) {
                            next(finalErr); // Pass error to error handler
                        }
                    });
                } else {
                     next(err); // Pass error to error handler if index.html itself fails
                }
            }
        });
    } else {
         res.sendFile(path.join(projectRoot, 'index.html'), (err) => {
            if (err) {
                next(err); // Pass error to error handler
            }
        });
    }
});


// Simple error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", err.stack);
  if (!res.headersSent) {
    res.status(500).send('Something broke!');
  }
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});