#!/usr/bin/env node

/**
 * Test Slack token and check available scopes
 */

require('dotenv').config();
const { WebClient } = require('@slack/web-api');

async function testSlackToken() {
  console.log('🔍 Testing Slack Token\n');
  console.log('=' .repeat(60));
  
  try {
    const client = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    console.log('🔑 Token Information:');
    console.log(`• Token starts with: ${process.env.SLACK_BOT_TOKEN?.substring(0, 20)}...`);
    console.log(`• Token length: ${process.env.SLACK_BOT_TOKEN?.length || 0} characters\n`);
    
    // Test auth.test to get bot info
    console.log('🔧 Testing auth.test...');
    const authTest = await client.auth.test();
    console.log('✅ Auth test successful!');
    console.log(`• Bot User ID: ${authTest.user_id}`);
    console.log(`• Bot User: ${authTest.user}`);
    console.log(`• Team: ${authTest.team}`);
    console.log(`• Team ID: ${authTest.team_id}`);
    console.log(`• URL: ${authTest.url}\n`);
    
    // Test conversations.list to see what we can access
    console.log('📺 Testing conversations.list...');
    try {
      const conversations = await client.conversations.list({
        types: 'public_channel,private_channel',
        limit: 10
      });
      
      console.log('✅ Conversations list successful!');
      console.log(`• Total channels: ${conversations.channels?.length || 0}`);
      console.log('• Available channels:');
      conversations.channels?.slice(0, 5).forEach(channel => {
        console.log(`  - #${channel.name} (${channel.id}) - ${channel.is_private ? 'Private' : 'Public'}`);
      });
      
      if (conversations.channels && conversations.channels.length > 5) {
        console.log(`  ... and ${conversations.channels.length - 5} more channels`);
      }
      
    } catch (error) {
      console.log('❌ Conversations list failed:');
      console.log(`• Error: ${error.message}`);
      console.log(`• Code: ${error.code}`);
      console.log(`• Data: ${JSON.stringify(error.data, null, 2)}`);
    }
    
    // Test specific channel access
    console.log('\n🎯 Testing specific channel access...');
    try {
      const channelInfo = await client.conversations.info({
        channel: 'product'
      });
      
      console.log('✅ Channel info successful!');
      console.log(`• Channel: #${channelInfo.channel.name}`);
      console.log(`• ID: ${channelInfo.channel.id}`);
      console.log(`• Members: ${channelInfo.channel.num_members}`);
      console.log(`• Type: ${channelInfo.channel.is_private ? 'Private' : 'Public'}`);
      
    } catch (error) {
      console.log('❌ Channel info failed:');
      console.log(`• Error: ${error.message}`);
      console.log(`• Code: ${error.code}`);
    }
    
    // Test message history
    console.log('\n💬 Testing message history...');
    try {
      const history = await client.conversations.history({
        channel: 'product',
        limit: 5
      });
      
      console.log('✅ Message history successful!');
      console.log(`• Messages found: ${history.messages?.length || 0}`);
      
      if (history.messages && history.messages.length > 0) {
        console.log('• Recent messages:');
        history.messages.slice(0, 3).forEach((message, index) => {
          console.log(`  ${index + 1}. ${message.user}: ${message.text?.substring(0, 50)}...`);
        });
      }
      
    } catch (error) {
      console.log('❌ Message history failed:');
      console.log(`• Error: ${error.message}`);
      console.log(`• Code: ${error.code}`);
    }
    
    console.log('\n✅ Slack token testing completed!');
    
  } catch (error) {
    console.error('❌ Slack token test failed:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testSlackToken();
