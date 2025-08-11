require('dotenv').config();
const { JiraIngestor } = require('../src/ingestors/jira');
const { SlackIngestor } = require('../src/ingestors/slack');
const { getAllSquads } = require('../src/utils/config');
const { TeamSummaryGenerator } = require('../src/utils/teamSummaryGenerator');
const moment = require('moment');

async function generateSampleNotionPage() {
  console.log('🚀 Generating Sample Notion Page...\n');
  
  try {
    // Initialize ingestors
    const jiraIngestor = new JiraIngestor();
    const slackIngestor = new SlackIngestor();
    
    // Get squad configuration
    const squads = await getAllSquads();
    if (!squads || squads.length === 0) {
      throw new Error('No squads configured');
    }
    
    // Use the first squad for testing
    const testSquad = squads[0];
    console.log(`📋 Testing with squad: ${testSquad.name}\n`);
    
    // Set date range (last 8 days)
    const endDate = moment();
    const startDate = moment().subtract(8, 'days');
    
    console.log(`📅 Date Range: ${startDate.format('MMM DD')} to ${endDate.format('MMM DD, YYYY')}\n`);
    
    // Fetch Jira data
    console.log('🔍 Fetching Jira data...');
    const jiraIssues = await jiraIngestor.fetchIssues(testSquad, { startDate, endDate });
    console.log(`✅ Found ${jiraIssues.length} Jira issues\n`);
    
    // Fetch Slack data
    console.log('💬 Fetching Slack data...');
    const slackData = await slackIngestor.collectData(testSquad, { startDate, endDate });
    console.log(`✅ Found ${slackData.decisions?.length || 0} decisions, ${slackData.risks?.length || 0} risks, ${slackData.launches?.length || 0} launches\n`);
    
    // Generate team summary
    console.log('📊 Generating team summary...');
    const teamSummaryGenerator = new TeamSummaryGenerator();
    const teamSummaries = teamSummaryGenerator.generateTeamSummary(jiraIssues, { startDate, endDate });
    const teamSummary = teamSummaries[testSquad.name] || teamSummaries['Unknown Team'] || {
      teamName: testSquad.name,
      totalIssues: 0,
      issuesWithChanges: 0,
      newItems: 0,
      totalChanges: 0,
      activityLevel: 'No Activity',
      statusChanges: 0,
      assigneeChanges: 0,
      storyPointChanges: 0,
      priorityChanges: 0,
      comments: 0,
      mostActiveIssues: []
    };
    console.log(`✅ Team summary generated\n`);
    
    // Generate the Notion page content
    const pageContent = generateNotionPageContent(
      testSquad,
      { issues: jiraIssues },
      slackData,
      teamSummary,
      startDate,
      endDate
    );
    
    console.log('📄 Generated Notion Page Content:\n');
    console.log('='.repeat(80));
    console.log(pageContent);
    console.log('='.repeat(80));
    
    // Save to file for review
    const fs = require('fs');
    const filename = `sample-notion-page-${moment().format('YYYY-MM-DD-HHmm')}.md`;
    fs.writeFileSync(filename, pageContent);
    console.log(`\n💾 Page content saved to: ${filename}`);
    
  } catch (error) {
    console.error('❌ Error generating Notion page:', error.message);
    console.error(error.stack);
  }
}

function generateNotionPageContent(squad, jiraData, slackData, teamSummary, startDate, endDate) {
  const squadName = squad.name;
  const dateRange = `${startDate.format('MMM DD')} to ${endDate.format('MMM DD, YYYY')}`;
  const generatedTime = moment().format('MMM DD, YYYY [at] h:mm A');
  
  // Extract key data
  const issues = jiraData.issues;
  const decisions = slackData.decisions || [];
  const risks = slackData.risks || [];
  const launches = slackData.launches || [];
  
  // Calculate metrics
  const completedIssues = issues.filter(issue => issue.fields.status.name === 'Done');
  const inProgressIssues = issues.filter(issue => 
    ['In Progress', 'In Review', 'Testing'].includes(issue.fields.status.name)
  );
  const blockedIssues = issues.filter(issue => 
    issue.fields.status.name === 'Blocked' || 
    issue.fields.priority?.name === 'High'
  );
  
  // Generate TL;DR
  const tldr = generateTLDR(issues, decisions, risks, teamSummary);
  
  // Generate sections
  const whatShipped = generateWhatShipped(completedIssues);
  const workInFlight = generateWorkInFlight(inProgressIssues, blockedIssues);
  const risksBlockers = generateRisksBlockers(blockedIssues, risks);
  const decisionsSection = generateDecisions(decisions);
  const roadmapSnapshot = generateRoadmapSnapshot(issues);
  const teamSummarySection = generateTeamSummarySection(teamSummary);
  const changelog = generateChangelog(issues);
  
  return `# ${squadName} Weekly Digest
**Date Range**: ${dateRange}  
**Generated**: ${generatedTime}  
**Team**: ${squadName}

${tldr}

${whatShipped}

${workInFlight}

${risksBlockers}

${decisionsSection}

${roadmapSnapshot}

${teamSummarySection}

${changelog}
`;
}

