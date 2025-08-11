#!/usr/bin/env node

/**
 * Test Slack direct channel access using channel ID
 */

require('dotenv').config();
const { WebClient } = require('@slack/web-api');
const moment = require('moment');

async function testSlackDirect() {
  console.log('🔍 Testing Slack Direct Channel Access\n');
  console.log('=' .repeat(60));
  
  try {
    const client = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    // Test date range (last 8 days)
    const endDate = moment();
    const startDate = moment().subtract(8, 'days');
    
    console.log(`📅 Testing date range: ${startDate.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}\n`);
    
    // Try to find the product channel ID by testing common patterns
    const possibleChannelIds = [
      'C099S4NQUPQ', // Common pattern based on bot ID
      'CQCFA387L',   // Based on team ID
      'C099S4NQUPR', // Another common pattern
      'C099S4NQUPS', // Another common pattern
    ];
    
    console.log('🔍 Trying to find product channel...\n');
    
    for (const channelId of possibleChannelIds) {
      console.log(`Testing channel ID: ${channelId}`);
      
      try {
        // Test if we can access this channel
        const history = await client.conversations.history({
          channel: channelId,
          limit: 1,
          oldest: Math.floor(startDate.valueOf() / 1000),
          latest: Math.floor(endDate.valueOf() / 1000)
        });
        
        console.log(`✅ Successfully accessed channel ${channelId}!`);
        console.log(`• Messages in date range: ${history.messages?.length || 0}`);
        
        if (history.messages && history.messages.length > 0) {
          console.log('• Sample message:');
          const message = history.messages[0];
          console.log(`  - User: ${message.user}`);
          console.log(`  - Text: ${message.text?.substring(0, 100)}...`);
          console.log(`  - Time: ${moment(message.ts * 1000).format('MMM DD, HH:mm')}`);
        }
        
        // Now get more messages
        console.log('\n📊 Fetching all messages in date range...');
        const allMessages = [];
        let cursor = null;
        
        do {
          const response = await client.conversations.history({
            channel: channelId,
            limit: 100,
            cursor: cursor,
            oldest: Math.floor(startDate.valueOf() / 1000),
            latest: Math.floor(endDate.valueOf() / 1000)
          });
          
          allMessages.push(...response.messages);
          cursor = response.response_metadata?.next_cursor;
          
          console.log(`  Fetched ${response.messages?.length || 0} messages...`);
        } while (cursor);
        
        console.log(`\n✅ Total messages found: ${allMessages.length}`);
        
        if (allMessages.length > 0) {
          console.log('\n💬 **Recent Messages**');
          console.log('-'.repeat(40));
          
          allMessages.slice(0, 10).forEach((message, index) => {
            console.log(`${index + 1}. **${message.user}** (${moment(message.ts * 1000).format('MMM DD, HH:mm')})`);
            console.log(`   ${message.text?.substring(0, 100)}${message.text && message.text.length > 100 ? '...' : ''}`);
            console.log(`   Thread: ${message.thread_ts ? 'Yes' : 'No'}`);
            console.log(`   Reactions: ${message.reactions ? message.reactions.length : 0}`);
            console.log('');
          });
          
          // User activity summary
          const userActivity = {};
          allMessages.forEach(message => {
            const user = message.user || 'Unknown';
            userActivity[user] = (userActivity[user] || 0) + 1;
          });
          
          console.log('👥 **User Activity Summary**');
          console.log('-'.repeat(40));
          Object.entries(userActivity)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .forEach(([user, count]) => {
              console.log(`• **${user}**: ${count} messages`);
            });
        }
        
        return; // Found the channel, exit
        
      } catch (error) {
        console.log(`❌ Channel ${channelId} failed: ${error.message}`);
      }
    }
    
    console.log('\n❌ Could not find product channel with common IDs');
    console.log('💡 You may need to:');
    console.log('1. Add the bot to the #product channel');
    console.log('2. Get the channel ID from Slack web interface');
    console.log('3. Update the bot scopes to include channels:read');
    
  } catch (error) {
    console.error('❌ Slack direct test failed:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSlackDirect();
