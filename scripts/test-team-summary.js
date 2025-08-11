#!/usr/bin/env node

/**
 * Test team summary generation with mock data
 */

require('dotenv').config();
const { TeamSummaryGenerator } = require('../src/utils/teamSummaryGenerator');
const moment = require('moment');

async function testTeamSummary() {
  console.log('🚀 Testing Team Summary Generation\n');
  console.log('=' .repeat(60));
  
  try {
    const teamSummaryGenerator = new TeamSummaryGenerator();
    
    // Test date range (last 8 days)
    const endDate = moment();
    const startDate = moment().subtract(8, 'days');
    const dateRange = { startDate, endDate };
    
    console.log(`📅 Testing date range: ${startDate.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}\n`);
    
    // Create mock Jira issues with different teams
    const mockIssues = [
      // Platform Squad Issues
      {
        key: 'PO-123',
        fields: {
          summary: 'Implement voice agent feature',
          status: { name: 'In Progress' },
          assignee: { displayName: 'John Doe' },
          priority: { name: 'High' },
          issuetype: { name: 'Story' },
          updated: moment().subtract(2, 'days').toISOString(),
          created: moment().subtract(10, 'days').toISOString(),
          customfield_10001: 'Platform Squad', // Team
          customfield_10014: 'PO-100', // Epic Link
          customfield_10030: 8, // Story Points
          customfield_10368: 'Q3 2025' // Target Quarter
        },
        changelog: {
          histories: [
            {
              created: moment().subtract(1, 'day').toISOString(),
              author: { displayName: 'Jane Smith' },
              items: [
                { field: 'status', fromString: 'To Do', toString: 'In Progress' },
                { field: 'assignee', fromString: null, toString: 'John Doe' }
              ]
            },
            {
              created: moment().subtract(3, 'days').toISOString(),
              author: { displayName: 'Mike Johnson' },
              items: [
                { field: 'customfield_10030', fromString: '5', toString: '8' }
              ]
            }
          ]
        }
      },
      {
        key: 'PO-124',
        fields: {
          summary: 'Fix authentication bug',
          status: { name: 'Done' },
          assignee: { displayName: 'Alice Brown' },
          priority: { name: 'Medium' },
          issuetype: { name: 'Bug' },
          updated: moment().subtract(5, 'days').toISOString(),
          created: moment().subtract(15, 'days').toISOString(),
          customfield_10001: 'Platform Squad',
          customfield_10014: 'PO-101',
          customfield_10030: 3,
          customfield_10368: 'Q2 2025'
        },
        changelog: {
          histories: [
            {
              created: moment().subtract(4, 'days').toISOString(),
              author: { displayName: 'Alice Brown' },
              items: [
                { field: 'status', fromString: 'In Progress', toString: 'Done' }
              ]
            }
          ]
        }
      },
      {
        key: 'PO-125',
        fields: {
          summary: 'Update API documentation',
          status: { name: 'To Do' },
          assignee: null,
          priority: { name: 'Low' },
          issuetype: { name: 'Task' },
          updated: moment().subtract(20, 'days').toISOString(),
          created: moment().subtract(25, 'days').toISOString(),
          customfield_10001: 'Platform Squad',
          customfield_10014: null,
          customfield_10030: 2,
          customfield_10368: 'Q3 2025'
        },
        changelog: {
          histories: []
        }
      },
      
      // Mobile Squad Issues
      {
        key: 'PO-126',
        fields: {
          summary: 'Implement push notifications',
          status: { name: 'In Progress' },
          assignee: { displayName: 'Bob Wilson' },
          priority: { name: 'High' },
          issuetype: { name: 'Story' },
          updated: moment().subtract(1, 'day').toISOString(),
          created: moment().subtract(5, 'days').toISOString(),
          customfield_10001: 'Mobile Squad',
          customfield_10014: 'PO-102',
          customfield_10030: 13,
          customfield_10368: 'Q3 2025'
        },
        changelog: {
          histories: [
            {
              created: moment().subtract(1, 'day').toISOString(),
              author: { displayName: 'Bob Wilson' },
              items: [
                { field: 'status', fromString: 'To Do', toString: 'In Progress' },
                { field: 'customfield_10030', fromString: '8', toString: '13' }
              ]
            }
          ]
        }
      },
      {
        key: 'PO-127',
        fields: {
          summary: 'Fix iOS crash on startup',
          status: { name: 'Done' },
          assignee: { displayName: 'Carol Davis' },
          priority: { name: 'High' },
          issuetype: { name: 'Bug' },
          updated: moment().subtract(3, 'days').toISOString(),
          created: moment().subtract(8, 'days').toISOString(),
          customfield_10001: 'Mobile Squad',
          customfield_10014: 'PO-103',
          customfield_10030: 5,
          customfield_10368: 'Q2 2025'
        },
        changelog: {
          histories: [
            {
              created: moment().subtract(3, 'days').toISOString(),
              author: { displayName: 'Carol Davis' },
              items: [
                { field: 'status', fromString: 'In Progress', toString: 'Done' },
                { field: 'priority', fromString: 'Medium', toString: 'High' }
              ]
            }
          ]
        }
      },
      
      // Data Squad Issues
      {
        key: 'PO-128',
        fields: {
          summary: 'Optimize database queries',
          status: { name: 'To Do' },
          assignee: { displayName: 'David Lee' },
          priority: { name: 'Medium' },
          issuetype: { name: 'Story' },
          updated: moment().subtract(30, 'days').toISOString(),
          created: moment().subtract(35, 'days').toISOString(),
          customfield_10001: 'Data Squad',
          customfield_10014: 'PO-104',
          customfield_10030: 8,
          customfield_10368: 'Q3 2025'
        },
        changelog: {
          histories: []
        }
      },
      {
        key: 'PO-129',
        fields: {
          summary: 'Set up data pipeline monitoring',
          status: { name: 'In Progress' },
          assignee: { displayName: 'Eva Garcia' },
          priority: { name: 'Medium' },
          issuetype: { name: 'Task' },
          updated: moment().subtract(2, 'days').toISOString(),
          created: moment().subtract(7, 'days').toISOString(),
          customfield_10001: 'Data Squad',
          customfield_10014: 'PO-105',
          customfield_10030: 5,
          customfield_10368: 'Q3 2025'
        },
        changelog: {
          histories: [
            {
              created: moment().subtract(2, 'days').toISOString(),
              author: { displayName: 'Eva Garcia' },
              items: [
                { field: 'status', fromString: 'To Do', toString: 'In Progress' },
                { field: 'assignee', fromString: null, toString: 'Eva Garcia' }
              ]
            }
          ]
        }
      }
    ];
    
    console.log('📊 Generating team summaries...\n');
    
    // Generate team summaries
    const teamSummaries = teamSummaryGenerator.generateTeamSummary(mockIssues, dateRange);
    
    console.log('✅ Team summary generation completed!\n');
    
    // Display results
    console.log('📋 Team Summary Results:');
    console.log(`• Total teams: ${Object.keys(teamSummaries).length}`);
    console.log(`• Teams found: ${Object.keys(teamSummaries).join(', ')}\n`);
    
    // Display detailed team summaries
    Object.entries(teamSummaries).forEach(([teamName, summary]) => {
      console.log(`🏢 **${teamName}**`);
      console.log(`   📊 Overview:`);
      console.log(`      • Total Issues: ${summary.totalIssues}`);
      console.log(`      • Issues with Changes: ${summary.issuesWithChanges}`);
      console.log(`      • New Items: ${summary.newItems}`);
      console.log(`      • Total Changes: ${summary.totalChanges}`);
      console.log(`      • Last Updated: ${summary.lastUpdated ? moment(summary.lastUpdated).format('MMM DD, HH:mm') : 'N/A'}`);
      
      if (summary.insights.length > 0) {
        console.log(`   💡 Key Insights:`);
        summary.insights.forEach(insight => {
          console.log(`      • ${insight}`);
        });
      }
      
      if (summary.totalChanges > 0) {
        console.log(`   🔄 Change Breakdown:`);
        Object.entries(summary.changeBreakdown).forEach(([changeType, count]) => {
          if (count > 0) {
            const displayName = teamSummaryGenerator.getChangeTypeDisplayName(changeType);
            console.log(`      • ${displayName}: ${count}`);
          }
        });
      }
      
      if (summary.mostActiveIssues.length > 0) {
        console.log(`   🔥 Most Active Issues:`);
        summary.mostActiveIssues.forEach((issue, index) => {
          console.log(`      ${index + 1}. ${issue.key} - ${issue.title}`);
          console.log(`         Status: ${issue.status}, Assignee: ${issue.assignee}, Changes: ${issue.changeCount}`);
        });
      }
      
      console.log('');
    });
    
    // Generate formatted report
    console.log('📄 Generating formatted report...\n');
    const formattedReport = teamSummaryGenerator.generateFormattedReport(teamSummaries, dateRange);
    
    console.log('📊 Formatted Report Summary:');
    console.log(`• Generated at: ${moment(formattedReport.generatedAt).format('YYYY-MM-DD HH:mm:ss')}`);
    console.log(`• Date range: ${formattedReport.dateRange.start} to ${formattedReport.dateRange.end}`);
    console.log(`• Total teams: ${formattedReport.totalTeams}`);
    
    // Generate human-readable summary
    console.log('\n📝 Human-Readable Summary:\n');
    const humanReadableSummary = teamSummaryGenerator.generateHumanReadableSummary(teamSummaries, dateRange);
    console.log(humanReadableSummary);
    
    console.log('\n✅ Team summary test completed successfully!');
    console.log('\n💡 Key Features Demonstrated:');
    console.log('• Team-based grouping and analysis');
    console.log('• Change categorization by type');
    console.log('• Activity level insights');
    console.log('• Most active issues tracking');
    console.log('• Recent activity monitoring');
    console.log('• Multiple output formats (JSON, Markdown)');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testTeamSummary();