function generateTLDR(issues, decisions, risks, teamSummary) {
  const completedCount = issues.filter(i => i.fields.status.name === 'Done').length;
  const inProgressCount = issues.filter(i => 
    ['In Progress', 'In Review', 'Testing'].includes(i.fields.status.name)
  ).length;
  const activityLevel = teamSummary.activityLevel;
  
  return `## TL;DR

• **Accomplishment**: Completed ${completedCount} issues with ${activityLevel} activity level
• **Risk**: ${risks.length} potential risks identified in team discussions
• **Decision**: ${decisions.length} key decisions made this week
• **Velocity**: ${inProgressCount} items currently in progress
• **Next Week**: Focus on ${inProgressCount > 0 ? 'completing in-progress items' : 'new sprint planning'}`;
}

function generateWhatShipped(completedIssues) {
  if (completedIssues.length === 0) {
    return `## What Shipped

*No issues were completed in this time period.*`;
  }
  
  const features = completedIssues.filter(issue => 
    issue.fields.issuetype.name === 'Story' || issue.fields.issuetype.name === 'Epic'
  );
  const fixes = completedIssues.filter(issue => 
    issue.fields.issuetype.name === 'Bug' || issue.fields.issuetype.name === 'Task'
  );
  
  let content = `## What Shipped

`;
  
  if (features.length > 0) {
    content += `### Features
`;
    features.forEach(issue => {
      const assignee = issue.fields.assignee?.displayName || 'Unassigned';
      const storyPoints = issue.fields.customfield_10030 || 'N/A';
      content += `• **${issue.key}** - ${issue.fields.summary} (${assignee}, ${storyPoints} SP)\n`;
    });
    content += `\n`;
  }
  
  if (fixes.length > 0) {
    content += `### Fixes & Improvements
`;
    fixes.forEach(issue => {
      const assignee = issue.fields.assignee?.displayName || 'Unassigned';
      content += `• **${issue.key}** - ${issue.fields.summary} (${assignee})\n`;
    });
    content += `\n`;
  }
  
  return content;
}

function generateWorkInFlight(inProgressIssues, blockedIssues) {
  let content = `## Work In Flight

`;
  
  if (inProgressIssues.length > 0) {
    content += `### In Progress
`;
    inProgressIssues.forEach(issue => {
      const assignee = issue.fields.assignee?.displayName || 'Unassigned';
      const storyPoints = issue.fields.customfield_10030 || 'N/A';
      content += `• **${issue.key}** - ${issue.fields.summary} (${issue.fields.status.name}, ${assignee}, ${storyPoints} SP)\n`;
    });
    content += `\n`;
  }
  
  if (blockedIssues.length > 0) {
    content += `### Blocked
`;
    blockedIssues.forEach(issue => {
      const assignee = issue.fields.assignee?.displayName || 'Unassigned';
      content += `• **${issue.key}** - ${issue.fields.summary} (${assignee})\n`;
    });
    content += `\n`;
  }
  
  if (inProgressIssues.length === 0 && blockedIssues.length === 0) {
    content += `*No active work in this time period.*\n`;
  }
  
  return content;
}

function generateRisksBlockers(blockedIssues, risks) {
  let content = `## Risks & Blockers

`;
  
  if (blockedIssues.length > 0) {
    content += `### High Priority
`;
    blockedIssues.forEach(issue => {
      const assignee = issue.fields.assignee?.displayName || 'Unassigned';
      content += `• **${issue.key}** - ${issue.fields.summary} - Blocked by ${issue.fields.status.name} (${assignee})\n`;
    });
    content += `\n`;
  }
  
  if (risks.length > 0) {
    content += `### Medium Priority
`;
    risks.forEach(risk => {
      content += `• **${risk.topic}** - ${risk.description} - ${risk.mitigation}\n`;
    });
    content += `\n`;
  }
  
  if (blockedIssues.length === 0 && risks.length === 0) {
    content += `*No significant risks or blockers identified.*\n`;
  }
  
  return content;
}

function generateDecisions(decisions) {
  let content = `## Decisions

`;
  
  if (decisions.length > 0) {
    content += `### Technical Decisions
`;
    decisions.forEach(decision => {
      content += `• **${decision.topic}** - ${decision.decision} - ${decision.rationale}\n`;
    });
    content += `\n`;
  } else {
    content += `*No key decisions documented this week.*\n`;
  }
  
  return content;
}

function generateRoadmapSnapshot(issues) {
  // Group issues by target quarter
  const issuesByQuarter = {};
  
  issues.forEach(issue => {
    const targetQuarter = issue.fields.customfield_10002 || 'Unknown';
    if (!issuesByQuarter[targetQuarter]) {
      issuesByQuarter[targetQuarter] = [];
    }
    issuesByQuarter[targetQuarter].push(issue);
  });
  
  let content = `## Roadmap Snapshot

`;
  
  const quarters = ['Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026'];
  
  quarters.forEach(quarter => {
    const quarterIssues = issuesByQuarter[quarter] || [];
    if (quarterIssues.length > 0) {
      const endDate = getQuarterEndDate(quarter);
      content += `### ${quarter} (Ends ${endDate})
`;
      
      // Group by epic if possible
      const epicGroups = groupByEpic(quarterIssues);
      epicGroups.forEach(epic => {
        const progress = calculateEpicProgress(epic.issues);
        const startDate = getEarliestToDoDate(epic.issues);
        content += `• **${epic.name}** - ${progress}% - [Start: ${startDate}] → [End: ${endDate}]\n`;
      });
      content += `\n`;
    }
  });
  
  if (Object.keys(issuesByQuarter).length === 0) {
    content += `*No roadmap data available for this time period.*\n`;
  }
  
  return content;
}

