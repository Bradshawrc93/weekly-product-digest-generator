const moment = require('moment');
const { logger } = require('./logger');

class ChangeAnalyzer {
  constructor() {
    // Define meaningful field changes to track
    this.meaningfulFields = {
      // Standard fields
      'status': 'Status changed',
      'assignee': 'Assignee changed',
      'priority': 'Priority changed',
      'summary': 'Summary updated',
      'description': 'Description updated',
      
      // Custom fields
      'customfield_10001': 'Team changed',
      'customfield_10014': 'Epic link changed',
      'customfield_10030': 'Story points changed',
      'customfield_10368': 'Target quarter changed',
      
      // Activity fields
      'comment': 'Comment added',
      'worklog': 'Time logged'
    };

    // Define change severity levels
    this.changeSeverity = {
      HIGH: ['status', 'assignee', 'customfield_10030', 'customfield_10368'],
      MEDIUM: ['priority', 'summary', 'customfield_10001', 'customfield_10014'],
      LOW: ['description', 'comment', 'worklog']
    };
  }

  /**
   * Analyze changelog to identify meaningful changes
   */
  analyzeChangelog(issue, dateRange) {
    const changes = [];
    const changelog = issue.changelog?.histories || [];

    for (const history of changelog) {
      const changeDate = moment(history.created);
      
      // Only include changes within the date range
      if (!changeDate.isBetween(dateRange.startDate, dateRange.endDate, 'day', '[]')) {
        continue;
      }

      for (const item of history.items || []) {
        const change = this.analyzeChangeItem(item, history, changeDate);
        if (change) {
          changes.push(change);
        }
      }
    }

    return changes;
  }

  /**
   * Analyze individual change item
   */
  analyzeChangeItem(item, history, changeDate) {
    const fieldName = item.field;
    const fieldDisplayName = this.meaningfulFields[fieldName];

    // Skip if not a meaningful field
    if (!fieldDisplayName) {
      return null;
    }

    const severity = this.getChangeSeverity(fieldName);
    const changeType = this.getChangeType(item);

    return {
      field: fieldName,
      fieldDisplayName: fieldDisplayName,
      severity: severity,
      changeType: changeType,
      fromValue: item.fromString,
      toValue: item.toString,
      author: history.author?.displayName || 'Unknown',
      timestamp: changeDate.toISOString(),
      date: changeDate.format('YYYY-MM-DD'),
      time: changeDate.format('HH:mm:ss')
    };
  }

  /**
   * Get change severity level
   */
  getChangeSeverity(fieldName) {
    if (this.changeSeverity.HIGH.includes(fieldName)) {
      return 'HIGH';
    } else if (this.changeSeverity.MEDIUM.includes(fieldName)) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  }

  /**
   * Get change type based on field and values
   */
  getChangeType(item) {
    const { fromString, toString } = item;

    // Handle null/empty values
    if (!fromString && toString) {
      return 'added';
    } else if (fromString && !toString) {
      return 'removed';
    } else if (fromString !== toString) {
      return 'updated';
    }

    return 'modified';
  }

  /**
   * Check if issue has significant changes
   */
  hasSignificantChanges(issue, dateRange) {
    const changes = this.analyzeChangelog(issue, dateRange);
    return changes.length > 0;
  }

  /**
   * Get change summary for an issue
   */
  getChangeSummary(issue, dateRange) {
    const changes = this.analyzeChangelog(issue, dateRange);
    
    if (changes.length === 0) {
      return null;
    }

    const highPriorityChanges = changes.filter(c => c.severity === 'HIGH');
    const mediumPriorityChanges = changes.filter(c => c.severity === 'MEDIUM');
    const lowPriorityChanges = changes.filter(c => c.severity === 'LOW');

    return {
      totalChanges: changes.length,
      highPriorityChanges: highPriorityChanges.length,
      mediumPriorityChanges: mediumPriorityChanges.length,
      lowPriorityChanges: lowPriorityChanges.length,
      changes: changes,
      lastChange: changes[changes.length - 1],
      hasHighPriorityChanges: highPriorityChanges.length > 0,
      changeTypes: [...new Set(changes.map(c => c.fieldDisplayName))]
    };
  }

  /**
   * Generate human-readable change description
   */
  generateChangeDescription(changes) {
    if (changes.length === 0) {
      return 'No changes detected';
    }

    const descriptions = changes.map(change => {
      const { fieldDisplayName, changeType, fromValue, toValue, author, date } = change;
      
      switch (changeType) {
        case 'added':
          return `${fieldDisplayName}: Set to "${toValue}" by ${author}`;
        case 'removed':
          return `${fieldDisplayName}: Removed by ${author}`;
        case 'updated':
          return `${fieldDisplayName}: Changed from "${fromValue}" to "${toValue}" by ${author}`;
        default:
          return `${fieldDisplayName}: Modified by ${author}`;
      }
    });

    return descriptions.join('; ');
  }

  /**
   * Filter issues by change significance
   */
  filterIssuesByChanges(issues, dateRange, minSeverity = 'LOW') {
    const severityOrder = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3 };
    const minSeverityLevel = severityOrder[minSeverity];

    return issues.filter(issue => {
      const changeSummary = this.getChangeSummary(issue, dateRange);
      if (!changeSummary) return false;

      // Check if any changes meet the minimum severity
      return changeSummary.changes.some(change => 
        severityOrder[change.severity] >= minSeverityLevel
      );
    });
  }

  /**
   * Get change statistics for a set of issues
   */
  getChangeStatistics(issues, dateRange) {
    const stats = {
      totalIssues: issues.length,
      issuesWithChanges: 0,
      totalChanges: 0,
      changesBySeverity: { HIGH: 0, MEDIUM: 0, LOW: 0 },
      changesByField: {},
      changesByDate: {},
      mostActiveIssues: []
    };

    const issueChangeCounts = [];

    for (const issue of issues) {
      const changeSummary = this.getChangeSummary(issue, dateRange);
      
      if (changeSummary) {
        stats.issuesWithChanges++;
        stats.totalChanges += changeSummary.totalChanges;

        // Count by severity
        changeSummary.changes.forEach(change => {
          stats.changesBySeverity[change.severity]++;
          
          // Count by field
          const fieldName = change.fieldDisplayName;
          stats.changesByField[fieldName] = (stats.changesByField[fieldName] || 0) + 1;
          
          // Count by date
          const date = change.date;
          stats.changesByDate[date] = (stats.changesByDate[date] || 0) + 1;
        });

        issueChangeCounts.push({
          key: issue.key,
          title: issue.fields.summary,
          changeCount: changeSummary.totalChanges,
          highPriorityChanges: changeSummary.highPriorityChanges
        });
      }
    }

    // Sort issues by change activity
    stats.mostActiveIssues = issueChangeCounts
      .sort((a, b) => b.changeCount - a.changeCount)
      .slice(0, 10);

    return stats;
  }
}

module.exports = { ChangeAnalyzer };
