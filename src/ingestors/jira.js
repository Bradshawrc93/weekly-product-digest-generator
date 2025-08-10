const { logger } = require('../utils/logger');
const axios = require('axios');
const moment = require('moment');

class JiraIngestor {
  constructor() {
    this.baseUrl = process.env.JIRA_BASE_URL;
    this.auth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
    this.apiVersion = '3';
  }

  async collectData(squad, dateRange) {
    logger.logSquad('info', 'Collecting Jira data', squad.name, { 
      startDate: dateRange.startDate.format(), 
      endDate: dateRange.endDate.format() 
    });
    
    try {
      const issues = await this.fetchIssues(squad, dateRange);
      const epics = await this.fetchEpics(squad, dateRange);
      
      // Process and enrich data
      const processedIssues = await this.processIssues(issues, squad);
      const processedEpics = await this.processEpics(epics, squad);
      
      return {
        issues: processedIssues,
        epics: processedEpics,
        summary: {
          totalIssues: processedIssues.length,
          totalEpics: processedEpics.length,
          issuesByStatus: this.groupByStatus(processedIssues),
          issuesByType: this.groupByType(processedIssues),
          riskIssues: processedIssues.filter(issue => issue.riskFactors.length > 0).length
        }
      };
    } catch (error) {
      logger.logSquad('error', 'Failed to collect Jira data', squad.name, { error: error.message });
      throw error;
    }
  }

  async fetchIssues(squad, dateRange) {
    logger.logSquad('debug', 'Fetching Jira issues', squad.name, { 
      projectKeys: squad.jiraProjectKeys,
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
          fields: 'summary,issuetype,status,assignee,duedate,storypoints,customfield_10001,customfield_10002,customfield_10014,updated,created,labels,components,priority,description',
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
          fields: 'summary,status,duedate,customfield_10001,customfield_10002,updated,created,labels,components,priority,description',
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

  buildIssueJQL(squad, dateRange) {
    const projectFilter = squad.jiraProjectKeys.map(key => `project = ${key}`).join(' OR ');
    const dateFilter = `updated >= "${dateRange.startDate.format('YYYY-MM-DD')}" AND updated <= "${dateRange.endDate.format('YYYY-MM-DD')}"`;
    const issueTypes = 'issuetype IN (Story, Task, Bug, Sub-task)';
    const excludeLabel = 'labels != "no-digest"';
    
    return `(${projectFilter}) AND ${dateFilter} AND ${issueTypes} AND ${excludeLabel} ORDER BY updated DESC`;
  }

  buildEpicJQL(squad, dateRange) {
    const projectFilter = squad.jiraProjectKeys.map(key => `project = ${key}`).join(' OR ');
    const dateFilter = `updated >= "${dateRange.startDate.format('YYYY-MM-DD')}" AND updated <= "${dateRange.endDate.format('YYYY-MM-DD')}"`;
    const issueTypes = 'issuetype = Epic';
    const excludeLabel = 'labels != "no-digest"';
    
    return `(${projectFilter}) AND ${dateFilter} AND ${issueTypes} AND ${excludeLabel} ORDER BY updated DESC`;
  }

  async processIssues(issues, squad) {
    return issues.map(issue => {
      const storyPoints = this.extractStoryPoints(issue);
      const targetQuarter = this.extractCustomField(issue, 'customfield_10001'); // PLACEHOLDER: Target Quarter field
      const confidence = this.extractCustomField(issue, 'customfield_10002'); // PLACEHOLDER: Confidence field
      const epicKey = this.extractCustomField(issue, 'customfield_10014'); // PLACEHOLDER: Epic Link field
      
      const riskFactors = this.assessRiskFactors(issue, squad);
      
      return {
        key: issue.key,
        title: issue.fields.summary,
        type: issue.fields.issuetype.name,
        status: issue.fields.status.name,
        storyPoints: storyPoints,
        targetQuarter: targetQuarter,
        dueDate: issue.fields.duedate,
        assignee: issue.fields.assignee?.emailAddress,
        epicKey: epicKey,
        linkedPRs: [], // Will be populated by cross-linking
        lastUpdated: issue.fields.updated,
        created: issue.fields.created,
        labels: issue.fields.labels || [],
        components: issue.fields.components?.map(c => c.name) || [],
        priority: issue.fields.priority?.name,
        confidence: confidence,
        riskFactors: riskFactors,
        changelog: this.processChangelog(issue.changelog?.histories || [])
      };
    });
  }

  async processEpics(epics, squad) {
    return epics.map(epic => {
      const targetQuarter = this.extractCustomField(epic, 'customfield_10001');
      const confidence = this.extractCustomField(epic, 'customfield_10002');
      
      const riskFactors = this.assessRiskFactors(epic, squad);
      
      return {
        key: epic.key,
        title: epic.fields.summary,
        status: epic.fields.status.name,
        targetQuarter: targetQuarter,
        dueDate: epic.fields.duedate,
        lastUpdated: epic.fields.updated,
        created: epic.fields.created,
        labels: epic.fields.labels || [],
        components: epic.fields.components?.map(c => c.name) || [],
        priority: epic.fields.priority?.name,
        confidence: confidence,
        riskFactors: riskFactors,
        changelog: this.processChangelog(epic.changelog?.histories || [])
      };
    });
  }

  extractStoryPoints(issue) {
    // PLACEHOLDER: Story points field mapping
    // This needs to be configured based on your Jira setup
    const storyPointsField = 'customfield_10003'; // PLACEHOLDER: Replace with actual field ID
    
    const total = issue.fields[storyPointsField] || 0;
    const done = this.calculateDoneStoryPoints(issue);
    
    return { total, done };
  }

  calculateDoneStoryPoints(issue) {
    // PLACEHOLDER: Calculate done story points based on status
    // This logic needs to be customized based on your workflow
    const doneStatuses = ['Done', 'Closed', 'Resolved'];
    
    if (doneStatuses.includes(issue.fields.status.name)) {
      return issue.fields['customfield_10003'] || 0; // PLACEHOLDER: Story points field
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
