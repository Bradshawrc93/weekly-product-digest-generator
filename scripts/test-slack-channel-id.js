#!/usr/bin/env node

/**
 * Test to find the correct channel ID for #product
 */

require('dotenv').config();
const { WebClient } = require('@slack/web-api');
const moment = require('moment');

async function testChannelId() {
  console.log('🔍 Finding #product Channel ID\n');
  console.log('=' .repeat(60));
  
  try {
    const client = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    // Test date range (last 8 days)
    const endDate = moment();
    const startDate = moment().subtract(8, 'days');
    
    console.log(`📅 Testing date range: ${startDate.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}\n`);
    
    // Common channel ID patterns to try
    const possibleChannelIds = [
      // Based on team ID TQCFA387L
      'CQCFA387L',
      'CQCFA387M', 
      'CQCFA387N',
      'CQCFA387O',
      'CQCFA387P',
      
      // Based on bot ID U099S4NQUPQ
      'C099S4NQUPQ',
      'C099S4NQUPR',
      'C099S4NQUPS',
      'C099S4NQUPT',
      'C099S4NQUPU',
      
      // Common product channel patterns
      'C1234567890', // Example
      'C0987654321', // Example
      
      // Try some variations
      'CQCFA387L0',
      'CQCFA387L1',
      'CQCFA387L2',
    ];
    
    console.log('🔍 Testing possible channel IDs...\n');
    
    for (const channelId of possibleChannelIds) {
      console.log(`Testing: ${channelId}`);
      
      try {
        // Try to get just one message to test access
        const response = await client.conversations.history({
          channel: channelId,
          limit: 1,
          oldest: Math.floor(startDate.valueOf() / 1000),
          latest: Math.floor(endDate.valueOf() / 1000)
        });
        
        console.log(`✅ SUCCESS! Channel ${channelId} is accessible!`);
        console.log(`• Messages in date range: ${response.messages?.length || 0}`);
        
        if (response.messages && response.messages.length > 0) {
          const message = response.messages[0];
          console.log(`• Sample message from: ${message.user}`);
          console.log(`• Time: ${moment(message.ts * 1000).format('MMM DD, HH:mm')}`);
          console.log(`• Text: ${message.text?.substring(0, 100)}...`);
        }
        
        // Now let's get more messages to confirm it's the right channel
        console.log('\n📊 Fetching more messages to confirm...');
        const allMessages = [];
        let cursor = null;
        
        do {
          const historyResponse = await client.conversations.history({
            channel: channelId,
            limit: 50,
            cursor: cursor,
            oldest: Math.floor(startDate.valueOf() / 1000),
            latest: Math.floor(endDate.valueOf() / 1000)
          });
          
          allMessages.push(...historyResponse.messages);
          cursor = historyResponse.response_metadata?.next_cursor;
          
        } while (cursor && allMessages.length < 100); // Limit to 100 messages
        
        console.log(`✅ Found ${allMessages.length} messages in channel ${channelId}`);
        
        if (allMessages.length > 0) {
          console.log('\n💬 **Recent Messages**');
          console.log('-'.repeat(40));
          
          allMessages.slice(0, 5).forEach((message, index) => {
            console.log(`${index + 1}. **${message.user}** (${moment(message.ts * 1000).format('MMM DD, HH:mm')})`);
            console.log(`   ${message.text?.substring(0, 80)}${message.text && message.text.length > 80 ? '...' : ''}`);
            console.log('');
          });
          
          // Check if this looks like a product channel
          const productKeywords = ['product', 'feature', 'launch', 'release', 'roadmap', 'sprint', 'epic', 'story'];
          const messageText = allMessages.map(m => m.text || '').join(' ').toLowerCase();
          const hasProductKeywords = productKeywords.some(keyword => messageText.includes(keyword));
          
          console.log(`🔍 Channel Analysis:`);
          console.log(`• Has product keywords: ${hasProductKeywords ? 'Yes' : 'No'}`);
          console.log(`• Message count: ${allMessages.length}`);
          console.log(`• Date range: ${moment(allMessages[allMessages.length - 1]?.ts * 1000).format('MMM DD')} to ${moment(allMessages[0]?.ts * 1000).format('MMM DD')}`);
          
          if (hasProductKeywords || allMessages.length > 10) {
            console.log(`\n🎯 This looks like the #product channel!`);
            console.log(`\n💡 To use this channel ID in your code:`);
            console.log(`• Channel ID: ${channelId}`);
            console.log(`• Add this to your .env file: PRODUCT_CHANNEL_ID=${channelId}`);
            console.log(`• Or update the SlackIngestor to use this ID directly`);
          }
        }
        
        return channelId; // Found a working channel
        
      } catch (error) {
        if (error.message.includes('channel_not_found')) {
          console.log(`❌ Channel not found`);
        } else if (error.message.includes('missing_scope')) {
          console.log(`❌ Missing scope`);
        } else {
          console.log(`❌ Error: ${error.message}`);
        }
      }
    }
    
    console.log('\n❌ Could not find the #product channel automatically');
    console.log('\n💡 Manual steps to find the channel ID:');
    console.log('1. Go to your Slack workspace in a web browser');
    console.log('2. Navigate to the #product channel');
    console.log('3. Look at the URL - it will contain the channel ID');
    console.log('   Example: https://thoughtfulai.slack.com/channels/C1234567890');
    console.log('4. The channel ID is the part after /channels/');
    console.log('5. Use that ID in the test script');
    
  } catch (error) {
    console.error('❌ Channel ID test failed:', error.message);
  }
}

testChannelId();
