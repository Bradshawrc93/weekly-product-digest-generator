require('dotenv').config();
const { SlackIngestor } = require('../src/ingestors/slack');
const { getAllSquads } = require('../src/utils/config');
const moment = require('moment');

async function showSlackLaunches() {
  console.log('🚀 Showing Slack Launch Messages...\n');
  
  try {
    const slackIngestor = new SlackIngestor();
    const squads = await getAllSquads();
    
    const startDate = moment().subtract(8, 'days');
    const endDate = moment();
    
    console.log(`📅 Date Range: ${startDate.format('MMM DD')} to ${endDate.format('MMM DD, YYYY')}\n`);
    
    for (const squad of squads) {
      console.log(`🔍 Checking squad: ${squad.name}`);
      
      try {
        const slackData = await slackIngestor.collectData(squad, { startDate, endDate });
        
        if (slackData.launches && slackData.launches.length > 0) {
          console.log(`  ✅ Found ${slackData.launches.length} launch messages:`);
          
          slackData.launches.forEach((launch, index) => {
            console.log(`\n  📄 Launch ${index + 1}:`);
            console.log(`     Channel: ${launch.channel}`);
            console.log(`     Author: ${launch.author}`);
            console.log(`     Timestamp: ${moment.unix(launch.timestamp).format('MMM DD, YYYY [at] h:mm A')}`);
            console.log(`     Text: "${launch.text}"`);
            console.log(`     Permalink: ${launch.permalink}`);
          });
        } else {
          console.log(`  ❌ No launch messages found`);
        }
        
      } catch (error) {
        console.log(`  ⚠️ Error processing squad: ${error.message}`);
      }
      
      console.log(''); // Empty line between squads
    }
    
  } catch (error) {
    console.error('❌ Error showing Slack launches:', error.message);
    console.error(error.stack);
  }
}

showSlackLaunches();
