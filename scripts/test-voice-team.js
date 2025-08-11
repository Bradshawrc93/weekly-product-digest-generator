#!/usr/bin/env node

/**
 * Test Voice team specifically
 */

require('dotenv').config();
const axios = require('axios');
const moment = require('moment');

async function testVoiceTeam() {
  console.log('🔍 Testing Voice Team Specifically\n');
  console.log('=' .repeat(60));
  
  try {
    const baseUrl = process.env.JIRA_BASE_URL;
    const auth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
    
    // Test 1: Get all issues for Voice team
    console.log('🔍 Test 1: Voice team issues (with team filter)');
    console.log('-'.repeat(40));
    
    const voiceJQL = 'project = PO AND "Team" = "eab6f557-2ee3-458c-9511-54c135cd4752-82" ORDER BY updated DESC';
    console.log(`JQL: ${voiceJQL}\n`);
    
    const voiceResponse = await axios.get(`${baseUrl}/rest/api/3/search`, {
      headers: { Authorization: `Basic ${auth}` },
      params: {
        jql: voiceJQL,
        maxResults: 10,
        fields: 'key,summary,status,updated,created,issuetype,customfield_10001'
      }
    });
    
    console.log(`✅ Found ${voiceResponse.data.total} Voice team issues`);
    console.log(`📄 Showing first ${voiceResponse.data.issues.length} issues:\n`);
    
    voiceResponse.data.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.key} - ${issue.fields.summary}`);
      console.log(`   Type: ${issue.fields.issuetype.name}`);
      console.log(`   Status: ${issue.fields.status.name}`);
      console.log(`   Created: ${moment(issue.fields.created).format('YYYY-MM-DD HH:mm')}`);
      console.log(`   Updated: ${moment(issue.fields.updated).format('YYYY-MM-DD HH:mm')}`);
      console.log(`   Team: ${JSON.stringify(issue.fields.customfield_10001)}`);
      console.log('');
    });
    
    // Test 2: Get recent issues without team filter
    console.log('🔍 Test 2: Recent issues without team filter');
    console.log('-'.repeat(40));
    
    const recentJQL = 'project = PO AND updated >= "2025-08-04" ORDER BY updated DESC';
    console.log(`JQL: ${recentJQL}\n`);
    
    const recentResponse = await axios.get(`${baseUrl}/rest/api/3/search`, {
      headers: { Authorization: `Basic ${auth}` },
      params: {
        jql: recentJQL,
        maxResults: 10,
        fields: 'key,summary,status,updated,created,issuetype,customfield_10001'
      }
    });
    
    console.log(`✅ Found ${recentResponse.data.total} recent issues`);
    console.log(`📄 Showing first ${recentResponse.data.issues.length} issues:\n`);
    
    recentResponse.data.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.key} - ${issue.fields.summary}`);
      console.log(`   Type: ${issue.fields.issuetype.name}`);
      console.log(`   Status: ${issue.fields.status.name}`);
      console.log(`   Created: ${moment(issue.fields.created).format('YYYY-MM-DD HH:mm')}`);
      console.log(`   Updated: ${moment(issue.fields.updated).format('YYYY-MM-DD HH:mm')}`);
      console.log(`   Team: ${JSON.stringify(issue.fields.customfield_10001)}`);
      console.log('');
    });
    
    // Test 3: Get specific issue PO-117
    console.log('🔍 Test 3: Get specific issue PO-117');
    console.log('-'.repeat(40));
    
    const po117Response = await axios.get(`${baseUrl}/rest/api/3/issue/PO-117`, {
      headers: { Authorization: `Basic ${auth}` },
      params: {
        fields: 'key,summary,status,updated,created,issuetype,customfield_10001'
      }
    });
    
    console.log(`✅ Found issue: ${po117Response.data.key}`);
    console.log(`Summary: ${po117Response.data.fields.summary}`);
    console.log(`Type: ${po117Response.data.fields.issuetype.name}`);
    console.log(`Status: ${po117Response.data.fields.status.name}`);
    console.log(`Created: ${moment(po117Response.data.fields.created).format('YYYY-MM-DD HH:mm')}`);
    console.log(`Updated: ${moment(po117Response.data.fields.updated).format('YYYY-MM-DD HH:mm')}`);
    console.log(`Team: ${JSON.stringify(po117Response.data.fields.customfield_10001, null, 2)}`);
    console.log('');
    
    // Test 4: Check if PO-117 matches our team filter
    console.log('🔍 Test 4: Check if PO-117 matches Voice team filter');
    console.log('-'.repeat(40));
    
    const teamField = po117Response.data.fields.customfield_10001;
    const voiceTeamId = 'eab6f557-2ee3-458c-9511-54c135cd4752-82';
    
    console.log(`PO-117 Team ID: ${teamField?.id}`);
    console.log(`Voice Team ID: ${voiceTeamId}`);
    console.log(`Match: ${teamField?.id === voiceTeamId ? 'YES' : 'NO'}`);
    console.log('');
    
    // Test 5: Try our exact JQL with issue type filter
    console.log('🔍 Test 5: Our exact JQL with issue type filter');
    console.log('-'.repeat(40));
    
    const ourJQL = `project = PO AND "Team" = "${voiceTeamId}" AND issuetype IN (Story, Task, Bug, Sub-task) AND updated >= "2025-07-12" ORDER BY updated DESC`;
    console.log(`JQL: ${ourJQL}\n`);
    
    const ourResponse = await axios.get(`${baseUrl}/rest/api/3/search`, {
      headers: { Authorization: `Basic ${auth}` },
      params: {
        jql: ourJQL,
        maxResults: 10,
        fields: 'key,summary,status,updated,created,issuetype,customfield_10001'
      }
    });
    
    console.log(`✅ Found ${ourResponse.data.total} issues with our exact filter`);
    console.log(`📄 Showing first ${ourResponse.data.issues.length} issues:\n`);
    
    ourResponse.data.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.key} - ${issue.fields.summary}`);
      console.log(`   Type: ${issue.fields.issuetype.name}`);
      console.log(`   Status: ${issue.fields.status.name}`);
      console.log(`   Created: ${moment(issue.fields.created).format('YYYY-MM-DD HH:mm')}`);
      console.log(`   Updated: ${moment(issue.fields.updated).format('YYYY-MM-DD HH:mm')}`);
      console.log(`   Team: ${JSON.stringify(issue.fields.customfield_10001)}`);
      console.log('');
    });
    
    console.log('✅ Voice team testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testVoiceTeam();
