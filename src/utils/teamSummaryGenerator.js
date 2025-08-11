const moment = require('moment');
const { logger } = require('./logger');

class TeamSummaryGenerator {
  constructor() {
    this.changeTypes = {
      NEW_ITEMS: 'new_items',
      STATUS_CHANGES: 'status_changes',
      ASSIGNEE_CHANGES: 'assignee_changes',
      STORY_POINT_CHANGES: 'story_point_changes',
      PRIORITY_CHANGES: 'priority_changes',
      TARGET_QUARTER_CHANGES: 'target_quarter_changes',
      EPIC_LINK_CHANGES: 'epic_link_changes',
      COMMENTS: 'comments',
      OTHER_CHANGES: 'other_changes'
    };

    // Map team UUIDs to readable names
    this.teamMappings = {
      'eab6f557-2ee3-458c-9511-54c135cd4752-88': 'Customer-Facing (Empower/SmarterAccess UI)',
      'eab6f557-2ee3-458c-9511-54c135cd4752-86': 'Human in the loop (HITL)',
      'eab6f557-2ee3-458c-9511-54c135cd4752-87': 'Developer Efficiency',
      'eab6f557-2ee3-458c-9511-54c135cd4752-85': 'Data Collection / Data Lakehouse',
      'eab6f557-2ee3-458c-9511-54c135cd4752-84': 'ThoughtHub Platform',
      'eab6f557-2ee3-458c-9511-54c135cd4752-83': 'Core RCM',
      'eab6f557-2ee3-458c-9511-54c135cd4752-82': 'Voice',
      'eab6f557-2ee3-458c-9511-54c135cd4752-80': 'Medical Coding',
      'eab6f557-2ee3-458c-9511-54c135cd4752-81': 'Deep Research'
    };
  }

  /**
   * Generate team-based summary of changes and updates
   */
  generateTeamSummary(issues, dateRange) {
    const teamSummaries = {};
    
    // Group issues by team
    issues.forEach(issue => {
      const team = this.getTeamName(issue.fields);
      
      if (!teamSummaries[team]) {
        teamSummaries[team] = this.initializeTeamSummary(team);
      }
      
      this.processIssueForTeam(issue, teamSummaries[team], dateRange);
    });

    // Process and enrich team summaries
    Object.values(teamSummaries).forEach(teamSummary => {
      this.calculateTeamMetrics(teamSummary);
      this.generateTeamInsights(teamSummary);
    });

    return teamSummaries;
  }

  /**
   * Get readable team name from issue fields
   */
  getTeamName(fields) {
    // Try to get team from the Team field (object with id and name)
    const teamField = fields?.customfield_10001;
    
    if (teamField && teamField.id && this.teamMappings[teamField.id]) {
      return this.teamMappings[teamField.id];
    }
    
    // Fallback to team name from the field object
    if (teamField && teamField.name) {
      return teamField.name;
    }
    
    // Fallback to unknown
    return 'Unknown Team';
  }

  /**
   * Initialize a new team summary
   */
  initializeTeamSummary(teamName) {
    return {
      teamName: teamName,
      totalIssues: 0,
      issuesWithChanges: 0,
      newItems: 0,
      totalChanges: 0,
      changeBreakdown: {
        statusChanges: 0,
        assigneeChanges: 0,
        storyPointChanges: 0,
        priorityChanges: 0,
        targetQuarterChanges: 0,
        epicLinkChanges: 0,
        comments: 0,
        otherChanges: 0
      },
      issuesByStatus: {},
      issuesByType: {},
      issuesByPriority: {},
      mostActiveIssues: [],
      recentActivity: [],
      riskIssues: [],
      insights: [],
      lastUpdated: null
    };
  }

