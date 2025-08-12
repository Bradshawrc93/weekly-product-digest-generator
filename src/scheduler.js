const cron = require('node-cron');
const { logger } = require('./utils/logger');
const WeeklyReportGenerator = require('./index');

class ReportScheduler {
  constructor() {
    this.generator = new WeeklyReportGenerator();
    this.scheduledJob = null;
  }

  /**
   * Start the scheduler to run reports on Mondays at 6am EST
   */
  startScheduler() {
    logger.info('🕐 Starting weekly report scheduler...');
    
    // Schedule job to run every Monday at 6:00 AM EST (11:00 AM UTC)
    // Cron format: minute hour day month day-of-week
    // 0 11 * * 1 = Every Monday at 11:00 AM UTC (6:00 AM EST)
    this.scheduledJob = cron.schedule('0 11 * * 1', async () => {
      await this.runScheduledReport();
    }, {
      scheduled: true,
      timezone: 'UTC' // Using UTC to avoid daylight saving time issues
    });

    logger.info('✅ Scheduler started successfully');
    logger.info('📅 Next run: Every Monday at 6:00 AM EST (11:00 AM UTC)');
    
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
      const nextRun = this.scheduledJob.nextDate();
      logger.info('⏰ Next scheduled run:', {
        date: nextRun.toISOString(),
        localTime: nextRun.toLocaleString()
      });
    }
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.scheduledJob ? this.scheduledJob.running : false,
      nextRun: this.scheduledJob ? this.scheduledJob.nextDate() : null,
      schedule: '0 11 * * 1 (Every Monday at 6:00 AM EST)'
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
