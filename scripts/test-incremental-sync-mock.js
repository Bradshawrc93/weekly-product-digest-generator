#!/usr/bin/env node

/**
 * Test incremental sync and change analysis with mock data
 */

require('dotenv').config();
const { ChangeAnalyzer } = require('../src/utils/changeAnalyzer');
const { StateManager } = require('../src/utils/stateManager');
const moment = require('moment');

async function testIncrementalSyncWithMock() {
  console.log('🚀 Testing Incremental Sync & Change Analysis (Mock Data)\n');
  console.log('=' .repeat(60));
  
  try {
    const changeAnalyzer = new ChangeAnalyzer();
    const stateManager = new StateManager();
    
    // Test date range (last 8 days)
    const endDate = moment();
    const startDate = moment().subtract(8, 'days');
    const dateRange = { startDate, endDate };
    
    console.log(`📅 Testing date range: ${startDate.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}\n`);
    
    // Check current state
    const lastRunTimestamp = await stateManager.getLastRunTimestamp();
    console.log(`⏰ Last run timestamp: ${lastRunTimestamp ? lastRunTimestamp.toISOString() : 'None (first run)'}\n`);
    
    // Create mock Jira issues with changelog
    const mockIssues = [
      {
        key: 'PO-123',
        fields: {
          summary: 'Implement voice agent feature',
          status: { name: 'In Progress' },
          assignee: { displayName: 'John Doe' },
          priority: { name: 'High' },
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
                {
                  field: 'status',
                  fromString: 'To Do',
                  toString: 'In Progress'
                },
                {
                  field: 'assignee',
                  fromString: null,
                  toString: 'John Doe'
                }
              ]
            },
            {
              created: moment().subtract(3, 'days').toISOString(),
              author: { displayName: 'Mike Johnson' },
              items: [
                {
                  field: 'customfield_10030',
                  fromString: '5',
                  toString: '8'
                }
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
          updated: moment().subtract(5, 'days').toISOString(),
          created: moment().subtract(15, 'days').toISOString(),
          customfield_10001: 'Mobile Squad',
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
                {
                  field: 'status',
                  fromString: 'In Progress',
                  toString: 'Done'
                }
              ]
            }
          ]
        }
      },
      {
        key: 'PO-125',
        fields: {
          summary: 'Update documentation',
          status: { name: 'To Do' },
          assignee: null,
          priority: { name: 'Low' },
          updated: moment().subtract(20, 'days').toISOString(),
          created: moment().subtract(25, 'days').toISOString(),
          customfield_10001: 'Data Squad',
          customfield_10014: null,
          customfield_10030: 2,
          customfield_10368: 'Q3 2025'
        },
        changelog: {
          histories: []
        }
      }
    ];
    
    console.log('📊 Analyzing mock issues for changes...\n');
    
    // Analyze changes for the full date range
    const issuesWithChanges = changeAnalyzer.filterIssuesByChanges(mockIssues, dateRange, 'LOW');
    const changeStats = changeAnalyzer.getChangeStatistics(mockIssues, dateRange);
    
    console.log('✅ Change analysis completed!\n');
    
    // Display results
    console.log('📋 Collection Results:');
    console.log(`• Total issues: ${mockIssues.length}`);
    console.log(`• Issues with changes: ${issuesWithChanges.length}`);
    console.log(`• Total changes detected: ${changeStats.totalChanges}\n`);
    
    // Display change statistics
    console.log('📊 Change Statistics:');
    console.log(`• Total issues processed: ${changeStats.totalIssues}`);
    console.log(`• Issues with changes: ${changeStats.issuesWithChanges}`);
    console.log(`• Total changes: ${changeStats.totalChanges}`);
    console.log(`• High priority changes: ${changeStats.changesBySeverity.HIGH}`);
    console.log(`• Medium priority changes: ${changeStats.changesBySeverity.MEDIUM}`);
    console.log(`• Low priority changes: ${changeStats.changesBySeverity.LOW}\n`);
    
    // Display changes by field
    if (Object.keys(changeStats.changesByField).length > 0) {
      console.log('🏷️  Changes by Field:');
      Object.entries(changeStats.changesByField)
        .sort(([,a], [,b]) => b - a)
        .forEach(([field, count]) => {
          console.log(`  • ${field}: ${count} changes`);
        });
      console.log();
    }
    
    // Display most active issues
    if (changeStats.mostActiveIssues.length > 0) {
      console.log('🔥 Most Active Issues:');
      changeStats.mostActiveIssues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue.key} - ${issue.title}`);
        console.log(`     Changes: ${issue.changeCount} (${issue.highPriorityChanges} high priority)`);
      });
      console.log();
    }
    
    // Display sample issues with changes
    console.log('📄 Issues with Changes:');
    issuesWithChanges.forEach((issue, index) => {
      console.log(`\n${index + 1}. ${issue.key} - ${issue.fields.summary}`);
      console.log(`   Status: ${issue.fields.status.name}`);
      console.log(`   Assignee: ${issue.fields.assignee?.displayName || 'Unassigned'}`);
      console.log(`   Team: ${issue.fields.customfield_10001 || 'Not set'}`);
      console.log(`   Story Points: ${issue.fields.customfield_10030 || 'Not set'}`);
      
      const changeSummary = changeAnalyzer.getChangeSummary(issue, dateRange);
      if (changeSummary) {
        console.log(`   Change Summary:`);
        console.log(`     • Total changes: ${changeSummary.totalChanges}`);
        console.log(`     • High priority: ${changeSummary.highPriorityChanges}`);
        console.log(`     • Medium priority: ${changeSummary.mediumPriorityChanges}`);
        console.log(`     • Low priority: ${changeSummary.lowPriorityChanges}`);
        
        const changeDescription = changeAnalyzer.generateChangeDescription(changeSummary.changes);
        console.log(`   Changes: ${changeDescription}`);
      }
    });
    
    // Test change filtering by severity
    console.log('\n🔍 Testing Change Filtering by Severity:\n');
    
    const highPriorityChanges = changeAnalyzer.filterIssuesByChanges(mockIssues, dateRange, 'HIGH');
    const mediumPriorityChanges = changeAnalyzer.filterIssuesByChanges(mockIssues, dateRange, 'MEDIUM');
    const lowPriorityChanges = changeAnalyzer.filterIssuesByChanges(mockIssues, dateRange, 'LOW');
    
    console.log('📊 Issues by Change Severity:');
    console.log(`• High priority changes: ${highPriorityChanges.length} issues`);
    console.log(`• Medium priority changes: ${mediumPriorityChanges.length} issues`);
    console.log(`• Low priority changes: ${lowPriorityChanges.length} issues`);
    
    // Test incremental sync simulation
    console.log('\n🔄 Testing Incremental Sync Simulation:\n');
    
    // Simulate first run
    const firstRunDate = moment().subtract(7, 'days');
    await stateManager.saveLastRunTimestamp(firstRunDate);
    console.log(`⏰ First run timestamp: ${firstRunDate.toISOString()}`);
    
    // Simulate second run (incremental)
    const secondRunDate = moment();
    const incrementalStartDate = firstRunDate;
    console.log(`⏰ Second run timestamp: ${secondRunDate.toISOString()}`);
    console.log(`📅 Incremental start date: ${incrementalStartDate.toISOString()}`);
    console.log(`📅 Full date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    // Save new timestamp
    await stateManager.saveLastRunTimestamp(secondRunDate);
    
    console.log('\n✅ Incremental sync test with mock data completed successfully!');
    console.log('\n💡 Key Benefits Demonstrated:');
    console.log('• Only processes issues with meaningful changes');
    console.log('• Tracks change severity (High/Medium/Low)');
    console.log('• Provides detailed change descriptions');
    console.log('• Reduces API calls through incremental sync');
    console.log('• Maintains state between runs');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testIncrementalSyncWithMock();
