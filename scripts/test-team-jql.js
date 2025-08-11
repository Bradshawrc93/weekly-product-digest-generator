#!/usr/bin/env node

/**
 * Test different JQL syntax for team field
 */

require('dotenv').config();
const axios = require('axios');
const moment = require('moment');

async function testTeamJQL() {
  console.log('🔍 Testing Team JQL Syntax\n');
  console.log('=' .repeat(60));
  
  try {
    const baseUrl = process.env.JIRA_BASE_URL;
    const auth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
    
    // Test different JQL syntax for team field
    const testQueries = [
      {
        name: 'Test 1: Team[Team] with UUID',
        jql: 'project = PO AND "Team[Team]" = "eab6f557-2ee3-458c-9511-54c135cd4752-82" ORDER BY updated DESC'
      },
      {
        name: 'Test 2: Team[Team] with name',
        jql: 'project = PO AND "Team[Team]" = "Voice" ORDER BY updated DESC'
      },
      {
        name: 'Test 3: customfield_10001 with UUID',
        jql: 'project = PO AND customfield_10001 = "eab6f557-2ee3-458c-9511-54c135cd4752-82" ORDER BY updated DESC'
      },
      {
        name: 'Test 4: customfield_10001 with name',
        jql: 'project = PO AND customfield_10001 = "Voice" ORDER BY updated DESC'
      },
      {
        name: 'Test 5: Team field with UUID',
        jql: 'project = PO AND "Team" = "eab6f557-2ee3-458c-9511-54c135cd4752-82" ORDER BY updated DESC'
      },
      {
        name: 'Test 6: Team field with name',
        jql: 'project = PO AND "Team" = "Voice" ORDER BY updated DESC'
      }
    ];
    
    for (const test of testQueries) {
      console.log(`🔍 ${test.name}`);
      console.log(`JQL: ${test.jql}`);
      
      try {
        const response = await axios.get(`${baseUrl}/rest/api/3/search`, {
          headers: { Authorization: `Basic ${auth}` },
          params: {
            jql: test.jql,
            maxResults: 5,
            fields: 'key,summary,status,updated,created,issuetype,customfield_10001'
          }
        });
        
        console.log(`✅ Found ${response.data.total} issues`);
        
        if (response.data.issues.length > 0) {
          console.log('📄 Sample issues:');
          response.data.issues.forEach((issue, index) => {
            console.log(`  ${index + 1}. ${issue.key} - ${issue.fields.summary}`);
            console.log(`     Type: ${issue.fields.issuetype.name}`);
            console.log(`     Status: ${issue.fields.status.name}`);
            console.log(`     Updated: ${moment(issue.fields.updated).format('YYYY-MM-DD HH:mm')}`);
            console.log(`     Team: ${JSON.stringify(issue.fields.customfield_10001)}`);
          });
        }
        
      } catch (error) {
        console.log(`❌ Error: ${error.response?.data?.errorMessages?.join(', ') || error.message}`);
      }
      
      console.log('');
    }
    
    // Test with a specific issue we know exists
    console.log('🔍 Test 7: Get specific issue PO-117');
    console.log('-'.repeat(40));
    
    try {
      const response = await axios.get(`${baseUrl}/rest/api/3/issue/PO-117`, {
        headers: { Authorization: `Basic ${auth}` },
        params: {
          fields: 'key,summary,status,updated,created,issuetype,customfield_10001'
        }
      });
      
      console.log(`✅ Found issue: ${response.data.key}`);
      console.log(`Summary: ${response.data.fields.summary}`);
      console.log(`Type: ${response.data.fields.issuetype.name}`);
      console.log(`Status: ${response.data.fields.status.name}`);
      console.log(`Updated: ${moment(response.data.fields.updated).format('YYYY-MM-DD HH:mm')}`);
      console.log(`Team field: ${JSON.stringify(response.data.fields.customfield_10001, null, 2)}`);
      
    } catch (error) {
      console.log(`❌ Error: ${error.response?.data?.errorMessages?.join(', ') || error.message}`);
    }
    
    console.log('\n✅ Team JQL testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testTeamJQL();
