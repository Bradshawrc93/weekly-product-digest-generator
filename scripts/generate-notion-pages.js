require('dotenv').config();
const { JiraIngestor } = require('../src/ingestors/jira');
const { SlackIngestor } = require('../src/ingestors/slack');
const { NotionPublisher } = require('../src/publishers/notion');
const { getAllSquads } = require('../src/utils/config');
const { TeamSummaryGenerator } = require('../src/utils/teamSummaryGenerator');
const moment = require('moment');

async function generateNotionPages() {
  console.log('🚀 Generating Real Notion Pages...\n');
  
  try {
    // Initialize ingestors and publisher
    const jiraIngestor = new JiraIngestor();
    const slackIngestor = new SlackIngestor();
    const notionPublisher = new NotionPublisher();
    
    // Get all squads
    const squads = await getAllSquads();
    if (!squads || squads.length === 0) {
      throw new Error('No squads configured');
    }
    
    // Set date range (last 8 days)
    const endDate = moment();
    const startDate = moment().subtract(8, 'days');
    
    console.log(`📅 Date Range: ${startDate.format('MMM DD')} to ${endDate.format('MMM DD, YYYY')}\n`);
    console.log(`📋 Processing ${squads.length} squads...\n`);
    
    // Collect data for all squads
    const squadsData = [];
    
    for (const squad of squads) {
      console.log(`🔍 Processing squad: ${squad.name}`);
      
      try {
        // Fetch Jira data
        const jiraIssues = await jiraIngestor.fetchIssues(squad, { startDate, endDate });
        console.log(`  ✅ Found ${jiraIssues.length} Jira issues`);
        
        // Fetch Slack data
        const slackData = await slackIngestor.collectData(squad, { startDate, endDate });
        console.log(`  ✅ Found ${slackData.decisions.length} decisions, ${slackData.risks.length} risks, ${slackData.threads.length} threads`);
        
        // Generate team summary
        const teamSummaryGenerator = new TeamSummaryGenerator();
        const teamSummaries = teamSummaryGenerator.generateTeamSummary(jiraIssues, { startDate, endDate });
        const teamSummary = teamSummaries[squad.name] || teamSummaries['Unknown Team'] || {
          teamName: squad.name,
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
        
        squadsData.push({
          squad,
          jiraData: { issues: jiraIssues },
          slackData,
          teamSummary
        });
        
        console.log(`  ✅ Team summary generated (${teamSummary.activityLevel} activity)\n`);
        
      } catch (error) {
        console.error(`  ❌ Error processing squad ${squad.name}:`, error.message);
        // Continue with other squads
      }
    }
    
    console.log(`📊 Data collection complete for ${squadsData.length} squads\n`);
    
    // Create weekly page with squad subpages
    console.log('📄 Creating weekly page with squad subpages...');
    const result = await notionPublisher.createWeeklyPage(squadsData, { startDate, endDate });
    console.log(`✅ Weekly page created: ${result.weeklyPage.id}`);
    console.log(`✅ Created ${result.squadSubpages.length} squad subpages:\n`);
    
    result.squadSubpages.forEach(page => {
      console.log(`  • ${page.squad}: ${page.pageId}`);
    });
    
    console.log('\n🎉 Notion page generation complete!');
    console.log(`📊 Summary:`);
    console.log(`  • Weekly Page: ${result.weeklyPage.id}`);
    console.log(`  • Squad Subpages: ${result.squadSubpages.length}`);
    console.log(`  • Date Range: ${startDate.format('MMM DD')} to ${endDate.format('MMM DD, YYYY')}`);
    
  } catch (error) {
    console.error('❌ Error generating Notion pages:', error.message);
    console.error(error.stack);
  }
}

// Run the generation
generateNotionPages();
