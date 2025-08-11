#!/usr/bin/env node

/**
 * Test team summary generation with REAL Jira data
 */

require('dotenv').config();
const { DigestGenerator } = require('../src/core/DigestGenerator');
const { TeamSummaryGenerator } = require('../src/utils/teamSummaryGenerator');
const moment = require('moment');

async function testRealTeamSummary() {
  console.log('🚀 Testing Team Summary with REAL Jira Data\n');
  console.log('=' .repeat(60));
  
  try {
    const digestGenerator = new DigestGenerator();
    const teamSummaryGenerator = new TeamSummaryGenerator();
    
    // Test date range (last 7 days to match recent activity)
    const endDate = moment();
    const startDate = moment().subtract(7, 'days');
    const dateRange = { startDate, endDate };
    
    console.log(`📅 Testing date range: ${startDate.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}\n`);
    
    console.log('🔧 Initializing DigestGenerator...\n');
    await digestGenerator.initialize();
    
    // Get squad configuration
    const { getAllSquads } = require('../src/utils/config');
    const squads = await getAllSquads();
    
    console.log(`📋 Found ${squads ? squads.length : 0} squads configured\n`);
    
    if (!squads || squads.length === 0) {
      console.log('❌ No squads found in configuration');
      return;
    }
    
    // Test with each squad
    for (const squad of squads) {
      console.log(`🏢 Testing Squad: ${squad.name}`);
      console.log('-'.repeat(40));
      
      try {
        // Temporarily remove team filter to get all issues for team analysis
        const originalJQL = squad.jiraConfig;
        
        // Fetch issues without team filter for team analysis
        const { JiraIngestor } = require('../src/ingestors/jira');
        const jiraIngestor = new JiraIngestor();
        
        console.log('📊 Fetching real Jira issues...');
        
        // Use the original JQL method (now fixed with proper labels filter)
        const issues = await jiraIngestor.fetchIssues(squad, dateRange);
        
        console.log(`✅ Fetched ${issues.length} issues from Jira\n`);
        
        if (issues.length === 0) {
          console.log('⚠️  No issues found for this squad in the date range\n');
          continue;
        }
        
        // Generate team summaries
        console.log('🔍 Generating team summaries...');
        const teamSummaries = teamSummaryGenerator.generateTeamSummary(issues, dateRange);
        
        console.log(`✅ Generated summaries for ${Object.keys(teamSummaries).length} teams\n`);
        
        // Display results
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
            summary.mostActiveIssues.slice(0, 3).forEach((issue, index) => {
              console.log(`      ${index + 1}. ${issue.key} - ${issue.title}`);
              console.log(`         Status: ${issue.status}, Assignee: ${issue.assignee}, Changes: ${issue.changeCount}`);
            });
          }
          
          console.log('');
        });
        
        // Generate human-readable summary
        console.log('📝 Generating human-readable summary...\n');
        const humanReadableSummary = teamSummaryGenerator.generateHumanReadableSummary(teamSummaries, dateRange);
        console.log(humanReadableSummary);
        
        // Overall statistics
        const totalTeams = Object.keys(teamSummaries).length;
        const totalIssues = Object.values(teamSummaries).reduce((sum, team) => sum + team.totalIssues, 0);
        const totalChanges = Object.values(teamSummaries).reduce((sum, team) => sum + team.totalChanges, 0);
        const totalNewItems = Object.values(teamSummaries).reduce((sum, team) => sum + team.newItems, 0);
        
        console.log('\n📊 Overall Statistics:');
        console.log(`• Total Teams: ${totalTeams}`);
        console.log(`• Total Issues: ${totalIssues}`);
        console.log(`• Total Changes: ${totalChanges}`);
        console.log(`• Total New Items: ${totalNewItems}`);
        console.log(`• Average Changes per Team: ${totalTeams > 0 ? (totalChanges / totalTeams).toFixed(1) : 0}`);
        console.log(`• Average Issues per Team: ${totalTeams > 0 ? (totalIssues / totalTeams).toFixed(1) : 0}`);
        
        // Restore original JQL method
        jiraIngestor.buildIssueJQL = originalBuildIssueJQL;
        
      } catch (error) {
        console.error(`❌ Error processing squad ${squad.name}:`, error.message);
        if (error.response?.data) {
          console.error('API Error:', JSON.stringify(error.response.data, null, 2));
        }
      }
      
      console.log('\n' + '='.repeat(60) + '\n');
    }
    
    console.log('✅ Real team summary test completed!');
    console.log('\n💡 This test used your actual Jira data to demonstrate:');
    console.log('• Real team grouping and analysis');
    console.log('• Actual change patterns from your Jira instance');
    console.log('• Real issue activity and progress tracking');
    console.log('• Team-specific insights based on your data');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testRealTeamSummary();
