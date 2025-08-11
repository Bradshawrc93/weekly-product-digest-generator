#!/usr/bin/env node

/**
 * Test the fixed JQL
 */

require('dotenv').config();
const axios = require('axios');
const moment = require('moment');

async function testFixedJQL() {
  console.log('🔍 Testing Fixed JQL\n');
  console.log('=' .repeat(60));
  
  try {
    const baseUrl = process.env.JIRA_BASE_URL;
    const auth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
    
    // Test the fixed JQL with proper labels filter
    const fixedJQL = 'project = PO AND updated >= "2025-08-04" AND updated <= "2025-08-11" AND issuetype IN (Story, Task, Bug, Sub-task) AND "Team" = "eab6f557-2ee3-458c-9511-54c135cd4752-82" AND (labels IS EMPTY OR labels != "no-digest") ORDER BY updated DESC';
    
    console.log(`🔍 Testing fixed JQL:`);
    console.log(`JQL: ${fixedJQL}\n`);
    
    const response = await axios.get(`${baseUrl}/rest/api/3/search`, {
      headers: { Authorization: `Basic ${auth}` },
      params: {
        jql: fixedJQL,
        maxResults: 10,
        fields: 'key,summary,status,updated,created,issuetype,customfield_10001,labels'
      }
    });
    
    console.log(`✅ Found ${response.data.total} issues`);
    console.log(`📄 Showing first ${response.data.issues.length} issues:\n`);
    
    response.data.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.key} - ${issue.fields.summary}`);
      console.log(`   Type: ${issue.fields.issuetype.name}`);
      console.log(`   Status: ${issue.fields.status.name}`);
      console.log(`   Created: ${moment(issue.fields.created).format('YYYY-MM-DD HH:mm')}`);
      console.log(`   Updated: ${moment(issue.fields.updated).format('YYYY-MM-DD HH:mm')}`);
      console.log(`   Team: ${JSON.stringify(issue.fields.customfield_10001)}`);
      console.log(`   Labels: ${JSON.stringify(issue.fields.labels)}`);
      console.log('');
    });
    
    console.log('✅ Fixed JQL testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testFixedJQL();
