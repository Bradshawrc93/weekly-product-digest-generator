#!/usr/bin/env node

/**
 * Test script to analyze Jira field structure
 * Run with: node scripts/test-jira-fields.js
 */

require('dotenv').config();
const axios = require('axios');
const { logger } = require('../src/utils/logger');

async function testJiraConnection() {
  console.log('🔍 Testing Jira API Connection...\n');
  
  try {
    // Test basic connection
    const auth = Buffer.from(`${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`).toString('base64');
    const baseUrl = process.env.JIRA_BASE_URL;
    
    console.log(`📡 Connecting to: ${baseUrl}`);
    console.log(`👤 Using email: ${process.env.JIRA_EMAIL}`);
    
    // Test user info
    const userResponse = await axios.get(`${baseUrl}/rest/api/3/myself`, {
      headers: { Authorization: `Basic ${auth}` }
    });
    
    console.log(`✅ Connected successfully as: ${userResponse.data.displayName}`);
    console.log(`📧 Email: ${userResponse.data.emailAddress}`);
    console.log(`🏢 Account ID: ${userResponse.data.accountId}\n`);
    
    return { auth, baseUrl };
  } catch (error) {
    console.error('❌ Jira connection failed:', error.response?.data || error.message);
    throw error;
  }
}

async function getProjectInfo(auth, baseUrl) {
  console.log('📋 Getting project information...\n');
  
  try {
    // Get project details
    const projectResponse = await axios.get(`${baseUrl}/rest/api/3/project/PO`, {
      headers: { Authorization: `Basic ${auth}` }
    });
    
    const project = projectResponse.data;
    console.log(`📁 Project: ${project.name} (${project.key})`);
    console.log(`👥 Lead: ${project.lead.displayName}`);
    console.log(`📊 Project Type: ${project.projectTypeKey}`);
    console.log(`🎨 Avatar: ${project.avatarUrls['48x48']}\n`);
    
    return project;
  } catch (error) {
    console.error('❌ Failed to get project info:', error.response?.data || error.message);
    throw error;
  }
}

async function getIssueTypes(auth, baseUrl) {
  console.log('🏷️  Getting issue types...\n');
  
  try {
    const issueTypesResponse = await axios.get(`${baseUrl}/rest/api/3/issuetype`, {
      headers: { Authorization: `Basic ${auth}` }
    });
    
    const issueTypes = issueTypesResponse.data;
    console.log('📝 Available Issue Types:');
    issueTypes.forEach(type => {
      console.log(`  • ${type.name} (${type.id}) - ${type.description || 'No description'}`);
    });
    console.log();
    
    return issueTypes;
  } catch (error) {
    console.error('❌ Failed to get issue types:', error.response?.data || error.message);
    throw error;
  }
}

async function getSampleIssues(auth, baseUrl, issueTypes) {
  console.log('🔍 Getting sample issues of each type...\n');
  
  const samples = {};
  
  for (const issueType of issueTypes) {
    if (['Workstream', 'Epic', 'Task', 'Story', 'Bug'].includes(issueType.name)) {
      try {
        console.log(`📋 Getting sample ${issueType.name} issues...`);
        
        const jql = `project = PO AND issuetype = "${issueType.name}" ORDER BY updated DESC`;
        const response = await axios.get(`${baseUrl}/rest/api/3/search`, {
          headers: { Authorization: `Basic ${auth}` },
          params: {
            jql: jql,
            maxResults: 3,
            fields: 'summary,status,assignee,created,updated,customfield_*'
          }
        });
        
        const issues = response.data.issues;
        console.log(`  Found ${issues.length} ${issueType.name} issues`);
        
        if (issues.length > 0) {
          samples[issueType.name] = issues[0]; // Get the first one as sample
          console.log(`  📄 Sample: ${issues[0].key} - ${issues[0].fields.summary}`);
        }
        
      } catch (error) {
        console.error(`  ❌ Failed to get ${issueType.name} issues:`, error.response?.data || error.message);
      }
    }
  }
  
  console.log();
  return samples;
}

async function analyzeFields(samples) {
  console.log('🔬 Analyzing field structure...\n');
  
  const allFields = new Set();
  const fieldDetails = {};
  
  for (const [issueType, issue] of Object.entries(samples)) {
    console.log(`📊 ${issueType} Fields:`);
    
    const fields = issue.fields;
    const customFields = {};
    
    for (const [fieldName, fieldValue] of Object.entries(fields)) {
      if (fieldName.startsWith('customfield_')) {
        customFields[fieldName] = {
          value: fieldValue,
          type: typeof fieldValue,
          isObject: fieldValue && typeof fieldValue === 'object',
          isArray: Array.isArray(fieldValue)
        };
        allFields.add(fieldName);
      }
    }
    
    fieldDetails[issueType] = customFields;
    
    // Display custom fields
    if (Object.keys(customFields).length > 0) {
      for (const [fieldId, details] of Object.entries(customFields)) {
        console.log(`  • ${fieldId}: ${JSON.stringify(details.value)}`);
      }
    } else {
      console.log(`  • No custom fields found`);
    }
    console.log();
  }
  
  // Get field metadata
  console.log('🏷️  Field Analysis Summary:');
  console.log(`📊 Total unique custom fields found: ${allFields.size}`);
  console.log(`📋 Fields: ${Array.from(allFields).join(', ')}\n`);
  
  return { allFields, fieldDetails };
}

async function getFieldMetadata(auth, baseUrl, fieldIds) {
  console.log('📋 Getting field metadata...\n');
  
  const fieldMetadata = {};
  
  for (const fieldId of fieldIds) {
    try {
      const response = await axios.get(`${baseUrl}/rest/api/3/field`, {
        headers: { Authorization: `Basic ${auth}` }
      });
      
      const fields = response.data;
      const field = fields.find(f => f.id === fieldId);
      
      if (field) {
        fieldMetadata[fieldId] = {
          name: field.name,
          type: field.schema?.type,
          custom: field.schema?.custom,
          customId: field.schema?.customId
        };
        console.log(`📊 ${fieldId}: ${field.name} (${field.schema?.type || 'unknown'})`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to get metadata for ${fieldId}:`, error.response?.data || error.message);
    }
  }
  
  console.log();
  return fieldMetadata;
}

async function main() {
  try {
    console.log('🚀 Starting Jira Field Analysis\n');
    console.log('=' .repeat(50));
    
    // Test connection
    const { auth, baseUrl } = await testJiraConnection();
    
    // Get project info
    await getProjectInfo(auth, baseUrl);
    
    // Get issue types
    const issueTypes = await getIssueTypes(auth, baseUrl);
    
    // Get sample issues
    const samples = await getSampleIssues(auth, baseUrl, issueTypes);
    
    // Analyze fields
    const { allFields, fieldDetails } = await analyzeFields(samples);
    
    // Get field metadata
    if (allFields.size > 0) {
      await getFieldMetadata(auth, baseUrl, Array.from(allFields));
    }
    
    console.log('✅ Analysis complete!');
    console.log('\n📋 Recommended field mappings:');
    console.log('Based on the analysis above, you can identify which custom fields correspond to:');
    console.log('• Target Quarter');
    console.log('• Confidence Level');
    console.log('• Epic Link');
    console.log('• Team Assignment');
    console.log('• Workstream');
    console.log('• Story Points');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
