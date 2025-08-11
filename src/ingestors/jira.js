const { logger } = require('../utils/logger');
const { StateManager } = require('../utils/stateManager');
const { ChangeAnalyzer } = require('../utils/changeAnalyzer');
const axios = require('axios');
const moment = require('moment');

class JiraIngestor {
  constructor() {
    this.baseUrl = process.env.JIRA_BASE_URL;
    this.auth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
    this.apiVersion = '3';
    this.stateManager = new StateManager();
    this.changeAnalyzer = new ChangeAnalyzer();
  }

  async collectData(squad, dateRange) {
    logger.logSquad('info', 'Collecting Jira data', squad.name, { 
      startDate: dateRange.startDate.format(), 
      endDate: dateRange.endDate.format() 
    });
    
    try {
      // Get last run timestamp for incremental sync
      const lastRunTimestamp = await this.stateManager.getLastRunTimestamp();
      const incrementalStartDate = lastRunTimestamp || dateRange.startDate;
      
      logger.logSquad('info', 'Using incremental sync', squad.name, {
        lastRunTimestamp: lastRunTimestamp?.toISOString(),
        incrementalStartDate: incrementalStartDate.format(),
        fullDateRange: `${dateRange.startDate.format()} to ${dateRange.endDate.format()}`
      });

      // Fetch data with incremental date range
      const workstreams = await this.fetchWorkstreams(squad, { startDate: incrementalStartDate, endDate: dateRange.endDate });
      const epics = await this.fetchEpics(squad, { startDate: incrementalStartDate, endDate: dateRange.endDate });
      const issues = await this.fetchIssues(squad, { startDate: incrementalStartDate, endDate: dateRange.endDate });
      
      // Analyze changes for the full date range
      const issuesWithChanges = this.changeAnalyzer.filterIssuesByChanges(issues, dateRange, 'LOW');
      const changeStats = this.changeAnalyzer.getChangeStatistics(issues, dateRange);
      
      logger.logSquad('info', 'Change analysis completed', squad.name, {
        totalIssues: issues.length,
        issuesWithChanges: issuesWithChanges.length,
        changeStats: changeStats
      });
      
      // Process and enrich data
      const processedWorkstreams = await this.processWorkstreams(workstreams, squad);
      const processedEpics = await this.processEpics(epics, squad);
      const processedIssues = await this.processIssues(issuesWithChanges, squad);
      
      // Save current timestamp for next run
      await this.stateManager.saveLastRunTimestamp(dateRange.endDate);
      
      return {
        workstreams: processedWorkstreams,
        epics: processedEpics,
        issues: processedIssues,
        changeStats: changeStats,
        summary: {
          totalWorkstreams: processedWorkstreams.length,
          totalEpics: processedEpics.length,
          totalIssues: processedIssues.length,
          issuesByStatus: this.groupByStatus(processedIssues),
          issuesByType: this.groupByType(processedIssues),
          riskIssues: processedIssues.filter(issue => issue.riskFactors.length > 0).length,
          issuesWithChanges: issuesWithChanges.length,
          totalChanges: changeStats.totalChanges
        }
      };
    } catch (error) {
      logger.logSquad('error', 'Failed to collect Jira data', squad.name, { error: error.message });
      throw error;
    }
  }

  async fetchWorkstreams(squad, dateRange) {
    logger.logSquad('debug', 'Fetching Jira workstreams', squad.name);
    
    const jql = this.buildWorkstreamJQL(squad, dateRange);
    
    try {
      const response = await axios.get(`${this.baseUrl}/rest/api/${this.apiVersion}/search`, {
        headers: {
          'Authorization': `Basic ${this.auth}`,
          'Content-Type': 'application/json'
        },
        params: {
          jql: jql,
          maxResults: 100,
          fields: 'summary,status,assignee,priority,description,updated,created,customfield_10001,customfield_10014,customfield_10030,customfield_10368',
          expand: 'changelog'
        }
      });

      logger.logSquad('info', 'Jira workstreams fetched successfully', squad.name, { 
        totalWorkstreams: response.data.total,
        returnedWorkstreams: response.data.issues.length 
      });

      return response.data.issues;
    } catch (error) {
      logger.logSquad('error', 'Failed to fetch Jira workstreams', squad.name, { error: error.message });
      throw error;
    }
  }

  async fetchEpics(squad, dateRange) {
    logger.logSquad('debug', 'Fetching Jira epics', squad.name);
    
    const jql = this.buildEpicJQL(squad, dateRange);
    
    try {
      const response = await axios.get(`${this.baseUrl}/rest/api/${this.apiVersion}/search`, {
        headers: {
          'Authorization': `Basic ${this.auth}`,
          'Content-Type': 'application/json'
        },
        params: {
          jql: jql,
          maxResults: 500,
          fields: 'summary,status,assignee,priority,description,updated,created,customfield_10001,customfield_10014,customfield_10030,customfield_10368',
          expand: 'changelog'
        }
      });

      logger.logSquad('info', 'Jira epics fetched successfully', squad.name, { 
        totalEpics: response.data.total,
        returnedEpics: response.data.issues.length 
      });

      return response.data.issues;
    } catch (error) {
      logger.logSquad('error', 'Failed to fetch Jira epics', squad.name, { error: error.message });
      throw error;
    }
  }

