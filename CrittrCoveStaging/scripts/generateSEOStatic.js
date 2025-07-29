const fs = require('fs');
const path = require('path');

// Function to get current build file names
function getCurrentBuildFiles() {
  const buildPath = path.join(__dirname, '..', 'web-build');
  const jsPath = path.join(buildPath, 'static', 'js');
  const cssPath = path.join(buildPath, 'static', 'css');
  
  let mainJsFile = '';
  let mainCssFile = '';
  
  try {
    // Find main.js file
    const jsFiles = fs.readdirSync(jsPath);
    const mainJsFiles = jsFiles.filter(file => file.startsWith('main.') && file.endsWith('.js') && !file.endsWith('.map'));
    if (mainJsFiles.length > 0) {
      mainJsFile = mainJsFiles[0];
      console.log(`📄 Found main JS file: ${mainJsFile}`);
    } else {
      console.warn('⚠️  No main JS file found matching pattern main.*.js');
    }
    
    // Find main.css file
    const cssFiles = fs.readdirSync(cssPath);
    const mainCssFiles = cssFiles.filter(file => file.startsWith('main.') && file.endsWith('.css') && !file.endsWith('.map'));
    if (mainCssFiles.length > 0) {
      mainCssFile = mainCssFiles[0];
      console.log(`🎨 Found main CSS file: ${mainCssFile}`);
    } else {
      console.warn('⚠️  No main CSS file found matching pattern main.*.css');
    }
  } catch (error) {
    console.error('❌ Error reading build files:', error.message);
  }
  
  return { mainJsFile, mainCssFile };
}

const seoPages = [
  {
    path: '/dog-boarding-colorado-springs',
    title: 'Dog Boarding Colorado Springs | Trusted Pet Care | CrittrCove',
    description: 'Find reliable dog boarding services in Colorado Springs. Professional pet sitters providing overnight care for your furry friends. Book trusted local dog boarding today.',
    keywords: 'dog boarding colorado springs, pet boarding, overnight dog care, dog sitters, pet care colorado springs'
  },
  {
    path: '/dog-walker-colorado-springs',
    title: 'Dog Walker Colorado Springs | Professional Pet Care | CrittrCove',
    description: 'Find trusted dog walkers in Colorado Springs. Professional pet care services for your furry friends. Book reliable local dog walking today.',
    keywords: 'dog walker colorado springs, dog walking services, pet care, dog sitters, professional dog walkers'
  },
  {
    path: '/cat-sitting-colorado-springs',
    title: 'Cat Sitting Colorado Springs | In-Home Pet Care | CrittrCove',
    description: 'Professional cat sitting services in Colorado Springs. In-home pet care for your feline friends. Book trusted local cat sitters today.',
    keywords: 'cat sitting colorado springs, cat sitter, in-home pet care, cat care services, professional cat sitters'
  },
  {
    path: '/exotic-pet-care-colorado-springs',
    title: 'Exotic Pet Care Colorado Springs | Specialized Pet Services | CrittrCove',
    description: 'Specialized exotic pet care in Colorado Springs. Professional care for birds, reptiles, ferrets, and other exotic pets. Book trusted local exotic pet sitters.',
    keywords: 'exotic pet care colorado springs, bird sitter, reptile care, ferret sitter, specialized pet care'
  },
  {
    path: '/ferret-sitter-colorado-springs',
    title: 'Ferret Sitter Colorado Springs | Specialized Ferret Care | CrittrCove',
    description: 'Professional ferret sitting services in Colorado Springs. Specialized care for your ferret friends. Book trusted local ferret sitters today.',
    keywords: 'ferret sitter colorado springs, ferret care, ferret sitting, specialized pet care, ferret boarding'
  },
  {
    path: '/bird-boarding-colorado-springs',
    title: 'Bird Boarding Colorado Springs | Avian Pet Care | CrittrCove',
    description: 'Professional bird boarding services in Colorado Springs. Specialized care for your avian friends. Book trusted local bird sitters today.',
    keywords: 'bird boarding colorado springs, bird sitter, avian care, bird care services, specialized bird care'
  },
  {
    path: '/horse-sitting-colorado',
    title: 'Horse Sitting Colorado | Equine Care Services | CrittrCove',
    description: 'Professional horse sitting services in Colorado. Specialized equine care for your horse friends. Book trusted local horse sitters today.',
    keywords: 'horse sitting colorado, horse sitter, equine care, horse care services, specialized horse care'
  },
  {
    path: '/reptile-sitter-colorado-springs',
    title: 'Reptile Sitter Colorado Springs | Specialized Reptile Care | CrittrCove',
    description: 'Professional reptile sitting services in Colorado Springs. Specialized care for your reptile friends. Book trusted local reptile sitters today.',
    keywords: 'reptile sitter colorado springs, reptile care, reptile sitting, specialized pet care, reptile boarding'
  },
  {
    path: '/pet-boarding-colorado-springs',
    title: 'Pet Boarding Colorado Springs | Professional Pet Care | CrittrCove',
    description: 'Professional pet boarding services in Colorado Springs. Overnight care for all types of pets. Book trusted local pet sitters today.',
    keywords: 'pet boarding colorado springs, pet care, overnight pet care, pet sitters, professional pet care'
  },
  {
    path: '/dog-sitting-colorado-springs',
    title: 'Dog Sitting Colorado Springs | In-Home Pet Care | CrittrCove',
    description: 'Professional dog sitting services in Colorado Springs. In-home care for your canine friends. Book trusted local dog sitters today.',
    keywords: 'dog sitting colorado springs, dog sitter, in-home pet care, dog care services, professional dog sitters'
  }
];

