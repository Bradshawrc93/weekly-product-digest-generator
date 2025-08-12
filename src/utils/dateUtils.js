const moment = require('moment');

class DateUtils {
  /**
   * Get the date range for the current week (Monday to Sunday)
   */
  static getCurrentWeekRange() {
    const startOfWeek = moment().startOf('week').add(1, 'day'); // Monday
    const endOfWeek = moment().endOf('week').add(1, 'day'); // Sunday
    
    return {
      start: startOfWeek.format('YYYY-MM-DD'),
      end: endOfWeek.format('YYYY-MM-DD'),
      startDate: startOfWeek.toDate(),
      endDate: endOfWeek.toDate(),
      display: `${startOfWeek.format('MMM D')} - ${endOfWeek.format('MMM D, YYYY')}`
    };
  }

  /**
   * Get the date range for the previous week
   */
  static getPreviousWeekRange() {
    const startOfWeek = moment().subtract(1, 'week').startOf('week').add(1, 'day');
    const endOfWeek = moment().subtract(1, 'week').endOf('week').add(1, 'day');
    
    return {
      start: startOfWeek.format('YYYY-MM-DD'),
      end: endOfWeek.format('YYYY-MM-DD'),
      startDate: startOfWeek.toDate(),
      endDate: endOfWeek.toDate(),
      display: `${startOfWeek.format('MMM D')} - ${endOfWeek.format('MMM D, YYYY')}`
    };
  }

  /**
   * Get a custom date range
   */
  static getCustomDateRange(startDate, endDate) {
    const start = moment(startDate);
    const end = moment(endDate);
    
    return {
      start: start.format('YYYY-MM-DD'),
      end: end.format('YYYY-MM-DD'),
      startDate: start.toDate(),
      endDate: end.toDate(),
      display: `${start.format('MMM D')} - ${end.format('MMM D, YYYY')}`
    };
  }

  /**
   * Format date for Jira API
   */
  static formatForJira(date) {
    return moment(date).format('YYYY-MM-DD');
  }

  /**
   * Format date for display
   */
  static formatForDisplay(date) {
    return moment(date).format('MMM D, YYYY');
  }

  /**
   * Format date for file naming
   */
  static formatForFile(date) {
    return moment(date).format('YYYY-MM-DD');
  }

  /**
   * Check if a date is within a range
   */
  static isDateInRange(date, startDate, endDate) {
    const checkDate = moment(date);
    const start = moment(startDate);
    const end = moment(endDate);
    
    return checkDate.isBetween(start, end, 'day', '[]'); // inclusive
  }

  /**
   * Calculate days since last update
   */
  static daysSinceUpdate(lastUpdateDate) {
    return moment().diff(moment(lastUpdateDate), 'days');
  }

  /**
   * Get JQL date range for last N days
   */
  static getJqlDateRange(days) {
    return `-${days}d`;
  }

  /**
   * Get ISO string for current timestamp
   */
  static getCurrentTimestamp() {
    return moment().toISOString();
  }
}

module.exports = DateUtils;
