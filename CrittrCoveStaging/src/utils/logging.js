/**
 * Debug logging utility function
 * @param {string} message - The message to log
 * @param {any} data - Optional data to log
 */

let debugEnabled = true;
export const debugLog = (message, data) => {
  if (debugEnabled) {
    if (process.env.NODE_ENV !== 'production') {
    // Log the actual process.env.NODE_ENV value
    // console.log('MBA1234: Current process.env.NODE_ENV:', process.env.NODE_ENV);
    
    if (data) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }
  }
}; 