#!/usr/bin/env node

/**
 * Test what channels the bot can access
 */

require('dotenv').config();
const { WebClient } = require('@slack/web-api');

async function testBotChannels() {
  console.log('🔍 Testing Bot Channel Access\n');
  console.log('=' .repeat(60));
  
  try {
    const client = new WebClient(process.env.SLACK_BOT_TOKEN);
    
    // Test auth.test to get bot info
    console.log('🔧 Getting bot info...');
    const authTest = await client.auth.test();
    console.log(`• Bot User ID: ${authTest.user_id}`);
    console.log(`• Bot User: ${authTest.user}`);
    console.log(`• Team: ${authTest.team}`);
    console.log(`• Team ID: ${authTest.team_id}\n`);
    
    // Try to get bot's own DM channel
    console.log('💬 Testing bot DM access...');
    try {
      const imList = await client.im.list();
      console.log('✅ Bot DM list successful!');
      console.log(`• DM channels: ${imList.ims?.length || 0}`);
      
      if (imList.ims && imList.ims.length > 0) {
        console.log('• DM channels:');
        imList.ims.slice(0, 3).forEach(im => {
          console.log(`  - DM with ${im.user} (${im.id})`);
        });
      }
    } catch (error) {
      console.log('❌ Bot DM list failed:', error.message);
    }
    
    // Try to get bot's own user info
    console.log('\n👤 Testing bot user info...');
    try {
      const userInfo = await client.users.info({
        user: authTest.user_id
      });
      
      console.log('✅ Bot user info successful!');
      console.log(`• Name: ${userInfo.user.name}`);
      console.log(`• Real Name: ${userInfo.user.real_name}`);
      console.log(`• Status: ${userInfo.user.profile?.status_text || 'No status'}`);
      console.log(`• Is Bot: ${userInfo.user.is_bot}`);
      console.log(`• Is Admin: ${userInfo.user.is_admin}`);
      console.log(`• Is Owner: ${userInfo.user.is_owner}`);
      
    } catch (error) {
      console.log('❌ Bot user info failed:', error.message);
    }
    
    // Try to get team info
    console.log('\n🏢 Testing team info...');
    try {
      const teamInfo = await client.team.info();
      
      console.log('✅ Team info successful!');
      console.log(`• Team Name: ${teamInfo.team.name}`);
      console.log(`• Team Domain: ${teamInfo.team.domain}`);
      console.log(`• Team ID: ${teamInfo.team.id}`);
      
    } catch (error) {
      console.log('❌ Team info failed:', error.message);
    }
    
    // Try to get users list
    console.log('\n👥 Testing users list...');
    try {
      const usersList = await client.users.list({
        limit: 10
      });
      
      console.log('✅ Users list successful!');
      console.log(`• Total users: ${usersList.members?.length || 0}`);
      console.log('• Sample users:');
      usersList.members?.slice(0, 5).forEach(user => {
        console.log(`  - ${user.real_name} (@${user.name}) - ${user.is_bot ? 'Bot' : 'User'}`);
      });
      
    } catch (error) {
      console.log('❌ Users list failed:', error.message);
    }
    
    // Try to get bot's own messages
    console.log('\n💬 Testing bot message history...');
    try {
      // Try to get messages from bot's own user
      const userHistory = await client.users.conversations({
        user: authTest.user_id,
        types: 'im,mpim,private_channel,public_channel',
        limit: 10
      });
      
      console.log('✅ Bot conversations successful!');
      console.log(`• Conversations: ${userHistory.channels?.length || 0}`);
      
      if (userHistory.channels && userHistory.channels.length > 0) {
        console.log('• Available conversations:');
        userHistory.channels.forEach(channel => {
          console.log(`  - ${channel.name || 'DM'} (${channel.id}) - ${channel.is_private ? 'Private' : 'Public'}`);
        });
      }
      
    } catch (error) {
      console.log('❌ Bot conversations failed:', error.message);
    }
    
    console.log('\n✅ Bot channel testing completed!');
    console.log('\n💡 Summary:');
    console.log('• The bot has limited scopes and cannot list all channels');
    console.log('• The bot can only access channels it has been invited to');
    console.log('• To access #product channel, you need to:');
    console.log('  1. Invite the bot to the #product channel');
    console.log('  2. Or get the channel ID from Slack web interface');
    console.log('  3. Or update bot scopes to include channels:read');
    
  } catch (error) {
    console.error('❌ Bot channel test failed:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testBotChannels();