const generateHTMLTemplate = (page, buildFiles) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <link rel="icon" href="/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="${page.description}" />
    <meta name="keywords" content="${page.keywords}" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://crittrcove.com${page.path}" />
    <meta property="og:title" content="${page.title}" />
    <meta property="og:description" content="${page.description}" />
    <meta property="og:image" content="https://crittrcove.com/og-image.jpg" />

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="https://crittrcove.com${page.path}" />
    <meta property="twitter:title" content="${page.title}" />
    <meta property="twitter:description" content="${page.description}" />
    <meta property="twitter:image" content="https://crittrcove.com/og-image.jpg" />

    <!-- Preload critical resources -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    
    <title>${page.title}</title>
    
    <!-- Structured Data for Local Business -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": "CrittrCove",
      "description": "${page.description}",
      "url": "https://crittrcove.com${page.path}",
      "telephone": "+1-719-555-0123",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Colorado Springs",
        "addressRegion": "CO",
        "addressCountry": "US"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 38.8339,
        "longitude": -104.8214
      },
      "openingHours": "Mo-Su 00:00-23:59",
      "priceRange": "$$",
      "serviceArea": {
        "@type": "City",
        "name": "Colorado Springs"
      }
    }
    </script>
    
    <!-- Preload the main app -->
    <link rel="preload" href="/static/js/${buildFiles.mainJsFile}" as="script">
    <link rel="preload" href="/static/css/${buildFiles.mainCssFile}" as="style">
</head>
<body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root">
        <!-- Loading indicator for React app -->
        <div style="display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: Arial, sans-serif; background: white;">
            <div style="text-align: center;">
                <div style="font-size: 24px; font-weight: bold; color: #4CAF50; margin-bottom: 20px;">CrittrCove</div>
                <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #4CAF50; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                <div style="margin-top: 20px; color: #666;">Loading...</div>
            </div>
        </div>
        <style>
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        </style>
    </div>
    
    <!-- Load the React app -->
    <script>
        // Single Page Apps for GitHub Pages
        // MIT License - https://github.com/rafgraph/spa-github-pages
        (function(l) {
          if (l.search[1] === '/' ) {
            var decoded = l.search.slice(1).split('&').map(function(s) { 
              return s.replace(/~and~/g, '&')
            }).join('?');
            window.history.replaceState(null, null,
              l.pathname.slice(0, -1) + decoded + l.hash
            );
          }
        }(window.location))
        
        // Ensure React app takes over after loading
        window.addEventListener('load', function() {
          // Remove the pre-rendered content and let React hydrate
          setTimeout(function() {
            const root = document.getElementById('root');
            if (root) {
              root.innerHTML = '';
            }
          }, 100);
        });
    </script>
    
    <!-- Load React app scripts -->
    <script defer="defer" src="/static/js/174.a88fdf84.js"></script>
    <script defer="defer" src="/static/js/${buildFiles.mainJsFile}"></script>
    <link href="/static/css/${buildFiles.mainCssFile}" rel="stylesheet">
</body>
</html>`;
};

const generateSEOStaticFiles = () => {
  console.log('🚀 Generating SEO static HTML files...');
  
  const buildPath = path.join(__dirname, '..', 'web-build');
  
  // Check if web-build directory exists
  if (!fs.existsSync(buildPath)) {
    console.error('❌ web-build directory not found. Please run "npx expo export:web" first.');
    process.exit(1);
  }
  
  // Get current build file names
  const buildFiles = getCurrentBuildFiles();
  console.log(`📁 Using build files: JS=${buildFiles.mainJsFile}, CSS=${buildFiles.mainCssFile}`);
  
  let successCount = 0;
  
  seoPages.forEach(page => {
    try {
      // Create directory if it doesn't exist
      const pageDir = path.join(buildPath, page.path.substring(1));
      if (!fs.existsSync(pageDir)) {
        fs.mkdirSync(pageDir, { recursive: true });
      }
      
      // Generate HTML content
      const htmlContent = generateHTMLTemplate(page, buildFiles);
      
      // Write index.html file
      const indexPath = path.join(pageDir, 'index.html');
      fs.writeFileSync(indexPath, htmlContent);
      
      console.log(`✅ Generated: ${page.path}/index.html`);
      successCount++;
    } catch (error) {
      console.error(`❌ Error generating ${page.path}:`, error.message);
    }
  });
  
  console.log(`\n🎉 Successfully generated ${successCount}/${seoPages.length} SEO static files`);
  console.log('📁 Files saved to web-build directory');
  
  if (successCount === seoPages.length) {
    console.log('✅ All SEO pages generated successfully!');
  } else {
    console.log('⚠️  Some pages may have failed to generate');
  }
};

// Run the generation
generateSEOStaticFiles();
