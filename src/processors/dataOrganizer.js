const config = require('../utils/config');
const { logger } = require('../utils/logger');
const DateUtils = require('../utils/dateUtils');

class DataOrganizer {
  constructor() {
    this.squads = config.squads;
  }

  /**
   * Organize all Jira data by squad and type
   */
  async organizeData(dateRange, jiraData) {
    try {
      const organizedData = {};
      
      for (const squad of this.squads) {
        logger.info('Organizing data for squad', { squad: squad.name });
        
        organizedData[squad.name] = await this.organizeSquadData(squad, dateRange, jiraData);
      }
      
      logger.info('Data organization completed', { 
        squadCount: Object.keys(organizedData).length,
        dateRange: dateRange.display 
      });
      
      return organizedData;
    } catch (error) {
      logger.error('Failed to organize data', { error: error.message });
      throw error;
    }
  }

  /**
   * Organize data for a specific squad
   */
  async organizeSquadData(squad, dateRange, jiraData) {
    try {
      const squadIssues = this.filterIssuesBySquad(jiraData.allIssues, squad.jiraUuid);
      const squadCompleted = this.filterIssuesBySquad(jiraData.completedIssues, squad.jiraUuid);
      const squadNew = this.filterIssuesBySquad(jiraData.newIssues, squad.jiraUuid);
      const squadStale = this.filterIssuesBySquad(jiraData.staleIssues, squad.jiraUuid);
      const squadBacklog = this.filterIssuesBySquad(jiraData.backlogIssues, squad.jiraUuid);
      const squadBlocked = this.filterIssuesBySquad(jiraData.blockedIssues, squad.jiraUuid);

      // Filter out Workstream tickets from stale and backlog (on deck) categories
      const filteredSquadStale = this.filterOutWorkstreamTickets(squadStale);
      const filteredSquadBacklog = this.filterOutWorkstreamTickets(squadBacklog);

      return {
        completedTickets: this.formatCompletedTickets(squadCompleted, dateRange),
        changelogEvents: this.extractChangelogEvents(squadIssues, dateRange),
        staleTickets: this.formatStaleTickets(filteredSquadStale),
        backlogTickets: this.formatBacklogTickets(filteredSquadBacklog),
        blockedTickets: this.formatBlockedTickets(squadBlocked),
        newTickets: this.formatNewTickets(squadNew, dateRange)
      };
    } catch (error) {
      logger.error('Failed to organize squad data', { 
        squad: squad.name,
        error: error.message 
      });
      return {
        completedTickets: [],
        changelogEvents: [],
        staleTickets: [],
        backlogTickets: [],
        blockedTickets: [],
        newTickets: []
      };
    }
  }

  /**
   * Filter issues by squad UUID
   */
  filterIssuesBySquad(issues, squadUuid) {
    return issues.filter(issue => {
      const teamUuid = this.getTeamUuidFromIssue(issue);
      return teamUuid === squadUuid;
    });
  }

  /**
   * Filter out Workstream tickets from issues
   */
  filterOutWorkstreamTickets(issues) {
    return issues.filter(issue => {
      const issueType = issue.fields.issuetype?.name;
      return issueType !== 'Workstream';
    });
  }

