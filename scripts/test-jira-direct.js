#!/usr/bin/env node

/**
 * Direct Jira API test to see what issues exist
 */

require('dotenv').config();
const axios = require('axios');

async function testDirectJira() {
  console.log('🔍 Direct Jira API Test...\n');
  
  try {
    const auth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
    const baseUrl = process.env.JIRA_BASE_URL;
    
    // Test 1: Get all issues in the project
    console.log('📋 Getting all issues in PO project...\n');
    const allIssuesResponse = await axios.get(`${baseUrl}/rest/api/3/search`, {
      headers: { Authorization: `Basic ${auth}` },
      params: {
        jql: 'project = PO ORDER BY updated DESC',
        maxResults: 10,
        fields: 'summary,issuetype,status,assignee,created,updated,customfield_10014,customfield_10001,customfield_10368,customfield_10030,customfield_10566'
      }
    });
    
    console.log(`📊 Found ${allIssuesResponse.data.issues.length} issues:\n`);
    
    allIssuesResponse.data.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.key} - ${issue.fields.summary}`);
      console.log(`   Type: ${issue.fields.issuetype.name}`);
      console.log(`   Status: ${issue.fields.status.name}`);
      console.log(`   Assignee: ${issue.fields.assignee?.displayName || 'Unassigned'}`);
      console.log(`   Epic Link: ${issue.fields.customfield_10014 || 'None'}`);
      console.log(`   Team: ${issue.fields.customfield_10001?.displayName || 'None'}`);
      console.log(`   Target Quarter: ${issue.fields.customfield_10368?.value || 'None'}`);
      console.log(`   Story Points: ${issue.fields.customfield_10030 || 'None'}`);
      console.log(`   Squad: ${issue.fields.customfield_10566?.map(s => s.value).join(', ') || 'None'}`);
      console.log('');
    });
    
    // Test 2: Get issues by type
    console.log('📋 Getting issues by type...\n');
    const issueTypes = ['Workstream', 'Epic', 'Task', 'Story'];
    
    for (const issueType of issueTypes) {
      try {
        const response = await axios.get(`${baseUrl}/rest/api/3/search`, {
          headers: { Authorization: `Basic ${auth}` },
          params: {
            jql: `project = PO AND issuetype = "${issueType}" ORDER BY updated DESC`,
            maxResults: 3,
            fields: 'summary,status,assignee,customfield_10014,customfield_10001,customfield_10368,customfield_10030,customfield_10566'
          }
        });
        
        console.log(`📄 ${issueType} issues (${response.data.issues.length}):`);
        response.data.issues.forEach(issue => {
          console.log(`  • ${issue.key} - ${issue.fields.summary}`);
          console.log(`    Status: ${issue.fields.status.name}`);
          console.log(`    Epic Link: ${issue.fields.customfield_10014 || 'None'}`);
          console.log(`    Team: ${issue.fields.customfield_10001?.displayName || 'None'}`);
          console.log(`    Target Quarter: ${issue.fields.customfield_10368?.value || 'None'}`);
          console.log(`    Story Points: ${issue.fields.customfield_10030 || 'None'}`);
          console.log(`    Squad: ${issue.fields.customfield_10566?.map(s => s.value).join(', ') || 'None'}`);
        });
        console.log('');
        
      } catch (error) {
        console.log(`📄 ${issueType}: Error - ${error.response?.data?.errorMessages?.[0] || error.message}\n`);
      }
    }
    
    console.log('✅ Direct test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testDirectJira();
