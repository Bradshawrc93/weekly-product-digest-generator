require('dotenv').config();
const { Client } = require('@notionhq/client');

async function checkNotionDatabase() {
  console.log('🔍 Checking Notion Database Structure...\n');
  
  try {
    const client = new Client({
      auth: process.env.NOTION_API_KEY,
    });
    
    const databaseId = process.env.NOTION_DATABASE_ID;
    console.log(`📋 Database ID: ${databaseId}\n`);
    
    // Get database information
    const database = await client.databases.retrieve({
      database_id: databaseId,
    });
    
    console.log('📊 Database Properties:');
    console.log('='.repeat(50));
    
    Object.entries(database.properties).forEach(([key, property]) => {
      console.log(`• ${key} (${property.type})`);
      if (property.type === 'select' && property.select?.options) {
        console.log(`  Options: ${property.select.options.map(opt => opt.name).join(', ')}`);
      }
    });
    
    console.log('\n📄 Database Title:', database.title[0]?.plain_text || 'Untitled');
    console.log('📄 Database Description:', database.description?.[0]?.plain_text || 'No description');
    
  } catch (error) {
    console.error('❌ Error checking Notion database:', error.message);
    console.error(error.stack);
  }
}

checkNotionDatabase();
