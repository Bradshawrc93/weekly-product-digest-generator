#!/usr/bin/env node

/**
 * Debug Jira query to figure out what's wrong
 */

require('dotenv').config();
const axios = require('axios');
const moment = require('moment');

async function debugJiraQuery() {
  console.log('🔍 Debugging Jira Query\n');
  console.log('=' .repeat(60));
  
  try {
    const baseUrl = process.env.JIRA_BASE_URL;
    const auth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
    
    console.log(`📊 Jira Base URL: ${baseUrl}`);
    console.log(`👤 Email: ${process.env.JIRA_EMAIL}`);
    console.log(`🔑 Token: ${process.env.JIRA_API_TOKEN ? 'Present' : 'Missing'}\n`);
    
    // Test 1: Simple project query - just get ALL issues from PO project
    console.log('🔍 Test 1: Simple project query (all issues from PO)');
    console.log('-'.repeat(40));
    
    const simpleJQL = 'project = PO ORDER BY updated DESC';
    console.log(`JQL: ${simpleJQL}\n`);
    
    const simpleResponse = await axios.get(`${baseUrl}/rest/api/3/search`, {
      headers: { Authorization: `Basic ${auth}` },
      params: {
        jql: simpleJQL,
        maxResults: 10,
        fields: 'key,summary,status,updated,created,issuetype'
      }
    });
    
    console.log(`✅ Found ${simpleResponse.data.total} total issues`);
    console.log(`📄 Showing first ${simpleResponse.data.issues.length} issues:\n`);
    
    simpleResponse.data.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.key} - ${issue.fields.summary}`);
      console.log(`   Type: ${issue.fields.issuetype.name}`);
      console.log(`   Status: ${issue.fields.status.name}`);
      console.log(`   Created: ${moment(issue.fields.created).format('YYYY-MM-DD HH:mm')}`);
      console.log(`   Updated: ${moment(issue.fields.updated).format('YYYY-MM-DD HH:mm')}`);
      console.log('');
    });
    
    // Test 2: Check what issue types exist
    console.log('🔍 Test 2: Check issue types in PO project');
    console.log('-'.repeat(40));
    
    const issueTypesResponse = await axios.get(`${baseUrl}/rest/api/3/issuetype`, {
      headers: { Authorization: `Basic ${auth}` }
    });
    
    console.log('Available issue types:');
    issueTypesResponse.data.forEach(type => {
      console.log(`• ${type.name} (${type.id})`);
    });
    console.log('');
    
    // Test 3: Check recent updates without issue type filter
    console.log('🔍 Test 3: Recent updates (last 7 days, no issue type filter)');
    console.log('-'.repeat(40));
    
    const recentJQL = 'project = PO AND updated >= "2025-08-04" ORDER BY updated DESC';
    console.log(`JQL: ${recentJQL}\n`);
    
    const recentResponse = await axios.get(`${baseUrl}/rest/api/3/search`, {
      headers: { Authorization: `Basic ${auth}` },
      params: {
        jql: recentJQL,
        maxResults: 10,
        fields: 'key,summary,status,updated,created,issuetype'
      }
    });
    
    console.log(`✅ Found ${recentResponse.data.total} recently updated issues`);
    console.log(`📄 Showing first ${recentResponse.data.issues.length} issues:\n`);
    
    recentResponse.data.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.key} - ${issue.fields.summary}`);
      console.log(`   Type: ${issue.fields.issuetype.name}`);
      console.log(`   Status: ${issue.fields.status.name}`);
      console.log(`   Created: ${moment(issue.fields.created).format('YYYY-MM-DD HH:mm')}`);
      console.log(`   Updated: ${moment(issue.fields.updated).format('YYYY-MM-DD HH:mm')}`);
      console.log('');
    });
    
    // Test 4: Check team field structure
    console.log('🔍 Test 4: Check team field structure');
    console.log('-'.repeat(40));
    
    if (recentResponse.data.issues.length > 0) {
      const sampleIssue = recentResponse.data.issues[0];
      console.log(`Sample issue: ${sampleIssue.key}`);
      
      const detailedResponse = await axios.get(`${baseUrl}/rest/api/3/issue/${sampleIssue.key}`, {
        headers: { Authorization: `Basic ${auth}` },
        params: {
          fields: 'summary,status,updated,created,issuetype,customfield_10001'
        }
      });
      
      console.log('Issue fields:');
      console.log(`• Summary: ${detailedResponse.data.fields.summary}`);
      console.log(`• Type: ${detailedResponse.data.fields.issuetype.name}`);
      console.log(`• Status: ${detailedResponse.data.fields.status.name}`);
      console.log(`• Created: ${moment(detailedResponse.data.fields.created).format('YYYY-MM-DD HH:mm')}`);
      console.log(`• Updated: ${moment(detailedResponse.data.fields.updated).format('YYYY-MM-DD HH:mm')}`);
      console.log(`• Team field (customfield_10001): ${JSON.stringify(detailedResponse.data.fields.customfield_10001)}`);
      console.log('');
    }
    
    // Test 5: Try our specific issue type filter
    console.log('🔍 Test 5: Our specific issue type filter');
    console.log('-'.repeat(40));
    
    const ourJQL = 'project = PO AND issuetype IN (Story, Task, Bug, Sub-task) AND updated >= "2025-08-04" ORDER BY updated DESC';
    console.log(`JQL: ${ourJQL}\n`);
    
    const ourResponse = await axios.get(`${baseUrl}/rest/api/3/search`, {
      headers: { Authorization: `Basic ${auth}` },
      params: {
        jql: ourJQL,
        maxResults: 10,
        fields: 'key,summary,status,updated,created,issuetype'
      }
    });
    
    console.log(`✅ Found ${ourResponse.data.total} issues with our filter`);
    console.log(`📄 Showing first ${ourResponse.data.issues.length} issues:\n`);
    
    ourResponse.data.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.key} - ${issue.fields.summary}`);
      console.log(`   Type: ${issue.fields.issuetype.name}`);
      console.log(`   Status: ${issue.fields.status.name}`);
      console.log(`   Created: ${moment(issue.fields.created).format('YYYY-MM-DD HH:mm')}`);
      console.log(`   Updated: ${moment(issue.fields.updated).format('YYYY-MM-DD HH:mm')}`);
      console.log('');
    });
    
    console.log('✅ Debug completed!');
    console.log('\n💡 This should help us understand:');
    console.log('• What issues exist in the PO project');
    console.log('• What issue types are available');
    console.log('• What the team field structure looks like');
    console.log('• Why our queries might be returning 0 results');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

debugJiraQuery();
