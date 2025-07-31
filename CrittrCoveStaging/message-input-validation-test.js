/**
 * MESSAGE INPUT VALIDATION TEST SUITE
 * This file simulates the MessageInput.js usage of validation.js
 * Run with: node message-input-validation-test.js
 */

// Mock the AuthContext debugLog function for Node.js environment
const debugLog = (code, message, data) => {
  console.log(`${code}: ${message}`, data || '');
};

// Mock the IsProduction function
const IsProduction = () => false;

// Import validation functions (we'll inline them for testing)
// In a real scenario, you'd import from the actual file

/**
 * INLINE VALIDATION FUNCTIONS FOR TESTING
 * (Copied from validation.js to make this test standalone)
 */

// Remove HTML tags function
const removeHtmlTags = (input) => {
  if (!input || typeof input !== 'string') return '';
  
  let cleaned = input.replace(/<script[\s\S]*?<\/script>/gi, '');
  cleaned = cleaned.replace(/<script[^>]*>/gi, '');
  cleaned = cleaned.replace(/<style[\s\S]*?<\/style>/gi, '');
  cleaned = cleaned.replace(/<[^>]*>/g, '');
  cleaned = cleaned.replace(/&[a-zA-Z0-9#]+;/g, '');
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
  cleaned = cleaned.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '');
  cleaned = cleaned.replace(/\bClick\b/gi, '');
  cleaned = cleaned.replace(/\bSubmit\b/gi, '');
  cleaned = cleaned.replace(/\bButton\b/gi, '');
  cleaned = cleaned.replace(/\bLink\b/gi, '');
  cleaned = cleaned.replace(/\bLoading\b/gi, '');
  
  return cleaned;
};

// Remove JavaScript patterns
const removeJavaScriptPatterns = (input) => {
  if (!input || typeof input !== 'string') return '';
  
  let cleaned = input;
  cleaned = cleaned.replace(/javascript\s*:/gi, '');
  cleaned = cleaned.replace(/vbscript\s*:/gi, '');
  cleaned = cleaned.replace(/data\s*:/gi, '');
  cleaned = cleaned.replace(/alert\s*\([^)]*\)/gi, '');
  cleaned = cleaned.replace(/confirm\s*\([^)]*\)/gi, '');
  cleaned = cleaned.replace(/prompt\s*\([^)]*\)/gi, '');
  cleaned = cleaned.replace(/eval\s*\([^)]*\)/gi, '');
  cleaned = cleaned.replace(/setTimeout\s*\([^)]*\)/gi, '');
  cleaned = cleaned.replace(/setInterval\s*\([^)]*\)/gi, '');
  cleaned = cleaned.replace(/Function\s*\([^)]*\)/gi, '');
  cleaned = cleaned.replace(/console\.[^)\s]*/gi, '');
  cleaned = cleaned.replace(/window\.[^)\s]*/gi, '');
  cleaned = cleaned.replace(/document\.[^)\s]*/gi, '');
  cleaned = cleaned.replace(/on\w+\s*=[^>\s]*/gi, '');
  cleaned = cleaned.replace(/'[^']*alert[^']*'/gi, '');
  cleaned = cleaned.replace(/"[^"]*alert[^"]*"/gi, '');
  cleaned = cleaned.replace(/'[^']*javascript[^']*'/gi, '');
  cleaned = cleaned.replace(/"[^"]*javascript[^"]*"/gi, '');
  
  return cleaned;
};

