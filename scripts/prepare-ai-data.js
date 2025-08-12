#!/usr/bin/env node

const aiDataPreparer = require('../src/utils/aiDataPreparer');
const fs = require('fs');
const path = require('path');

async function main() {
  try {
    console.log('🤖 Preparing AI Data Package...\n');

    // Generate the AI data package
    const dataPackage = aiDataPreparer.generateAIDataPackage();
    
    console.log('✅ AI Data Package Generated Successfully!\n');
    
    // Display summary
    console.log('📊 Data Summary:');
    console.log(`   Total Weeks: ${dataPackage.summary.totalWeeks}`);
    console.log(`   Total Squads: ${dataPackage.summary.overallStats.totalSquads}`);
    console.log(`   Total Completed (4 weeks): ${dataPackage.summary.overallStats.totalCompleted}`);
    console.log(`   Total Stale (4 weeks): ${dataPackage.summary.overallStats.totalStale}`);
    console.log(`   Total Blocked (4 weeks): ${dataPackage.summary.overallStats.totalBlocked}`);
    console.log(`   Total Created (4 weeks): ${dataPackage.summary.overallStats.totalCreated}\n`);

    // Display weekly breakdown
    console.log('📅 Weekly Breakdown:');
    dataPackage.summary.weeks.forEach(week => {
      console.log(`   ${week.week} (${week.dateRange}):`);
      console.log(`     Completed: ${week.totals.completed}`);
      console.log(`     Stale: ${week.totals.stale}`);
      console.log(`     Blocked: ${week.totals.blocked}`);
      console.log(`     Created: ${week.totals.created}`);
      console.log(`     Updated: ${week.totals.updated}`);
      console.log(`     In Progress: ${week.totals.inProgress}\n`);
    });

    // Get file paths for manual analysis
    const filePaths = aiDataPreparer.getFilePathsForAI();
    
    console.log('📁 Files for AI Analysis:');
    filePaths.forEach(week => {
      console.log(`   ${week.week}:`);
      console.log(`     Metrics: ${week.metricsFile}`);
      console.log(`     Details: ${week.detailsFile}\n`);
    });

    // Display the prompt file location
    const promptFile = path.join(process.cwd(), 'ai-tldr-prompt.md');
    console.log('📝 AI Prompt File:');
    console.log(`   ${promptFile}\n`);

    // Show usage instructions
    console.log('🚀 Usage Instructions:');
    console.log('   1. Copy the content of ai-tldr-prompt.md');
    console.log('   2. Attach the 8 JSON files listed above to your AI request');
    console.log('   3. Paste the prompt and request a TL;DR summary');
    console.log('   4. The AI will analyze 4 weeks of data and provide insights\n');

    console.log('✅ Ready for AI analysis!');

  } catch (error) {
    console.error('❌ Error preparing AI data:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = main;
