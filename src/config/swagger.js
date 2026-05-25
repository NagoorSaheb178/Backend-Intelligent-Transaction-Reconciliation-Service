// src/config/swagger.js
import swaggerUi from 'swagger-ui-express';
import logger from './logger.js';
import yaml from 'yamljs';
import path from 'path';

/**
 * Setup Swagger UI for the Express app.
 * Loads the OpenAPI spec from the project root `swagger.yaml`.
 *
 * @param {import('express').Express} app - The Express application instance
 */
export const setupSwagger = (app) => {
  const specPath = path.resolve(process.cwd(), 'swagger.yaml');
  const swaggerDocument = yaml.load(specPath);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  logger.info('Swagger UI initialized');
};
