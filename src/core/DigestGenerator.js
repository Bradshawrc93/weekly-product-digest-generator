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
    this.config = null;
    this.globalSettings = null;
    this.ingestors = {};
    this.processor = null;
    this.aiGenerator = null;
    this.publishers = {};
  }

  /**
   * Initialize the digest generator
   */
  async initialize() {
    try {
      logger.info('Initializing DigestGenerator');
      
      // Load configuration
      this.config = await loadSquadConfig();
      this.globalSettings = this.config.globalSettings;
      
      // Initialize ingestors
      this.ingestors = {
        jira: new JiraIngestor(),
        github: new GitHubIngestor(),
        slack: new SlackIngestor(),
      };
      
      // Initialize processor
      this.processor = new DataProcessor();
      
      // Initialize AI generator
      this.aiGenerator = new AIGenerator();
      
      // Initialize publishers
      this.publishers = {
        notion: new NotionPublisher(),
        slack: new SlackNotifier(),
      };
      
      logger.info('DigestGenerator initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize DigestGenerator', { error: error.message });
      throw error;
    }
  }

  /**
   * Test API connections
   */
  async testConnections() {
    logger.info('Testing API connections');
    const results = await validateApiConnections();
    
    const failedConnections = Object.entries(results)
      .filter(([_, success]) => !success)
      .map(([api, _]) => api);
    
    if (failedConnections.length > 0) {
      throw new Error(`Failed API connections: ${failedConnections.join(', ')}`);
    }
    
    logger.info('All API connections validated successfully');
    return results;
  }

  /**
   * Start the digest generator (for scheduled runs)
   */
  async start() {
    await this.initialize();
    
    // TODO: Initialize scheduler for automated runs
    logger.info('DigestGenerator started successfully');
  }

  /**
   * Generate digest for specified parameters
   */
  async generateDigest(options = {}) {
    const {
      squadName = null,
      startDate = null,
      endDate = null,
      dryRun = false
    } = options;

    try {
      logger.info('Starting digest generation', { squadName, startDate, endDate, dryRun });
      
      // Initialize if not already done
      if (!this.config) {
        await this.initialize();
      }

      // Determine date range
      const dateRange = this.calculateDateRange(startDate, endDate);
      logger.info('Date range calculated', { startDate: dateRange.startDate.format(), endDate: dateRange.endDate.format() });

      // Determine squads to process
      const squads = squadName ? [await getSquadByName(squadName)] : await getAllSquads();
      logger.info('Squads to process', { squadCount: squads.length, squads: squads.map(s => s.name) });

      const results = {
        generatedDigests: [],
        notionPages: [],
        summary: {
          totalSquads: squads.length,
          successfulDigests: 0,
          failedDigests: 0,
          totalIssues: 0,
          totalPRs: 0,
          totalDecisions: 0,
        }
      };

      // Process each squad
      for (const squad of squads) {
        try {
          logger.logSquad('info', 'Processing squad', squad.name);
          
          const squadResult = await this.processSquad(squad, dateRange, dryRun);
          results.generatedDigests.push(squadResult);
          results.summary.successfulDigests++;
          
          // Update summary counts
          results.summary.totalIssues += squadResult.issues.length;
          results.summary.totalPRs += squadResult.prs.length;
          results.summary.totalDecisions += squadResult.decisions.length;
          
          if (!dryRun && squadResult.notionPageId) {
            results.notionPages.push(squadResult.notionPageId);
          }
          
          logger.logSquad('info', 'Squad processed successfully', squad.name, { 
            issues: squadResult.issues.length,
            prs: squadResult.prs.length,
            decisions: squadResult.decisions.length
          });
          
        } catch (error) {
          logger.logSquad('error', 'Failed to process squad', squad.name, { error: error.message });
          results.summary.failedDigests++;
        }
      }

      // Generate executive roll-up if multiple squads
      if (squads.length > 1 && !dryRun) {
        try {
          const rollupResult = await this.generateExecutiveRollup(results.generatedDigests, dateRange);
          results.executiveRollup = rollupResult;
          logger.info('Executive roll-up generated successfully');
        } catch (error) {
          logger.error('Failed to generate executive roll-up', { error: error.message });
        }
      }

      // Send notifications
      if (!dryRun) {
        try {
          await this.sendNotifications(results, dateRange);
          logger.info('Notifications sent successfully');
        } catch (error) {
          logger.error('Failed to send notifications', { error: error.message });
        }
      }

      logger.info('Digest generation completed', { 
        successful: results.summary.successfulDigests,
        failed: results.summary.failedDigests,
        totalIssues: results.summary.totalIssues,
        totalPRs: results.summary.totalPRs
      });

      return results;

    } catch (error) {
      logger.error('Digest generation failed', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Process a single squad
   */
  async processSquad(squad, dateRange, dryRun = false) {
    const result = {
      squad: squad.name,
      dateRange,
      issues: [],
      prs: [],
      decisions: [],
      insights: {},
      digest: null,
      notionPageId: null,
    };

    try {
      // 1. Collect data from all sources
      logger.logSquad('info', 'Collecting data from sources', squad.name);
      
      // Collect Jira data
      const jiraData = await this.ingestors.jira.collectData(squad, dateRange);
      result.issues = jiraData.issues;
      logger.logSquad('info', 'Jira data collected', squad.name, { issueCount: jiraData.issues.length });

      // Collect GitHub data
      const githubData = await this.ingestors.github.collectData(squad, dateRange);
      result.prs = githubData.prs;
      logger.logSquad('info', 'GitHub data collected', squad.name, { prCount: githubData.prs.length });

      // Collect Slack data
      const slackData = await this.ingestors.slack.collectData(squad, dateRange);
      result.decisions = slackData.decisions;
      logger.logSquad('info', 'Slack data collected', squad.name, { decisionCount: slackData.decisions.length });

      // 2. Process and cross-link data
      logger.logSquad('info', 'Processing and cross-linking data', squad.name);
      const processedData = await this.processor.processSquadData({
        squad,
        issues: jiraData.issues,
        prs: githubData.prs,
        decisions: slackData.decisions,
        dateRange
      });
      result.insights = processedData.insights;

      // 3. Generate AI summary
      logger.logSquad('info', 'Generating AI summary', squad.name);
      const aiSummary = await this.aiGenerator.generateSquadSummary({
        squad,
        processedData,
        dateRange
      });
      result.digest = aiSummary;

      // 4. Publish to Notion (if not dry run)
      if (!dryRun) {
        logger.logSquad('info', 'Publishing to Notion', squad.name);
        const notionResult = await this.publishers.notion.publishSquadDigest({
          squad,
          digest: aiSummary,
          insights: processedData.insights,
          dateRange
        });
        result.notionPageId = notionResult.pageId;
      }

      return result;

    } catch (error) {
      logger.logSquad('error', 'Failed to process squad', squad.name, { error: error.message });
      throw error;
    }
  }

  /**
   * Generate executive roll-up
   */
  async generateExecutiveRollup(squadResults, dateRange) {
    try {
      logger.info('Generating executive roll-up');
      
      const rollupData = await this.processor.processRollupData(squadResults, dateRange);
      const rollupSummary = await this.aiGenerator.generateRollupSummary(rollupData, dateRange);
      
      const notionResult = await this.publishers.notion.publishExecutiveRollup({
        squadResults,
        rollupSummary,
        dateRange
      });
      
      return {
        summary: rollupSummary,
        notionPageId: notionResult.pageId
      };
      
    } catch (error) {
      logger.error('Failed to generate executive roll-up', { error: error.message });
      throw error;
    }
  }

  /**
   * Send notifications
   */
  async sendNotifications(results, dateRange) {
    try {
      logger.info('Sending notifications');
      
      await this.publishers.slack.sendDigestNotification({
        results,
        dateRange,
        globalSettings: this.globalSettings
      });
      
    } catch (error) {
      logger.error('Failed to send notifications', { error: error.message });
      throw error;
    }
  }

  /**
   * Calculate date range for digest
   */
  calculateDateRange(startDate, endDate) {
    if (startDate && endDate) {
      return {
        startDate: moment(startDate).startOf('day'),
        endDate: moment(endDate).endOf('day')
      };
    }

    // Default to last week
    const now = moment();
    const lastWeekStart = now.clone().subtract(1, 'week').startOf('week');
    const lastWeekEnd = now.clone().subtract(1, 'week').endOf('week');

    return {
      startDate: lastWeekStart,
      endDate: lastWeekEnd
    };
  }
}

module.exports = { DigestGenerator };
