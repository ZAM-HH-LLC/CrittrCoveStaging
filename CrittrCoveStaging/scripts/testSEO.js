const fs = require('fs');
const path = require('path');

const seoPages = [
  '/dog-boarding-colorado-springs',
  '/dog-walker-colorado-springs',
  '/cat-sitting-colorado-springs',
  '/exotic-pet-care-colorado-springs',
  '/ferret-sitter-colorado-springs',
  '/bird-boarding-colorado-springs',
  '/horse-sitting-colorado',
  '/reptile-sitter-colorado-springs',
  '/pet-boarding-colorado-springs',
  '/dog-sitting-colorado-springs'
];

const testSEOStaticFiles = () => {
  console.log('🧪 Testing SEO static files...');
  
  const buildPath = path.join(__dirname, '..', 'web-build');
  let successCount = 0;
  let totalCount = seoPages.length;
  
  seoPages.forEach(pagePath => {
    const indexPath = path.join(buildPath, pagePath.substring(1), 'index.html');
    
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath, 'utf8');
      
      // Check for required SEO elements
      const hasDoctype = content.includes('<!DOCTYPE html>');
      const hasTitle = content.includes('<title>');
      const hasMetaDescription = content.includes('meta name="description"');
      const hasOpenGraph = content.includes('property="og:');
      const hasStructuredData = content.includes('application/ld+json');
      const hasVisibleContent = content.includes('CrittrCove');
      
      if (hasDoctype && hasTitle && hasMetaDescription && hasOpenGraph && hasStructuredData && hasVisibleContent) {
        console.log(`✅ ${pagePath}: All SEO elements present`);
        successCount++;
      } else {
        console.log(`❌ ${pagePath}: Missing SEO elements`);
        console.log(`   DOCTYPE: ${hasDoctype ? 'Yes' : 'No'}`);
        console.log(`   Title: ${hasTitle ? 'Yes' : 'No'}`);
        console.log(`   Meta Description: ${hasMetaDescription ? 'Yes' : 'No'}`);
        console.log(`   Open Graph: ${hasOpenGraph ? 'Yes' : 'No'}`);
        console.log(`   Structured Data: ${hasStructuredData ? 'Yes' : 'No'}`);
        console.log(`   Visible Content: ${hasVisibleContent ? 'Yes' : 'No'}`);
      }
    } else {
      console.log(`❌ ${pagePath}: File not found`);
    }
  });
  
  console.log(`\n📊 Results: ${successCount}/${totalCount} files pass SEO requirements`);
  
  if (successCount === totalCount) {
    console.log('✅ All SEO files are properly formatted!');
  } else {
    console.log('⚠️  Some files may need attention');
  }
};

testSEOStaticFiles();