  async fetchIssues(squad, dateRange) {
    logger.logSquad('debug', 'Fetching Jira issues', squad.name, { 
      projectKey: squad.jiraConfig.projectKey,
      dateRange: `${dateRange.startDate.format()} to ${dateRange.endDate.format()}`
    });

    const jql = this.buildIssueJQL(squad, dateRange);
    
    try {
      const response = await axios.get(`${this.baseUrl}/rest/api/${this.apiVersion}/search`, {
        headers: {
          'Authorization': `Basic ${this.auth}`,
          'Content-Type': 'application/json'
        },
        params: {
          jql: jql,
          maxResults: 1000,
          fields: 'summary,issuetype,status,assignee,priority,description,updated,created,customfield_10001,customfield_10014,customfield_10030,customfield_10368',
          expand: 'changelog'
        }
      });

      logger.logSquad('info', 'Jira issues fetched successfully', squad.name, { 
        totalIssues: response.data.total,
        returnedIssues: response.data.issues.length 
      });

      return response.data.issues;
    } catch (error) {
      logger.logSquad('error', 'Failed to fetch Jira issues', squad.name, { 
        error: error.message,
        status: error.response?.status,
        jql: jql
      });
      throw error;
    }
  }

  buildWorkstreamJQL(squad, dateRange) {
    const projectFilter = `project = ${squad.jiraConfig.projectKey}`;
    const dateFilter = `updated >= "${dateRange.startDate.format('YYYY-MM-DD')}" AND updated <= "${dateRange.endDate.format('YYYY-MM-DD')}"`;
    const issueTypes = 'issuetype = Workstream';
    // Use the correct team field structure for your Jira instance
    const teamFilter = this.getTeamFilter(squad.name);
    // Fix the labels filter to handle undefined/null labels
    const excludeLabel = '(labels IS EMPTY OR labels != "no-digest")';
    
    return `${projectFilter} AND ${dateFilter} AND ${issueTypes} AND ${teamFilter} AND ${excludeLabel} ORDER BY updated DESC`;
  }

  buildEpicJQL(squad, dateRange) {
    const projectFilter = `project = ${squad.jiraConfig.projectKey}`;
    const dateFilter = `updated >= "${dateRange.startDate.format('YYYY-MM-DD')}" AND updated <= "${dateRange.endDate.format('YYYY-MM-DD')}"`;
    const issueTypes = 'issuetype = Epic';
    const teamFilter = this.getTeamFilter(squad.name);
    // Fix the labels filter to handle undefined/null labels
    const excludeLabel = '(labels IS EMPTY OR labels != "no-digest")';
    
    return `${projectFilter} AND ${dateFilter} AND ${issueTypes} AND ${teamFilter} AND ${excludeLabel} ORDER BY updated DESC`;
  }

  buildIssueJQL(squad, dateRange) {
    const projectFilter = `project = ${squad.jiraConfig.projectKey}`;
    const dateFilter = `updated >= "${dateRange.startDate.format('YYYY-MM-DD')}" AND updated <= "${dateRange.endDate.format('YYYY-MM-DD')}"`;
    const issueTypes = 'issuetype IN (Story, Task, Bug, Sub-task)';
    const teamFilter = this.getTeamFilter(squad.name);
    // Fix the labels filter to handle undefined/null labels
    const excludeLabel = '(labels IS EMPTY OR labels != "no-digest")';
    
    return `${projectFilter} AND ${dateFilter} AND ${issueTypes} AND ${teamFilter} AND ${excludeLabel} ORDER BY updated DESC`;
  }

  async processWorkstreams(workstreams, squad) {
    return workstreams.map(workstream => {
      const targetQuarter = this.extractCustomField(workstream, 'customfield_10368');
      const team = this.extractCustomField(workstream, 'customfield_10001');
      
      const riskFactors = this.assessRiskFactors(workstream, squad);
      
      return {
        key: workstream.key,
        title: workstream.fields.summary,
        type: workstream.fields.issuetype.name,
        status: workstream.fields.status.name,
        targetQuarter: targetQuarter,
        dueDate: workstream.fields.duedate,
        lastUpdated: workstream.fields.updated,
        created: workstream.fields.created,

        priority: workstream.fields.priority?.name,
        team: team,
        riskFactors: riskFactors,
        changelog: this.processChangelog(workstream.changelog?.histories || [])
      };
    });
  }

  async processEpics(epics, squad) {
    return epics.map(epic => {
      const targetQuarter = this.extractCustomField(epic, 'customfield_10368');
      const team = this.extractCustomField(epic, 'customfield_10001');
      
      const riskFactors = this.assessRiskFactors(epic, squad);
      
      return {
        key: epic.key,
        title: epic.fields.summary,
        status: epic.fields.status.name,
        targetQuarter: targetQuarter,
        dueDate: epic.fields.duedate,
        lastUpdated: epic.fields.updated,
        created: epic.fields.created,

        priority: epic.fields.priority?.name,
        team: team,
        riskFactors: riskFactors,
        changelog: this.processChangelog(epic.changelog?.histories || [])
      };
    });
  }

