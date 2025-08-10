#!/usr/bin/env node

/**
 * Weekly Product Digest Generator
 * Main application entry point
 */

require('dotenv').config();
const { logger } = require('./utils/logger');
const { validateEnvironment } = require('./utils/config');
const { DigestGenerator } = require('./core/DigestGenerator');

async function main() {
  try {
    logger.info('Starting Weekly Product Digest Generator');
    
    // Validate environment configuration
    await validateEnvironment();
    logger.info('Environment validation passed');
    
    // Initialize digest generator
    const generator = new DigestGenerator();
    
    // Start the application
    await generator.start();
    
    logger.info('Weekly Product Digest Generator started successfully');
  } catch (error) {
    logger.error('Failed to start application', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
  process.exit(1);
});

// Start the application
if (require.main === module) {
  main();
}

module.exports = { main };
