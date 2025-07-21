/**
 * Validation utility functions for form inputs
 * These functions are used across the app to ensure data integrity and security
 */

// Import is_PRODUCTION from AuthContext
import { IsProduction, debugLog } from '../context/AuthContext';

/**
 * Universal input sanitizer that handles different input types
 * This function sanitizes input based on the specified type while preventing XSS and injection attacks
 * @param {string} input - The input string to sanitize
 * @param {string} type - The type of input ('message', 'email', 'name', 'password', 'phone', 'general', 'amount', 'description')
 * @param {Object} options - Additional options for sanitization
 * @returns {string} - The sanitized input
 */
export const sanitizeInput = (input, type = 'general', options = {}) => {
  debugLog(`[SANITIZE DEBUG] Input: "${input}", Type: ${type}`);
  
  if (!input || typeof input !== 'string') {
    debugLog(`[SANITIZE DEBUG] Empty input, returning empty string`);
    return '';
  }
  
  // Common security patterns to remove
  const removeScriptTags = (str) => str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  const removeHtmlTags = (str) => str.replace(/<[^>]*>/g, '');
  const removeJavaScriptProtocol = (str) => str.replace(/javascript:/gi, '');
  const removeEventHandlers = (str) => str.replace(/on\w+\s*=/gi, '');
  const removeDataAttributes = (str) => str.replace(/data-\w+\s*=/gi, '');
  
  // SQL injection prevention patterns
  const removeSqlKeywords = (str) => str.replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi, '');
  
  let sanitized = input;
  debugLog(`[SANITIZE DEBUG] Initial sanitized: "${sanitized}"`);
  
  // Apply common security sanitization to all types
  sanitized = removeScriptTags(sanitized);
  debugLog(`[SANITIZE DEBUG] After removeScriptTags: "${sanitized}"`);
  sanitized = removeJavaScriptProtocol(sanitized);
  debugLog(`[SANITIZE DEBUG] After removeJavaScriptProtocol: "${sanitized}"`);
  sanitized = removeEventHandlers(sanitized);
  debugLog(`[SANITIZE DEBUG] After removeEventHandlers: "${sanitized}"`);
  sanitized = removeDataAttributes(sanitized);
  debugLog(`[SANITIZE DEBUG] After removeDataAttributes: "${sanitized}"`);
  
  // Type-specific sanitization
  switch (type.toLowerCase()) {
    case 'message':
      // For messages, we want to preserve most characters for natural communication
      // but still prevent XSS and malicious code injection
      
      // Remove HTML tags but preserve common symbols and emojis
      sanitized = removeHtmlTags(sanitized);
      
      // Remove SQL injection patterns
      sanitized = removeSqlKeywords(sanitized);
      
      // Remove dangerous character sequences but preserve normal punctuation
      sanitized = sanitized.replace(/[<>]/g, ''); // Remove angle brackets
      sanitized = sanitized.replace(/\{[^}]*\}/g, ''); // Remove code blocks
      
      // Preserve line breaks and common punctuation
      // Allow: letters, numbers, spaces, common punctuation, emojis
      // This regex allows most unicode characters while blocking dangerous patterns
      sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove control characters
      
      // Limit length to prevent DoS attacks
      const maxMessageLength = options.maxLength || 5000;
      if (sanitized.length > maxMessageLength) {
        sanitized = sanitized.substring(0, maxMessageLength);
      }
      break;
      
    case 'email':
      // For emails, be more restrictive
      sanitized = sanitized.replace(/[<>"']/g, ''); // Remove quotes and brackets
      sanitized = sanitized.replace(/\s/g, ''); // Remove spaces
      sanitized = sanitized.toLowerCase(); // Convert to lowercase
      break;
      
    case 'name':
      debugLog(`[SANITIZE DEBUG] Processing 'name' type, before: "${sanitized}"`);
      // For names, allow letters, spaces, hyphens, apostrophes, and periods
      sanitized = sanitized.replace(/[^a-zA-Z\s\-'\.]/g, '');
      debugLog(`[SANITIZE DEBUG] After character filter: "${sanitized}"`);
      sanitized = sanitized.replace(/[<>"]/g, '');
      debugLog(`[SANITIZE DEBUG] After quote removal: "${sanitized}"`);
      break;
      
    case 'password':
      // For passwords, remove HTML tags, SQL keywords, and dangerous characters but preserve most special chars
      sanitized = removeHtmlTags(sanitized);
      sanitized = removeSqlKeywords(sanitized);
      sanitized = sanitized.replace(/[<>"']/g, '');
      break;
      
    case 'phone':
      // For phone numbers, allow only digits, spaces, hyphens, parentheses, and plus
      sanitized = sanitized.replace(/[^0-9\s\-\(\)\+\.]/g, '');
      break;
      
    case 'amount':
      // For monetary amounts, allow only digits and decimal point
      sanitized = sanitized.replace(/[^\d\.]/g, '');
      // Ensure only one decimal point
      const parts = sanitized.split('.');
      if (parts.length > 2) {
        sanitized = parts[0] + '.' + parts.slice(1).join('');
      }
      // Limit to 2 decimal places
      if (parts.length === 2 && parts[1].length > 2) {
        sanitized = parts[0] + '.' + parts[1].substring(0, 2);
      }
      break;
      
    case 'description':
      // For descriptions, allow spaces, dashes, punctuation, and normal text characters
      sanitized = removeHtmlTags(sanitized);
      sanitized = removeSqlKeywords(sanitized);
      
      // Remove dangerous angle brackets but preserve normal punctuation and spaces
      sanitized = sanitized.replace(/[<>]/g, '');
      
      // Remove control characters but preserve spaces, dashes, punctuation, and normal text
      sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      
      // Limit length
      const maxDescLength = options.maxLength || 1000;
      if (sanitized.length > maxDescLength) {
        sanitized = sanitized.substring(0, maxDescLength);
      }
      break;
      
    case 'general':
    default:
      // For general input, allow spaces, dashes, and normal text but remove dangerous content
      sanitized = removeHtmlTags(sanitized);
      sanitized = removeSqlKeywords(sanitized);
      
      // Remove dangerous characters but preserve spaces, dashes, and normal punctuation
      sanitized = sanitized.replace(/[<>"']/g, '');
      
      // Remove control characters but preserve normal text characters
      sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
      break;
  }
  
  // Final security check - remove any remaining dangerous patterns
  sanitized = sanitized.replace(/\0/g, ''); // Remove null bytes
  debugLog(`[SANITIZE DEBUG] After null byte removal: "${sanitized}"`);
  // Note: Control characters are already removed in type-specific sanitization above
  
  debugLog(`[SANITIZE DEBUG] Final result (no trim): "${sanitized}"`);
  return sanitized;
};

/**
 * Validates message content for chat/messaging functionality
 * @param {string} message - The message content to validate
 * @param {Object} options - Validation options
 * @returns {Object} - Object containing isValid (boolean), message (string), and sanitizedInput (string)
 */
export const validateMessage = (message, options = {}) => {
  const maxLength = options.maxLength || 5000;
  const minLength = options.minLength || 0;
  const allowEmpty = options.allowEmpty || false;
  
  // Check if message is empty
  if (!message || message.trim() === '') {
    if (allowEmpty) {
      return {
        isValid: true,
        message: '',
        sanitizedInput: ''
      };
    } else {
      return {
        isValid: false,
        message: 'Message cannot be empty',
        sanitizedInput: ''
      };
    }
  }
  
  // Sanitize the message
  const sanitizedMessage = sanitizeInput(message, 'message', { maxLength });
  
  // Check length after sanitization
  if (sanitizedMessage.length < minLength) {
    return {
      isValid: false,
      message: `Message must be at least ${minLength} characters long`,
      sanitizedInput: sanitizedMessage
    };
  }
  
  if (sanitizedMessage.length > maxLength) {
    return {
      isValid: false,
      message: `Message must be no more than ${maxLength} characters long`,
      sanitizedInput: sanitizedMessage
    };
  }
  
  // Check if sanitization removed too much content (potential attack)
  const originalLength = message.length;
  const sanitizedLength = sanitizedMessage.length;
  const removalPercentage = ((originalLength - sanitizedLength) / originalLength) * 100;
  
  if (removalPercentage > 50 && originalLength > 10) {
    return {
      isValid: false,
      message: 'Message contains too many invalid characters',
      sanitizedInput: sanitizedMessage
    };
  }
  
  // Check for spam patterns (repeated characters)
  const repeatedCharPattern = /(.)\1{10,}/; // More than 10 repeated characters
  if (repeatedCharPattern.test(sanitizedMessage)) {
    return {
      isValid: false,
      message: 'Message contains too many repeated characters',
      sanitizedInput: sanitizedMessage
    };
  }
  
  return {
    isValid: true,
    message: '',
    sanitizedInput: sanitizedMessage
  };
};

/**
 * Validates an email address
 * @param {string} email - The email address to validate
 * @returns {Object} - Object containing isValid (boolean) and message (string)
 */
export const validateEmail = (email) => {
  // Check if email is empty
  if (!email || email.trim() === '') {
    return {
      isValid: false,
      message: 'Email is required'
    };
  }

  // Sanitize the email first
  const sanitizedEmail = sanitizeInput(email, 'email');

  // Basic email format validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(sanitizedEmail)) {
    return {
      isValid: false,
      message: 'Please enter a valid email address'
    };
  }

  return {
    isValid: true,
    message: '',
    sanitizedInput: sanitizedEmail
  };
};

/**
 * Validates a first or last name
 * @param {string} name - The name to validate
 * @returns {Object} - Object containing isValid (boolean) and message (string)
 */
export const validateName = (name) => {
  // Check if name is empty
  if (!name || name.trim() === '') {
    return {
      isValid: false,
      message: 'Name is required'
    };
  }

  // Don't sanitize again - assume input is already sanitized
  // This prevents double sanitization when called from components
  
  // Only allow letters, spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-Z\s\-'\.]+$/;
  
  if (!nameRegex.test(name)) {
    return {
      isValid: false,
      message: 'Name can only contain letters, spaces, hyphens, and apostrophes'
    };
  }

  return {
    isValid: true,
    message: '',
    sanitizedInput: name
  };
};

/**
 * Validates a password
 * @param {string} password - The password to validate
 * @returns {Object} - Object containing isValid (boolean) and message (string)
 */
export const validatePassword = (password) => {
  // Check if password is empty
  if (!password || password.trim() === '') {
    return {
      isValid: false,
      message: 'Password is required'
    };
  }

  // Sanitize the password
  const sanitizedPassword = sanitizeInput(password, 'password');

  // Password strength requirements
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(sanitizedPassword);
  const hasLowerCase = /[a-z]/.test(sanitizedPassword);
  const hasNumbers = /\d/.test(sanitizedPassword);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(sanitizedPassword);

  // Validate password strength
  if (IsProduction()) {
    if (sanitizedPassword.length < minLength) {
        return {
        isValid: false,
        message: `Password must be at least ${minLength} characters long`,
        sanitizedInput: sanitizedPassword
        };
    }
  }

  // Only enforce strict password requirements in production
  if (IsProduction()) {
    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return {
        isValid: false,
        message: 'Password must contain uppercase, lowercase, numbers, and special characters',
        sanitizedInput: sanitizedPassword
      };
    }
  }

  return {
    isValid: true,
    message: '',
    sanitizedInput: sanitizedPassword
  };
};

/**
 * Validates that two passwords match
 * @param {string} password - The first password
 * @param {string} confirmPassword - The confirmation password
 * @returns {Object} - Object containing isValid (boolean) and message (string)
 */
export const validatePasswordMatch = (password, confirmPassword) => {
  if (password !== confirmPassword) {
    return {
      isValid: false,
      message: 'Passwords do not match'
    };
  }

  return {
    isValid: true,
    message: ''
  };
};

/**
 * Validates a phone number
 * @param {string} phoneNumber - The phone number to validate
 * @returns {Object} - Object containing isValid (boolean) and message (string)
 */
export const validatePhoneNumber = (phoneNumber) => {
  // If phone number is optional, allow empty values
  if (!phoneNumber || phoneNumber.trim() === '') {
    return {
      isValid: true,
      message: ''
    };
  }

  // Sanitize the phone number
  const sanitizedPhone = sanitizeInput(phoneNumber, 'phone');

  // Basic phone number format validation (allows various formats)
  const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  
  if (!phoneRegex.test(sanitizedPhone)) {
    return {
      isValid: false,
      message: 'Please enter a valid phone number'
    };
  }

  return {
    isValid: true,
    message: '',
    sanitizedInput: sanitizedPhone
  };
};

// Legacy function - kept for backward compatibility but now uses the universal sanitizer
export const sanitizeInputLegacy = (input) => {
  return sanitizeInput(input, 'general');
};
