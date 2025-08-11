require('dotenv').config();
const { SlackIngestor } = require('../src/ingestors/slack');
const { getAllSquads } = require('../src/utils/config');
const moment = require('moment');

async function showSlackThreads() {
  console.log('💬 Showing Slack Threads (Squad-Specific vs General)...\n');
  
  try {
    const slackIngestor = new SlackIngestor();
    const squads = await getAllSquads();
    
    const startDate = moment().subtract(8, 'days');
    const endDate = moment();
    
    console.log(`📅 Date Range: ${startDate.format('MMM DD')} to ${endDate.format('MMM DD, YYYY')}\n`);
    
    // Collect all general threads
    const allGeneralThreads = [];
    
    for (const squad of squads) {
      console.log(`🔍 Checking squad: ${squad.name}`);
      
      try {
        const slackData = await slackIngestor.collectData(squad, { startDate, endDate });
        
        if (slackData.threads && slackData.threads.length > 0) {
          console.log(`  ✅ Found ${slackData.threads.length} squad-specific threads:`);
          
          slackData.threads.forEach((thread, index) => {
            console.log(`\n  📄 Squad Thread ${index + 1}:`);
            console.log(`     Channel: ${thread.channel}`);
            console.log(`     Author: ${thread.author}`);
            console.log(`     Timestamp: ${moment.unix(thread.timestamp).format('MMM DD, YYYY [at] h:mm A')}`);
            console.log(`     Text: "${thread.text}"`);
            console.log(`     Permalink: ${thread.permalink}`);
          });
        } else {
          console.log(`  ❌ No squad-specific threads found`);
        }
        
        // Collect general threads
        if (slackData.generalThreads && slackData.generalThreads.length > 0) {
          allGeneralThreads.push(...slackData.generalThreads);
        }
        
      } catch (error) {
        console.log(`  ⚠️ Error processing squad: ${error.message}`);
      }
      
      console.log(''); // Empty line between squads
    }
    
    // Show general threads
    console.log('🌐 General Product Conversations:');
    console.log('='.repeat(80));
    
    // Remove duplicates
    const uniqueGeneralThreads = allGeneralThreads.filter((thread, index, self) => 
      index === self.findIndex(t => t.timestamp === thread.timestamp && t.text === thread.text)
    );
    
    if (uniqueGeneralThreads.length > 0) {
      console.log(`Found ${uniqueGeneralThreads.length} general product conversations:\n`);
      
      uniqueGeneralThreads.forEach((thread, index) => {
        console.log(`📄 General Thread ${index + 1}:`);
        console.log(`   Channel: ${thread.channel}`);
        console.log(`   Author: ${thread.author}`);
        console.log(`   Timestamp: ${moment.unix(thread.timestamp).format('MMM DD, YYYY [at] h:mm A')}`);
        console.log(`   Text: "${thread.text}"`);
        console.log(`   Permalink: ${thread.permalink}`);
        console.log('');
      });
    } else {
      console.log('No general product conversations found.');
    }
    
  } catch (error) {
    console.error('❌ Error showing Slack threads:', error.message);
    console.error(error.stack);
  }
}

showSlackThreads();