  /**
   * Get team UUID from issue
   */
  getTeamUuidFromIssue(issue) {
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
          } else if (field.id) {
            return field.id;
          } else if (field.name) {
            return field.name;
          } else if (Array.isArray(field) && field.length > 0) {
            return field[0].id || field[0].name || field[0].value;
          }
        }
      }
      
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
   * Format completed tickets for display
   */
  formatCompletedTickets(issues, dateRange) {
    return issues.map(issue => {
      const completedDate = this.findCompletionDate(issue, dateRange);
      
      return {
        key: issue.key,
        summary: issue.fields.summary,
        assignee: issue.fields.assignee?.displayName || 'Unassigned',
        completedDate: DateUtils.formatForDisplay(completedDate),
        priority: issue.fields.priority?.name || 'Medium',
        jiraUrl: `${config.jira.baseUrl}/browse/${issue.key}`
      };
    }).sort((a, b) => new Date(b.completedDate) - new Date(a.completedDate));
  }

  /**
   * Find when a ticket was completed
   */
  findCompletionDate(issue, dateRange) {
    try {
      const changelog = issue.changelog?.histories || [];
      
      for (const history of changelog) {
        const historyDate = DateUtils.formatForJira(history.created);
        
        if (DateUtils.isDateInRange(historyDate, dateRange.start, dateRange.end)) {
          for (const item of history.items) {
            if (item.field === 'status' && this.isDoneStatus(item.toString)) {
              return history.created;
            }
          }
        }
      }
      
      // Fallback to issue updated date
      return issue.fields.updated;
    } catch (error) {
      return issue.fields.updated;
    }
  }

  /**
   * Extract changelog events from issues
   */
  extractChangelogEvents(issues, dateRange) {
    const events = [];
    
    for (const issue of issues) {
      const issueEvents = this.extractIssueChangelogEvents(issue, dateRange);
      events.push(...issueEvents);
    }
    
    // Sort by creation date
    return events.sort((a, b) => new Date(a.created) - new Date(b.created));
  }

  /**
   * Extract changelog events from a single issue
   */
  extractIssueChangelogEvents(issue, dateRange) {
    const events = [];
    const changelog = issue.changelog?.histories || [];
    
    for (const history of changelog) {
      const historyDate = DateUtils.formatForJira(history.created);
      
      if (DateUtils.isDateInRange(historyDate, dateRange.start, dateRange.end)) {
        for (const item of history.items) {
          events.push({
            ticketKey: issue.key,
            ticketSummary: issue.fields.summary,
            author: history.author.displayName,
            field: item.field,
            fromString: item.fromString || '',
            toString: item.toString || '',
            created: history.created,
            displayDate: DateUtils.formatForDisplay(history.created),
            jiraUrl: `${config.jira.baseUrl}/browse/${issue.key}`
          });
        }
      }
    }
    
    return events;
  }

  /**
   * Format stale tickets for display
   */
  formatStaleTickets(issues) {
    return issues.map(issue => {
      const daysStale = DateUtils.daysSinceUpdate(issue.fields.updated);
      
      return {
        key: issue.key,
        summary: issue.fields.summary,
        assignee: issue.fields.assignee?.displayName || 'Unassigned',
        lastUpdated: DateUtils.formatForDisplay(issue.fields.updated),
        daysStale,
        priority: issue.fields.priority?.name || 'Medium',
        jiraUrl: `${config.jira.baseUrl}/browse/${issue.key}`
      };
    }).sort((a, b) => b.daysStale - a.daysStale);
  }

  /**
   * Format backlog tickets for display
   */
  formatBacklogTickets(issues) {
    return issues.map(issue => {
      return {
        key: issue.key,
        summary: issue.fields.summary,
        assignee: issue.fields.assignee?.displayName || 'Unassigned',
        priority: issue.fields.priority?.name || 'Medium',
        created: DateUtils.formatForDisplay(issue.fields.created),
        jiraUrl: `${config.jira.baseUrl}/browse/${issue.key}`
      };
    }).sort((a, b) => {
      // Sort by priority first, then by creation date
      const priorityOrder = { 'Highest': 1, 'High': 2, 'Medium': 3, 'Low': 4, 'Lowest': 5 };
      const priorityA = priorityOrder[a.priority] || 3;
      const priorityB = priorityOrder[b.priority] || 3;
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      return new Date(a.created) - new Date(b.created);
    });
  }

  /**
   * Format blocked tickets for display
   */
  formatBlockedTickets(issues) {
    return issues.map(issue => {
      const daysBlocked = DateUtils.daysSinceUpdate(issue.fields.updated);
      
      return {
        key: issue.key,
        summary: issue.fields.summary,
        assignee: issue.fields.assignee?.displayName || 'Unassigned',
        lastUpdated: DateUtils.formatForDisplay(issue.fields.updated),
        daysBlocked,
        priority: issue.fields.priority?.name || 'Medium',
        jiraUrl: `${config.jira.baseUrl}/browse/${issue.key}`
      };
    }).sort((a, b) => b.daysBlocked - a.daysBlocked);
  }

  /**
   * Format new tickets for display
   */
  formatNewTickets(issues, dateRange) {
    return issues.map(issue => {
      return {
        key: issue.key,
        summary: issue.fields.summary,
        assignee: issue.fields.assignee?.displayName || 'Unassigned',
        created: DateUtils.formatForDisplay(issue.fields.created),
        priority: issue.fields.priority?.name || 'Medium',
        status: issue.fields.status?.name || 'Open',
        jiraUrl: `${config.jira.baseUrl}/browse/${issue.key}`
      };
    }).sort((a, b) => new Date(b.created) - new Date(a.created));
  }

  /**
   * Check if status is considered "done"
   */
  isDoneStatus(status) {
    const doneStatuses = config.statusCategories.done || [];
    return doneStatuses.includes(status);
  }

  /**
   * Group changelog events by ticket
   */
  groupChangelogByTicket(events) {
    const grouped = {};
    
    for (const event of events) {
      if (!grouped[event.ticketKey]) {
        grouped[event.ticketKey] = {
          key: event.ticketKey,
          summary: event.ticketSummary,
          events: []
        };
      }
      grouped[event.ticketKey].events.push(event);
    }
    
    return Object.values(grouped);
  }

  /**
   * Get summary statistics for organized data
   */
  getDataSummary(organizedData) {
    const summary = {
      totalCompleted: 0,
      totalChangelogEvents: 0,
      totalStale: 0,
      totalBacklog: 0,
      totalBlocked: 0,
      totalNew: 0,
      squadsWithActivity: 0
    };

    for (const [squadName, squadData] of Object.entries(organizedData)) {
      summary.totalCompleted += squadData.completedTickets.length;
      summary.totalChangelogEvents += squadData.changelogEvents.length;
      summary.totalStale += squadData.staleTickets.length;
      summary.totalBacklog += squadData.backlogTickets.length;
      summary.totalBlocked += squadData.blockedTickets.length;
      summary.totalNew += squadData.newTickets.length;
      
      if (squadData.completedTickets.length > 0 || squadData.changelogEvents.length > 0) {
        summary.squadsWithActivity++;
      }
    }

    return summary;
  }
}

module.exports = new DataOrganizer();
