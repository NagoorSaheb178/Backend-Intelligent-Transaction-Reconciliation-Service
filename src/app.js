// src/app.js
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { connectDB } from './config/db.js';
import logger from './config/logger.js';
import reconciliationRoutes from './routes/reconciliationRoutes.js';
import { setupSwagger } from './config/swagger.js';
import healthRoutes from './routes/healthRoutes.js';
import { cspHeader } from './middleware/csp.js';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();

// CORS middleware – allow all origins for dev
app.use(cors());

// Body parsers
app.use(express.json());

// Log incoming requests
app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.originalUrl }, 'Incoming request');
  next();
});

// CSP header
app.use(cspHeader);

// Lazy DB connection for Vercel serverless
app.use(async (req, res, next) => {
  if (!global.__dbConnected) {
    try {
      await connectDB();
      global.__dbConnected = true;
      logger.info('MongoDB connected (Vercel)');
    } catch (e) {
      logger.error({ e }, 'Failed to connect DB on Vercel');
      // Continue; controllers should handle DB errors
    }
  }
  next();
});

// Routes
app.use('/health', healthRoutes);
app.use('/api', reconciliationRoutes);
app.get('/favicon.ico', (req, res) => {
  res.status(204).end();
});
app.use('/api', reconciliationRoutes);

if (fs.existsSync(path.resolve('swagger.yaml'))) {
  setupSwagger(app);
} else {
  logger.warn('swagger.yaml not found – skipping Swagger UI');
}
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: err.message });
});




if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    logger.info(`Server listening on http://localhost:${PORT}`);
  });
}
export default app;
