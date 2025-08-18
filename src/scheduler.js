const cron = require('node-cron');
const { logger } = require('./utils/logger');
const WeeklyReportGenerator = require('./index');

class ReportScheduler {
  constructor() {
    this.generator = new WeeklyReportGenerator();
    this.scheduledJob = null;
  }

  /**
   * Start the scheduler to run reports on Mondays at 8am ET
   */
  startScheduler() {
    logger.info('🕐 Starting weekly report scheduler...');
    
    // Schedule job to run every Monday at 8:00 AM ET
    // Cron format: minute hour day month day-of-week
    // Using America/New_York timezone to handle DST automatically
    // 0 8 * * 1 = Every Monday at 8:00 AM ET
    this.scheduledJob = cron.schedule('0 8 * * 1', async () => {
      await this.runScheduledReport();
    }, {
      scheduled: true,
      timezone: 'America/New_York' // Using ET timezone to handle DST automatically
    });

    logger.info('✅ Scheduler started successfully');
    logger.info('📅 Next run: Every Monday at 8:00 AM ET');
    
    // Log when the next run will be
    this.logNextRunTime();
  }

  /**
   * Stop the scheduler
   */
  stopScheduler() {
    if (this.scheduledJob) {
      this.scheduledJob.stop();
      logger.info('⏹️  Scheduler stopped');
    }
  }

  /**
   * Run the scheduled report generation
   */
  async runScheduledReport() {
    const startTime = Date.now();
    
    try {
      logger.info('🚀 Running scheduled weekly report generation...');
      
      // Generate report for the previous week
      const result = await this.generator.generatePreviousWeekReport();
      
      const duration = Date.now() - startTime;
      logger.info('✅ Scheduled report generation completed successfully', {
        pageId: result.pageId,
        pageUrl: result.pageUrl,
        dateRange: result.dateRange.display,
        duration: `${duration}ms`
      });

      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('❌ Scheduled report generation failed', {
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`
      });
      
      // You might want to add notification logic here (email, Slack, etc.)
      throw error;
    }
  }

  /**
   * Log when the next scheduled run will be
   */
  logNextRunTime() {
    if (this.scheduledJob) {
      // Calculate next Monday at 8:00 AM ET
      const now = new Date();
      const daysUntilMonday = (8 - now.getDay()) % 7;
      const nextMonday = new Date(now);
      nextMonday.setDate(now.getDate() + daysUntilMonday);
      nextMonday.setHours(8, 0, 0, 0); // 8:00 AM ET
      
      logger.info('⏰ Next scheduled run:', {
        date: nextMonday.toISOString(),
        localTime: nextMonday.toLocaleString('en-US', { timeZone: 'America/New_York' })
      });
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    let nextRun = null;
    if (this.scheduledJob) {
      // Calculate next Monday at 8:00 AM ET
      const now = new Date();
      const daysUntilMonday = (8 - now.getDay()) % 7;
      const nextMonday = new Date(now);
      nextMonday.setDate(now.getDate() + daysUntilMonday);
      nextMonday.setHours(8, 0, 0, 0); // 8:00 AM ET
      nextRun = nextMonday;
    }
    
    return {
      isRunning: this.scheduledJob ? this.scheduledJob.running : false,
      nextRun: nextRun,
      schedule: '0 8 * * 1 (Every Monday at 8:00 AM ET)'
    };
  }

  /**
   * Run a manual report generation (for testing)
   */
  async runManualReport() {
    logger.info('🔧 Running manual report generation...');
    return await this.runScheduledReport();
  }
}

module.exports = ReportScheduler;
