#!/usr/bin/env node

/**
 * Test Slack integration - show all messages without filtering
 */

require('dotenv').config();
const { SlackIngestor } = require('../src/ingestors/slack');
const moment = require('moment');

async function testAllMessages() {
  console.log('🔍 Testing Slack - All Messages\n');
  console.log('=' .repeat(60));
  
  try {
    const slackIngestor = new SlackIngestor();
    
    // Test date range (last 8 days)
    const endDate = moment();
    const startDate = moment().subtract(8, 'days');
    const dateRange = { startDate, endDate };
    
    console.log(`📅 Testing date range: ${startDate.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}\n`);
    
    // Test with 'product' channel
    const channelName = 'product';
    console.log(`📺 Testing channel: #${channelName}\n`);
    
    // Mock squad configuration for testing
    const mockSquad = {
      name: 'Test Squad',
      slackChannel: `#${channelName}`,
      members: [
        { slackHandle: '@cody.bradshaw' },
        { slackHandle: '@jakob.mcclanahan' }
      ]
    };
    
    console.log('📊 Fetching all Slack messages...\n');
    
    // Get the channel ID directly
    const channelId = await slackIngestor.getChannelId(`#${channelName}`);
    console.log(`Channel ID: ${channelId}\n`);
    
    if (!channelId) {
      console.log('❌ Could not get channel ID');
      return;
    }
    
    // Fetch all messages directly
    const allMessages = await slackIngestor.fetchChannelMessages(channelId, dateRange);
    
    console.log(`✅ Found ${allMessages.length} total messages\n`);
    
    if (allMessages.length > 0) {
      console.log('💬 **All Messages**');
      console.log('-'.repeat(40));
      
      allMessages.forEach((message, index) => {
        console.log(`${index + 1}. **${message.user}** (${moment(message.ts * 1000).format('MMM DD, HH:mm')})`);
        console.log(`   Text: ${message.text || '(no text)'}`);
        console.log(`   Thread: ${message.thread_ts ? 'Yes' : 'No'}`);
        console.log(`   Reactions: ${message.reactions ? message.reactions.length : 0}`);
        console.log(`   Attachments: ${message.attachments ? message.attachments.length : 0}`);
        console.log(`   Bot: ${message.bot_id ? 'Yes' : 'No'}`);
        console.log('');
      });
      
      // Test filtering logic
      console.log('🔍 **Testing Filter Logic**');
      console.log('-'.repeat(40));
      
      // Test decision filtering
      const decisionMessages = allMessages.filter(message => 
        slackIngestor.isDecisionMessage(message, mockSquad)
      );
      console.log(`• Decision messages: ${decisionMessages.length}`);
      
      // Test risk filtering
      const riskMessages = allMessages.filter(message => 
        slackIngestor.isRiskMessage(message, mockSquad)
      );
      console.log(`• Risk messages: ${riskMessages.length}`);
      
      // Test launch filtering
      const launchMessages = allMessages.filter(message => 
        slackIngestor.isLaunchMessage(message, mockSquad)
      );
      console.log(`• Launch messages: ${launchMessages.length}`);
      
      // Test noise filtering
      const noiseMessages = allMessages.filter(message => 
        slackIngestor.isNoiseMessage(message)
      );
      console.log(`• Noise messages: ${noiseMessages.length}`);
      
      console.log('');
      
      // Show what would be classified as each type
      if (decisionMessages.length > 0) {
        console.log('🎯 **Decision Messages Found:**');
        decisionMessages.forEach((message, index) => {
          console.log(`${index + 1}. ${message.user}: ${message.text?.substring(0, 100)}...`);
        });
        console.log('');
      }
      
      if (riskMessages.length > 0) {
        console.log('⚠️ **Risk Messages Found:**');
        riskMessages.forEach((message, index) => {
          console.log(`${index + 1}. ${message.user}: ${message.text?.substring(0, 100)}...`);
        });
        console.log('');
      }
      
      if (launchMessages.length > 0) {
        console.log('🚀 **Launch Messages Found:**');
        launchMessages.forEach((message, index) => {
          console.log(`${index + 1}. ${message.user}: ${message.text?.substring(0, 100)}...`);
        });
        console.log('');
      }
      
      // Test with more inclusive filtering
      console.log('🔧 **Testing More Inclusive Filtering**');
      console.log('-'.repeat(40));
      
      // Test decision keywords without squad mention requirement
      const decisionKeywords = ['decided', 'decision', 'agreed', 'agreement', 'approved', 'approval'];
      const inclusiveDecisionMessages = allMessages.filter(message => {
        if (!message.text || message.bot_id) return false;
        const text = message.text.toLowerCase();
        return decisionKeywords.some(keyword => text.includes(keyword));
      });
      console.log(`• Inclusive decision messages: ${inclusiveDecisionMessages.length}`);
      
      // Test risk keywords without squad mention requirement
      const riskKeywords = ['risk', 'concern', 'issue', 'blocked', 'blocker', 'stuck', 'problem'];
      const inclusiveRiskMessages = allMessages.filter(message => {
        if (!message.text || message.bot_id) return false;
        const text = message.text.toLowerCase();
        return riskKeywords.some(keyword => text.includes(keyword));
      });
      console.log(`• Inclusive risk messages: ${inclusiveRiskMessages.length}`);
      
      // Test launch keywords without squad mention requirement
      const launchKeywords = ['launch', 'deploy', 'release', 'shipped', 'live', 'production'];
      const inclusiveLaunchMessages = allMessages.filter(message => {
        if (!message.text || message.bot_id) return false;
        const text = message.text.toLowerCase();
        return launchKeywords.some(keyword => text.includes(keyword));
      });
      console.log(`• Inclusive launch messages: ${inclusiveLaunchMessages.length}`);
      
      console.log('');
      
      if (inclusiveDecisionMessages.length > 0) {
        console.log('🎯 **Inclusive Decision Messages:**');
        inclusiveDecisionMessages.forEach((message, index) => {
          console.log(`${index + 1}. ${message.user}: ${message.text?.substring(0, 100)}...`);
        });
        console.log('');
      }
      
      if (inclusiveRiskMessages.length > 0) {
        console.log('⚠️ **Inclusive Risk Messages:**');
        inclusiveRiskMessages.forEach((message, index) => {
          console.log(`${index + 1}. ${message.user}: ${message.text?.substring(0, 100)}...`);
        });
        console.log('');
      }
      
      if (inclusiveLaunchMessages.length > 0) {
        console.log('🚀 **Inclusive Launch Messages:**');
        inclusiveLaunchMessages.forEach((message, index) => {
          console.log(`${index + 1}. ${message.user}: ${message.text?.substring(0, 100)}...`);
        });
        console.log('');
      }
    }
    
    console.log('✅ Slack all messages testing completed!');
    
  } catch (error) {
    console.error('❌ Slack all messages test failed:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testAllMessages();
