# SEO Landing Pages

This directory contains search-engine-optimized landing pages designed to compete in the pet services market, specifically targeting the Colorado Springs area and exotic pet niches.

## 📁 Structure

```
src/screens/seo/
├── README.md                           # This documentation
├── index.js                           # Export all landing pages
├── DogBoardingColoradoSprings.js      # /dog-boarding-colorado-springs
├── DogWalkerColoradoSprings.js        # /dog-walker-colorado-springs  
├── CatSittingColoradoSprings.js       # /cat-sitting-colorado-springs
├── ExoticPetCareColoradoSprings.js    # /exotic-pet-care-colorado-springs (fully developed example)
├── FerretSitterColoradoSprings.js     # /ferret-sitter-colorado-springs
├── BirdBoardingColoradoSprings.js     # /bird-boarding-colorado-springs
├── HorseSittingColorado.js            # /horse-sitting-colorado
├── ReptileSitterColoradoSprings.js    # /reptile-sitter-colorado-springs
├── PetBoardingColoradoSprings.js      # /pet-boarding-colorado-springs
└── DogSittingColoradoSprings.js       # /dog-sitting-colorado-springs
```

## 🎯 SEO Strategy

### Target Keywords
Each landing page targets specific high-value keywords:
- **Primary**: Service + Location (e.g., "dog boarding colorado springs")
- **Secondary**: Variations and related terms (e.g., "pet boarding", "overnight dog care")
- **Long-tail**: Specific questions and needs (e.g., "exotic pet care reptiles colorado springs")

### Content Structure
All landing pages follow a consistent, SEO-optimized structure:

1. **H1 Header**: Primary keyword phrase
2. **Intro Section**: 2-3 sentences with keyword variations  
3. **Why CrittrCove Section**: Value propositions with keyword integration
4. **FAQ Section**: Answers common search queries
5. **Internal Links**: Cross-linking to related services
6. **CTA Section**: Conversion-focused calls-to-action

## 🔧 Technical Implementation

### SEO Utilities (`src/utils/seoUtils.js`)
- **`useSEO()`**: Hook for setting page title, meta description, and Open Graph tags
- **`addStructuredData()`**: Adds JSON-LD structured data for search engines
- **`seoConfigs`**: Predefined SEO configurations for each landing page

### Template System (`src/components/SEOLandingPageTemplate.js`)
Reusable template component that provides:
- Consistent semantic HTML structure using React Native Web
- Accessibility attributes (`accessibilityRole`, `accessibilityLevel`)
- Responsive design for web and mobile
- SEO meta tag management
- Structured data integration

## 🚀 Adding New Landing Pages

To add a new SEO landing page:

1. **Create the component**:
```javascript
// src/screens/seo/NewServiceLocation.js
import React from 'react';
import { View, Text, Platform } from 'react-native';
import SEOLandingPageTemplate from '../../components/SEOLandingPageTemplate';
import { seoConfigs } from '../../utils/seoUtils';

const NewServiceLocation = () => {
  // Define content sections...
  
  return (
    <SEOLandingPageTemplate
      seoConfig={seoConfigs.newService}
      mainHeading="Your Main Heading"
      introContent={introContent}
      whyCrittrCoveContent={whyCrittrCoveContent}
      faqItems={faqItems}
      internalLinks={internalLinks}
    />
  );
};

export default NewServiceLocation;
```

2. **Add SEO config** to `src/utils/seoUtils.js`:
```javascript
newService: {
  title: "Service Name Location | CrittrCove",
  description: "Description under 160 characters...", 
  keywords: "keyword1, keyword2, keyword3"
}
```

3. **Register in App.js**:
   - Import the component
   - Add to `screens` array
   - Add URL mapping in `createLinking` config

4. **Update exports** in `src/screens/seo/index.js`

## 📊 SEO Features

### Meta Tags
- **Title**: Optimized for search engines and click-through rates
- **Description**: Compelling 150-160 character descriptions
- **Keywords**: Targeted keyword phrases
- **Open Graph**: Social media sharing optimization
- **Robots**: `index, follow` for search engine crawling

### Structured Data
JSON-LD markup for:
- Local Business information
- Service offerings
- Location data
- Contact information

### Internal Linking
Each page links to 2-4 related services to:
- Distribute page authority
- Improve crawlability
- Increase session duration
- Support topic clustering

## 🎨 Styling and Design

### Responsive Design
- **Web**: Centered layout with max-width 1200px
- **Mobile**: Full-width with proper padding
- **Typography**: Hierarchical headings (H1, H2, H3)
- **Colors**: Consistent with theme.colors

### Performance
- **No Images**: Text-only for fast loading
- **Minimal Dependencies**: Basic React Native primitives only
- **Semantic HTML**: Proper accessibility roles for web

## 🔍 Content Guidelines

### Writing Style
- **Professional but approachable** tone
- **Local focus** with Colorado Springs references
- **Keyword integration** without stuffing
- **Value-focused** messaging highlighting CrittrCove benefits

### FAQ Strategy
Each page includes 3-4 FAQs targeting:
- **Pricing questions**: "How much does X cost?"
- **Service details**: "What's included in X service?"
- **Local relevance**: "Do you serve Y area?"
- **Unique value**: "Why choose CrittrCove?"

## 📈 Analytics and Monitoring

### Recommended Tracking
- **Google Analytics**: Page views, bounce rate, conversion tracking
- **Google Search Console**: Search performance, indexing status
- **Core Web Vitals**: Page speed and user experience metrics

### Success Metrics
- **Organic traffic** to landing pages
- **Keyword rankings** for target phrases
- **Conversion rate** from landing page to signup
- **Internal link clicks** and user flow

## 🛠 Maintenance

### Regular Updates
- **Content refresh**: Update pricing, service areas, FAQ answers
- **Keyword monitoring**: Track rankings and adjust content
- **Internal links**: Update as new pages are added
- **Technical SEO**: Monitor for crawl errors and performance issues

### A/B Testing Opportunities
- **Headlines**: Test different H1 variations
- **CTAs**: Test button text and placement
- **Content length**: Test expanded vs. concise descriptions
- **FAQ selection**: Test different question sets

## 🎯 Competitive Advantage

These landing pages are designed to compete with established players like Rover by:

1. **Exotic Pet Focus**: Targeting underserved niches (reptiles, birds, ferrets)
2. **Local Optimization**: Colorado Springs-specific content and references  
3. **Zero Fees**: Highlighting beta pricing advantage
4. **Professional Network**: Emphasizing vetted, experienced sitters
5. **Comprehensive Coverage**: Multiple service types and pet categories

## 📞 Support

For questions about the SEO landing pages system:
- Review the fully developed example: `ExoticPetCareColoradoSprings.js`
- Check the template component: `SEOLandingPageTemplate.js`
- Reference the SEO utilities: `seoUtils.js` 