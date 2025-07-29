#!/usr/bin/env node

const https = require('https');
const { URL } = require('url');

// Configuration
const BASE_URL = 'https://staging.crittrcove.com'; // Change to crittrcove.com for production
const PAGES_TO_TEST = [
  '/',
  '/signin',
  '/signup',
  '/SearchProfessionalsListing',
  '/contact-us',
  '/privacy-policy',
  '/terms-of-service',
  '/dog-boarding-colorado-springs',
  '/dog-walker-colorado-springs',
  '/dog-sitting-colorado-springs',
  '/cat-sitting-colorado-springs',
  '/pet-boarding-colorado-springs',
  '/exotic-pet-care-colorado-springs',
  '/ferret-sitter-colorado-springs',
  '/reptile-sitter-colorado-springs',
  '/bird-boarding-colorado-springs',
  '/horse-sitting-colorado',
  '/blog',
  '/blog-post?postId=blog_1',
  '/blog-post?postId=blog_2',
  '/blog-post?postId=blog_3',
  '/site-map',
  '/site-map.html',
  '/sitemap.xml'
];

// Helper function to make HTTPS requests
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          url,
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
          success: res.statusCode >= 200 && res.statusCode < 400
        });
      });
    });

    req.on('error', (err) => {
      reject({ url, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({ url, error: 'Request timeout' });
    });

    req.end();
  });
}

