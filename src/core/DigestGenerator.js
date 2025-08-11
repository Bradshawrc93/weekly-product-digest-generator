const { logger } = require('../utils/logger');
const { loadSquadConfig, getSquadByName, getAllSquads, getGlobalSettings, validateApiConnections } = require('../utils/config');
const { JiraIngestor } = require('../ingestors/jira');
const { GitHubIngestor } = require('../ingestors/github');
const { SlackIngestor } = require('../ingestors/slack');
const { DataProcessor } = require('../processors/DataProcessor');
const { AIGenerator } = require('../generators/AIGenerator');
const { NotionPublisher } = require('../publishers/notion');
const { SlackNotifier } = require('../publishers/slack');
const moment = require('moment');

class DigestGenerator {
  constructor() {
    this.jiraIngestor = new JiraIngestor();
    this.githubIngestor = new GitHubIngestor();
    this.slackIngestor = new SlackIngestor();
    this.dataProcessor = new DataProcessor();
    this.aiGenerator = new AIGenerator();
    this.notionPublisher = new NotionPublisher();
    this.slackNotifier = new SlackNotifier();
  }

  async initialize() {
    logger.info('Initializing Weekly Product Digest Generator');
    
    try {
      // Validate environment and configuration
      await validateApiConnections();
      
      logger.info('Weekly Product Digest Generator initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Weekly Product Digest Generator', { error: error.message });
      throw error;
    }
  }

  async testConnections() {
    logger.info('Testing API connections');
    
    try {
      await validateApiConnections();
      logger.info('All API connections successful');
    } catch (error) {
      logger.error('API connection test failed', { error: error.message });
      throw error;
    }
  }

  async start() {
    await this.initialize();
    // TODO: Initialize scheduler for automated runs
    logger.info('Weekly Product Digest Generator started');
  }

