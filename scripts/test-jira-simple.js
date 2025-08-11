#!/usr/bin/env node

/**
 * Simple Jira field analysis test
 */

require('dotenv').config();
const axios = require('axios');

async function testJiraFields() {
  console.log('🔍 Testing Jira API Connection...\n');
  
  try {
    const auth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
    const baseUrl = process.env.JIRA_BASE_URL;
    
    console.log(`📡 Connecting to: ${baseUrl}`);
    console.log(`👤 Using email: ${process.env.JIRA_EMAIL}\n`);
    
    // Test connection
    const userResponse = await axios.get(`${baseUrl}/rest/api/3/myself`, {
      headers: { Authorization: `Basic ${auth}` }
    });
    
    console.log(`✅ Connected as: ${userResponse.data.displayName}\n`);
    
    // Get project info
    const projectResponse = await axios.get(`${baseUrl}/rest/api/3/project/PO`, {
      headers: { Authorization: `Basic ${auth}` }
    });
    
    console.log(`📁 Project: ${projectResponse.data.name} (${projectResponse.data.key})\n`);
    
    // Get all fields
    console.log('📋 Getting all available fields...\n');
    const fieldsResponse = await axios.get(`${baseUrl}/rest/api/3/field`, {
      headers: { Authorization: `Basic ${auth}` }
    });
    
    const customFields = fieldsResponse.data.filter(field => field.id.startsWith('customfield_'));
    console.log(`📊 Found ${customFields.length} custom fields:\n`);
    
    customFields.forEach(field => {
      console.log(`• ${field.id}: ${field.name} (${field.schema?.type || 'unknown'})`);
    });
    
    // Get sample issues
    console.log('\n📄 Getting sample issues...\n');
    
    const issueTypes = ['Workstream', 'Epic', 'Task', 'Story'];
    
    for (const issueType of issueTypes) {
      try {
        const jql = `project = PO AND issuetype = "${issueType}" ORDER BY updated DESC`;
        const response = await axios.get(`${baseUrl}/rest/api/3/search`, {
          headers: { Authorization: `Basic ${auth}` },
          params: {
            jql: jql,
            maxResults: 1,
            fields: 'summary,status,assignee,created,updated,customfield_*'
          }
        });
        
        if (response.data.issues.length > 0) {
          const issue = response.data.issues[0];
          console.log(`📋 ${issueType}: ${issue.key} - ${issue.fields.summary}`);
          
          // Check for custom fields
          const customFieldValues = {};
          for (const [fieldName, fieldValue] of Object.entries(issue.fields)) {
            if (fieldName.startsWith('customfield_') && fieldValue !== null) {
              customFieldValues[fieldName] = fieldValue;
            }
          }
          
          if (Object.keys(customFieldValues).length > 0) {
            console.log(`  Custom fields:`);
            for (const [fieldId, value] of Object.entries(customFieldValues)) {
              console.log(`    • ${fieldId}: ${JSON.stringify(value)}`);
            }
          } else {
            console.log(`  No custom fields found`);
          }
          console.log();
        } else {
          console.log(`📋 ${issueType}: No issues found\n`);
        }
        
      } catch (error) {
        console.log(`📋 ${issueType}: Error - ${error.response?.data?.errorMessages?.[0] || error.message}\n`);
      }
    }
    
    console.log('✅ Analysis complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testJiraFields();
