#!/usr/bin/env node

/**
 * Test Slack integration - examine messages and threads in 'product' channel
 */

require('dotenv').config();
const { SlackIngestor } = require('../src/ingestors/slack');
const moment = require('moment');

async function testSlackIntegration() {
  console.log('🔍 Testing Slack Integration\n');
  console.log('=' .repeat(60));
  
  try {
    const slackIngestor = new SlackIngestor();
    
    // Test date range (last 8 days)
    const endDate = moment();
    const startDate = moment().subtract(8, 'days');
    const dateRange = { startDate, endDate };
    
    console.log(`📅 Testing date range: ${startDate.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}\n`);
    
    console.log('🔧 Slack ingestor ready...\n');
    
    // Test with 'product' channel
    const channelName = 'product';
    console.log(`📺 Testing channel: #${channelName}\n`);
    
    // Mock squad configuration for testing
    const mockSquad = {
      name: 'Test Squad',
      slackChannel: `#${channelName}`,
      members: [
        { slackHandle: '@cody.bradshaw' },
        { slackHandle: '@jakob.mcclanahan' }
      ]
    };
    
    console.log('📊 Fetching Slack messages and threads...\n');
    
    const slackData = await slackIngestor.collectData(mockSquad, dateRange);
    
    console.log('✅ Slack data collection completed!\n');
    
    // Display summary
    console.log('📈 **Data Summary**');
    console.log('-'.repeat(40));
    console.log(`• Decisions found: ${slackData.decisions?.length || 0}`);
    console.log(`• Risks found: ${slackData.risks?.length || 0}`);
    console.log(`• Launches found: ${slackData.launches?.length || 0}`);
    console.log(`• Total items: ${(slackData.decisions?.length || 0) + (slackData.risks?.length || 0) + (slackData.launches?.length || 0)}\n`);
    
    // Display decisions
    if (slackData.decisions && slackData.decisions.length > 0) {
      console.log('🎯 **Decisions Identified**');
      console.log('-'.repeat(40));
      
      slackData.decisions.slice(0, 10).forEach((decision, index) => {
        console.log(`${index + 1}. **${decision.author}** (${moment(decision.timestamp * 1000).format('MMM DD, HH:mm')})`);
        console.log(`   ${decision.text.substring(0, 100)}${decision.text.length > 100 ? '...' : ''}`);
        console.log(`   Channel: ${decision.channel}`);
        console.log(`   Classification: ${decision.classification}`);
        console.log(`   Mentions: ${decision.mentions.join(', ') || 'None'}`);
        console.log('');
      });
      
      if (slackData.decisions.length > 10) {
        console.log(`... and ${slackData.decisions.length - 10} more decisions\n`);
      }
    } else {
      console.log('🎯 **Decisions**: No decisions found in the date range\n');
    }
    
    // Display risks
    if (slackData.risks && slackData.risks.length > 0) {
      console.log('⚠️ **Risks Identified**');
      console.log('-'.repeat(40));
      
      slackData.risks.slice(0, 5).forEach((risk, index) => {
        console.log(`${index + 1}. **${risk.author}** (${moment(risk.timestamp * 1000).format('MMM DD, HH:mm')})`);
        console.log(`   ${risk.text.substring(0, 100)}${risk.text.length > 100 ? '...' : ''}`);
        console.log(`   Channel: ${risk.channel}`);
        console.log(`   Severity: ${risk.severity}`);
        console.log(`   Mentions: ${risk.mentions.join(', ') || 'None'}`);
        console.log('');
      });
      
      if (slackData.risks.length > 5) {
        console.log(`... and ${slackData.risks.length - 5} more risks\n`);
      }
    } else {
      console.log('⚠️ **Risks**: No risks found in the date range\n');
    }
    
    // Display launches
    if (slackData.launches && slackData.launches.length > 0) {
      console.log('🚀 **Launches Identified**');
      console.log('-'.repeat(40));
      
      slackData.launches.slice(0, 5).forEach((launch, index) => {
        console.log(`${index + 1}. **${launch.author}** (${moment(launch.timestamp * 1000).format('MMM DD, HH:mm')})`);
        console.log(`   ${launch.text.substring(0, 100)}${launch.text.length > 100 ? '...' : ''}`);
        console.log(`   Channel: ${launch.channel}`);
        console.log(`   Mentions: ${launch.mentions.join(', ') || 'None'}`);
        console.log('');
      });
      
      if (slackData.launches.length > 5) {
        console.log(`... and ${slackData.launches.length - 5} more launches\n`);
      }
    } else {
      console.log('🚀 **Launches**: No launches found in the date range\n');
    }
    
    // Display user activity
    const userActivity = {};
    if (slackData.decisions || slackData.risks || slackData.launches) {
      console.log('👥 **User Activity Summary**');
      console.log('-'.repeat(40));
      
      // Count decisions by user
      if (slackData.decisions) {
        slackData.decisions.forEach(decision => {
          const user = decision.author || 'Unknown';
          userActivity[user] = userActivity[user] || { decisions: 0, risks: 0, launches: 0, total: 0 };
          userActivity[user].decisions++;
          userActivity[user].total++;
        });
      }
      
      // Count risks by user
      if (slackData.risks) {
        slackData.risks.forEach(risk => {
          const user = risk.author || 'Unknown';
          userActivity[user] = userActivity[user] || { decisions: 0, risks: 0, launches: 0, total: 0 };
          userActivity[user].risks++;
          userActivity[user].total++;
        });
      }
      
      // Count launches by user
      if (slackData.launches) {
        slackData.launches.forEach(launch => {
          const user = launch.author || 'Unknown';
          userActivity[user] = userActivity[user] || { decisions: 0, risks: 0, launches: 0, total: 0 };
          userActivity[user].launches++;
          userActivity[user].total++;
        });
      }
      
      // Sort by total activity
      const sortedUsers = Object.entries(userActivity)
        .sort(([,a], [,b]) => b.total - a.total)
        .slice(0, 10);
      
      sortedUsers.forEach(([user, activity]) => {
        console.log(`• **${user}**: ${activity.total} total (${activity.decisions} decisions, ${activity.risks} risks, ${activity.launches} launches)`);
      });
      
      console.log('');
    }
    
    // Display channel info
    console.log('📺 **Channel Information**');
    console.log('-'.repeat(40));
    console.log(`• Channel: #${channelName}`);
    console.log(`• Date Range: ${startDate.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}`);
    console.log(`• Total Activity: ${(slackData.decisions?.length || 0) + (slackData.risks?.length || 0) + (slackData.launches?.length || 0)} items`);
    console.log(`• Decisions: ${slackData.decisions?.length || 0}`);
    console.log(`• Risks: ${slackData.risks?.length || 0}`);
    console.log(`• Launches: ${slackData.launches?.length || 0}`);
    console.log(`• Active Users: ${Object.keys(userActivity || {}).length}`);
    console.log('');
    
    console.log('✅ Slack integration testing completed!');
    console.log('\n💡 This test examined:');
    console.log('• Decisions in the #product channel');
    console.log('• Risks and blockers');
    console.log('• Launch announcements');
    console.log('• User activity patterns');
    
  } catch (error) {
    console.error('❌ Slack integration test failed:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSlackIntegration();