  async generateDigest(options = {}) {
    const startTime = Date.now();
    logger.info('Starting digest generation', { options });
    
    try {
      // Calculate date range
      const dateRange = this.calculateDateRange(options.startDate, options.endDate);
      
      // Get all squads or specific squad
      const squads = options.squad ? [await getSquadByName(options.squad)] : await getAllSquads();
      const globalSettings = await getGlobalSettings();
      
      logger.info('Processing squads', { 
        squadCount: squads.length, 
        dateRange: `${dateRange.startDate.format()} to ${dateRange.endDate.format()}` 
      });
      
      // Process each squad
      const squadResults = [];
      for (const squad of squads) {
        try {
          const result = await this.processSquad(squad, dateRange, options.dryRun);
          squadResults.push(result);
        } catch (error) {
          logger.logSquad('error', 'Failed to process squad', squad.name, { error: error.message });
          squadResults.push({
            squad: squad.name,
            error: error.message,
            issues: [],
            prs: [],
            decisions: [],
            workstreams: [],
            epics: []
          });
        }
      }
      
      // Generate weekly summary
      let weeklySummary = null;
      if (squadResults.length > 1) {
        weeklySummary = await this.generateWeeklySummary(squadResults, dateRange, globalSettings);
      }
      
      // Publish to Notion
      const publishedResults = [];
      for (const result of squadResults) {
        if (!result.error && !options.dryRun) {
          try {
            const notionResult = await this.notionPublisher.publishSquadDigest({
              squad: result.squad,
              digest: result.digest,
              insights: result.insights,
              dateRange
            });
            result.notionPageId = notionResult.pageId;
            publishedResults.push(result);
          } catch (error) {
            logger.logSquad('error', 'Failed to publish squad digest to Notion', result.squad, { error: error.message });
          }
        }
      }
      
      // Publish weekly summary
      let weeklySummaryPageId = null;
      if (weeklySummary && !options.dryRun) {
        try {
          const notionResult = await this.notionPublisher.publishWeeklySummary({
            squadResults: publishedResults,
            rollupSummary: weeklySummary,
            dateRange,
            globalSettings
          });
          weeklySummaryPageId = notionResult.pageId;
        } catch (error) {
          logger.error('Failed to publish weekly summary to Notion', { error: error.message });
        }
      }
      
      // Send notifications
      if (!options.dryRun) {
        await this.sendNotifications({
          squadResults: publishedResults,
          weeklySummary,
          weeklySummaryPageId,
          dateRange,
          globalSettings
        });
      }
      
      const duration = Date.now() - startTime;
      logger.info('Digest generation completed', { 
        duration, 
        successfulSquads: publishedResults.length,
        totalSquads: squads.length 
      });
      
      return {
        squadResults: publishedResults,
        weeklySummary,
        weeklySummaryPageId,
        summary: {
          successfulDigests: publishedResults.length,
          failedDigests: squads.length - publishedResults.length,
          totalIssues: publishedResults.reduce((sum, r) => sum + r.issues.length, 0),
          totalPRs: publishedResults.reduce((sum, r) => sum + r.prs.length, 0),
          totalDecisions: publishedResults.reduce((sum, r) => sum + r.decisions.length, 0)
        }
      };
      
    } catch (error) {
      logger.error('Digest generation failed', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  async processSquad(squad, dateRange, dryRun = false) {
    logger.logSquad('info', 'Processing squad', squad.name);
    
    try {
      // Collect data from all sources
      const jiraData = await this.jiraIngestor.collectData(squad, dateRange);
      const githubData = await this.githubIngestor.collectData(squad, dateRange);
      const slackData = await this.slackIngestor.collectData(squad, dateRange);
      
      // Process and cross-link data
      const processedData = await this.dataProcessor.processSquadData({
        squad,
        workstreams: jiraData.workstreams,
        epics: jiraData.epics,
        issues: jiraData.issues,
        prs: githubData.prs,
        decisions: slackData.decisions,
        dateRange
      });
      
      // Generate AI summary
      const digest = await this.aiGenerator.generateSquadSummary({
        squad,
        processedData,
        dateRange
      });
      
      return {
        squad: squad.name,
        workstreams: jiraData.workstreams,
        epics: jiraData.epics,
        issues: jiraData.issues,
        prs: githubData.prs,
        decisions: slackData.decisions,
        insights: processedData.insights,
        digest
      };
      
    } catch (error) {
      logger.logSquad('error', 'Failed to process squad', squad.name, { error: error.message });
      throw error;
    }
  }

  async generateWeeklySummary(squadResults, dateRange) {
    logger.info('Generating weekly summary');
    
    try {
      // Process rollup data
      const rollupData = await this.dataProcessor.processRollupData(squadResults, dateRange);
      
      // Generate AI summary
      const rollupSummary = await this.aiGenerator.generateRollupSummary(rollupData, dateRange);
      
      return rollupSummary;
      
    } catch (error) {
      logger.error('Failed to generate weekly summary', { error: error.message });
      throw error;
    }
  }

  async sendNotifications(data) {
    const { squadResults, weeklySummary, weeklySummaryPageId, dateRange, globalSettings } = data;
    
    try {
      await this.slackNotifier.sendDigestNotification({
        results: {
          generatedDigests: squadResults,
          executiveRollup: weeklySummary ? { notionPageId: weeklySummaryPageId } : null,
          summary: {
            successfulDigests: squadResults.length,
            failedDigests: 0,
            totalIssues: squadResults.reduce((sum, r) => sum + r.issues.length, 0),
            totalPRs: squadResults.reduce((sum, r) => sum + r.prs.length, 0),
            totalDecisions: squadResults.reduce((sum, r) => sum + r.decisions.length, 0)
          }
        },
        dateRange,
        globalSettings
      });
      
      logger.info('Notifications sent successfully');
    } catch (error) {
      logger.error('Failed to send notifications', { error: error.message });
    }
  }

  calculateDateRange(startDate, endDate) {
    let start, end;
    
    if (startDate && endDate) {
      start = moment(startDate);
      end = moment(endDate);
    } else if (startDate) {
      start = moment(startDate);
      end = start.clone().add(6, 'days');
    } else {
      // Default to current week (Monday to Sunday)
      start = moment().startOf('week').add(1, 'day'); // Monday
      end = start.clone().add(6, 'days'); // Sunday
    }
    
    return { startDate: start, endDate: end };
  }
}

module.exports = { DigestGenerator };
