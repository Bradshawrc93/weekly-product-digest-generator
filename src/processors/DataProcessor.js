const { logger } = require('../utils/logger');
const moment = require('moment');

class DataProcessor {
  constructor() {
    // Initialize processor
  }

  async processSquadData(data) {
    const { squad, issues, prs, decisions, dateRange } = data;
    
    logger.logSquad('info', 'Processing squad data', squad.name);
    
    try {
      // Cross-link data
      const crossLinkedData = await this.crossLinkData(issues, prs, decisions);
      
      // Generate insights
      const insights = await this.generateInsights(crossLinkedData, squad, dateRange);
      
      return {
        crossLinkedData,
        insights
      };
    } catch (error) {
      logger.logSquad('error', 'Failed to process squad data', squad.name, { error: error.message });
      throw error;
    }
  }

  async crossLinkData(issues, prs, decisions) {
    logger.debug('Cross-linking data');
    
    // Link PRs to Jira issues
    const linkedIssues = this.linkPRsToIssues(issues, prs);
    
    // Link Slack decisions to relevant issues/PRs
    const linkedDecisions = this.linkDecisionsToIssues(decisions, linkedIssues);
    
    // Build epic hierarchies
    const epicHierarchies = this.buildEpicHierarchies(linkedIssues);
    
    return {
      issues: linkedIssues,
      prs: prs,
      decisions: linkedDecisions,
      epics: epicHierarchies,
      links: this.generateLinkSummary(linkedIssues, linkedDecisions)
    };
  }

  linkPRsToIssues(issues, prs) {
    return issues.map(issue => {
      const linkedPRs = prs.filter(pr => 
        pr.linkedIssues.includes(issue.key)
      );
      
      return {
        ...issue,
        linkedPRs: linkedPRs.map(pr => ({
          number: pr.number,
          title: pr.title,
          author: pr.author,
          mergedAt: pr.mergedAt,
          url: pr.url,
          repository: pr.repository
        }))
      };
    });
  }

  linkDecisionsToIssues(decisions, issues) {
    return decisions.map(decision => {
      // Find issues mentioned in the decision text
      const mentionedIssues = this.extractIssueMentions(decision.text);
      const linkedIssues = issues.filter(issue => 
        mentionedIssues.includes(issue.key)
      );
      
      return {
        ...decision,
        linkedIssues: linkedIssues.map(issue => ({
          key: issue.key,
          title: issue.title,
          status: issue.status
        }))
      };
    });
  }

  extractIssueMentions(text) {
    // Extract Jira issue keys from text
    const matches = text.match(/(?:PLAT|MOB|DATA|PROJ)-\d+/gi) || [];
    return [...new Set(matches)];
  }

  buildEpicHierarchies(issues) {
    const epics = {};
    
    // Group issues by epic
    issues.forEach(issue => {
      if (issue.epicKey) {
        if (!epics[issue.epicKey]) {
          epics[issue.epicKey] = {
            key: issue.epicKey,
            issues: [],
            totalPoints: 0,
            completedPoints: 0,
            riskFactors: []
          };
        }
        
        epics[issue.epicKey].issues.push(issue);
        epics[issue.epicKey].totalPoints += issue.storyPoints.total;
        epics[issue.epicKey].completedPoints += issue.storyPoints.done;
        epics[issue.epicKey].riskFactors.push(...issue.riskFactors);
      }
    });
    
    // Calculate epic-level metrics
    Object.values(epics).forEach(epic => {
      epic.riskFactors = [...new Set(epic.riskFactors)];
      epic.completionRate = epic.totalPoints > 0 ? epic.completedPoints / epic.totalPoints : 0;
      epic.issueCount = epic.issues.length;
      epic.completedIssues = epic.issues.filter(issue => 
        ['Done', 'Closed', 'Resolved'].includes(issue.status)
      ).length;
    });
    
    return epics;
  }

  generateLinkSummary(issues, decisions) {
    return {
      totalIssues: issues.length,
      totalPRs: issues.reduce((sum, issue) => sum + issue.linkedPRs.length, 0),
      totalDecisions: decisions.length,
      linkedDecisions: decisions.filter(d => d.linkedIssues.length > 0).length,
      orphanedIssues: issues.filter(issue => issue.linkedPRs.length === 0).length
    };
  }

