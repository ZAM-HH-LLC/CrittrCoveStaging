# SiteMap Component

## Overview

The SiteMap component provides a comprehensive sitemap page for the CrittrCove application, accessible at `/site-map`. It displays all available pages in an organized, user-friendly format that's both crawlable by search engines and navigable by users.

## Features

### Dual Navigation Support
- **Direct Web Links**: Uses `window.location.href` for optimal SEO and direct web access
- **App Navigation Links**: Uses React Navigation for optimal app performance

### Comprehensive Page Coverage
- **Main Pages**: Core functionality pages (Home, Sign In, Sign Up, etc.)
- **SEO Landing Pages**: Specialized service pages for different pet types
- **Blog Content**: Blog main page and individual blog posts

### Accessibility Features
- Semantic HTML structure
- Proper accessibility labels and roles
- Screen reader friendly navigation
- Keyboard navigation support

### SEO Optimized
- Clean, fast-loading design
- Proper heading hierarchy (H1, H2)
- Descriptive link text
- Mobile-responsive layout

## Page Structure

### Main Pages (7 pages)
- Home (`/`)
- Sign In (`/signin`)
- Sign Up (`/signup`)
- Search Professionals (`/SearchProfessionalsListing`)
- Contact Us (`/contact-us`)
- Privacy Policy (`/privacy-policy`)
- Terms of Service (`/terms-of-service`)

### SEO Landing Pages (10 pages)
- Dog Boarding Colorado Springs (`/dog-boarding-colorado-springs`)
- Dog Walker Colorado Springs (`/dog-walker-colorado-springs`)
- Dog Sitting Colorado Springs (`/dog-sitting-colorado-springs`)
- Cat Sitting Colorado Springs (`/cat-sitting-colorado-springs`)
- Pet Boarding Colorado Springs (`/pet-boarding-colorado-springs`)
- Exotic Pet Care Colorado Springs (`/exotic-pet-care-colorado-springs`)
- Ferret Sitter Colorado Springs (`/ferret-sitter-colorado-springs`)
- Reptile Sitter Colorado Springs (`/reptile-sitter-colorado-springs`)
- Bird Boarding Colorado Springs (`/bird-boarding-colorado-springs`)
- Horse Sitting Colorado (`/horse-sitting-colorado`)

### Blog Content (4 pages)
- Blog (`/blog`)
- Blog Post 1 (`/blog-post?postId=blog_1`)
- Blog Post 2 (`/blog-post?postId=blog_2`)
- Blog Post 3 (`/blog-post?postId=blog_3`)

## Implementation Details

### React Navigation Integration
- Added to App.js screens array
- Configured in linking config with route `/site-map`
- Added to webpack configuration for proper routing

### Static HTML Version
- Created `web/site-map.html` for direct web access
- Optimized for search engines
- Includes all 21 pages with proper styling
- Accessible at `/site-map.html`

### Sitemap XML Updates
- Added `/site-map` and `/site-map.html` to `web/sitemap.xml`
- Proper priority and change frequency settings
- Updated lastmod dates

### Footer Integration
- Added "Site Map" link to footer component
- Provides easy access for users

## Technical Specifications

### Component Structure
```javascript
SiteMap
├── Header (Title + Description)
├── Direct Web Links Section (Web only)
├── App Navigation Links Section
└── Footer (Stats + Last Updated)
```

### Styling
- Uses theme colors for consistency
- Responsive design for mobile/desktop
- Clean, minimal styling for fast loading
- Hover effects for better UX

### Navigation Methods
1. **Web Links**: Direct URL navigation for SEO
2. **App Links**: React Navigation for app performance
3. **Footer Link**: Easy access from site footer

## Testing

A comprehensive test suite is included in `__tests__/SiteMap.test.js` that verifies:
- Component rendering
- All page links are present
- Section titles display correctly
- Path information is shown
- Total page count is accurate

## Usage

### For Users
- Navigate to `/site-map` in the app
- Click any link to visit the corresponding page
- Use footer link for quick access

### For Search Engines
- Crawl `/site-map` for React app version
- Crawl `/site-map.html` for static HTML version
- Both versions are included in sitemap.xml

### For Developers
- Component is self-contained and reusable
- Easy to add new pages by updating the `pages` array
- Follows React Navigation patterns
- Maintains accessibility standards

## Maintenance

### Adding New Pages
1. Add to `pages` array in SiteMap.js
2. Update static HTML version
3. Add to sitemap.xml
4. Update tests if needed

### Updating Links
- Modify `pages` array in SiteMap.js
- Update both React and static HTML versions
- Test navigation functionality

## Performance Considerations

- Minimal styling for fast loading
- No images or heavy assets
- Efficient React Navigation integration
- Static HTML version for direct web access
- Proper caching headers recommended

## SEO Benefits

- Improves site crawlability
- Provides clear site structure
- Helps search engines discover all pages
- Supports internal linking strategy
- Enhances user navigation experience 