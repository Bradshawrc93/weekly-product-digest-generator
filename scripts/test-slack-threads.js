#!/usr/bin/env node

/**
 * Test Slack thread replies access
 */

require('dotenv').config();
const { WebClient } = require('@slack/web-api');
const moment = require('moment');

async function testSlackThreads() {
  console.log('🔍 Testing Slack Thread Replies\n');
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
    
    // Identify threads
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
    
    console.log(`📊 Thread Analysis:`);
    console.log(`• Top-level messages: ${topLevelMessages.length}`);
    console.log(`• Messages with thread replies: ${threads.size}`);
    console.log(`• Total thread replies: ${Array.from(threads.values()).reduce((sum, replies) => sum + replies.length, 0)}\n`);
    
    // Show top-level messages and their thread replies
    console.log('🧵 **Thread Analysis**');
    console.log('-'.repeat(60));
    
    topLevelMessages.forEach((message, index) => {
      const userName = userNames[message.user] || `Unknown (${message.user})`;
      const timestamp = moment(message.ts * 1000);
      const threadReplies = threads.get(message.ts) || [];
      
      console.log(`${index + 1}. **${userName}** (${timestamp.format('MMM DD, HH:mm')})`);
      console.log(`   ${message.text?.substring(0, 100)}${message.text && message.text.length > 100 ? '...' : ''}`);
      console.log(`   Thread replies: ${threadReplies.length}`);
      
      if (threadReplies.length > 0) {
        console.log(`   📝 Thread replies:`);
        threadReplies.forEach((reply, replyIndex) => {
          const replyUserName = userNames[reply.user] || `Unknown (${reply.user})`;
          const replyTimestamp = moment(reply.ts * 1000);
          console.log(`      ${replyIndex + 1}. ${replyUserName} (${replyTimestamp.format('MMM DD, HH:mm')})`);
          console.log(`         ${reply.text?.substring(0, 80)}${reply.text && reply.text.length > 80 ? '...' : ''}`);
        });
      }
      console.log('');
    });
    
    // Test fetching thread replies for a specific thread
    console.log('🔍 **Testing Thread Reply Fetching**');
    console.log('-'.repeat(40));
    
    const threadWithReplies = Array.from(threads.entries()).find(([ts, replies]) => replies.length > 0);
    
    if (threadWithReplies) {
      const [threadTs, replies] = threadWithReplies;
      console.log(`Testing thread: ${threadTs} (${replies.length} replies)`);
      
      try {
        const threadResponse = await client.conversations.replies({
          channel: channelId,
          ts: threadTs
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
        }
        
      } catch (error) {
        console.log(`❌ Failed to fetch thread replies: ${error.message}`);
      }
    } else {
      console.log('No threads with replies found in the date range');
    }
    
    // Show summary of all thread activity
    console.log('📈 **Thread Activity Summary**');
    console.log('-'.repeat(40));
    
    let totalThreadMessages = 0;
    threads.forEach((replies, threadTs) => {
      totalThreadMessages += replies.length;
    });
    
    console.log(`• Threads with replies: ${threads.size}`);
    console.log(`• Total thread replies: ${totalThreadMessages}`);
    console.log(`• Average replies per thread: ${threads.size > 0 ? (totalThreadMessages / threads.size).toFixed(1) : 0}`);
    
    if (threads.size > 0) {
      console.log('\n🧵 **Threads with Most Activity:**');
      const sortedThreads = Array.from(threads.entries())
        .sort(([,a], [,b]) => b.length - a.length)
        .slice(0, 3);
      
      sortedThreads.forEach(([threadTs, replies], index) => {
        const originalMessage = topLevelMessages.find(m => m.ts === threadTs);
        if (originalMessage) {
          const userName = userNames[originalMessage.user] || `Unknown (${originalMessage.user})`;
          console.log(`${index + 1}. ${userName}'s thread: ${replies.length} replies`);
          console.log(`   ${originalMessage.text?.substring(0, 80)}...`);
        }
      });
    }
    
    console.log('\n✅ Thread testing completed!');
    
  } catch (error) {
    console.error('❌ Thread test failed:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSlackThreads();