function generateTeamSummarySection(teamSummary) {
  return `## Team Summary

### Activity Overview
• **Total Issues**: ${teamSummary.totalIssues}
• **Issues with Changes**: ${teamSummary.issuesWithChanges}
• **New Items**: ${teamSummary.newItems}
• **Total Changes**: ${teamSummary.totalChanges}
• **Activity Level**: ${teamSummary.activityLevel}

### Change Breakdown
• **Status Changes**: ${teamSummary.statusChanges}
• **Assignee Changes**: ${teamSummary.assigneeChanges}
• **Story Point Changes**: ${teamSummary.storyPointChanges}
• **Priority Changes**: ${teamSummary.priorityChanges}
• **Comments**: ${teamSummary.comments}

### Most Active Issues
${teamSummary.mostActiveIssues.map(issue => 
  `• **${issue.key}** - ${issue.title} - ${issue.changes} changes (${issue.assignee})`
).join('\n')}`;
}

function generateChangelog(issues) {
  let content = `## Changelog

`;
  
  // Group changes by date
  const changesByDate = {};
  
  issues.forEach(issue => {
    if (issue.changelog && issue.changelog.histories) {
      issue.changelog.histories.forEach(history => {
        const date = moment(history.created).format('MMM DD');
        if (!changesByDate[date]) {
          changesByDate[date] = [];
        }
        
        history.items.forEach(item => {
          const time = moment(history.created).format('h:mm A');
          const author = history.author.displayName;
          changesByDate[date].push({
            time,
            author,
            issue: issue.key,
            change: `${item.field} changed from "${item.fromString || 'None'}" to "${item.toString || 'None'}"`
          });
        });
      });
    }
  });
  
  // Sort dates and display changes
  const sortedDates = Object.keys(changesByDate).sort((a, b) => 
    moment(a, 'MMM DD').diff(moment(b, 'MMM DD'))
  );
  
  sortedDates.forEach(date => {
    content += `### ${date}
`;
    changesByDate[date].forEach(change => {
      content += `• **${change.time}** - **${change.author}** updated **${change.issue}** - ${change.change}\n`;
    });
    content += `\n`;
  });
  
  if (sortedDates.length === 0) {
    content += `*No changes recorded in this time period.*\n`;
  }
  
  return content;
}

// Helper functions
function getQuarterEndDate(quarter) {
  const quarterEnds = {
    'Q3 2025': 'Sept 30',
    'Q4 2025': 'Dec 31',
    'Q1 2026': 'Mar 31',
    'Q2 2026': 'Jun 30'
  };
  return quarterEnds[quarter] || 'Unknown';
}

function groupByEpic(issues) {
  const epicGroups = {};
  
  issues.forEach(issue => {
    const epicKey = issue.fields.customfield_10014 || 'No Epic';
    const epicName = issue.fields.customfield_10014 ? 
      `Epic ${epicKey}` : 'Uncategorized';
    
    if (!epicGroups[epicKey]) {
      epicGroups[epicKey] = {
        name: epicName,
        issues: []
      };
    }
    epicGroups[epicKey].issues.push(issue);
  });
  
  return Object.values(epicGroups);
}

function calculateEpicProgress(issues) {
  if (issues.length === 0) return 0;
  
  const progressMap = {
    'To Do': 0,
    'In Progress': 25,
    'In Review': 50,
    'Testing': 75,
    'Done': 100
  };
  
  const totalProgress = issues.reduce((sum, issue) => {
    const status = issue.fields.status.name;
    const progress = progressMap[status] || 0;
    const storyPoints = issue.fields.customfield_10030 || 1;
    return sum + (progress * storyPoints);
  }, 0);
  
  const totalStoryPoints = issues.reduce((sum, issue) => 
    sum + (issue.fields.customfield_10030 || 1), 0
  );
  
  return Math.round(totalProgress / totalStoryPoints);
}

function getEarliestToDoDate(issues) {
  let earliestDate = null;
  
  issues.forEach(issue => {
    if (issue.changelog && issue.changelog.histories) {
      const toDoChange = issue.changelog.histories.find(history =>
        history.items.some(item => 
          item.field === 'status' && 
          item.toString === 'To Do'
        )
      );
      
      if (toDoChange) {
        const changeDate = moment(toDoChange.created);
        if (!earliestDate || changeDate.isBefore(earliestDate)) {
          earliestDate = changeDate;
        }
      }
    }
  });
  
  return earliestDate ? earliestDate.format('MMM DD') : 'Unknown';
}

// Run the test
generateSampleNotionPage();