  /**
   * Process a single issue for team summary
   */
  processIssueForTeam(issue, teamSummary, dateRange) {
    teamSummary.totalIssues++;
    
    // Check if issue is new (created within date range)
    const createdDate = moment(issue.fields.created);
    if (createdDate.isBetween(dateRange.startDate, dateRange.endDate, 'day', '[]')) {
      teamSummary.newItems++;
    }

    // Track status distribution
    const status = issue.fields.status?.name || 'Unknown';
    teamSummary.issuesByStatus[status] = (teamSummary.issuesByStatus[status] || 0) + 1;

    // Track issue type distribution
    const issueType = issue.fields.issuetype?.name || 'Unknown';
    teamSummary.issuesByType[issueType] = (teamSummary.issuesByType[issueType] || 0) + 1;

    // Track priority distribution
    const priority = issue.fields.priority?.name || 'Unset';
    teamSummary.issuesByPriority[priority] = (teamSummary.issuesByPriority[priority] || 0) + 1;

    // Process changelog for changes
    const changes = this.extractChangesFromIssue(issue, dateRange);
    if (changes.length > 0) {
      teamSummary.issuesWithChanges++;
      teamSummary.totalChanges += changes.length;
      
      // Categorize changes
      changes.forEach(change => {
        this.categorizeChange(change, teamSummary);
      });

      // Add to recent activity
      teamSummary.recentActivity.push({
        issueKey: issue.key,
        issueTitle: issue.fields.summary,
        changes: changes,
        lastChange: changes[changes.length - 1]
      });
    }

    // Track most active issues
    const changeCount = changes.length;
    if (changeCount > 0) {
      teamSummary.mostActiveIssues.push({
        key: issue.key,
        title: issue.fields.summary,
        changeCount: changeCount,
        status: status,
        assignee: issue.fields.assignee?.displayName || 'Unassigned'
      });
    }

    // Update last updated timestamp
    const updatedDate = moment(issue.fields.updated);
    if (!teamSummary.lastUpdated || updatedDate.isAfter(teamSummary.lastUpdated)) {
      teamSummary.lastUpdated = updatedDate.toDate();
    }
  }

  /**
   * Extract changes from issue changelog
   */
  extractChangesFromIssue(issue, dateRange) {
    const changes = [];
    const changelog = issue.changelog?.histories || [];

    changelog.forEach(history => {
      const changeDate = moment(history.created);
      
      // Only include changes within the date range
      if (changeDate.isBetween(dateRange.startDate, dateRange.endDate, 'day', '[]')) {
        history.items?.forEach(item => {
          changes.push({
            field: item.field,
            fromValue: item.fromString,
            toValue: item.toString,
            author: history.author?.displayName || 'Unknown',
            timestamp: changeDate.toISOString(),
            date: changeDate.format('YYYY-MM-DD')
          });
        });
      }
    });

    return changes;
  }

  /**
   * Categorize a change and update team summary
   */
  categorizeChange(change, teamSummary) {
    const field = change.field;
    
    switch (field) {
      case 'status':
        teamSummary.changeBreakdown.statusChanges++;
        break;
      case 'assignee':
        teamSummary.changeBreakdown.assigneeChanges++;
        break;
      case 'customfield_10030': // Story Points
        teamSummary.changeBreakdown.storyPointChanges++;
        break;
      case 'priority':
        teamSummary.changeBreakdown.priorityChanges++;
        break;
      case 'customfield_10368': // Target Quarter
        teamSummary.changeBreakdown.targetQuarterChanges++;
        break;
      case 'customfield_10014': // Epic Link
        teamSummary.changeBreakdown.epicLinkChanges++;
        break;
      case 'comment':
        teamSummary.changeBreakdown.comments++;
        break;
      default:
        teamSummary.changeBreakdown.otherChanges++;
        break;
    }
  }

  /**
   * Calculate team metrics and insights
   */
  calculateTeamMetrics(teamSummary) {
    // Sort most active issues by change count
    teamSummary.mostActiveIssues.sort((a, b) => b.changeCount - a.changeCount);
    teamSummary.mostActiveIssues = teamSummary.mostActiveIssues.slice(0, 5);

    // Sort recent activity by timestamp
    teamSummary.recentActivity.sort((a, b) => 
      moment(b.lastChange.timestamp).valueOf() - moment(a.lastChange.timestamp).valueOf()
    );
    teamSummary.recentActivity = teamSummary.recentActivity.slice(0, 10);
  }

  /**
   * Generate insights for the team
   */
  generateTeamInsights(teamSummary) {
    const insights = [];

    // Activity level insights
    if (teamSummary.totalChanges === 0) {
      insights.push('No activity detected in the specified time period');
    } else if (teamSummary.totalChanges > 20) {
      insights.push('High activity level - team is very active');
    } else if (teamSummary.totalChanges > 10) {
      insights.push('Moderate activity level - steady progress');
    } else {
      insights.push('Low activity level - minimal changes detected');
    }

    // New items insights
    if (teamSummary.newItems > 0) {
      insights.push(`${teamSummary.newItems} new items created`);
    }

    // Status distribution insights
    const inProgress = teamSummary.issuesByStatus['In Progress'] || 0;
    const done = teamSummary.issuesByStatus['Done'] || 0;
    const toDo = teamSummary.issuesByStatus['To Do'] || 0;

    if (inProgress > 0) {
      insights.push(`${inProgress} items currently in progress`);
    }
    if (done > 0) {
      insights.push(`${done} items completed`);
    }
    if (toDo > 0) {
      insights.push(`${toDo} items in backlog`);
    }

    // Change type insights
    if (teamSummary.changeBreakdown.statusChanges > 0) {
      insights.push(`${teamSummary.changeBreakdown.statusChanges} status changes`);
    }
    if (teamSummary.changeBreakdown.assigneeChanges > 0) {
      insights.push(`${teamSummary.changeBreakdown.assigneeChanges} assignee changes`);
    }
    if (teamSummary.changeBreakdown.storyPointChanges > 0) {
      insights.push(`${teamSummary.changeBreakdown.storyPointChanges} story point updates`);
    }

    teamSummary.insights = insights;
  }

