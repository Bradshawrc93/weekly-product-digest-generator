#!/usr/bin/env node

const ReportScheduler = require('./scheduler');
const { logger } = require('./utils/logger');

async function testScheduler() {
  const scheduler = new ReportScheduler();
  
  try {
    logger.info('🧪 Testing scheduler functionality...');
    
    // Test manual report generation
    logger.info('Running manual report generation test...');
    const result = await scheduler.runManualReport();
    
    logger.info('✅ Manual report generation test completed successfully!', {
      pageId: result.pageId,
      pageUrl: result.pageUrl,
      dateRange: result.dateRange.display
    });
    
    // Test scheduler status
    const status = scheduler.getStatus();
    logger.info('📊 Scheduler status:', status);
    
    logger.info('✅ All tests passed!');
    
  } catch (error) {
    logger.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  testScheduler();
}

module.exports = testScheduler;
