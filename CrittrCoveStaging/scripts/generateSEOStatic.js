const fs = require('fs');
const path = require('path');

// Function to get current build file names
function getCurrentBuildFiles() {
  const buildPath = path.join(__dirname, '..', 'web-build');
  const jsPath = path.join(buildPath, 'static', 'js');
  const cssPath = path.join(buildPath, 'static', 'css');
  
  let mainJsFile = '';
  let vendorJsFile = '';
  let mainCssFile = '';
  
  try {
    // Find main.js file
    const jsFiles = fs.readdirSync(jsPath);
    const jsFilesFiltered = jsFiles.filter(file => file.endsWith('.js') && !file.endsWith('.map'));
    const mainJsFiles = jsFilesFiltered.filter(file => file.startsWith('main.'));
    if (mainJsFiles.length > 0) {
      mainJsFile = mainJsFiles[0];
      console.log(`📄 Found main JS file: ${mainJsFile}`);
    } else {
      console.warn('⚠️  No main JS file found matching pattern main.*.js');
    }

    // Try to find a secondary/vendor chunk (optional)
    const candidateVendors = jsFilesFiltered
      .filter(file => !file.startsWith('main.') && !file.startsWith('workbox-'))
      .sort();
    if (candidateVendors.length > 0) {
      vendorJsFile = candidateVendors[0];
      console.log(`📄 Found secondary JS file: ${vendorJsFile}`);
    } else {
      console.warn('ℹ️  No secondary JS chunk detected; will only include main bundle');
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
  
  return { mainJsFile, vendorJsFile, mainCssFile };
}

const seoPages = [
  {
    path: '/dog-boarding-colorado-springs',
    title: 'Dog Boarding Colorado Springs | Trusted Pet Care | CrittrCove',
    description: 'Find reliable dog boarding services in Colorado Springs. Professional pet professionals providing overnight care for your furry friends. Book trusted local dog boarding today.',
    keywords: 'dog boarding colorado springs, pet boarding, overnight dog care, dog professionals, pet care colorado springs'
  },
  {
    path: '/dog-walker-colorado-springs',
    title: 'Dog Walker Colorado Springs | Professional Pet Care | CrittrCove',
    description: 'Find trusted dog walkers in Colorado Springs. Professional pet care services for your furry friends. Book reliable local dog walking today.',
    keywords: 'dog walker colorado springs, dog walking services, pet care, dog professionals, professional dog walkers'
  },
  {
    path: '/cat-sitting-colorado-springs',
    title: 'Cat Sitting Colorado Springs | In-Home Pet Care | CrittrCove',
    description: 'Professional cat sitting services in Colorado Springs. In-home pet care for your feline friends. Book trusted local cat professionals today.',
    keywords: 'cat sitting colorado springs, cat professional, in-home pet care, cat care services, professional cat professionals'
  },
  {
    path: '/exotic-pet-care-colorado-springs',
    title: 'Exotic Pet Care Colorado Springs | Specialized Pet Services | CrittrCove',
    description: 'Specialized exotic pet care in Colorado Springs. Professional care for birds, reptiles, ferrets, and other exotic pets. Book trusted local exotic pet professionals.',
    keywords: 'exotic pet care colorado springs, bird professional, reptile care, ferret professional, specialized pet care'
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

// Unique, semantic content for each SEO page
const content_map = {
  '/dog-sitting-colorado-springs': {
    h1: 'Dog Sitting in Colorado Springs',
    intro: 'Book trusted in-home dog sitting in Colorado Springs. Local pet professionals provide drop-in visits and overnights so your pup can stay comfortable at home while you’re away.',
    benefits: [
      'Background‑checked local sitters you can meet in advance',
      'Flexible options: drop‑ins, dog walks, overnights, medication support',
      'Photo updates and visit summaries after every booking',
      'No surprise fees — simple, transparent pricing'
    ],
    areas: 'We serve neighborhoods across Colorado Springs including Briargate, Old Colorado City, Downtown, Rockrimmon, Westside, Broadmoor, and Northgate.',
    faqs: [
      { q: 'How much does dog sitting cost?', a: 'Single drop‑in visits typically range from $18–$30 depending on length, number of pets, and special care needs. Overnight stays are quoted per night.' },
      { q: 'What’s included in a visit?', a: 'Feeding and fresh water, potty breaks or short walks, playtime, litter or yard tidy as needed, and medication administration upon request.' },
      { q: 'Can I meet my sitter first?', a: 'Yes. Most sitters offer free meet‑and‑greets so you can review routines, keys, and expectations before confirming.' },
      { q: 'Do you offer last‑minute bookings?', a: 'Many sitters accept short‑notice requests. Search sitters near you and message directly to confirm availability.' }
    ],
    related: [
      { href: '/dog-boarding-colorado-springs', label: 'Dog boarding' },
      { href: '/dog-walker-colorado-springs', label: 'Dog walking' },
      { href: '/cat-sitting-colorado-springs', label: 'Cat sitting' }
    ]
  },
  '/dog-boarding-colorado-springs': {
    h1: 'Dog Boarding in Colorado Springs',
    intro: 'Find safe, comfortable dog boarding with trusted local caregivers. Your dog enjoys overnight care and play while you travel.',
    benefits: [
      'Home‑style boarding with personalized attention',
      'Daily updates and photos from your caregiver',
      'Options for puppies, seniors, and special‑care pets'
    ],
    areas: 'Serving Colorado Springs and nearby communities including Manitou Springs, Cimarron Hills, and Security‑Widefield.',
    faqs: [
      { q: 'What should I pack for boarding?', a: 'Bring your dog’s food, medication, and favorite items. Sitters will provide a safe space, walks, and playtime.' },
      { q: 'Are vaccines required?', a: 'For everyone’s safety, sitters may require up‑to‑date core vaccines. Check each listing for details.' },
      { q: 'Can my dogs stay together?', a: 'Yes. Many caregivers accept multiple pets from the same household. See capacity and policies on each profile.' }
    ],
    related: [
      { href: '/dog-sitting-colorado-springs', label: 'Dog sitting' },
      { href: '/pet-boarding-colorado-springs', label: 'Pet boarding' },
      { href: '/dog-walker-colorado-springs', label: 'Dog walking' }
    ]
  },
  '/cat-sitting-colorado-springs': {
    h1: 'Cat Sitting in Colorado Springs',
    intro: 'Keep your cat relaxed at home with reliable in‑home visits from Colorado Springs sitters. Litter care, playtime, and medication support are available.',
    benefits: [
      'Gentle, cat‑savvy sitters focused on routine and comfort',
      'Daily photo updates and detailed visit notes',
      'Add‑ons available like plant care and mail pick‑up'
    ],
    areas: 'Serving neighborhoods citywide including Briargate, Downtown, Northeast Colorado Springs, and Broadmoor.',
    faqs: [
      { q: 'How often should a sitter visit?', a: 'Most cats do best with one to two visits per day. Choose the cadence that fits your cat’s routine.' },
      { q: 'Can you handle shy or anxious cats?', a: 'Yes. Many sitters specialize in slow‑approach care and will follow your instructions to reduce stress.' },
      { q: 'Do you administer medications?', a: 'Many providers can give oral meds and some offer insulin injections. Check listings for specific experience.' }
    ],
    related: [
      { href: '/pet-boarding-colorado-springs', label: 'Pet boarding' },
      { href: '/dog-sitting-colorado-springs', label: 'Dog sitting' },
      { href: '/exotic-pet-care-colorado-springs', label: 'Exotic pet care' }
    ]
  },
  '/dog-walker-colorado-springs': {
    h1: 'Dog Walkers in Colorado Springs',
    intro: 'Book dependable local dog walkers for quick potty breaks or longer adventures around your neighborhood.',
    benefits: [
      'Real‑time updates and GPS‑logged walks',
      'Flexible scheduling from weekdays to weekends',
      'Experienced walkers for puppies and seniors'
    ],
    areas: 'Common routes include Monument Valley Park, Bear Creek, and trails around Rockrimmon and Briargate.',
    faqs: [
      { q: 'How long are walks?', a: 'Choose 20, 30, or 60‑minute options. Custom lengths are often available on request.' },
      { q: 'Do walkers come in all weather?', a: 'Yes, within reason. Walkers adjust pace and duration for heat, snow, and safety.' },
      { q: 'Is key handling secure?', a: 'Sitters follow clear key and access procedures. Many use lockboxes for convenience.' }
    ],
    related: [
      { href: '/dog-sitting-colorado-springs', label: 'Dog sitting' },
      { href: '/dog-boarding-colorado-springs', label: 'Dog boarding' },
      { href: '/cat-sitting-colorado-springs', label: 'Cat sitting' }
    ]
  },
  '/pet-boarding-colorado-springs': {
    h1: 'Pet Boarding in Colorado Springs',
    intro: 'Overnight boarding for dogs, cats, and small animals. Comfortable accommodations with attentive caregivers.',
    benefits: [
      'Home‑like settings and small‑group care',
      'Photo updates and flexible drop‑off/pick‑up windows',
      'Options for bonded pairs and multi‑pet households'
    ],
    areas: 'Available across Colorado Springs and nearby towns such as Manitou Springs and Woodland Park.',
    faqs: [
      { q: 'Can you board exotic pets?', a: 'Some providers welcome small mammals and birds. Check each listing for species experience.' },
      { q: 'What is the cancellation policy?', a: 'Policies vary by provider. Review each profile for specific timelines and fees.' },
      { q: 'Are play sessions included?', a: 'Yes. Time for enrichment and exercise is built into every stay.' }
    ],
    related: [
      { href: '/dog-boarding-colorado-springs', label: 'Dog boarding' },
      { href: '/cat-sitting-colorado-springs', label: 'Cat sitting' },
      { href: '/dog-walker-colorado-springs', label: 'Dog walking' }
    ]
  },
  '/exotic-pet-care-colorado-springs': {
    h1: 'Exotic Pet Care in Colorado Springs',
    intro: 'Experienced caregivers for birds, reptiles, and small mammals. Get specialized in‑home visits tailored to your pet’s habitat and routine.',
    benefits: [
      'Handlers with species‑specific experience',
      'Temperature, humidity, and diet routines followed precisely',
      'Detailed care logs and photos after each visit'
    ],
    areas: 'Care available throughout Colorado Springs and nearby communities.',
    faqs: [
      { q: 'Which species are supported?', a: 'Common requests include parrots, geckos, snakes, turtles, rabbits, and ferrets. Message providers about your pet.' },
      { q: 'Do you handle complex enclosures?', a: 'Yes. Sitters can follow your detailed instructions for lighting, misting, and cleaning.' },
      { q: 'Is handling required?', a: 'Only when safe and appropriate for the species. Your instructions always come first.' }
    ],
    related: [
      { href: '/reptile-sitter-colorado-springs', label: 'Reptile sitter' },
      { href: '/bird-boarding-colorado-springs', label: 'Bird boarding' },
      { href: '/ferret-sitter-colorado-springs', label: 'Ferret sitter' }
    ]
  },
  '/reptile-sitter-colorado-springs': {
    h1: 'Reptile Sitters in Colorado Springs',
    intro: 'Find knowledgeable reptile caregivers who understand heating, humidity, and feeding schedules for a variety of species.',
    benefits: [
      'Species‑aware sitters with careful handling practices',
      'Feeding schedules for insectivores and herbivores',
      'Enclosure checks for temperature and humidity'
    ],
    areas: 'Service available across the metro area including Downtown, Westside, and Northeast.',
    faqs: [
      { q: 'Do you care for hatchlings?', a: 'Yes, with clear written instructions. Some sitters specialize in juvenile care.' },
      { q: 'Can you assist with shedding issues?', a: 'Sitters can monitor humidity levels and apply your vet‑recommended routines.' },
      { q: 'What about live feed storage?', a: 'Discuss safe storage and feeding steps during your meet‑and‑greet.' }
    ],
    related: [
      { href: '/exotic-pet-care-colorado-springs', label: 'Exotic pet care' },
      { href: '/bird-boarding-colorado-springs', label: 'Bird boarding' }
    ]
  },
  '/ferret-sitter-colorado-springs': {
    h1: 'Ferret Sitters in Colorado Springs',
    intro: 'Specialized sitters who understand ferret play, safety, and enrichment. Get dependable in‑home care.',
    benefits: [
      'Cage cleaning and safe playtime included',
      'Feeding routines and medications handled with care',
      'Updates after every visit so you can travel with confidence'
    ],
    areas: 'Available citywide and nearby communities.',
    faqs: [
      { q: 'Do sitters ferret‑proof areas?', a: 'Yes. Sitters follow your guidance to block tight spaces and keep chewables out of reach.' },
      { q: 'Can you administer medications?', a: 'Many sitters can provide oral meds. Confirm details on each profile.' },
      { q: 'How often are play sessions?', a: 'We recommend at least one daily session; your sitter can tailor schedule and length.' }
    ],
    related: [
      { href: '/exotic-pet-care-colorado-springs', label: 'Exotic pet care' },
      { href: '/pet-boarding-colorado-springs', label: 'Pet boarding' }
    ]
  },
  '/bird-boarding-colorado-springs': {
    h1: 'Bird Boarding in Colorado Springs',
    intro: 'Caring boarding for parrots and other birds with attention to diet, enrichment, and environment.',
    benefits: [
      'Quiet, safe boarding options for a variety of birds',
      'Diet and enrichment plans followed closely',
      'Daily updates to your phone or email'
    ],
    areas: 'Serving Colorado Springs and surrounding areas.',
    faqs: [
      { q: 'Do you accept large parrots?', a: 'Many sitters have experience with cockatoos and macaws. Review profiles for specific species.' },
      { q: 'Can you provide fresh foods?', a: 'Yes, with your instructions and supplies. Sitters will prepare meals as directed.' },
      { q: 'Is nail or wing care available?', a: 'Some providers offer basic maintenance. Ask your sitter about availability.' }
    ],
    related: [
      { href: '/exotic-pet-care-colorado-springs', label: 'Exotic pet care' },
      { href: '/reptile-sitter-colorado-springs', label: 'Reptile sitter' }
    ]
  },
  '/horse-sitting-colorado': {
    h1: 'Horse Sitting in Colorado',
    intro: 'Experienced equine sitters who can manage daily feeding, turnout, and stall care while you’re away.',
    benefits: [
      'Routine barn care and wellness checks',
      'Medication administration and special diets',
      'Coverage for weekends or extended travel'
    ],
    areas: 'Available across Colorado’s Front Range including Colorado Springs area.',
    faqs: [
      { q: 'Do you handle multiple horses?', a: 'Yes. Discuss your herd size and routines during booking.' },
      { q: 'Can sitters coordinate with your vet?', a: 'Many sitters can follow detailed care plans and coordinate with your preferred providers.' },
      { q: 'What about pasture maintenance?', a: 'Light tasks like water checks and fence inspections can be arranged.' }
    ],
    related: [
      { href: '/dog-sitting-colorado-springs', label: 'Dog sitting' },
      { href: '/pet-boarding-colorado-springs', label: 'Pet boarding' }
    ]
  }
};

function buildStaticBodyHTMLFor(page) {
  const cfg = content_map[page.path];
  if (!cfg) {
    return `
      <main>
        <header>
          <h1>${page.title}</h1>
          <p>${page.description}</p>
        </header>
        <p>Discover trusted local caregivers in Colorado Springs.</p>
        <p><a class="cta" href="/signup" rel="nofollow">Get started</a></p>
      </main>
    `;
  }

  const benefitsList = (cfg.benefits || [])
    .map(item => `<li>${item}</li>`)
    .join('');

  const faqList = (cfg.faqs || [])
    .map(f => `
      <h3>${f.q}</h3>
      <p>${f.a}</p>
    `)
    .join('');

  const relatedLinks = (cfg.related || [])
    .map(l => `<a href="${l.href}">${l.label}</a>`)
    .join(' • ');

  return `
    <main>
      <header>
        <h1>${cfg.h1}</h1>
        <p>${cfg.intro}</p>
      </header>

      <section>
        <h2>Why choose CrittrCove</h2>
        <ul>
          ${benefitsList}
        </ul>
      </section>

      <section>
        <h2>Areas we serve</h2>
        <p>${cfg.areas}</p>
      </section>

      <section>
        <h2>FAQs</h2>
        ${faqList}
      </section>

      <nav aria-label="Related services">
        ${relatedLinks}
      </nav>

      <p><a class="cta" href="/signup" rel="nofollow">Find a sitter</a></p>
    </main>
  `;
}

const generateHTMLTemplate = (page, buildFiles) => {
  const canonicalUrl = `https://crittrcove.com${page.path}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <link rel="icon" href="/favicon.ico" />
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="${page.description}" />
    <meta name="keywords" content="${page.keywords}" />
    <meta name="robots" content="index,follow" />
    <link rel="canonical" href="${canonicalUrl}" />
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:title" content="${page.title}" />
    <meta property="og:description" content="${page.description}" />
    <meta property="og:image" content="https://crittrcove.com/og-image.jpg" />

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:url" content="${canonicalUrl}" />
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
      "url": "${canonicalUrl}",
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
    <div id="root">${buildStaticBodyHTMLFor(page)}</div>
    
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
        }(window.location));
        // Note: We intentionally do not clear #root so the static content remains
    </script>
    
    <!-- Load React app scripts (progressive enhancement) -->
    ${buildFiles.vendorJsFile ? `<script defer="defer" src="/static/js/${buildFiles.vendorJsFile}"></script>` : ''}
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
  
  // Ensure robots.txt exists
  const robotsPath = path.join(buildPath, 'robots.txt');
  if (!fs.existsSync(robotsPath)) {
    const robotsContent = [
      'User-agent: *',
      'Disallow:',
      'Sitemap: https://crittrcove.com/sitemap.xml',
      ''
    ].join('\n');
    fs.writeFileSync(robotsPath, robotsContent);
    console.log('🤖 Wrote robots.txt');
  }
  
  // Get current build file names
  const buildFiles = getCurrentBuildFiles();
  console.log(`📁 Using build files: JS=${buildFiles.mainJsFile}${buildFiles.vendorJsFile ? `, Vendor=${buildFiles.vendorJsFile}` : ''}, CSS=${buildFiles.mainCssFile}`);
  
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
