import moment from 'moment-timezone';
import { debugLog } from '../../context/AuthContext';
import { formatFromUTC, FORMAT_TYPES } from '../../utils/time_utils';

// Cache for formatted dates to avoid repeated calculations
const formatCache = {
  times: new Map(),
  dates: new Map()
};

// Clear cache when it gets too large
const clearCacheIfNeeded = () => {
  if (formatCache.times.size > 1000) {
    formatCache.times.clear();
  }
  if (formatCache.dates.size > 100) {
    formatCache.dates.clear();
  }
};

/**
 * Formats a message timestamp to display in a message bubble
 * 
 * @param {string} timestamp - The message timestamp in UTC format
 * @param {string} userTimezone - The user's timezone
 * @returns {string} - Formatted time (e.g., "7:13 PM")
 */
export const formatMessageTime = (timestamp, userTimezone) => {
  try {
    if (!timestamp) return '';
    
    // Check cache first
    const cacheKey = `${timestamp}:${userTimezone}`;
    if (formatCache.times.has(cacheKey)) {
      return formatCache.times.get(cacheKey);
    }
    
    // Extract date and time parts from timestamp
    const dateTimeMatch = timestamp.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}):/);
    
    let result;
    if (!dateTimeMatch) {
      // Fallback for invalid format
      result = moment(timestamp).format('h:mm A');
    } else {
      const [, dateStr, timeStr] = dateTimeMatch;
      
      // Use the formatFromUTC function to convert and format
      result = formatFromUTC(dateStr, timeStr, userTimezone, FORMAT_TYPES.TIME_ONLY);
    }
    
    // Cache the result
    formatCache.times.set(cacheKey, result);
    clearCacheIfNeeded();
    
    return result;
  } catch (error) {
    debugLog('MBA2349: Error formatting message time:', error);
    // Fallback in case of error
    return moment(timestamp).format('h:mm A');
  }
};

/**
 * Formats a date for display in message groups
 * 
 * @param {string} timestamp - The message timestamp in UTC format
 * @param {string} userTimezone - The user's timezone
 * @returns {string} - Formatted date (e.g., "June 9, 2025" or "Today" or "Yesterday")
 */
export const formatMessageDate = (timestamp, userTimezone) => {
  try {
    if (!timestamp) return '';
    
    // Check cache first
    const cacheKey = `${timestamp}:${userTimezone}`;
    if (formatCache.dates.has(cacheKey)) {
      return formatCache.dates.get(cacheKey);
    }
    
    const now = moment().tz(userTimezone);
    const messageDate = moment(timestamp).tz(userTimezone);
    
    // Get today and yesterday in user's timezone
    const today = now.clone().startOf('day');
    const yesterday = now.clone().subtract(1, 'day').startOf('day');
    const messageDateStartOfDay = messageDate.clone().startOf('day');
    
    // Check if the date is today, yesterday, or another date
    let result;
    if (messageDateStartOfDay.isSame(today, 'day')) {
      result = 'Today';
    } else if (messageDateStartOfDay.isSame(yesterday, 'day')) {
      result = 'Yesterday';
    } else {
      result = messageDate.format('MMMM D, YYYY');
    }
    
    // Cache the result
    formatCache.dates.set(cacheKey, result);
    clearCacheIfNeeded();
    
    return result;
  } catch (error) {
    debugLog('MBA2349: Error formatting message date:', error);
    // Fallback in case of error
    return moment(timestamp).format('MMMM D, YYYY');
  }
};

/**
 * Groups messages by date in user's timezone
 * 
 * @param {Array} messages - Array of message objects
 * @param {string} userTimezone - The user's timezone
 * @returns {Object} - Object with dates as keys and arrays of message IDs as values
 */
export const groupMessagesByDate = (messages, userTimezone) => {
  try {
    if (!messages || !Array.isArray(messages)) return {};
    
    const groups = {};
    
    messages.forEach(message => {
      if (!message.timestamp) return;
      
      // Convert timestamp to user timezone date
      const messageDate = moment(message.timestamp).tz(userTimezone);
      const dateKey = messageDate.format('YYYY-MM-DD');
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      
      groups[dateKey].push(message.message_id);
    });
    
    return groups;
  } catch (error) {
    debugLog('MBA2349: Error grouping messages by date:', error);
    return {};
  }
};

/**
 * Determines if a message should show a timestamp
 * Based on rules:
 * - First message of a sequence should have a timestamp
 * - Messages sent more than 1 minute apart should have timestamps
 * 
 * @param {Object} message - Current message object
 * @param {Object} prevMessage - Previous message object (chronologically later in inverted list)
 * @param {boolean} isFirstInGroup - Whether this is the first message in a visual group
 * @returns {boolean} - Whether to show a timestamp for this message
 */
export const shouldShowTimestamp = (message, prevMessage, isFirstInGroup) => {
  // Always show timestamp on first message in a visual group
  if (isFirstInGroup) return true;
  
  // If no previous message, show timestamp
  if (!prevMessage) return true;
  
  // If different sender, show timestamp
  if (message.sent_by_other_user !== prevMessage.sent_by_other_user) return true;
  
  // If message is of a different type, show timestamp
  if (message.type_of_message !== prevMessage.type_of_message) return true;
  
  // If more than 1 minute apart, show timestamp
  try {
    const currentTime = new Date(message.timestamp || message.created_at);
    const prevTime = new Date(prevMessage.timestamp || prevMessage.created_at);
    
    // Calculate time difference in minutes
    const timeDiff = Math.abs(currentTime - prevTime) / (1000 * 60);
    
    // Special logic for image messages - always show timestamp
    if (message.type_of_message === 'image_message' || 
        (message.metadata && message.metadata.is_attachment) ||
        message.image_url || message.image_urls) {
      return true;
    }
    
    return timeDiff > 1;
  } catch (error) {
    // If there's an error parsing dates, default to showing timestamp
    return true;
  }
}; 