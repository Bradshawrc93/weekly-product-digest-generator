#!/usr/bin/env node

/**
 * Test Slack #product channel access using specific channel ID
 */

require('dotenv').config();
const { WebClient } = require('@slack/web-api');
const moment = require('moment');

async function testProductChannel() {
  console.log('🔍 Testing #product Channel Access\n');
  console.log('=' .repeat(60));
  
  try {
    const client = new WebClient(process.env.SLACK_BOT_TOKEN);
    const channelId = 'C08T8ARC5T9';
    
    // Test date range (last 8 days)
    const endDate = moment();
    const startDate = moment().subtract(8, 'days');
    
    console.log(`📅 Testing date range: ${startDate.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}\n`);
    console.log(`📺 Channel ID: ${channelId}\n`);
    
    // Test channel access
    console.log('🔧 Testing channel access...');
    
    try {
      // Get messages from the channel
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
      
      console.log(`\n✅ Successfully accessed #product channel!`);
      console.log(`• Total messages in date range: ${allMessages.length}\n`);
      
      if (allMessages.length > 0) {
        console.log('💬 **Recent Messages**');
        console.log('-'.repeat(40));
        
        allMessages.slice(0, 10).forEach((message, index) => {
          console.log(`${index + 1}. **${message.user}** (${moment(message.ts * 1000).format('MMM DD, HH:mm')})`);
          console.log(`   ${message.text?.substring(0, 100)}${message.text && message.text.length > 100 ? '...' : ''}`);
          console.log(`   Thread: ${message.thread_ts ? 'Yes' : 'No'}`);
          console.log(`   Reactions: ${message.reactions ? message.reactions.length : 0}`);
          console.log(`   Attachments: ${message.attachments ? message.attachments.length : 0}`);
          console.log('');
        });
        
        if (allMessages.length > 10) {
          console.log(`... and ${allMessages.length - 10} more messages\n`);
        }
        
        // User activity summary
        console.log('👥 **User Activity Summary**');
        console.log('-'.repeat(40));
        
        const userActivity = {};
        allMessages.forEach(message => {
          const user = message.user || 'Unknown';
          userActivity[user] = (userActivity[user] || 0) + 1;
        });
        
        Object.entries(userActivity)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .forEach(([user, count]) => {
            console.log(`• **${user}**: ${count} messages`);
          });
        
        console.log('');
        
        // Message type analysis
        console.log('📊 **Message Analysis**');
        console.log('-'.repeat(40));
        
        const threadMessages = allMessages.filter(m => m.thread_ts && m.thread_ts !== m.ts);
        const topLevelMessages = allMessages.filter(m => !m.thread_ts || m.thread_ts === m.ts);
        const messagesWithReactions = allMessages.filter(m => m.reactions && m.reactions.length > 0);
        const messagesWithAttachments = allMessages.filter(m => m.attachments && m.attachments.length > 0);
        
        console.log(`• Top-level messages: ${topLevelMessages.length}`);
        console.log(`• Thread replies: ${threadMessages.length}`);
        console.log(`• Messages with reactions: ${messagesWithReactions.length}`);
        console.log(`• Messages with attachments: ${messagesWithAttachments.length}`);
        
        // Check for decision-related messages
        console.log('\n🎯 **Decision Analysis**');
        console.log('-'.repeat(40));
        
        const decisionKeywords = ['decided', 'decision', 'agreed', 'agreement', 'approved', 'approval', 'final', 'settled'];
        const decisionMessages = allMessages.filter(message => {
          if (!message.text) return false;
          const text = message.text.toLowerCase();
          return decisionKeywords.some(keyword => text.includes(keyword));
        });
        
        console.log(`• Decision-related messages: ${decisionMessages.length}`);
        
        if (decisionMessages.length > 0) {
          console.log('\n🎯 **Decision Messages**');
          decisionMessages.slice(0, 5).forEach((message, index) => {
            console.log(`${index + 1}. **${message.user}** (${moment(message.ts * 1000).format('MMM DD, HH:mm')})`);
            console.log(`   ${message.text?.substring(0, 150)}${message.text && message.text.length > 150 ? '...' : ''}`);
            console.log('');
          });
        }
        
        // Check for risk-related messages
        console.log('⚠️ **Risk Analysis**');
        console.log('-'.repeat(40));
        
        const riskKeywords = ['risk', 'concern', 'issue', 'blocked', 'blocker', 'stuck', 'problem', 'trouble'];
        const riskMessages = allMessages.filter(message => {
          if (!message.text) return false;
          const text = message.text.toLowerCase();
          return riskKeywords.some(keyword => text.includes(keyword));
        });
        
        console.log(`• Risk-related messages: ${riskMessages.length}`);
        
        if (riskMessages.length > 0) {
          console.log('\n⚠️ **Risk Messages**');
          riskMessages.slice(0, 5).forEach((message, index) => {
            console.log(`${index + 1}. **${message.user}** (${moment(message.ts * 1000).format('MMM DD, HH:mm')})`);
            console.log(`   ${message.text?.substring(0, 150)}${message.text && message.text.length > 150 ? '...' : ''}`);
            console.log('');
          });
        }
        
        // Check for launch-related messages
        console.log('🚀 **Launch Analysis**');
        console.log('-'.repeat(40));
        
        const launchKeywords = ['launch', 'deploy', 'release', 'shipped', 'live', 'production', 'go-live'];
        const launchMessages = allMessages.filter(message => {
          if (!message.text) return false;
          const text = message.text.toLowerCase();
          return launchKeywords.some(keyword => text.includes(keyword));
        });
        
        console.log(`• Launch-related messages: ${launchMessages.length}`);
        
        if (launchMessages.length > 0) {
          console.log('\n🚀 **Launch Messages**');
          launchMessages.slice(0, 5).forEach((message, index) => {
            console.log(`${index + 1}. **${message.user}** (${moment(message.ts * 1000).format('MMM DD, HH:mm')})`);
            console.log(`   ${message.text?.substring(0, 150)}${message.text && message.text.length > 150 ? '...' : ''}`);
            console.log('');
          });
        }
        
      } else {
        console.log('💬 No messages found in the specified date range');
      }
      
      console.log('\n✅ #product channel testing completed successfully!');
      console.log('\n💡 Next steps:');
      console.log('• Update the SlackIngestor to use channel ID: C08T8ARC5T9');
      console.log('• Test the full integration with the DigestGenerator');
      console.log('• Configure decision/risk/launch detection keywords');
      
    } catch (error) {
      console.log('❌ Failed to access channel:');
      console.log(`• Error: ${error.message}`);
      console.log(`• Code: ${error.code}`);
      if (error.data) {
        console.log(`• Data: ${JSON.stringify(error.data, null, 2)}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Product channel test failed:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testProductChannel();
