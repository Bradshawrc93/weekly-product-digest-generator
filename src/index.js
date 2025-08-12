#!/usr/bin/env node

const config = require('./utils/config');
const { logger } = require('./utils/logger');
const DateUtils = require('./utils/dateUtils');
const dataStorage = require('./utils/dataStorage');
const jiraConnector = require('./connectors/jira');
const notionConnector = require('./connectors/notion');
const metricsCalculator = require('./processors/metricsCalculator');
const dataOrganizer = require('./processors/dataOrganizer');
const notionPageGenerator = require('./generators/notionPageGenerator');

class WeeklyReportGenerator {
  constructor() {
    this.config = config;
  }

  /**
   * Main entry point for generating weekly report
   */
  async generateReport(dateRange = null) {
    const startTime = Date.now();
    
    try {
      logger.info('🚀 Starting weekly report generation');

      // Use provided date range or get previous week
      const reportDateRange = dateRange || DateUtils.getPreviousWeekRange();
      
      logger.info('Report date range', { 
        start: reportDateRange.start,
        end: reportDateRange.end,
        display: reportDateRange.display 
      });

      // Step 1: Test connections
      await this.testConnections();

      // Step 2: Fetch Jira data
      const jiraData = await this.fetchJiraData(reportDateRange);
      
      // Debug: Log sample issue data to understand structure
      if (jiraData.allIssues.length > 0) {
        const sampleIssue = jiraData.allIssues[0];
        logger.info('Sample issue structure', {
          key: sampleIssue.key,
          summary: sampleIssue.fields.summary,
          status: sampleIssue.fields.status?.name,
          fields: Object.keys(sampleIssue.fields).filter(key => 
            key.includes('customfield') || key.includes('team') || key.includes('component')
          ),
          customfield_10001: sampleIssue.fields.customfield_10001,
          project: sampleIssue.fields.project
        });
      }

      // Step 3: Calculate metrics
      const metrics = await this.calculateMetrics(reportDateRange, jiraData);

      // Step 4: Organize data
      const organizedData = await this.organizeData(reportDateRange, jiraData);

      // Step 5: Generate Notion page
      const notionPage = await this.generateNotionPage(reportDateRange, metrics, organizedData);

      // Step 6: Save data
      await this.saveData(reportDateRange, metrics, organizedData);

      const duration = Date.now() - startTime;
      logger.info('✅ Weekly report generation completed successfully', {
        duration: `${duration}ms`,
        pageId: notionPage.id,
        dateRange: reportDateRange.display
      });

      return {
        success: true,
        pageId: notionPage.id,
        pageUrl: notionPage.url,
        dateRange: reportDateRange,
        metrics,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('❌ Weekly report generation failed', {
        error: error.message,
        duration: `${duration}ms`
      });
      
      throw error;
    }
  }

  /**
   * Test all API connections
   */
  async testConnections() {
    logger.info('Testing API connections...');

    const jiraConnected = await jiraConnector.testConnection();
    const notionConnected = await notionConnector.testConnection();

    if (!jiraConnected) {
      throw new Error('Failed to connect to Jira API');
    }

    if (!notionConnected) {
      throw new Error('Failed to connect to Notion API');
    }

    logger.info('✅ All API connections successful');
  }

  /**
   * Fetch all required Jira data
   */
  async fetchJiraData(dateRange) {
    logger.info('Fetching Jira data...');

    const squadUuids = config.getAllSquadUuids();

    // Fetch all issues updated in last 7 days
    const allIssues = await jiraConnector.getIssuesUpdatedInLastDays(7, squadUuids);
    logger.info('Fetched all issues', { count: allIssues.length });

    // Fetch completed tickets
    const completedIssues = await jiraConnector.getCompletedTickets(dateRange, squadUuids);
    logger.info('Fetched completed tickets', { count: completedIssues.length });

    // Fetch new tickets
    const newIssues = await jiraConnector.getNewTickets(dateRange, squadUuids);
    logger.info('Fetched new tickets', { count: newIssues.length });

    // Fetch stale tickets
    const staleIssues = await jiraConnector.getStaleTickets(squadUuids);
    logger.info('Fetched stale tickets', { count: staleIssues.length });

    // Fetch backlog tickets
    const backlogIssues = await jiraConnector.getBacklogTickets(squadUuids);
    logger.info('Fetched backlog tickets', { count: backlogIssues.length });

    return {
      allIssues,
      completedIssues,
      newIssues,
      staleIssues,
      backlogIssues
    };
  }

  /**
   * Calculate weekly metrics
   */
  async calculateMetrics(dateRange, jiraData) {
    logger.info('Calculating weekly metrics...');

    const metrics = await metricsCalculator.calculateWeeklyMetrics(dateRange, jiraData);
    
    // Validate metrics
    const validatedMetrics = metricsCalculator.validateMetrics(metrics);
    
    // Get summary
    const summary = metricsCalculator.getSquadSummary(validatedMetrics);
    logger.info('Metrics summary', summary);

    return validatedMetrics;
  }

  /**
   * Organize data for Notion display
   */
  async organizeData(dateRange, jiraData) {
    logger.info('Organizing data for display...');

    const organizedData = await dataOrganizer.organizeData(dateRange, jiraData);
    
    // Get summary
    const summary = dataOrganizer.getDataSummary(organizedData);
    logger.info('Data organization summary', summary);

    return organizedData;
  }

  /**
   * Generate Notion page
   */
  async generateNotionPage(dateRange, metrics, organizedData) {
    logger.info('Generating Notion page...');

    const notionPage = await notionPageGenerator.generateWeeklyReport(
      dateRange,
      metrics,
      organizedData
    );

    return notionPage;
  }

  /**
   * Save data to files
   */
  async saveData(dateRange, metrics, organizedData) {
    logger.info('Saving data to files...');

    // Save weekly metrics
    await dataStorage.saveWeeklyMetrics(dateRange, metrics);

    // Save detailed data
    await dataStorage.saveWeeklyDetails(dateRange, organizedData);

    // Append to historical data
    await dataStorage.appendToHistoricalMetrics(dateRange, metrics);

    // Clean up old data
    dataStorage.cleanupOldData();

    logger.info('✅ Data saved successfully');
  }

  /**
   * Generate report for current week
   */
  async generateCurrentWeekReport() {
    const dateRange = DateUtils.getCurrentWeekRange();
    return this.generateReport(dateRange);
  }

  /**
   * Generate report for previous week
   */
  async generatePreviousWeekReport() {
    const dateRange = DateUtils.getPreviousWeekRange();
    return this.generateReport(dateRange);
  }

  /**
   * Generate report for custom date range
   */
  async generateCustomReport(startDate, endDate) {
    const dateRange = DateUtils.getCustomDateRange(startDate, endDate);
    return this.generateReport(dateRange);
  }

  /**
   * Get report status
   */
  async getReportStatus(dateRange = null) {
    const reportDateRange = dateRange || DateUtils.getPreviousWeekRange();
    
    const metrics = dataStorage.loadWeeklyMetrics(reportDateRange);
    const details = dataStorage.loadWeeklyDetails(reportDateRange);
    
    return {
      dateRange: reportDateRange,
      hasMetrics: !!metrics,
      hasDetails: !!details,
      metrics: metrics?.squads || null,
      generatedAt: metrics?.generatedAt || null
    };
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const generator = new WeeklyReportGenerator();

  try {
    if (args.length === 0) {
      // Default: generate previous week report
      logger.info('No arguments provided, generating previous week report');
      const result = await generator.generatePreviousWeekReport();
      console.log('✅ Report generated successfully!');
      console.log(`📄 Page ID: ${result.pageId}`);
      console.log(`📅 Date Range: ${result.dateRange.display}`);
      console.log(`⏱️  Duration: ${result.duration}ms`);
    } else if (args[0] === 'current') {
      // Generate current week report
      const result = await generator.generateCurrentWeekReport();
      console.log('✅ Current week report generated successfully!');
      console.log(`📄 Page ID: ${result.pageId}`);
    } else if (args[0] === 'previous') {
      // Generate previous week report
      const result = await generator.generatePreviousWeekReport();
      console.log('✅ Previous week report generated successfully!');
      console.log(`📄 Page ID: ${result.pageId}`);
    } else if (args[0] === 'custom' && args.length === 3) {
      // Generate custom date range report
      const result = await generator.generateCustomReport(args[1], args[2]);
      console.log('✅ Custom report generated successfully!');
      console.log(`📄 Page ID: ${result.pageId}`);
    } else if (args[0] === 'status') {
      // Get report status
      const status = await generator.getReportStatus();
      console.log('📊 Report Status:');
      console.log(`📅 Date Range: ${status.dateRange.display}`);
      console.log(`📈 Has Metrics: ${status.hasMetrics}`);
      console.log(`📋 Has Details: ${status.hasDetails}`);
      if (status.generatedAt) {
        console.log(`🕒 Generated At: ${status.generatedAt}`);
      }
    } else {
      console.log('Usage:');
      console.log('  node src/index.js                    # Generate previous week report');
      console.log('  node src/index.js current            # Generate current week report');
      console.log('  node src/index.js previous           # Generate previous week report');
      console.log('  node src/index.js custom YYYY-MM-DD YYYY-MM-DD  # Generate custom date range report');
      console.log('  node src/index.js status             # Get report status');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Export for use as module
module.exports = WeeklyReportGenerator;

// Run CLI if called directly
if (require.main === module) {
  main();
}
