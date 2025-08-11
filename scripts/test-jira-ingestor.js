#!/usr/bin/env node

/**
 * Test Jira ingestor with field mappings
 */

require('dotenv').config();
const { JiraIngestor } = require('../src/ingestors/jira');
const moment = require('moment');

async function testJiraIngestor() {
  console.log('🔍 Testing Jira Ingestor...\n');
  
  try {
    const ingestor = new JiraIngestor();
    
    // Create a test squad configuration
    const testSquad = {
      name: "Test Squad",
      jiraConfig: {
        projectKey: "PO",
        projectName: "Product Operations",
        workstreams: [
          {
            name: "Voice Experiments",
            key: "VOICE-EXP",
            description: "Voice agent experiments"
          }
        ]
      }
    };
    
    // Test date range (last 30 days)
    const endDate = moment();
    const startDate = moment().subtract(30, 'days');
    const dateRange = { startDate, endDate };
    
    console.log(`📅 Testing date range: ${startDate.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}\n`);
    
    // Test data collection
    console.log('📊 Collecting Jira data...\n');
    const data = await ingestor.collectData(testSquad, dateRange);
    
    console.log('✅ Data collection successful!\n');
    
    // Display results
    console.log('📋 Results Summary:');
    console.log(`• Workstreams: ${data.workstreams.length}`);
    console.log(`• Epics: ${data.epics.length}`);
    console.log(`• Issues: ${data.issues.length}`);
    
    if (data.workstreams.length > 0) {
      console.log('\n📁 Sample Workstream:');
      const workstream = data.workstreams[0];
      console.log(`  • Key: ${workstream.key}`);
      console.log(`  • Name: ${workstream.name}`);
      console.log(`  • Status: ${workstream.status}`);
      console.log(`  • Target Quarter: ${workstream.targetQuarter || 'Not set'}`);
      console.log(`  • Team: ${workstream.team || 'Not set'}`);
    }
    
    if (data.epics.length > 0) {
      console.log('\n📚 Sample Epic:');
      const epic = data.epics[0];
      console.log(`  • Key: ${epic.key}`);
      console.log(`  • Name: ${epic.name}`);
      console.log(`  • Status: ${epic.status}`);
      console.log(`  • Epic Link: ${epic.epicLink || 'Not set'}`);
      console.log(`  • Story Points: ${epic.storyPoints || 'Not set'}`);
    }
    
    if (data.issues.length > 0) {
      console.log('\n📄 Sample Issue:');
      const issue = data.issues[0];
      console.log(`  • Key: ${issue.key}`);
      console.log(`  • Summary: ${issue.summary}`);
      console.log(`  • Type: ${issue.issueType}`);
      console.log(`  • Status: ${issue.status}`);
      console.log(`  • Assignee: ${issue.assignee || 'Unassigned'}`);
      console.log(`  • Story Points: ${issue.storyPoints || 'Not set'}`);
      console.log(`  • Epic Link: ${issue.epicLink || 'Not set'}`);
      console.log(`  • Workstream: ${issue.workstream || 'Not set'}`);
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testJiraIngestor();
