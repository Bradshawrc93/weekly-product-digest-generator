const { logger } = require('./utils/logger');
const ReportScheduler = require('./scheduler');

class HealthCheck {
  constructor(scheduler) {
    this.scheduler = scheduler;
    this.startTime = Date.now();
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    const uptime = Date.now() - this.startTime;
    const schedulerStatus = this.scheduler ? this.scheduler.getStatus() : null;
    
    return {
      status: 'healthy',
      uptime: {
        milliseconds: uptime,
        seconds: Math.floor(uptime / 1000),
        minutes: Math.floor(uptime / 60000),
        hours: Math.floor(uptime / 3600000)
      },
      scheduler: schedulerStatus,
      timestamp: new Date().toISOString(),
      version: require('../package.json').version
    };
  }

  /**
   * Check if the application is healthy
   */
  isHealthy() {
    try {
      const status = this.getHealthStatus();
      return status.status === 'healthy';
    } catch (error) {
      logger.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Get detailed health information
   */
  getDetailedHealth() {
    const basicHealth = this.getHealthStatus();
    
    return {
      ...basicHealth,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external
      },
      pid: process.pid
    };
  }
}

module.exports = HealthCheck;
