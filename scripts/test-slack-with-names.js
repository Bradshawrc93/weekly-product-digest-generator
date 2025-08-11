#!/usr/bin/env node

/**
 * Test Slack integration with user name resolution
 */

require('dotenv').config();
const { WebClient } = require('@slack/web-api');
const moment = require('moment');

async function testSlackWithNames() {
  console.log('🔍 Testing Slack with User Names\n');
  console.log('=' .repeat(60));
  
  try {
    const client = new WebClient(process.env.SLACK_BOT_TOKEN);
    const channelId = 'C08T8ARC5T9';
    
    // Test date range (last 8 days)
    const endDate = moment();
    const startDate = moment().subtract(8, 'days');
    
    console.log(`📅 Testing date range: ${startDate.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}\n`);
    console.log(`📺 Channel ID: ${channelId}\n`);
    
    // Get all messages
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
    
    console.log(`\n✅ Found ${allMessages.length} total messages\n`);
    
    // Get unique user IDs
    const userIds = [...new Set(allMessages.map(m => m.user).filter(Boolean))];
    console.log(`👥 Found ${userIds.length} unique users: ${userIds.join(', ')}\n`);
    
    // Resolve user names
    const userNames = {};
    for (const userId of userIds) {
      try {
        const userInfo = await client.users.info({ user: userId });
        userNames[userId] = userInfo.user.real_name || userInfo.user.name;
        console.log(`• ${userId} → ${userNames[userId]}`);
      } catch (error) {
        console.log(`• ${userId} → Error: ${error.message}`);
        userNames[userId] = `Unknown (${userId})`;
      }
    }
    
    console.log('\n💬 **All Messages with User Names**');
    console.log('-'.repeat(60));
    
    // Sort messages by timestamp (newest first)
    const sortedMessages = allMessages.sort((a, b) => b.ts - a.ts);
    
    sortedMessages.forEach((message, index) => {
      const userName = userNames[message.user] || `Unknown (${message.user})`;
      const timestamp = moment(message.ts * 1000);
      
      console.log(`${index + 1}. **${userName}** (${timestamp.format('MMM DD, HH:mm')})`);
      console.log(`   User ID: ${message.user}`);
      console.log(`   Text: ${message.text || '(no text)'}`);
      console.log(`   Thread: ${message.thread_ts ? 'Yes' : 'No'}`);
      console.log(`   Reactions: ${message.reactions ? message.reactions.length : 0}`);
      console.log(`   Attachments: ${message.attachments ? message.attachments.length : 0}`);
      console.log(`   Bot: ${message.bot_id ? 'Yes' : 'No'}`);
      console.log('');
    });
    
    // Check for Aug 4th specifically
    console.log('🔍 **Checking for Aug 4th Messages**');
    console.log('-'.repeat(40));
    
    const aug4Messages = sortedMessages.filter(message => {
      const timestamp = moment(message.ts * 1000);
      return timestamp.format('YYYY-MM-DD') === '2025-08-04';
    });
    
    if (aug4Messages.length > 0) {
      console.log(`✅ Found ${aug4Messages.length} messages from Aug 4th:`);
      aug4Messages.forEach((message, index) => {
        const userName = userNames[message.user] || `Unknown (${message.user})`;
        const timestamp = moment(message.ts * 1000);
        
        console.log(`${index + 1}. **${userName}** (${timestamp.format('MMM DD, HH:mm')})`);
        console.log(`   ${message.text || '(no text)'}`);
        console.log('');
      });
    } else {
      console.log('❌ No messages found from Aug 4th');
      
      // Show date range of messages we found
      if (sortedMessages.length > 0) {
        const earliest = moment(sortedMessages[sortedMessages.length - 1].ts * 1000);
        const latest = moment(sortedMessages[0].ts * 1000);
        console.log(`📅 Message date range: ${earliest.format('MMM DD')} to ${latest.format('MMM DD')}`);
      }
    }
    
    // User activity summary with names
    console.log('👥 **User Activity Summary (with Names)**');
    console.log('-'.repeat(40));
    
    const userActivity = {};
    sortedMessages.forEach(message => {
      const userName = userNames[message.user] || `Unknown (${message.user})`;
      userActivity[userName] = (userActivity[userName] || 0) + 1;
    });
    
    Object.entries(userActivity)
      .sort(([,a], [,b]) => b - a)
      .forEach(([userName, count]) => {
        console.log(`• **${userName}**: ${count} messages`);
      });
    
    console.log('\n✅ Slack with names testing completed!');
    
  } catch (error) {
    console.error('❌ Slack with names test failed:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSlackWithNames();