  async generateInsights(data, squad, dateRange) {
    logger.debug('Generating insights', { squad: squad.name });
    
    const velocity = this.calculateVelocity(data.issues, dateRange);
    const risks = this.identifyRisks(data.issues, data.epics);
    const quarterSnapshot = this.generateQuarterSnapshot(data.issues, data.epics);
    const decisions = this.processDecisions(data.decisions);
    
    return {
      velocity,
      risks,
      quarterSnapshot,
      decisions,
      summary: this.generateSummary(data, velocity, risks)
    };
  }

  calculateVelocity(issues, dateRange) {
    const completedIssues = issues.filter(issue => 
      ['Done', 'Closed', 'Resolved'].includes(issue.status) &&
      moment(issue.lastUpdated).isBetween(dateRange.startDate, dateRange.endDate)
    );
    
    const plannedIssues = issues.filter(issue => 
      moment(issue.created).isBefore(dateRange.startDate) &&
      !['Done', 'Closed', 'Resolved'].includes(issue.status)
    );
    
    const completedPoints = completedIssues.reduce((sum, issue) => sum + issue.storyPoints.done, 0);
    const plannedPoints = plannedIssues.reduce((sum, issue) => sum + issue.storyPoints.total, 0);
    
    const velocity = plannedPoints > 0 ? completedPoints / plannedPoints : 0;
    
    // Determine trend (would need historical data for real trend analysis)
    const trend = velocity > 0.8 ? 'increasing' : velocity > 0.6 ? 'stable' : 'decreasing';
    
    return {
      plannedPoints,
      completedPoints,
      velocity,
      trend,
      comparison: 'last_week', // PLACEHOLDER: Would need historical data
      completedIssues: completedIssues.length,
      plannedIssues: plannedIssues.length
    };
  }

  identifyRisks(issues, epics) {
    const highRiskEpics = Object.values(epics)
      .filter(epic => epic.riskFactors.length > 0)
      .map(epic => epic.key);
    
    const riskFactors = {};
    Object.values(epics).forEach(epic => {
      if (epic.riskFactors.length > 0) {
        riskFactors[epic.key] = epic.riskFactors;
      }
    });
    
    const riskScore = this.calculateRiskScore(issues, epics);
    
    return {
      highRiskEpics,
      riskFactors,
      riskScore,
      totalRisks: issues.filter(issue => issue.riskFactors.length > 0).length,
      riskBreakdown: this.breakdownRisks(issues)
    };
  }

  calculateRiskScore(issues, epics) {
    const totalIssues = issues.length;
    const riskIssues = issues.filter(issue => issue.riskFactors.length > 0).length;
    
    if (totalIssues === 0) return 0;
    
    // Base score from percentage of issues with risks
    let score = riskIssues / totalIssues;
    
    // Add weight for high-risk epics
    const highRiskEpics = Object.values(epics).filter(epic => epic.riskFactors.length > 0).length;
    const totalEpics = Object.keys(epics).length;
    
    if (totalEpics > 0) {
      score += (highRiskEpics / totalEpics) * 0.3;
    }
    
    return Math.min(score, 1.0);
  }

  breakdownRisks(issues) {
    const breakdown = {};
    
    issues.forEach(issue => {
      issue.riskFactors.forEach(factor => {
        breakdown[factor] = (breakdown[factor] || 0) + 1;
      });
    });
    
    return breakdown;
  }