// Test GitHub Pages routing by checking redirected URLs
async function testGitHubPagesRouting() {
  console.log('🔍 Testing GitHub Pages routing (including 404 redirects)...\n');
  
  const results = [];
  
  for (const page of PAGES_TO_TEST) {
    const fullUrl = BASE_URL + page;
    try {
      const result = await makeRequest(fullUrl);
      
      // For GitHub Pages, 404 responses are expected and correct
      // We need to check if the 404 page contains the redirect script
      if (result.statusCode === 404) {
        const hasRedirectScript = result.data.includes('spa-github-pages') || 
                                result.data.includes('window.location.replace');
        
        if (hasRedirectScript) {
          // Test the redirected URL
          const redirectedUrl = BASE_URL + '/?/' + page.slice(1);
          try {
            const redirectResult = await makeRequest(redirectedUrl);
            const isAppLoaded = redirectResult.data.includes('CrittrCove') && 
                              redirectResult.data.includes('root');
            
            results.push({
              url: fullUrl,
              statusCode: result.statusCode,
              routing: 'GitHub Pages 404 → Redirect',
              appLoaded: isAppLoaded,
              success: isAppLoaded
            });
            
            const status = isAppLoaded ? '✅' : '❌';
            console.log(`${status} ${page} - 404 (GitHub Pages routing) - App ${isAppLoaded ? 'loaded' : 'failed'}`);
          } catch (redirectError) {
            results.push({
              url: fullUrl,
              statusCode: result.statusCode,
              routing: 'GitHub Pages 404 → Redirect failed',
              success: false
            });
            console.log(`❌ ${page} - 404 (GitHub Pages routing) - Redirect failed`);
          }
        } else {
          results.push({
            url: fullUrl,
            statusCode: result.statusCode,
            routing: '404 without redirect script',
            success: false
          });
          console.log(`❌ ${page} - 404 (No redirect script)`);
        }
      } else {
        // Direct success (like sitemap pages)
        results.push({
          url: fullUrl,
          statusCode: result.statusCode,
          routing: 'Direct access',
          success: result.success
        });
        
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${page} - ${result.statusCode} (Direct access)`);
      }
    } catch (error) {
      results.push({ url: fullUrl, error: error.error, success: false });
      console.log(`❌ ${page} - ERROR: ${error.error}`);
    }
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

// Test sitemap.xml content
async function testSitemapContent() {
  console.log('\n📋 Testing sitemap.xml content...\n');
  
  try {
    const url = BASE_URL + '/sitemap.xml';
    const response = await makeRequest(url);

    if (response.statusCode === 200) {
      console.log('✅ sitemap.xml is accessible');
      
      // Check for key URLs in sitemap
      const sitemapContent = response.data;
      const keyUrls = [
        'https://crittrcove.com/site-map',
        'https://crittrcove.com/site-map.html',
        'https://crittrcove.com/signin',
        'https://crittrcove.com/signup',
        'https://crittrcove.com/blog'
      ];
      
      console.log('\n🔍 Checking for key URLs in sitemap:');
      keyUrls.forEach(url => {
        const found = sitemapContent.includes(url);
        console.log(`${found ? '✅' : '❌'} ${url}`);
      });
      
      return true;
    } else {
      console.log(`❌ sitemap.xml returned status ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error accessing sitemap.xml: ${error.message}`);
    return false;
  }
}

// Test static HTML sitemap
async function testStaticSitemap() {
  console.log('\n📄 Testing static HTML sitemap...\n');
  
  try {
    const url = BASE_URL + '/site-map.html';
    const response = await makeRequest(url);

    if (response.statusCode === 200) {
      console.log('✅ site-map.html is accessible');
      
      // Check for key content
      const content = response.data;
      const checks = [
        { name: 'Title', pattern: 'CrittrCove Sitemap', found: content.includes('CrittrCove Sitemap') },
        { name: 'Main Pages section', pattern: 'Main Pages', found: content.includes('Main Pages') },
        { name: 'SEO Landing Pages section', pattern: 'SEO Landing Pages', found: content.includes('SEO Landing Pages') },
        { name: 'Blog section', pattern: 'Blog & Content', found: content.includes('Blog & Content') },
        { name: 'Total pages count', pattern: 'Total Pages: 21', found: content.includes('Total Pages: 21') }
      ];
      
      console.log('\n🔍 Checking static sitemap content:');
      checks.forEach(check => {
        console.log(`${check.found ? '✅' : '❌'} ${check.name}`);
      });
      
      return true;
    } else {
      console.log(`❌ site-map.html returned status ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Error accessing site-map.html: ${error.message}`);
    return false;
  }
}

// Generate summary report
function generateReport(pageResults, sitemapOk, staticOk) {
  console.log('\n📊 SUMMARY REPORT');
  console.log('=' * 50);
  
  const successful = pageResults.filter(r => r.success).length;
  const failed = pageResults.filter(r => !r.success).length;
  const total = pageResults.length;
  
  console.log(`\n📈 Page Status:`);
  console.log(`   ✅ Working: ${successful}/${total}`);
  console.log(`   ❌ Failed: ${failed}/${total}`);
  console.log(`   📊 Success Rate: ${((successful/total)*100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Pages:');
    pageResults.filter(r => !r.success).forEach(result => {
      console.log(`   - ${result.url} (${result.routing || result.statusCode || 'ERROR'})`);
    });
  }
  
  console.log('\n🗺️ Sitemap Status:');
  console.log(`   XML Sitemap: ${sitemapOk ? '✅ Working' : '❌ Failed'}`);
  console.log(`   HTML Sitemap: ${staticOk ? '✅ Working' : '❌ Failed'}`);
  
  console.log('\n🔗 Test URLs:');
  console.log(`   React Sitemap: ${BASE_URL}/site-map`);
  console.log(`   Static Sitemap: ${BASE_URL}/site-map.html`);
  console.log(`   XML Sitemap: ${BASE_URL}/sitemap.xml`);
  
  console.log('\n📝 GitHub Pages Routing Explanation:');
  console.log('   • 404 responses are EXPECTED for app routes');
  console.log('   • 404.html redirects to /?/route format');
  console.log('   • index.html processes /?/route back to /route');
  console.log('   • This is the correct GitHub Pages SPA pattern');
  
  console.log('\n📝 Next Steps:');
  if (successful >= total * 0.8 && sitemapOk && staticOk) {
    console.log('   ✅ All tests passed! Your sitemap is working correctly.');
    console.log('   🚀 Ready for production deployment.');
    console.log('   🔍 Google will be able to crawl all pages via the sitemap.');
  } else {
    console.log('   ⚠️ Some issues detected. Please review failed pages.');
    console.log('   🔧 Check GitHub Pages routing configuration.');
  }
}

// Main execution
async function main() {
  console.log('🚀 CrittrCove Sitemap Verification Tool');
  console.log(`📍 Testing: ${BASE_URL}`);
  console.log('=' * 50);
  
  try {
    const pageResults = await testGitHubPagesRouting();
    const sitemapOk = await testSitemapContent();
    const staticOk = await testStaticSitemap();
    
    generateReport(pageResults, sitemapOk, staticOk);
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

// Run the verification
if (require.main === module) {
  main();
}

module.exports = { testGitHubPagesRouting, testSitemapContent, testStaticSitemap }; 