  /**
   * Generate formatted team summary report
   */
  generateFormattedReport(teamSummaries, dateRange) {
    const report = {
      generatedAt: new Date().toISOString(),
      dateRange: {
        start: dateRange.startDate.format('YYYY-MM-DD'),
        end: dateRange.endDate.format('YYYY-MM-DD')
      },
      totalTeams: Object.keys(teamSummaries).length,
      teams: {}
    };

    Object.entries(teamSummaries).forEach(([teamName, summary]) => {
      report.teams[teamName] = {
        overview: {
          totalIssues: summary.totalIssues,
          issuesWithChanges: summary.issuesWithChanges,
          newItems: summary.newItems,
          totalChanges: summary.totalChanges,
          lastUpdated: summary.lastUpdated?.toISOString()
        },
        changeBreakdown: summary.changeBreakdown,
        distribution: {
          byStatus: summary.issuesByStatus,
          byType: summary.issuesByType,
          byPriority: summary.issuesByPriority
        },
        mostActiveIssues: summary.mostActiveIssues,
        recentActivity: summary.recentActivity,
        insights: summary.insights
      };
    });

    return report;
  }

  /**
   * Generate human-readable team summary
   */
  generateHumanReadableSummary(teamSummaries, dateRange) {
    const lines = [];
    
    lines.push(`# Team Summary Report`);
    lines.push(`**Date Range**: ${dateRange.startDate.format('YYYY-MM-DD')} to ${dateRange.endDate.format('YYYY-MM-DD')}`);
    lines.push(`**Generated**: ${moment().format('YYYY-MM-DD HH:mm:ss')}`);
    lines.push('');

    Object.entries(teamSummaries).forEach(([teamName, summary]) => {
      lines.push(`## ${teamName}`);
      lines.push('');
      
      // Overview
      lines.push(`### Overview`);
      lines.push(`- **Total Issues**: ${summary.totalIssues}`);
      lines.push(`- **Issues with Changes**: ${summary.issuesWithChanges}`);
      lines.push(`- **New Items**: ${summary.newItems}`);
      lines.push(`- **Total Changes**: ${summary.totalChanges}`);
      lines.push('');

      // Insights
      if (summary.insights.length > 0) {
        lines.push(`### Key Insights`);
        summary.insights.forEach(insight => {
          lines.push(`- ${insight}`);
        });
        lines.push('');
      }

      // Change Breakdown
      if (summary.totalChanges > 0) {
        lines.push(`### Change Breakdown`);
        Object.entries(summary.changeBreakdown).forEach(([changeType, count]) => {
          if (count > 0) {
            const displayName = this.getChangeTypeDisplayName(changeType);
            lines.push(`- **${displayName}**: ${count}`);
          }
        });
        lines.push('');
      }

      // Most Active Issues
      if (summary.mostActiveIssues.length > 0) {
        lines.push(`### Most Active Issues`);
        summary.mostActiveIssues.forEach((issue, index) => {
          lines.push(`${index + 1}. **${issue.key}** - ${issue.title}`);
          lines.push(`   - Status: ${issue.status}`);
          lines.push(`   - Assignee: ${issue.assignee}`);
          lines.push(`   - Changes: ${issue.changeCount}`);
        });
        lines.push('');
      }

      // Recent Activity
      if (summary.recentActivity.length > 0) {
        lines.push(`### Recent Activity`);
        summary.recentActivity.slice(0, 3).forEach(activity => {
          lines.push(`- **${activity.issueKey}** - ${activity.issueTitle}`);
          lines.push(`  - Last change: ${moment(activity.lastChange.timestamp).format('MMM DD, HH:mm')}`);
          lines.push(`  - Changes: ${activity.changes.length}`);
        });
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    });

    return lines.join('\n');
  }

  /**
   * Get display name for change type
   */
  getChangeTypeDisplayName(changeType) {
    const displayNames = {
      statusChanges: 'Status Changes',
      assigneeChanges: 'Assignee Changes',
      storyPointChanges: 'Story Point Changes',
      priorityChanges: 'Priority Changes',
      targetQuarterChanges: 'Target Quarter Changes',
      epicLinkChanges: 'Epic Link Changes',
      comments: 'Comments',
      otherChanges: 'Other Changes'
    };
    return displayNames[changeType] || changeType;
  }
}

module.exports = { TeamSummaryGenerator };
