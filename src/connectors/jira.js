const axios = require('axios');
const config = require('../utils/config');
const { logger } = require('../utils/logger');
const DateUtils = require('../utils/dateUtils');

class JiraConnector {
  constructor() {
    this.baseUrl = config.jira.baseUrl;
    this.auth = Buffer.from(`${config.jira.email}:${config.jira.apiToken}`).toString('base64');
    this.headers = {
      'Authorization': `Basic ${this.auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  }

  /**
   * Test Jira connection
   */
  async testConnection() {
    try {
      const response = await axios.get(`${this.baseUrl}/rest/api/3/myself`, {
        headers: this.headers
      });
      
      logger.info('Jira connection successful', { 
        user: response.data.displayName,
        email: response.data.emailAddress 
      });
      
      return true;
    } catch (error) {
      logger.error('Jira connection failed', { 
        error: error.message,
        status: error.response?.status 
      });
      return false;
    }
  }

  /**
   * Search for issues using JQL
   */
  async searchIssues(jql, fields = ['summary', 'status', 'priority', 'assignee', 'created', 'updated'], maxResults = 1000) {
    try {
      const response = await axios.post(`${this.baseUrl}/rest/api/3/search`, {
        jql,
        fields,
        maxResults,
        expand: ['changelog']
      }, {
        headers: this.headers
      });

      logger.info('Jira search successful', { 
        jql: jql.substring(0, 100) + '...',
        total: response.data.total,
        returned: response.data.issues.length 
      });

      return response.data.issues;
    } catch (error) {
      logger.error('Jira search failed', { 
        error: error.message,
        jql: jql.substring(0, 100) + '...',
        status: error.response?.status 
      });
      throw error;
    }
  }

  /**
   * Get issues updated in the last N days
   */
  async getIssuesUpdatedInLastDays(days, squadUuids = null) {
    let jql = `updated >= ${DateUtils.getJqlDateRange(days)}`;
    
    if (squadUuids && squadUuids.length > 0) {
      const squadFilter = squadUuids.map(uuid => `"${uuid}"`).join(', ');
      jql += ` AND "Team" in (${squadFilter})`;
    }
    
    jql += ' ORDER BY updated DESC';
    
    return this.searchIssues(jql, [
      'summary', 
      'status', 
      'priority', 
      'assignee', 
      'created', 
      'updated',
      'customfield_10001' // Team field
    ]);
  }

  /**
   * Get stale tickets (in progress with no updates in 5+ days)
   */
  async getStaleTickets(squadUuids = null) {
    let jql = 'status in ("In Progress") AND updated <= -5d';
    
    if (squadUuids && squadUuids.length > 0) {
      const squadFilter = squadUuids.map(uuid => `"${uuid}"`).join(', ');
      jql += ` AND "Team" in (${squadFilter})`;
    }
    
    jql += ' ORDER BY updated ASC';
    
    return this.searchIssues(jql, [
      'summary', 
      'status', 
      'priority', 
      'assignee', 
      'created', 
      'updated',
      'customfield_10001' // Team field
    ]);
  }

  /**
   * Get completed tickets (moved to Done in last 7 days)
   */
  async getCompletedTickets(dateRange, squadUuids = null) {
    let jql = `status changed to Done DURING ("${dateRange.start}", "${dateRange.end}")`;
    
    if (squadUuids && squadUuids.length > 0) {
      const squadFilter = squadUuids.map(uuid => `"${uuid}"`).join(', ');
      jql += ` AND "Team" in (${squadFilter})`;
    }
    
    jql += ' ORDER BY updated DESC';
    
    return this.searchIssues(jql, [
      'summary', 
      'status', 
      'priority', 
      'assignee', 
      'created', 
      'updated',
      'customfield_10001' // Team field
    ]);
  }

  /**
   * Get new tickets created in last 7 days
   */
  async getNewTickets(dateRange, squadUuids = null) {
    let jql = `created >= "${dateRange.start}" AND created <= "${dateRange.end}"`;
    
    if (squadUuids && squadUuids.length > 0) {
      const squadFilter = squadUuids.map(uuid => `"${uuid}"`).join(', ');
      jql += ` AND "Team" in (${squadFilter})`;
    }
    
    jql += ' ORDER BY created DESC';
    
    return this.searchIssues(jql, [
      'summary', 
      'status', 
      'priority', 
      'assignee', 
      'created', 
      'updated',
      'customfield_10001' // Team field
    ]);
  }

  /**
   * Get backlog tickets organized by priority
   */
  async getBacklogTickets(squadUuids = null) {
    let jql = 'status in ("Backlog", "Open")';
    
    if (squadUuids && squadUuids.length > 0) {
      const squadFilter = squadUuids.map(uuid => `"${uuid}"`).join(', ');
      jql += ` AND "Team" in (${squadFilter})`;
    }
    
    jql += ' ORDER BY priority DESC, created ASC';
    
    return this.searchIssues(jql, [
      'summary', 
      'status', 
      'priority', 
      'assignee', 
      'created', 
      'updated',
      'customfield_10001' // Team field
    ]);
  }

  /**
   * Get changelog for specific issues
   */
  async getChangelog(issueKeys, dateRange) {
    try {
      const issues = [];
      
      for (const key of issueKeys) {
        const response = await axios.get(`${this.baseUrl}/rest/api/3/issue/${key}`, {
          params: {
            expand: 'changelog',
            fields: 'summary,status,priority,assignee,created,updated,customfield_10001'
          },
          headers: this.headers
        });
        
        const issue = response.data;
        const changelog = issue.changelog.histories || [];
        
        // Filter changelog events within date range
        const filteredChangelog = changelog.filter(history => {
          const historyDate = DateUtils.formatForJira(history.created);
          return DateUtils.isDateInRange(historyDate, dateRange.start, dateRange.end);
        });
        
        issues.push({
          ...issue,
          changelog: filteredChangelog
        });
      }
      
      logger.info('Changelog fetched', { 
        issueCount: issues.length,
        dateRange: dateRange.display 
      });
      
      return issues;
    } catch (error) {
      logger.error('Failed to fetch changelog', { 
        error: error.message,
        issueKeys: issueKeys.slice(0, 5) // Log first 5 keys
      });
      throw error;
    }
  }

  /**
   * Get team field value from issue
   */
  getTeamFromIssue(issue) {
    try {
      // Try multiple possible field names for team
      const possibleFields = [
        'customfield_10001', // Team field
        'customfield_10002', // Alternative team field
        'components', // Components field
        'project' // Project field
      ];
      
      for (const fieldName of possibleFields) {
        const field = issue.fields[fieldName];
        if (field) {
          if (field.value) {
            return field.value;
          } else if (field.name) {
            return field.name;
          } else if (Array.isArray(field) && field.length > 0) {
            return field[0].name || field[0].value;
          }
        }
      }
      
      // Log the available fields for debugging
      logger.debug('Available fields for team extraction', {
        issueKey: issue.key,
        fields: Object.keys(issue.fields).filter(key => key.includes('customfield') || key.includes('team') || key.includes('component'))
      });
      
      return null;
    } catch (error) {
      logger.warn('Failed to extract team from issue', { 
        issueKey: issue.key,
        error: error.message 
      });
      return null;
    }
  }

  /**
   * Extract changelog events from issue
   */
  extractChangelogEvents(issue, dateRange) {
    try {
      const events = [];
      const changelog = issue.changelog?.histories || [];
      
      changelog.forEach(history => {
        const historyDate = DateUtils.formatForJira(history.created);
        
        if (DateUtils.isDateInRange(historyDate, dateRange.start, dateRange.end)) {
          history.items.forEach(item => {
            events.push({
              ticketKey: issue.key,
              author: history.author.displayName,
              field: item.field,
              fromString: item.fromString,
              toString: item.toString,
              created: history.created
            });
          });
        }
      });
      
      return events;
    } catch (error) {
      logger.warn('Failed to extract changelog events', { 
        issueKey: issue.key,
        error: error.message 
      });
      return [];
    }
  }
}

module.exports = new JiraConnector();
