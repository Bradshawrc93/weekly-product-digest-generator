#!/usr/bin/env node

/**
 * Debug JQL generation
 */

require('dotenv').config();
const { JiraIngestor } = require('../src/ingestors/jira');
const moment = require('moment');

async function debugJQLGeneration() {
  console.log('🔍 Debugging JQL Generation\n');
  console.log('=' .repeat(60));
  
  try {
    const jiraIngestor = new JiraIngestor();
    
    // Test date range
    const endDate = moment();
    const startDate = moment().subtract(7, 'days');
    const dateRange = { startDate, endDate };
    
    console.log(`📅 Date range: ${startDate.format('YYYY-MM-DD')} to ${endDate.format('YYYY-MM-DD')}\n`);
    
    // Get squad configuration
    const { getAllSquads } = require('../src/utils/config');
    const squads = await getAllSquads();
    
    if (!squads || squads.length === 0) {
      console.log('❌ No squads found in configuration');
      return;
    }
    
    // Test with Voice squad (we know it has issues)
    const voiceSquad = squads.find(s => s.name === 'Voice');
    if (!voiceSquad) {
      console.log('❌ Voice squad not found');
      return;
    }
    
    console.log(`🏢 Testing with Voice squad: ${voiceSquad.name}\n`);
    
    // Test 1: Original JQL generation
    console.log('🔍 Test 1: Original JQL generation');
    console.log('-'.repeat(40));
    
    const originalJQL = jiraIngestor.buildIssueJQL(voiceSquad, dateRange);
    console.log(`JQL: ${originalJQL}\n`);
    
    // Test 2: Override method and generate JQL
    console.log('🔍 Test 2: Override method and generate JQL');
    console.log('-'.repeat(40));
    
    const originalBuildIssueJQL = jiraIngestor.buildIssueJQL.bind(jiraIngestor);
    jiraIngestor.buildIssueJQL = function(squad, dateRange) {
      const projectFilter = `project = ${squad.jiraConfig.projectKey}`;
      const dateFilter = `updated >= "${dateRange.startDate.format('YYYY-MM-DD')}" AND updated <= "${dateRange.endDate.format('YYYY-MM-DD')}"`;
      const issueTypes = 'issuetype IN (Story, Task, Bug, Sub-task)';
      const excludeLabel = 'labels != "no-digest"';
      
      return `${projectFilter} AND ${dateFilter} AND ${issueTypes} AND ${excludeLabel} ORDER BY updated DESC`;
    };
    
    const overriddenJQL = jiraIngestor.buildIssueJQL(voiceSquad, dateRange);
    console.log(`JQL: ${overriddenJQL}\n`);
    
    // Test 3: Call fetchIssues with overridden method
    console.log('🔍 Test 3: Call fetchIssues with overridden method');
    console.log('-'.repeat(40));
    
    try {
      const issues = await jiraIngestor.fetchIssues(voiceSquad, dateRange);
      console.log(`✅ Fetched ${issues.length} issues\n`);
      
      if (issues.length > 0) {
        console.log('📄 Sample issues:');
        issues.slice(0, 3).forEach((issue, index) => {
          console.log(`  ${index + 1}. ${issue.key} - ${issue.fields.summary}`);
          console.log(`     Type: ${issue.fields.issuetype.name}`);
          console.log(`     Status: ${issue.fields.status.name}`);
          console.log(`     Updated: ${moment(issue.fields.updated).format('YYYY-MM-DD HH:mm')}`);
        });
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      if (error.response?.data?.errorMessages) {
        console.log(`API Error: ${error.response.data.errorMessages.join(', ')}`);
      }
    }
    
    // Restore original method
    jiraIngestor.buildIssueJQL = originalBuildIssueJQL;
    
    console.log('✅ JQL generation debugging completed!');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugJQLGeneration();