// Remove message-specific threats
const removeMessageSpecificThreats = (input) => {
  if (!input || typeof input !== 'string') return '';
  
  let cleaned = input;
  
  // Remove script tags and their content completely (but preserve other HTML)
  cleaned = cleaned.replace(/<script[\s\S]*?<\/script>/gi, '');
  cleaned = cleaned.replace(/<script[^>]*>/gi, '');
  
  // Remove dangerous JavaScript protocols and functions
  cleaned = cleaned.replace(/javascript\s*:/gi, '');
  cleaned = cleaned.replace(/vbscript\s*:/gi, '');
  cleaned = cleaned.replace(/data\s*:/gi, '');
  
  // Only remove JavaScript functions if they're clearly malicious
  cleaned = cleaned.replace(/alert\s*\([^)]*\)/gi, '');
  cleaned = cleaned.replace(/eval\s*\([^)]*\)/gi, '');
  
  // Remove dangerous SQL patterns - be more comprehensive
  // Remove SQL keywords that are clearly commands (not legitimate words)
  cleaned = cleaned.replace(/\bSELECT\s+\*\s+FROM\s+\w+/gi, '');
  cleaned = cleaned.replace(/\bDROP\s+TABLE\s+\w+/gi, '');
  cleaned = cleaned.replace(/\bDELETE\s+FROM\s+\w+/gi, '');
  cleaned = cleaned.replace(/\bINSERT\s+INTO\s+\w+/gi, '');
  cleaned = cleaned.replace(/\bUNION\s+SELECT\s+/gi, '');
  cleaned = cleaned.replace(/\bUPDATE\s+\w+\s+SET\s+/gi, '');
  cleaned = cleaned.replace(/\bCREATE\s+TABLE\s+\w+/gi, '');
  cleaned = cleaned.replace(/\bALTER\s+TABLE\s+\w+/gi, '');
  
  // Remove SQL with quotes (classic injection patterns)
  cleaned = cleaned.replace(/';?\s*DROP\s+TABLE/gi, '');
  cleaned = cleaned.replace(/';?\s*DELETE\s+FROM/gi, '');
  cleaned = cleaned.replace(/';?\s*INSERT\s+INTO/gi, '');
  cleaned = cleaned.replace(/';?\s*UNION\s+SELECT/gi, '');
  cleaned = cleaned.replace(/';?\s*SELECT\s+\*/gi, '');
  
  cleaned = cleaned.replace(/--.*$/gm, ''); // Remove SQL comments
  
  // Remove dangerous shell commands only if they're clearly malicious
  cleaned = cleaned.replace(/;\s*rm\s+-rf/gi, '');
  cleaned = cleaned.replace(/;\s*sudo\s+/gi, '');
  cleaned = cleaned.replace(/&&\s*rm\s+-rf/gi, '');
  cleaned = cleaned.replace(/&&\s*sudo\s+/gi, '');
  
  // Remove NoSQL injection operators
  cleaned = cleaned.replace(/\$where\s*:/gi, '');
  cleaned = cleaned.replace(/\$ne\s*:/gi, '');
  cleaned = cleaned.replace(/\$regex\s*:/gi, '');
  
  return cleaned;
};

// Main sanitizeInput function for messages
const sanitizeInput = (input, type = 'general', options = {}) => {
  debugLog(`MBA7777: Native sanitization - Type: ${type}, Input:`, `"${input}"`);
  
  if (!input || typeof input !== 'string') {
    debugLog(`MBA7777: Empty or invalid input, returning empty string`);
    return '';
  }
  
  let sanitized = input;
  
  // For messages, only remove the most dangerous patterns
  if (type === 'message') {
    sanitized = removeMessageSpecificThreats(sanitized);
  } else {
    // Full security for other input types
    sanitized = removeHtmlTags(sanitized);
    sanitized = removeJavaScriptPatterns(sanitized);
    // ... other security layers would go here
  }
  
  // Type-specific sanitization
  if (type === 'message') {
    // For messages, be very permissive - allow all printable characters
    // Security is handled by the security layers, not character filtering
    // Only remove control characters and other non-printable characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
    // Remove multiple consecutive spaces but preserve single spaces
    sanitized = sanitized.replace(/\s{2,}/g, ' ');
    // Only trim leading whitespace, preserve trailing spaces for user input
    sanitized = sanitized.replace(/^\s+/g, '');
  }
  
  // Apply length limits
  const maxLength = options.maxLength || 5000;
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  debugLog(`MBA7777: Native sanitization complete - Result:`, `"${sanitized}"`);
  return sanitized;
};

/**
 * TEST SUITE
 */

const testCases = [
  // Category 1: XSS Attacks
  {
    category: 'XSS Attacks',
    tests: [
      {
        name: 'Basic Script Tag',
        input: 'Hello <script>alert("xss")</script> world',
        expected: 'Hello  world',
        shouldBlock: true
      },
      {
        name: 'Script with Complex Content',
        input: '<script>document.cookie="stolen"; alert("hacked");</script>',
        expected: '',
        shouldBlock: true
      },
      {
        name: 'Multiple Script Tags',
        input: '<script>alert(1)</script><script>alert(2)</script>',
        expected: '',
        shouldBlock: true
      },
      {
        name: 'JavaScript Protocol',
        input: 'Click here: javascript:alert("xss")',
        expected: 'Click here: ',
        shouldBlock: true
      },
      {
        name: 'Alert Function',
        input: 'Run this: alert("danger")',
        expected: 'Run this: ',
        shouldBlock: true
      }
    ]
  },

  // Category 2: SQL Injection
  {
    category: 'SQL Injection',
    tests: [
      {
        name: 'Basic SELECT Statement',
        input: 'Can you run: select * from users',
        expected: 'Can you run: ',
        shouldBlock: true
      },
      {
        name: 'DROP TABLE Command',
        input: "Let's try: drop table users",
        expected: "Let's try: ",
        shouldBlock: true
      },
      {
        name: 'Case Insensitive SQL',
        input: 'Execute: SELECT * FROM Users WHERE id=1',
        expected: 'Execute:  WHERE id=1',
        shouldBlock: true
      },
      {
        name: 'SQL with Quotes',
        input: "'; drop table users; --",
        expected: '',
        shouldBlock: true
      },
      {
        name: 'Complex SQL Injection',
        input: "admin'; union select password from users where admin=1 --",
        expected: 'adminpassword from users where admin=1 ',
        shouldBlock: true
      },
      {
        name: 'INSERT Statement',
        input: "insert into users values('hacker','pass')",
        expected: "",
        shouldBlock: true
      },
      {
        name: 'UPDATE Statement',
        input: "update users set password='hacked'",
        expected: "",
        shouldBlock: true
      }
    ]
  },

  // Category 3: Command Injection
  {
    category: 'Command Injection',
    tests: [
      {
        name: 'rm Command',
        input: 'Message here; rm -rf /',
        expected: 'Message here',
        shouldBlock: true
      },
      {
        name: 'sudo Command',
        input: 'Test && sudo su -',
        expected: 'Test',
        shouldBlock: true
      },
      {
        name: 'Multiple Commands',
        input: 'Hello; rm -rf /; echo "done"',
        expected: 'Hello; echo "done"',
        shouldBlock: true
      }
    ]
  },

  // Category 4: NoSQL Injection
  {
    category: 'NoSQL Injection',
    tests: [
      {
        name: 'MongoDB $where',
        input: 'Query: $where: function() { return true; }',
        expected: 'Query:  function() { return true; }',
        shouldBlock: true
      },
      {
        name: 'MongoDB $ne',
        input: 'Find users with $ne: null',
        expected: 'Find users with  null',
        shouldBlock: true
      },
      {
        name: 'MongoDB $regex',
        input: 'Search with $regex: ".*"',
        expected: 'Search with  ".*"',
        shouldBlock: true
      }
    ]
  },

  // Category 5: Legitimate Content (Should be preserved)
  {
    category: 'Legitimate Content',
    tests: [
      {
        name: 'Normal Conversation',
        input: 'Hello! How are you doing today?',
        expected: 'Hello! How are you doing today?',
        shouldBlock: false
      },
      {
        name: 'International Characters',
        input: '¡Hola! ¿Cómo estás? 你好！こんにちは！',
        expected: '¡Hola! ¿Cómo estás? 你好！こんにちは！',
        shouldBlock: false
      },
      {
        name: 'Emojis',
        input: 'Hello! 😀 How are you? 🐕🐱 This is fun! 👍',
        expected: 'Hello! 😀 How are you? 🐕🐱 This is fun! 👍',
        shouldBlock: false
      },
      {
        name: 'All Punctuation',
        input: 'Test: .,;:!?()[]{}@#$%^&*+=|/\\~`"\'<> symbols',
        expected: 'Test: .,;:!?()[]{}@#$%^&*+=|/\\~`"\'<> symbols',
        shouldBlock: false
      },
      {
        name: 'URLs and Emails',
        input: 'Check out https://example.com and email user@domain.com',
        expected: 'Check out https://example.com and email user@domain.com',
        shouldBlock: false
      },
      {
        name: 'HTML-like but Legitimate',
        input: "I'm using <brackets> and <tags> in my message",
        expected: "I'm using <brackets> and <tags> in my message",
        shouldBlock: false
      },
      {
        name: 'Database Discussion (Legitimate)',
        input: 'I need to select a user from the list of users in my app',
        expected: 'I need to select a user from the list of users in my app',
        shouldBlock: false
      },
      {
        name: 'Programming Discussion',
        input: 'The table has many users and we need to find the right one',
        expected: 'The table has many users and we need to find the right one',
        shouldBlock: false
      }
    ]
  },

  // Category 6: Mixed Content (Malicious + Legitimate)
  {
    category: 'Mixed Content',
    tests: [
      {
        name: 'XSS + Normal Text',
        input: 'Hey! <script>alert("xss")</script> How are you doing today?',
        expected: 'Hey!  How are you doing today?',
        shouldBlock: true
      },
      {
        name: 'SQL + Normal Text',
        input: 'Hi there! select * from users How are you?',
        expected: 'Hi there!  How are you?',
        shouldBlock: true
      },
      {
        name: 'Complex Mixed Attack',
        input: 'Hello <script>alert("xss")</script> please drop table users and have a great day!',
        expected: 'Hello  please  and have a great day!',
        shouldBlock: true
      }
    ]
  },

  // Category 7: Edge Cases
  {
    category: 'Edge Cases',
    tests: [
      {
        name: 'Empty String',
        input: '',
        expected: '',
        shouldBlock: false
      },
      {
        name: 'Only Spaces',
        input: '   ',
        expected: '',
        shouldBlock: false
      },
      {
        name: 'Very Long Message',
        input: 'A'.repeat(6000),
        expected: 'A'.repeat(5000), // Truncated to max length
        shouldBlock: false
      },
      {
        name: 'Multiple Spaces',
        input: 'Hello    world    test',
        expected: 'Hello world test',
        shouldBlock: false
      },
      {
        name: 'Leading Spaces',
        input: '   Hello world',
        expected: 'Hello world',
        shouldBlock: false
      },
      {
        name: 'Trailing Spaces',
        input: 'Hello world   ',
        expected: 'Hello world   ',
        shouldBlock: false
      }
    ]
  }
];

/**
 * RUN TESTS
 */

console.log('🧪 MESSAGE INPUT VALIDATION TEST SUITE');
console.log('=====================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

testCases.forEach(category => {
  console.log(`📂 ${category.category}`);
  console.log('-'.repeat(50));
  
  category.tests.forEach(test => {
    totalTests++;
    
    console.log(`\n🔍 Test: ${test.name}`);
    console.log(`Input:    "${test.input}"`);
    console.log(`Expected: "${test.expected}"`);
    
    try {
      const result = sanitizeInput(test.input, 'message');
      console.log(`Actual:   "${result}"`);
      
      if (result === test.expected) {
        console.log(`✅ PASS`);
        passedTests++;
      } else {
        console.log(`❌ FAIL - Expected "${test.expected}" but got "${result}"`);
        failedTests++;
      }
      
      // Check if content was blocked as expected
      const wasBlocked = test.input !== result;
      if (test.shouldBlock && !wasBlocked) {
        console.log(`⚠️  WARNING: Expected content to be blocked but it wasn't`);
      } else if (!test.shouldBlock && wasBlocked) {
        console.log(`⚠️  WARNING: Expected content to be preserved but it was blocked`);
      }
      
    } catch (error) {
      console.log(`💥 ERROR: ${error.message}`);
      failedTests++;
    }
  });
  
  console.log('\n');
});

// Summary
console.log('📊 TEST SUMMARY');
console.log('===============');
console.log(`Total Tests: ${totalTests}`);
console.log(`Passed: ${passedTests} (${Math.round((passedTests/totalTests)*100)}%)`);
console.log(`Failed: ${failedTests} (${Math.round((failedTests/totalTests)*100)}%)`);

if (failedTests === 0) {
  console.log('\n🎉 ALL TESTS PASSED! Message input validation is working correctly.');
} else {
  console.log(`\n⚠️  ${failedTests} tests failed. Review the output above for details.`);
}

console.log('\n🔒 Security Coverage:');
console.log('- XSS Protection (script tags, JavaScript)');
console.log('- SQL Injection (SELECT, DROP, INSERT, UPDATE, etc.)');
console.log('- Command Injection (rm, sudo, shell commands)');
console.log('- NoSQL Injection (MongoDB operators)');
console.log('- International Character Support');
console.log('- Emoji Support');
console.log('- URL and Email Preservation');
console.log('- Legitimate HTML-like Content Preservation'); 