  generateQuarterSnapshot(issues, epics) {
    const quarters = {};
    
    // Group by target quarter
    [...issues, ...Object.values(epics)].forEach(item => {
      const quarter = item.targetQuarter || 'Unassigned';
      
      if (!quarters[quarter]) {
        quarters[quarter] = {
          epicCount: 0,
          totalPoints: 0,
          completedPoints: 0,
          completionRate: 0,
          issues: []
        };
      }
      
      if (item.key && item.key.includes('-')) {
        // This is an issue
        quarters[quarter].issues.push(item);
      } else {
        // This is an epic
        quarters[quarter].epicCount++;
        quarters[quarter].totalPoints += item.totalPoints || 0;
        quarters[quarter].completedPoints += item.completedPoints || 0;
      }
    });
    
    // Calculate completion rates
    Object.values(quarters).forEach(quarter => {
      quarter.completionRate = quarter.totalPoints > 0 ? quarter.completedPoints / quarter.totalPoints : 0;
    });
    
    return quarters;
  }

  processDecisions(decisions) {
    return decisions.map(decision => ({
      text: decision.text,
      owner: decision.author,
      date: moment.unix(decision.timestamp).format('YYYY-MM-DD'),
      permalink: decision.permalink,
      impact: this.assessDecisionImpact(decision),
      linkedIssues: decision.linkedIssues
    }));
  }

  assessDecisionImpact(decision) {
    // PLACEHOLDER: Implement decision impact assessment
    // This could be based on number of linked issues, keywords, etc.
    const linkedIssueCount = decision.linkedIssues.length;
    
    if (linkedIssueCount > 5) return 'high';
    if (linkedIssueCount > 2) return 'medium';
    return 'low';
  }

  generateSummary(data, velocity, risks) {
    return {
      totalIssues: data.issues.length,
      totalPRs: data.links.totalPRs,
      totalDecisions: data.decisions.length,
      velocity: velocity.velocity,
      riskScore: risks.riskScore,
      completionRate: velocity.completedPoints / (velocity.plannedPoints || 1)
    };
  }

  async processRollupData(squadResults, dateRange) {
    logger.info('Processing rollup data', { squadCount: squadResults.length });
    
    const allIssues = [];
    const allPRs = [];
    const allDecisions = [];
    const crossSquadDependencies = [];
    
    // Aggregate data from all squads
    squadResults.forEach(result => {
      allIssues.push(...result.issues);
      allPRs.push(...result.prs);
      allDecisions.push(...result.decisions);
    });
    
    // Identify cross-squad dependencies
    const dependencies = this.identifyCrossSquadDependencies(squadResults);
    
    // Calculate company-wide metrics
    const companyMetrics = this.calculateCompanyMetrics(squadResults);
    
    return {
      totalSquads: squadResults.length,
      totalIssues: allIssues.length,
      totalPRs: allPRs.length,
      totalDecisions: allDecisions.length,
      crossSquadDependencies: dependencies,
      companyMetrics,
      squadSummaries: squadResults.map(result => ({
        name: result.squad,
        issues: result.issues.length,
        prs: result.prs.length,
        decisions: result.decisions.length,
        velocity: result.insights?.velocity?.velocity || 0,
        riskScore: result.insights?.risks?.riskScore || 0
      }))
    };
  }

  identifyCrossSquadDependencies(squadResults) {
    const dependencies = [];
    
    // PLACEHOLDER: Implement cross-squad dependency detection
    // This could be based on:
    // - Shared components
    // - API dependencies
    // - Database dependencies
    // - Shared external services
    
    return dependencies;
  }

  calculateCompanyMetrics(squadResults) {
    const totalVelocity = squadResults.reduce((sum, result) => 
      sum + (result.insights?.velocity?.velocity || 0), 0
    );
    
    const avgVelocity = squadResults.length > 0 ? totalVelocity / squadResults.length : 0;
    
    const totalRiskScore = squadResults.reduce((sum, result) => 
      sum + (result.insights?.risks?.riskScore || 0), 0
    );
    
    const avgRiskScore = squadResults.length > 0 ? totalRiskScore / squadResults.length : 0;
    
    return {
      averageVelocity: avgVelocity,
      averageRiskScore: avgRiskScore,
      totalIssues: squadResults.reduce((sum, result) => sum + result.issues.length, 0),
      totalPRs: squadResults.reduce((sum, result) => sum + result.prs.length, 0),
      totalDecisions: squadResults.reduce((sum, result) => sum + result.decisions.length, 0)
    };
  }
}

module.exports = { DataProcessor };