  async processIssues(issues, squad) {
    return issues.map(issue => {
      const storyPoints = this.extractStoryPoints(issue);
      const targetQuarter = this.extractCustomField(issue, 'customfield_10368');
      const epicKey = this.extractCustomField(issue, 'customfield_10014');
      const team = this.extractCustomField(issue, 'customfield_10001');
      
      const riskFactors = this.assessRiskFactors(issue, squad);
      
      // Analyze changes for this issue
      const changeSummary = this.changeAnalyzer.getChangeSummary(issue, { 
        startDate: moment().subtract(8, 'days'), 
        endDate: moment() 
      });
      
      return {
        key: issue.key,
        title: issue.fields.summary,
        type: issue.fields.issuetype.name,
        status: issue.fields.status.name,
        storyPoints: storyPoints,
        targetQuarter: targetQuarter,
        dueDate: issue.fields.duedate,
        assignee: issue.fields.assignee?.displayName || issue.fields.assignee?.emailAddress,
        epicKey: epicKey,
        team: team,
        linkedPRs: [], // Will be populated by cross-linking
        lastUpdated: issue.fields.updated,
        created: issue.fields.created,
        priority: issue.fields.priority?.name,
        riskFactors: riskFactors,
        changelog: this.processChangelog(issue.changelog?.histories || []),
        changeSummary: changeSummary,
        hasChanges: changeSummary !== null,
        changeDescription: changeSummary ? this.changeAnalyzer.generateChangeDescription(changeSummary.changes) : null
      };
    });
  }

  /**
   * Get the correct team filter for a squad name
   */
  getTeamFilter(squadName) {
    // Map squad names to their UUID values in Jira
    const teamMappings = {
      'Customer-Facing (Empower/SmarterAccess UI)': 'eab6f557-2ee3-458c-9511-54c135cd4752-88',
      'Human in the loop (HITL)': 'eab6f557-2ee3-458c-9511-54c135cd4752-86',
      'Developer Efficiency': 'eab6f557-2ee3-458c-9511-54c135cd4752-87',
      'Data Collection / Data Lakehouse': 'eab6f557-2ee3-458c-9511-54c135cd4752-85',
      'ThoughtHub Platform': 'eab6f557-2ee3-458c-9511-54c135cd4752-84',
      'Core RCM': 'eab6f557-2ee3-458c-9511-54c135cd4752-83',
      'Voice': 'eab6f557-2ee3-458c-9511-54c135cd4752-82',
      'Medical Coding': 'eab6f557-2ee3-458c-9511-54c135cd4752-80',
      'Deep Research': 'eab6f557-2ee3-458c-9511-54c135cd4752-81'
    };
    
    const teamUuid = teamMappings[squadName];
    if (!teamUuid) {
      logger.warn(`No team UUID mapping found for squad: ${squadName}`);
      return `"Team[Team]" = "${squadName}"`; // Fallback to name matching
    }
    
    // Use the correct JQL syntax for team field
    return `"Team" = "${teamUuid}"`;
  }

  extractStoryPoints(issue) {
    // Use the configured story points field
    const storyPointsField = 'customfield_10030'; // Story Points field
    
    const total = issue.fields[storyPointsField] || 0;
    const done = this.calculateDoneStoryPoints(issue);
    
    return { total, done };
  }

  calculateDoneStoryPoints(issue) {
    const doneStatuses = ['Done', 'Closed', 'Resolved'];
    
    if (doneStatuses.includes(issue.fields.status.name)) {
      return issue.fields['customfield_10030'] || 0; // Story points field
    }
    
    return 0;
  }

  extractCustomField(issue, fieldId) {
    return issue.fields[fieldId] || null;
  }

  assessRiskFactors(issue, squad) {
    const riskFactors = [];
    const now = moment();
    const lastUpdated = moment(issue.fields.updated);
    const dueDate = issue.fields.duedate ? moment(issue.fields.duedate) : null;
    
    // No movement in 14+ days
    if (now.diff(lastUpdated, 'days') >= 14) {
      riskFactors.push('no_movement_14_days');
    }
    
    // Overdue due date
    if (dueDate && now.isAfter(dueDate)) {
      riskFactors.push('overdue');
    }
    
    // Scope creep detection (would need historical data)
    // PLACEHOLDER: Implement scope creep detection
    
    // Confidence drop detection
    // PLACEHOLDER: Implement confidence drop detection
    
    return riskFactors;
  }

  processChangelog(histories) {
    return histories.map(history => ({
      author: history.author.emailAddress,
      timestamp: history.created,
      changes: history.items.map(item => ({
        field: item.field,
        fromString: item.fromString,
        toString: item.toString
      }))
    }));
  }

  groupByStatus(issues) {
    return issues.reduce((acc, issue) => {
      const status = issue.status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }

  groupByType(issues) {
    return issues.reduce((acc, issue) => {
      const type = issue.type || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
  }
}

module.exports = { JiraIngestor };
