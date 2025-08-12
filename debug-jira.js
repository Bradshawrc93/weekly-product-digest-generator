#!/usr/bin/env node

require('dotenv').config();
const jiraConnector = require('./src/connectors/jira');
const config = require('./src/utils/config');

async function debugJira() {
  try {
    console.log('🔍 Debugging Jira data structure...\n');
    
    // Test connection
    const connected = await jiraConnector.testConnection();
    if (!connected) {
      console.log('❌ Failed to connect to Jira');
      return;
    }
    console.log('✅ Jira connection successful\n');
    
    // Get a few issues
    const squadUuids = config.getAllSquadUuids();
    console.log('📋 Squad UUIDs:', squadUuids);
    
    const issues = await jiraConnector.getIssuesUpdatedInLastDays(7, squadUuids);
    console.log(`\n📊 Found ${issues.length} issues updated in last 7 days\n`);
    
    if (issues.length > 0) {
      console.log('🔍 Examining first issue structure:');
      const issue = issues[0];
      
      console.log(`Key: ${issue.key}`);
      console.log(`Summary: ${issue.fields.summary}`);
      console.log(`Status: ${issue.fields.status?.name}`);
      console.log(`Project: ${issue.fields.project?.name} (${issue.fields.project?.key})`);
      
      // Check for team field
      console.log('\n🏷️  Team field analysis:');
      console.log('customfield_10001:', JSON.stringify(issue.fields.customfield_10001, null, 2));
      
      // Check all custom fields
      console.log('\n🔧 All custom fields:');
      Object.keys(issue.fields).forEach(key => {
        if (key.includes('customfield')) {
          console.log(`${key}:`, JSON.stringify(issue.fields[key], null, 2));
        }
      });
      
      // Test team extraction
      console.log('\n🎯 Team extraction test:');
      const teamUuid = jiraConnector.getTeamFromIssue(issue);
      console.log('Extracted team UUID:', teamUuid);
      
      if (teamUuid) {
        const squad = config.getSquadByUuid(teamUuid);
        console.log('Found squad:', squad?.displayName || 'Unknown');
      } else {
        console.log('❌ No team UUID found');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugJira();
