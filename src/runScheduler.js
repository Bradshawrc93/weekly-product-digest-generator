#!/usr/bin/env node

const ReportScheduler = require('./scheduler');
const { logger } = require('./utils/logger');
const HealthCheck = require('./healthCheck');

async function main() {
  const scheduler = new ReportScheduler();
  const healthCheck = new HealthCheck(scheduler);
  
  // Handle graceful shutdown
  const gracefulShutdown = (signal) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    scheduler.stopScheduler();
    process.exit(0);
  };

  // Listen for shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon

  try {
    // Start the scheduler
    scheduler.startScheduler();
    
    // Keep the process running
    logger.info('🔄 Scheduler is running. Press Ctrl+C to stop.');
    
    // Log status every hour
    setInterval(() => {
      const status = scheduler.getStatus();
      const health = healthCheck.getHealthStatus();
      logger.info('📊 Scheduler Status:', status);
      logger.info('💚 Health Check:', health);
    }, 60 * 60 * 1000); // Every hour
    
  } catch (error) {
    logger.error('❌ Failed to start scheduler:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = main;
