const DateUtils = require('../src/utils/dateUtils');
const moment = require('moment');

describe('DateUtils Module', () => {
  test('should get current week range', () => {
    const range = DateUtils.getCurrentWeekRange();
    
    expect(range).toBeDefined();
    expect(range.start).toBeDefined();
    expect(range.end).toBeDefined();
    expect(range.display).toBeDefined();
    expect(range.startDate).toBeDefined();
    expect(range.endDate).toBeDefined();
    
    // Should be Monday to Sunday
    const startDay = moment(range.start).day();
    const endDay = moment(range.end).day();
    expect(startDay).toBe(1); // Monday
    expect(endDay).toBe(0); // Sunday
  });

  test('should get previous week range', () => {
    const range = DateUtils.getPreviousWeekRange();
    
    expect(range).toBeDefined();
    expect(range.start).toBeDefined();
    expect(range.end).toBeDefined();
    expect(range.display).toBeDefined();
    
    // Should be in the past
    const now = moment();
    const startDate = moment(range.start);
    expect(startDate.isBefore(now)).toBe(true);
  });

  test('should get custom date range', () => {
    const startDate = '2024-01-01';
    const endDate = '2024-01-07';
    const range = DateUtils.getCustomDateRange(startDate, endDate);
    
    expect(range.start).toBe(startDate);
    expect(range.end).toBe(endDate);
    expect(range.display).toBeDefined();
  });

  test('should format date for Jira', () => {
    const date = moment('2024-01-15').toDate();
    const formatted = DateUtils.formatForJira(date);
    expect(formatted).toBe('2024-01-15');
  });

  test('should format date for display', () => {
    const date = moment('2024-01-15').toDate();
    const formatted = DateUtils.formatForDisplay(date);
    expect(formatted).toBe('Jan 15, 2024');
  });

  test('should format date for file', () => {
    const date = moment('2024-01-15').toDate();
    const formatted = DateUtils.formatForFile(date);
    expect(formatted).toBe('2024-01-15');
  });

  test('should check if date is in range', () => {
    const startDate = '2024-01-01';
    const endDate = '2024-01-07';
    const inRangeDate = '2024-01-05';
    const outOfRangeDate = '2024-01-10';
    
    expect(DateUtils.isDateInRange(inRangeDate, startDate, endDate)).toBe(true);
    expect(DateUtils.isDateInRange(outOfRangeDate, startDate, endDate)).toBe(false);
  });

  test('should calculate days since update', () => {
    const pastDate = moment().subtract(5, 'days').toDate();
    const days = DateUtils.daysSinceUpdate(pastDate);
    expect(days).toBe(5);
  });

  test('should get JQL date range', () => {
    const jqlRange = DateUtils.getJqlDateRange(7);
    expect(jqlRange).toBe('-7d');
  });

  test('should get current timestamp', () => {
    const timestamp = DateUtils.getCurrentTimestamp();
    expect(timestamp).toBeDefined();
    expect(typeof timestamp).toBe('string');
    expect(moment(timestamp).isValid()).toBe(true);
  });
});
