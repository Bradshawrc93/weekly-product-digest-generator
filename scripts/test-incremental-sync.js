#!/usr/bin/env node

/**
 * Test incremental sync and change analysis
 */

require('dotenv').config();
const { JiraIngestor } = require('../src/ingestors/jira');
const { ChangeAnalyzer } = require('../src/utils/changeAnalyzer');
const { StateManager } = require('../src/utils/stateManager');
const moment = require('moment');

async function testIncrementalSync() {
  console.log('🚀 Testing Incremental Sync & Change Analysis\n');
  console.log('=' .repeat(60));
  
  try {
    const ingestor = new JiraIngestor();
    const changeAnalyzer = new ChangeAnalyzer();
    const stateManager = new StateManager();
    
    // Create test squad configuration
    const testSquad = {
      name: "Test Squad",
      jiraConfig: {
        projectKey: "PO",
        projectName: "Product Operations",
        workstreams: [
          {
            name: "Voice Experiments",
            key: "VOICE-EXP",
            description: "Voice agent experiments"
          }
        ]
      }
    };
    
    // Test date range (last 90 days to get more data)
    const endDate = moment();
    const startDate = moment().subtract(90, 'days');
    const dateRange = { startDate, endDate };
    
    console.log(`📅 Testing date range: ${startDate.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}\n`);
    
    // Check current state
    const lastRunTimestamp = await stateManager.getLastRunTimestamp();
    console.log(`⏰ Last run timestamp: ${lastRunTimestamp ? lastRunTimestamp.toISOString() : 'None (first run)'}\n`);
    
    // Test data collection with incremental sync
    console.log('📊 Collecting Jira data with incremental sync...\n');
    
    // For testing, let's get all issues without team filter to demonstrate change analysis
    console.log('🔍 Fetching all issues for change analysis demonstration...\n');
    const allIssues = await ingestor.fetchIssues(testSquad, dateRange);
    
    // Analyze changes for the full date range
    const issuesWithChanges = changeAnalyzer.filterIssuesByChanges(allIssues, dateRange, 'LOW');
    const changeStats = changeAnalyzer.getChangeStatistics(allIssues, dateRange);
    
    console.log('✅ Change analysis completed!\n');
    
    // Display results
    console.log('📋 Collection Results:');
    console.log(`• Total issues fetched: ${allIssues.length}`);
    console.log(`• Issues with changes: ${issuesWithChanges.length}`);
    console.log(`• Total changes detected: ${changeStats.totalChanges}\n`);
    
    // Display change statistics
    if (changeStats) {
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
        changeStats.mostActiveIssues.slice(0, 5).forEach((issue, index) => {
          console.log(`  ${index + 1}. ${issue.key} - ${issue.title}`);
          console.log(`     Changes: ${issue.changeCount} (${issue.highPriorityChanges} high priority)`);
        });
        console.log();
      }
    }
    
    // Display sample issues with changes
    if (allIssues.length > 0) {
      console.log('📄 Sample Issues with Changes:');
      allIssues.slice(0, 3).forEach((issue, index) => {
        console.log(`\n${index + 1}. ${issue.key} - ${issue.title}`);
        console.log(`   Status: ${issue.status}`);
        console.log(`   Assignee: ${issue.assignee || 'Unassigned'}`);
        console.log(`   Team: ${issue.team || 'Not set'}`);
        console.log(`   Story Points: ${issue.storyPoints?.total || 'Not set'}`);
        console.log(`   Has Changes: ${issue.hasChanges ? 'Yes' : 'No'}`);
        
        if (issue.changeSummary) {
          console.log(`   Change Summary:`);
          console.log(`     • Total changes: ${issue.changeSummary.totalChanges}`);
          console.log(`     • High priority: ${issue.changeSummary.highPriorityChanges}`);
          console.log(`     • Medium priority: ${issue.changeSummary.mediumPriorityChanges}`);
          console.log(`     • Low priority: ${issue.changeSummary.lowPriorityChanges}`);
          
          if (issue.changeDescription) {
            console.log(`   Changes: ${issue.changeDescription}`);
          }
        }
      });
    }
    
    // Test change filtering by severity
    console.log('\n🔍 Testing Change Filtering by Severity:\n');
    
    // Get all issues for filtering test
    const highPriorityChanges = changeAnalyzer.filterIssuesByChanges(allIssues, dateRange, 'HIGH');
    const mediumPriorityChanges = changeAnalyzer.filterIssuesByChanges(allIssues, dateRange, 'MEDIUM');
    const lowPriorityChanges = changeAnalyzer.filterIssuesByChanges(allIssues, dateRange, 'LOW');
    
    console.log('📊 Issues by Change Severity:');
    console.log(`• High priority changes: ${highPriorityChanges.length} issues`);
    console.log(`• Medium priority changes: ${mediumPriorityChanges.length} issues`);
    console.log(`• Low priority changes: ${lowPriorityChanges.length} issues`);
    
    // Show new timestamp
    const newTimestamp = await stateManager.getLastRunTimestamp();
    console.log(`\n⏰ New last run timestamp: ${newTimestamp?.toISOString()}`);
    
    console.log('\n✅ Incremental sync test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testIncrementalSync();
