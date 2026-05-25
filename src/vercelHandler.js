// src/vercelHandler.js
// Entry point for Vercel serverless deployment.
// Vercel expects a default export that is a request handler (Express app works).
// This file imports the existing Express app and re-exports it.

import app from './app.js';

export default app;
