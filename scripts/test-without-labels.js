#!/usr/bin/env node

/**
 * Test without the labels filter
 */

require('dotenv').config();
const axios = require('axios');
const moment = require('moment');

async function testWithoutLabels() {
  console.log('🔍 Testing Without Labels Filter\n');
  console.log('=' .repeat(60));
  
  try {
    const baseUrl = process.env.JIRA_BASE_URL;
    const auth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
    
    // Test without the labels filter
    const jqlWithoutLabels = 'project = PO AND updated >= "2025-08-04" AND updated <= "2025-08-11" AND issuetype IN (Story, Task, Bug, Sub-task) ORDER BY updated DESC';
    
    console.log(`🔍 Testing without labels filter:`);
    console.log(`JQL: ${jqlWithoutLabels}\n`);
    
    const response = await axios.get(`${baseUrl}/rest/api/3/search`, {
      headers: { Authorization: `Basic ${auth}` },
      params: {
        jql: jqlWithoutLabels,
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
    
    // Test with broader date range without labels
    console.log('🔍 Testing with broader date range without labels');
    console.log('-'.repeat(40));
    
    const broaderJQL = 'project = PO AND updated >= "2025-07-12" AND updated <= "2025-08-11" AND issuetype IN (Story, Task, Bug, Sub-task) ORDER BY updated DESC';
    
    console.log(`JQL: ${broaderJQL}\n`);
    
    const broaderResponse = await axios.get(`${baseUrl}/rest/api/3/search`, {
      headers: { Authorization: `Basic ${auth}` },
      params: {
        jql: broaderJQL,
        maxResults: 10,
        fields: 'key,summary,status,updated,created,issuetype,customfield_10001,labels'
      }
    });
    
    console.log(`✅ Found ${broaderResponse.data.total} issues`);
    console.log(`📄 Showing first ${broaderResponse.data.issues.length} issues:\n`);
    
    broaderResponse.data.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.key} - ${issue.fields.summary}`);
      console.log(`   Type: ${issue.fields.issuetype.name}`);
      console.log(`   Status: ${issue.fields.status.name}`);
      console.log(`   Created: ${moment(issue.fields.created).format('YYYY-MM-DD HH:mm')}`);
      console.log(`   Updated: ${moment(issue.fields.updated).format('YYYY-MM-DD HH:mm')}`);
      console.log(`   Team: ${JSON.stringify(issue.fields.customfield_10001)}`);
      console.log(`   Labels: ${JSON.stringify(issue.fields.labels)}`);
      console.log('');
    });
    
    console.log('✅ Labels filter testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testWithoutLabels();
