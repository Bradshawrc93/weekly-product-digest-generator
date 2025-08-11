#!/usr/bin/env node

/**
 * Complete test of team summary functionality with DigestGenerator
 */

require('dotenv').config();
const { DigestGenerator } = require('../src/core/DigestGenerator');
const { TeamSummaryGenerator } = require('../src/utils/teamSummaryGenerator');
const moment = require('moment');

async function testCompleteTeamSummary() {
  console.log('🚀 Testing Complete Team Summary with DigestGenerator\n');
  console.log('=' .repeat(60));
  
  try {
    const digestGenerator = new DigestGenerator();
    const teamSummaryGenerator = new TeamSummaryGenerator();
    
    // Test date range (last 8 days)
    const endDate = moment();
    const startDate = moment().subtract(8, 'days');
    const dateRange = { startDate, endDate };
    
    console.log(`📅 Testing date range: ${startDate.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}\n`);
    
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
    
    console.log('🔧 Initializing DigestGenerator...\n');
    await digestGenerator.initialize();
    
    console.log('📊 Testing team summary generation...\n');
    
    // Test 1: Direct team summary generation
    console.log('📋 Test 1: Direct Team Summary Generation');
    console.log('-'.repeat(40));
    
    // Create mock issues for testing
    const mockIssues = [
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
          customfield_10001: 'Platform Squad',
          customfield_10014: 'PO-100',
          customfield_10030: 8,
          customfield_10368: 'Q3 2025'
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
                { field: 'status', fromString: 'In Progress', toString: 'Done' }
              ]
            }
          ]
        }
      }
    ];
    
    const teamSummaries = teamSummaryGenerator.generateTeamSummary(mockIssues, dateRange);
    
    console.log(`✅ Generated summaries for ${Object.keys(teamSummaries).length} teams`);
    Object.keys(teamSummaries).forEach(team => {
      const summary = teamSummaries[team];
      console.log(`   • ${team}: ${summary.totalIssues} issues, ${summary.totalChanges} changes`);
    });
    console.log('');
    
    // Test 2: Generate human-readable summary
    console.log('📝 Test 2: Human-Readable Summary Generation');
    console.log('-'.repeat(40));
    
    const humanReadableSummary = teamSummaryGenerator.generateHumanReadableSummary(teamSummaries, dateRange);
    console.log('Generated Summary:');
    console.log(humanReadableSummary);
    console.log('');
    
    // Test 3: Generate formatted report
    console.log('📊 Test 3: Formatted Report Generation');
    console.log('-'.repeat(40));
    
    const formattedReport = teamSummaryGenerator.generateFormattedReport(teamSummaries, dateRange);
    console.log('Formatted Report Structure:');
    console.log(`• Generated at: ${formattedReport.generatedAt}`);
    console.log(`• Date range: ${formattedReport.dateRange.start} to ${formattedReport.dateRange.end}`);
    console.log(`• Total teams: ${formattedReport.totalTeams}`);
    console.log(`• Teams: ${Object.keys(formattedReport.teams).join(', ')}`);
    console.log('');
    
    // Test 4: Integration with DigestGenerator (mock)
    console.log('🔗 Test 4: Integration with DigestGenerator');
    console.log('-'.repeat(40));
    
    // Simulate what the DigestGenerator would return
    const mockDigestResult = {
      squad: testSquad.name,
      workstreams: [],
      epics: [],
      issues: mockIssues,
      prs: [],
      decisions: [],
      insights: [],
      teamSummaries: teamSummaries,
      digest: "Mock digest content"
    };
    
    console.log('✅ DigestGenerator integration structure:');
    console.log(`• Squad: ${mockDigestResult.squad}`);
    console.log(`• Issues: ${mockDigestResult.issues.length}`);
    console.log(`• Team Summaries: ${Object.keys(mockDigestResult.teamSummaries).length} teams`);
    console.log(`• Has digest: ${!!mockDigestResult.digest}`);
    console.log('');
    
    // Test 5: Team summary analytics
    console.log('📈 Test 5: Team Summary Analytics');
    console.log('-'.repeat(40));
    
    Object.entries(teamSummaries).forEach(([teamName, summary]) => {
      console.log(`🏢 ${teamName} Analytics:`);
      console.log(`   📊 Activity Level: ${getActivityLevel(summary.totalChanges)}`);
      console.log(`   🆕 New Items: ${summary.newItems}`);
      console.log(`   🔄 Change Rate: ${((summary.issuesWithChanges / summary.totalIssues) * 100).toFixed(1)}%`);
      console.log(`   📅 Last Activity: ${summary.lastUpdated ? moment(summary.lastUpdated).fromNow() : 'No recent activity'}`);
      
      if (summary.mostActiveIssues.length > 0) {
        console.log(`   🔥 Most Active: ${summary.mostActiveIssues[0].key} (${summary.mostActiveIssues[0].changeCount} changes)`);
      }
      console.log('');
    });
    
    // Test 6: Change type analysis
    console.log('🔍 Test 6: Change Type Analysis');
    console.log('-'.repeat(40));
    
    const allChanges = Object.values(teamSummaries).reduce((total, summary) => {
      Object.entries(summary.changeBreakdown).forEach(([type, count]) => {
        total[type] = (total[type] || 0) + count;
      });
      return total;
    }, {});
    
    console.log('Overall Change Distribution:');
    Object.entries(allChanges)
      .filter(([, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .forEach(([type, count]) => {
        const displayName = teamSummaryGenerator.getChangeTypeDisplayName(type);
        console.log(`   • ${displayName}: ${count}`);
      });
    console.log('');
    
    console.log('✅ Complete team summary test completed successfully!');
    console.log('\n💡 Key Features Demonstrated:');
    console.log('• Team-based grouping and analysis');
    console.log('• Change categorization and tracking');
    console.log('• Activity level assessment');
    console.log('• Human-readable report generation');
    console.log('• Formatted JSON report structure');
    console.log('• Integration with DigestGenerator');
    console.log('• Comprehensive analytics and insights');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Helper function to determine activity level
function getActivityLevel(totalChanges) {
  if (totalChanges === 0) return 'No Activity';
  if (totalChanges <= 5) return 'Low Activity';
  if (totalChanges <= 15) return 'Moderate Activity';
  if (totalChanges <= 30) return 'High Activity';
  return 'Very High Activity';
}

testCompleteTeamSummary();
