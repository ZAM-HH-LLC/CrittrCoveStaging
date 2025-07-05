/**
 * Contact Sanitization Utilities
 * 
 * Shared functions for detecting and sanitizing contact details (phone numbers, emails)
 * in messages and conversation previews.
 * 
 * Used by: ConversationList.js, MessageList.js
 */

/**
 * Sanitizes contact details in message content by replacing phone numbers and emails
 * with placeholder text.
 * 
 * @param {string} content - The message content to sanitize
 * @returns {string} - The sanitized content with contact details replaced
 */
export const sanitizeContactDetails = (content) => {
  if (!content) return content;
  
  let sanitizedContent = content;
  
  // Phone number patterns (various formats)
  const phonePatterns = [
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, // 123-456-7890, 123.456.7890, 123 456 7890
    /\b\(\d{3}\)\s?\d{3}[-.\s]?\d{4}\b/g, // (123) 456-7890, (123)456-7890
    /\b\+\d{1,3}[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, // +1-123-456-7890
    /\b\d{10,11}\b/g, // 1234567890 or 11234567890
  ];
  
  // Email pattern
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  
  // Replace phone numbers with [PHONE NUMBER]
  phonePatterns.forEach(pattern => {
    sanitizedContent = sanitizedContent.replace(pattern, '[PHONE NUMBER]');
  });
  
  // Replace email addresses with [EMAIL ADDRESS]
  sanitizedContent = sanitizedContent.replace(emailPattern, '[EMAIL ADDRESS]');
  
  return sanitizedContent;
};

/**
 * Checks if content contains contact details (phone numbers or emails).
 * 
 * @param {string} content - The content to check
 * @returns {boolean} - True if contact details are found, false otherwise
 */
export const containsContactDetails = (content) => {
  if (!content) return false;
  
  const phonePatterns = [
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, // 123-456-7890, 123.456.7890, 123 456 7890
    /\b\(\d{3}\)\s?\d{3}[-.\s]?\d{4}\b/, // (123) 456-7890, (123)456-7890
    /\b\+\d{1,3}[-.\s]?\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, // +1-123-456-7890
    /\b\d{10,11}\b/, // 1234567890 or 11234567890
  ];
  
  const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  
  // Check for email first
  if (emailPattern.test(content)) return true;
  
  // Check for phone numbers
  return phonePatterns.some(pattern => pattern.test(content));
}; 