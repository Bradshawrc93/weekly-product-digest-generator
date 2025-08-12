const config = require('../utils/config');
const { logger } = require('../utils/logger');
const DateUtils = require('../utils/dateUtils');

class MetricsCalculator {
  constructor() {
    this.squads = config.squads;
  }

  /**
   * Calculate weekly metrics for all squads
   */
  async calculateWeeklyMetrics(dateRange, jiraData) {
    try {
      const metrics = {};
      
      for (const squad of this.squads) {
        logger.info('Calculating metrics for squad', { squad: squad.name });
        
        metrics[squad.name] = await this.calculateSquadMetrics(squad, dateRange, jiraData);
      }
      
      logger.info('Weekly metrics calculated', { 
        squadCount: Object.keys(metrics).length,
        dateRange: dateRange.display 
      });
      
      return metrics;
    } catch (error) {
      logger.error('Failed to calculate weekly metrics', { error: error.message });
      throw error;
    }
  }

  /**
   * Calculate metrics for a specific squad
   */
  async calculateSquadMetrics(squad, dateRange, jiraData) {
    try {
      const squadIssues = this.filterIssuesBySquad(jiraData.allIssues, squad.jiraUuid);
      const squadCompleted = this.filterIssuesBySquad(jiraData.completedIssues, squad.jiraUuid);
      const squadNew = this.filterIssuesBySquad(jiraData.newIssues, squad.jiraUuid);
      const squadStale = this.filterIssuesBySquad(jiraData.staleIssues, squad.jiraUuid);
      const squadBacklog = this.filterIssuesBySquad(jiraData.backlogIssues, squad.jiraUuid);

      // Calculate metrics
      const done = squadCompleted.length;
      const updated = this.countUpdatedIssues(squadIssues, dateRange);
      const created = squadNew.length;
      const stale = squadStale.length;
      const inProgress = this.countInProgressIssues(squadIssues);

      logger.logSquadData(squad.name, 'metrics', { done, updated, created, stale, inProgress });

      return {
        done,
        updated,
        created,
        stale,
        inProgress
      };
    } catch (error) {
      logger.error('Failed to calculate squad metrics', { 
        squad: squad.name,
        error: error.message 
      });
      return { done: 0, updated: 0, created: 0, stale: 0, inProgress: 0 };
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
   * Get team UUID from issue
   */
  getTeamUuidFromIssue(issue) {
    try {
      const teamField = issue.fields.customfield_10001;
      if (teamField && teamField.value) {
        return teamField.value;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Count issues with updates in date range
   */
  countUpdatedIssues(issues, dateRange) {
    return issues.filter(issue => {
      const updatedDate = DateUtils.formatForJira(issue.fields.updated);
      return DateUtils.isDateInRange(updatedDate, dateRange.start, dateRange.end);
    }).length;
  }

  /**
   * Count issues currently in progress
   */
  countInProgressIssues(issues) {
    return issues.filter(issue => {
      const status = issue.fields.status?.name || '';
      return this.isInProgressStatus(status);
    }).length;
  }

  /**
   * Check if status is considered "in progress"
   */
  isInProgressStatus(status) {
    const inProgressStatuses = config.statusCategories.inProgress || [];
    return inProgressStatuses.includes(status);
  }

  /**
   * Check if status is considered "done"
   */
  isDoneStatus(status) {
    const doneStatuses = config.statusCategories.done || [];
    return doneStatuses.includes(status);
  }

  /**
   * Check if status is considered "backlog"
   */
  isBacklogStatus(status) {
    const backlogStatuses = config.statusCategories.backlog || [];
    return backlogStatuses.includes(status);
  }

  /**
   * Get priority level from issue
   */
  getPriorityLevel(issue) {
    try {
      const priority = issue.fields.priority?.name || 'Medium';
      return priority;
    } catch (error) {
      return 'Medium';
    }
  }

  /**
   * Sort issues by priority
   */
  sortIssuesByPriority(issues) {
    const priorityOrder = { 'Highest': 1, 'High': 2, 'Medium': 3, 'Low': 4, 'Lowest': 5 };
    
    return issues.sort((a, b) => {
      const priorityA = priorityOrder[this.getPriorityLevel(a)] || 3;
      const priorityB = priorityOrder[this.getPriorityLevel(b)] || 3;
      return priorityA - priorityB;
    });
  }

  /**
   * Calculate days since last update
   */
  calculateDaysSinceUpdate(issue) {
    try {
      const updatedDate = new Date(issue.fields.updated);
      return DateUtils.daysSinceUpdate(updatedDate);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Validate metrics data
   */
  validateMetrics(metrics) {
    const requiredFields = ['done', 'updated', 'created', 'stale', 'inProgress'];
    
    for (const [squadName, squadMetrics] of Object.entries(metrics)) {
      for (const field of requiredFields) {
        if (typeof squadMetrics[field] !== 'number' || squadMetrics[field] < 0) {
          logger.warn('Invalid metric value', { 
            squad: squadName, 
            field, 
            value: squadMetrics[field] 
          });
          squadMetrics[field] = 0;
        }
      }
    }
    
    return metrics;
  }

  /**
   * Get squad summary statistics
   */
  getSquadSummary(metrics) {
    const summary = {
      totalSquads: Object.keys(metrics).length,
      totalDone: 0,
      totalUpdated: 0,
      totalCreated: 0,
      totalStale: 0,
      totalInProgress: 0,
      mostActiveSquad: null,
      leastActiveSquad: null
    };

    let maxActivity = 0;
    let minActivity = Infinity;

    for (const [squadName, squadMetrics] of Object.entries(metrics)) {
      const activity = squadMetrics.done + squadMetrics.updated + squadMetrics.created;
      
      summary.totalDone += squadMetrics.done;
      summary.totalUpdated += squadMetrics.updated;
      summary.totalCreated += squadMetrics.created;
      summary.totalStale += squadMetrics.stale;
      summary.totalInProgress += squadMetrics.inProgress;

      if (activity > maxActivity) {
        maxActivity = activity;
        summary.mostActiveSquad = squadName;
      }

      if (activity < minActivity) {
        minActivity = activity;
        summary.leastActiveSquad = squadName;
      }
    }

    return summary;
  }
}

module.exports = new MetricsCalculator();
