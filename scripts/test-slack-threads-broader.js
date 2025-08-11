#!/usr/bin/env node

/**
 * Test Slack thread replies with broader date range
 */

require('dotenv').config();
const { WebClient } = require('@slack/web-api');
const moment = require('moment');

async function testSlackThreadsBroader() {
  console.log('🔍 Testing Slack Thread Replies (Broader Range)\n');
  console.log('=' .repeat(60));
  
  try {
    const client = new WebClient(process.env.SLACK_BOT_TOKEN);
    const channelId = 'C08T8ARC5T9';
    
    // Test with broader date range (last 30 days)
    const endDate = moment();
    const startDate = moment().subtract(30, 'days');
    
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
    
    // Get unique user IDs for name resolution
    const userIds = [...new Set(allMessages.map(m => m.user).filter(Boolean))];
    const userNames = {};
    for (const userId of userIds) {
      try {
        const userInfo = await client.users.info({ user: userId });
        userNames[userId] = userInfo.user.real_name || userInfo.user.name;
      } catch (error) {
        userNames[userId] = `Unknown (${userId})`;
      }
    }
    
    // Identify threads and replies
    const threads = new Map();
    const topLevelMessages = [];
    
    allMessages.forEach(message => {
      if (message.thread_ts && message.thread_ts !== message.ts) {
        // This is a thread reply
        if (!threads.has(message.thread_ts)) {
          threads.set(message.thread_ts, []);
        }
        threads.get(message.thread_ts).push(message);
      } else {
        // This is a top-level message
        topLevelMessages.push(message);
      }
    });
    
    console.log(`📊 Thread Analysis (30 days):`);
    console.log(`• Top-level messages: ${topLevelMessages.length}`);
    console.log(`• Messages with thread replies: ${threads.size}`);
    console.log(`• Total thread replies: ${Array.from(threads.values()).reduce((sum, replies) => sum + replies.length, 0)}\n`);
    
    // Show threads with replies
    const threadsWithReplies = Array.from(threads.entries()).filter(([ts, replies]) => replies.length > 0);
    
    if (threadsWithReplies.length > 0) {
      console.log('🧵 **Threads with Replies**');
      console.log('-'.repeat(60));
      
      threadsWithReplies.forEach(([threadTs, replies], index) => {
        const originalMessage = topLevelMessages.find(m => m.ts === threadTs);
        if (originalMessage) {
          const userName = userNames[originalMessage.user] || `Unknown (${originalMessage.user})`;
          const timestamp = moment(originalMessage.ts * 1000);
          
          console.log(`${index + 1}. **${userName}** (${timestamp.format('MMM DD, HH:mm')})`);
          console.log(`   ${originalMessage.text?.substring(0, 100)}${originalMessage.text && originalMessage.text.length > 100 ? '...' : ''}`);
          console.log(`   Thread replies: ${replies.length}`);
          
          replies.forEach((reply, replyIndex) => {
            const replyUserName = userNames[reply.user] || `Unknown (${reply.user})`;
            const replyTimestamp = moment(reply.ts * 1000);
            console.log(`   📝 ${replyIndex + 1}. ${replyUserName} (${replyTimestamp.format('MMM DD, HH:mm')})`);
            console.log(`      ${reply.text?.substring(0, 80)}${reply.text && reply.text.length > 80 ? '...' : ''}`);
          });
          console.log('');
        }
      });
    } else {
      console.log('❌ No threads with replies found in the 30-day range');
      
      // Show some recent messages to see what we have
      console.log('\n📝 **Recent Messages (Last 10)**');
      console.log('-'.repeat(40));
      
      const recentMessages = topLevelMessages
        .sort((a, b) => b.ts - a.ts)
        .slice(0, 10);
      
      recentMessages.forEach((message, index) => {
        const userName = userNames[message.user] || `Unknown (${message.user})`;
        const timestamp = moment(message.ts * 1000);
        console.log(`${index + 1}. ${userName} (${timestamp.format('MMM DD, HH:mm')})`);
        console.log(`   ${message.text?.substring(0, 100)}${message.text && message.text.length > 100 ? '...' : ''}`);
        console.log(`   Thread: ${message.thread_ts ? 'Yes' : 'No'}`);
        console.log('');
      });
    }
    
    // Test the conversations.replies API directly
    console.log('🔍 **Testing conversations.replies API**');
    console.log('-'.repeat(40));
    
    if (topLevelMessages.length > 0) {
      const testMessage = topLevelMessages[0]; // Use the most recent message
      console.log(`Testing thread replies for: ${testMessage.text?.substring(0, 50)}...`);
      
      try {
        const threadResponse = await client.conversations.replies({
          channel: channelId,
          ts: testMessage.ts
        });
        
        console.log(`✅ Successfully fetched thread replies!`);
        console.log(`• Total messages in thread: ${threadResponse.messages?.length || 0}`);
        console.log(`• Original message: ${threadResponse.messages?.[0]?.text?.substring(0, 100)}...`);
        console.log(`• Replies: ${(threadResponse.messages?.length || 1) - 1}`);
        
        if (threadResponse.messages && threadResponse.messages.length > 1) {
          console.log(`\n📝 Thread replies:`);
          threadResponse.messages.slice(1).forEach((reply, index) => {
            const replyUserName = userNames[reply.user] || `Unknown (${reply.user})`;
            const replyTimestamp = moment(reply.ts * 1000);
            console.log(`${index + 1}. ${replyUserName} (${replyTimestamp.format('MMM DD, HH:mm')})`);
            console.log(`   ${reply.text?.substring(0, 100)}${reply.text && reply.text.length > 100 ? '...' : ''}`);
            console.log('');
          });
        } else {
          console.log('No replies found in this thread');
        }
        
      } catch (error) {
        console.log(`❌ Failed to fetch thread replies: ${error.message}`);
      }
    }
    
    console.log('\n✅ Thread testing completed!');
    
  } catch (error) {
    console.error('❌ Thread test failed:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSlackThreadsBroader();
