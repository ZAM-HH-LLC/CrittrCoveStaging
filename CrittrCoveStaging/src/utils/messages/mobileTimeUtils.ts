// Mobile message time utilities - handles timestamps and date separation for mobile messaging
import { debugLog } from '../../context/AuthContext';

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
 * @param {string} userTimezone - The user's timezone (optional, defaults to local)
 * @returns {string} - Formatted time (e.g., "7:13 PM")
 */
export const formatMessageTime = (timestamp: string, userTimezone?: string): string => {
  try {
    if (!timestamp) return '';
    
    // Use default timezone if userTimezone is null/undefined
    const targetTimezone = userTimezone || 'US/Mountain';
    
    // Check cache first
    const cacheKey = `${timestamp}:${targetTimezone}`;
    if (formatCache.times.has(cacheKey)) {
      return formatCache.times.get(cacheKey) || '';
    }
    
    clearCacheIfNeeded();
    
    // Simple date formatting without external dependencies
    let result: string;
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return '';
      }
      result = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (error) {
      debugLog('MobileTimeUtils: Error parsing timestamp:', error);
      return '';
    }
    
    // Cache the result
    formatCache.times.set(cacheKey, result);
    return result;
  } catch (error) {
    debugLog('MobileTimeUtils: Error formatting message time:', error);
    return '';
  }
};

/**
 * Determines if a timestamp should be shown for a message
 * based on the time difference from the previous message
 * 
 * @param {string} currentTimestamp - Current message timestamp
 * @param {string|null} previousTimestamp - Previous message timestamp
 * @param {number} thresholdMinutes - Minutes threshold for showing timestamp (default 30)
 * @returns {boolean} - Whether to show the timestamp
 */
export const shouldShowTimestamp = (
  currentTimestamp: string, 
  previousTimestamp: string | null, 
  thresholdMinutes: number = 30
): boolean => {
  try {
    if (!currentTimestamp) return false;
    if (!previousTimestamp) return true; // Always show for first message
    
    const current = new Date(currentTimestamp);
    const previous = new Date(previousTimestamp);
    
    if (isNaN(current.getTime()) || isNaN(previous.getTime())) {
      return true; // Show if we can't parse dates
    }
    
    const diffMinutes = (current.getTime() - previous.getTime()) / (1000 * 60);
    return diffMinutes >= thresholdMinutes;
  } catch (error) {
    debugLog('MobileTimeUtils: Error checking timestamp visibility:', error);
    return true; // Show on error to be safe
  }
};

/**
 * Determines if a date separator should be shown between messages
 * 
 * @param {string} currentTimestamp - Current message timestamp
 * @param {string|null} previousTimestamp - Previous message timestamp
 * @returns {boolean} - Whether to show a date separator
 */
export const shouldShowDateSeparator = (
  currentTimestamp: string, 
  previousTimestamp: string | null
): boolean => {
  try {
    if (!currentTimestamp) return false;
    if (!previousTimestamp) return true; // Always show for first message
    
    const current = new Date(currentTimestamp);
    const previous = new Date(previousTimestamp);
    
    if (isNaN(current.getTime()) || isNaN(previous.getTime())) {
      return true; // Show if we can't parse dates
    }
    
    // Show separator if messages are on different days
    const currentDay = current.toDateString();
    const previousDay = previous.toDateString();
    return currentDay !== previousDay;
  } catch (error) {
    debugLog('MobileTimeUtils: Error checking date separator visibility:', error);
    return false; // Don't show on error
  }
};

/**
 * Formats a date for use in date separators
 * 
 * @param {string} timestamp - The message timestamp
 * @param {string} userTimezone - The user's timezone (optional)
 * @returns {string} - Formatted date (e.g., "Today", "Yesterday", "Jan 5")
 */
export const formatDateSeparator = (timestamp: string, userTimezone?: string): string => {
  try {
    if (!timestamp) return '';
    
    // Check cache first
    const cacheKey = `date:${timestamp}:${userTimezone || 'local'}`;
    if (formatCache.dates.has(cacheKey)) {
      return formatCache.dates.get(cacheKey) || '';
    }
    
    clearCacheIfNeeded();
    
    const messageDate = new Date(timestamp);
    
    if (isNaN(messageDate.getTime())) {
      return '';
    }
    
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let result: string;
    
    // Check if it's today
    if (messageDate.toDateString() === now.toDateString()) {
      result = 'Today';
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      result = 'Yesterday';
    } else if (messageDate.getFullYear() === now.getFullYear()) {
      // Same year: show "Jan 5"
      result = messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } else {
      // Different year: show "Jan 5, 2023"
      result = messageDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
    
    // Cache the result
    formatCache.dates.set(cacheKey, result);
    return result;
  } catch (error) {
    debugLog('MobileTimeUtils: Error formatting date separator:', error);
    return '';
  }
};

/**
 * Processes messages to determine which ones should show timestamps and date separators
 * 
 * @param {Array} messages - Array of message objects with timestamp property
 * @param {string} userTimezone - The user's timezone (optional)
 * @returns {Array} - Messages with added showTimestamp and showDateSeparator properties
 */
export const processMessagesForDisplay = (messages: any[], userTimezone?: string): any[] => {
  if (!Array.isArray(messages) || messages.length === 0) {
    return [];
  }
  
  return messages.map((message, index) => {
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const currentTimestamp = message.timestamp;
    const previousTimestamp = previousMessage?.timestamp || null;
    
    return {
      ...message,
      showTimestamp: shouldShowTimestamp(currentTimestamp, previousTimestamp),
      showDateSeparator: shouldShowDateSeparator(currentTimestamp, previousTimestamp),
      formattedTime: formatMessageTime(currentTimestamp, userTimezone),
      formattedDate: shouldShowDateSeparator(currentTimestamp, previousTimestamp) 
        ? formatDateSeparator(currentTimestamp, userTimezone) 
        : null
    };
  });
};