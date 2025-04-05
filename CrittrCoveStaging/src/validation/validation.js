/**
 * Validation utility functions for form inputs
 * These functions are used across the app to ensure data integrity and security
 */

// Import is_PRODUCTION from AuthContext
import { IsProduction } from '../context/AuthContext';

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

  // Basic email format validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      message: 'Please enter a valid email address'
    };
  }

  // Check for potential XSS or injection attempts
  const sanitizedEmail = email.replace(/[<>]/g, '');
  if (sanitizedEmail !== email) {
    return {
      isValid: false,
      message: 'Email contains invalid characters'
    };
  }

  return {
    isValid: true,
    message: ''
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

  // Only allow letters, spaces, hyphens, and apostrophes
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  
  if (!nameRegex.test(name)) {
    return {
      isValid: false,
      message: 'Name can only contain letters, spaces, hyphens, and apostrophes'
    };
  }

  // Check for potential XSS or injection attempts
  const sanitizedName = name.replace(/[<>]/g, '');
  if (sanitizedName !== name) {
    return {
      isValid: false,
      message: 'Name contains invalid characters'
    };
  }

  return {
    isValid: true,
    message: ''
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

  // Password strength requirements
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  // Check for potential XSS or injection attempts
  if (IsProduction()) {
    const sanitizedPassword = password.replace(/[<>]/g, '');
    if (sanitizedPassword !== password) {
      return {
        isValid: false,
        message: `Password contains invalid characters: <, >`
      };
    }
  }

  // Validate password strength
  if (IsProduction()) {
    if (password.length < minLength) {
        return {
        isValid: false,
        message: `Password must be at least ${minLength} characters long`
        };
    }
  }

  // Only enforce strict password requirements in production
  if (IsProduction()) {
    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      return {
        isValid: false,
        message: 'Password must contain uppercase, lowercase, numbers, and special characters'
      };
    }
  }

  return {
    isValid: true,
    message: ''
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

  // Basic phone number format validation (allows various formats)
  const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
  
  if (!phoneRegex.test(phoneNumber)) {
    return {
      isValid: false,
      message: 'Please enter a valid phone number'
    };
  }

  // Check for potential XSS or injection attempts
  const sanitizedPhone = phoneNumber.replace(/[<>]/g, '');
  if (sanitizedPhone !== phoneNumber) {
    return {
      isValid: false,
      message: 'Phone number contains invalid characters'
    };
  }

  return {
    isValid: true,
    message: ''
  };
};

/**
 * Sanitizes input to prevent XSS attacks
 * @param {string} input - The input to sanitize
 * @returns {string} - The sanitized input
 */
export const sanitizeInput = (input) => {
  if (!input) return '';
  
  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML injection
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
};
