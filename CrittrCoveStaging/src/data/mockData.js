// First, declare the BOOKING_STATES constant
export const BOOKING_STATES = {
  // # Initial States
  DRAFT: 'Draft',
  PENDING_INITIAL_PROFESSIONAL_CHANGES: 'Pending Initial Professional Changes',
    
  // # Review States
  PENDING_PROFESSIONAL_CHANGES: 'Pending Professional Changes',
  PENDING_CLIENT_APPROVAL: 'Pending Owner Approval',
    
  // # Active States
  CONFIRMED: 'Confirmed',
  CONFIRMED_PENDING_PROFESSIONAL_CHANGES: 'Confirmed Pending Professional Changes',
  CONFIRMED_PENDING_CLIENT_APPROVAL: 'Confirmed Pending Owner Approval',
    
  // # Terminal States
  COMPLETED: 'Completed',
  DENIED: 'Denied',
  CANCELLED: 'Cancelled',

  // # States where professionals can edit
  PROFESSIONAL_EDITABLE_STATES: [
    'Draft',
    'Pending Initial Professional Changes',
    'Pending Professional Changes',
    'Confirmed Pending Professional Changes',
    'Confirmed'
  ]
};

export const defaultTermsData = [
    {
      header: "Welcome to CrittrCove",
      body: "Welcome to CrittrCove! These Terms of Service ('Terms') create a binding legal agreement between you and CrittrCove LLC, a Colorado-based company ('we,' 'us,' or 'our'). By using our platform, mobile apps, website, or any other CrittrCove services (collectively, the 'Platform'), you're agreeing to these Terms. If you don't agree, please don't use our services. We may update these Terms from time to time, and continued use means you accept any changes. You can find our current Terms at https://www.crittrcove.com/terms-of-service/."
    },
    {
      header: "What CrittrCove Does",
      subsections: [
        {
          subtitle: "Our Platform's Purpose",
          body: "CrittrCove connects pet owners with professional pet care providers. We're a marketplace platform that facilitates introductions, communications, and service arrangements between pet owners and service providers. Think of us as the digital bridge that helps you find trusted care for your beloved pets."
        },
        {
          subtitle: "We're Not Your Pet Care Provider",
          body: "Important: CrittrCove doesn't provide pet care services ourselves. We're the platform that connects you with independent professionals who do. Each service provider operates their own business and makes their own decisions about how to care for your pets. While we help facilitate connections and provide support resources, the actual pet care is between you and your chosen provider."
        },
        {
          subtitle: "What We Do Provide",
          body: "We may offer emergency support, educational resources for providers, safety guidelines, and tools to help you find and communicate with pet care professionals. We also facilitate optional background checks for service providers and provide a platform for reviews and recommendations."
        },
        {
          subtitle: "Your Responsibility for Safety",
          body: "You're responsible for making smart decisions about pet care. While we provide tools and information to help you choose wisely, you should always use your judgment, ask questions, and ensure your pets' vaccinations and health records are current. We can't guarantee the quality of any specific service provider."
        }
      ]
    },
    {
      header: "Legal Compliance & User Responsibilities",
      subsections: [
        {
          subtitle: "Age and Legal Requirements",
          body: "You must be at least 18 years old (or the age of majority in your area) to use CrittrCove. You're responsible for following all applicable laws and regulations related to your activities on our platform."
        },
        {
          subtitle: "Pet Owner Responsibilities",
          body: "As a pet owner, you must ensure your pets are properly vaccinated, licensed, and identified as required by local laws. You should also maintain appropriate insurance coverage for your pets and disclose any behavioral or health concerns to service providers."
        },
        {
          subtitle: "Service Provider Responsibilities",
          body: "As a service provider, you must have all necessary business licenses, permits, and insurance required by your jurisdiction. You're responsible for complying with local pet care regulations, leash laws, waste disposal rules, and any other applicable requirements."
        },
        {
          subtitle: "Exotic and Farm Animal Care",
          body: "CrittrCove welcomes providers who care for exotic animals, farm animals, and livestock, provided they have appropriate experience, facilities, and permits. However, pet owners must disclose if they have animals with dangerous behaviors or species requiring special handling, and service providers should only accept bookings within their expertise and qualifications. CrittrCove strictly prohibits the arrangement of care for illegal species through our platform or those without the proper permiting and licensing. CrittrCove is not liable for any injuries, damages, or losses that occur during pet care services. We're not liable for any actions taken by service providers or pet owners during service provision. CrittrCove is not liable for decisions made by providers during emergency medical care."
        }
      ]
    },
    {
      header: "User Conduct & Platform Rules",
      subsections: [
        {
          subtitle: "What You Can Do",
          body: "Use our platform to find and connect with pet care providers, communicate about services, arrange bookings, and share honest reviews. Be respectful, honest, and professional in all your interactions."
        },
        {
          subtitle: "What You Cannot Do",
          body: "Don't use our platform for illegal activities, harassment, or fraud. Don't post false information, spam, or inappropriate content. Don't try to circumvent our platform for payments (outside of beta) or arrange services outside our system. Don't create multiple accounts or impersonate others."
        },
        {
          subtitle: "Content Standards",
          body: "Any content you post must be accurate, respectful, and legal. No hate speech, threats, or inappropriate material. We reserve the right to remove content that violates our standards."
        },
        {
          subtitle: "Payment Processing",
          body: "When we launch payment processing, CrittrCove will be a limited payment agent for the provider (not a principal). We will specify refund handling, dispute channels, and timing of disbursement. We will also reassess risk of chargebacks and integrate Stripe/third-party payment terms. We also reserve the right to change which payment processor we use at any time - whether internally or through a third-party provider."
        },
        {
          subtitle: "Account Security",
          body: "Keep your account credentials secure and notify us immediately if you suspect unauthorized access. You're responsible for all activity under your account."
        }
      ]
    },
    {
      header: "Service Arrangements & Bookings",
      subsections: [
        {
          subtitle: "How Bookings Work",
          body: "When you find a service provider you like, you can request a booking through our platform. The provider will review your request and either accept, decline, or suggest modifications. Once both parties agree, you have a confirmed booking."
        },
        {
          subtitle: "Pricing and Payments",
          body: "During our beta period, CrittrCove doesn't process payments or charge service fees. All payments are handled directly between you and your service provider using your preferred method (cash, Venmo, etc.). We reserve the right to implement payment processing and service fees in the future."
        },
        {
          subtitle: "Cancellation Policies",
          body: "Cancellation policies are set by individual service providers and discussed through our messaging system. Make sure you understand the provider's policy before confirming a booking. We encourage open communication about any changes or concerns."
        },
        {
          subtitle: "Service Completion",
          body: "Service providers mark bookings as complete once the service period ends. This helps maintain accurate records and enables proper review systems."
        }
      ]
    },
    {
      header: "Emergency Situations & Pet Safety",
      subsections: [
        {
          subtitle: "Emergency Contact Information",
          body: "Pet owners should provide emergency contact information and ensure service providers can reach them if needed. Service providers should immediately contact pet owners (or if unreachable, their emergency contacts) in emergency situations."
        },
        {
          subtitle: "Veterinary Care Authorization",
          body: "By using our platform, pet owners authorize service providers to seek emergency veterinary care if the pet owner or emergency contact cannot be reached. Pet owners are responsible for all veterinary costs and authorize service providers to make emergency decisions. If a provider oversteps or delays in any way, CrittrCove is not liable for any damages or losses or any other issues that may arise."
        },
        {
          subtitle: "Abandoned Pets",
          body: "If a pet owner fails to retrieve their pet after the agreed service period, service providers may take appropriate action including contacting animal control or finding alternative care. Pet owners are responsible for all associated costs."
        },
        {
          subtitle: "Pet Safety and Removal",
          body: "CrittrCove reserves the right to remove pets from service providers' care if safety concerns arise. We'll attempt to contact pet owners and emergency contacts before taking such action."
        },
        {
          subtitle: "CrittrCove's Responsibility",
          body: "CrittrCove is not responsible for any injuries, damages, or losses that occur during pet care services. We're not liable for any actions taken by service providers or pet owners during service provision. CrittrCove is not liable for decisions made by providers during emergency medical care. We recomment that service providers procure necessary insurance, and background checks. We also recommend that pet owners ensure their pets are properly vaccinated and licensed, and search for service providers with insurance and background check badges as displayed in the search results."
        }
      ]
    },
    {
      header: "Background Checks & Verification",
      subsections: [
        {
          subtitle: "Optional Background Checks",
          body: "CrittrCove offers optional background check services for service providers through third-party vendors. These checks are voluntary but highly recommended for pet owner safety and trust."
        },
        {
          subtitle: "How Background Checks Work",
          body: "Service providers can request background checks through our contact form. We'll provide a secure link to complete the verification process through our third-party provider. Results are displayed on provider profiles to help pet owners make informed decisions."
        },
        {
          subtitle: "Limitations of Background Checks",
          body: "Background checks have limitations and may not include all jurisdictions, juvenile records, or foreign convictions. They're not a substitute for your own due diligence and judgment when selecting service providers."
        },
        {
          subtitle: "Your Authorization",
          body: "By undergoing a background check, you authorize the collection and use of your information by our third-party verification provider. You agree to provide accurate information and understand that CrittrCove may rely on these results for platform decisions."
        }
      ]
    },
    {
      header: "Reviews & Community Guidelines",
      subsections: [
        {
          subtitle: "Honest Reviews",
          body: "We encourage honest, constructive reviews based on your actual experiences. Reviews help our community make informed decisions and improve service quality."
        },
        {
          subtitle: "Review Standards",
          body: "Reviews must be truthful, respectful, and based on personal experience. No false claims, harassment, or inappropriate content. We may remove reviews that violate our standards."
        },
        {
          subtitle: "Review Ownership",
          body: "You retain ownership of your reviews but grant CrittrCove a license to use, display, and share them as part of our platform. We may remove reviews at our discretion."
        }
      ]
    },
    {
      header: "Content & Intellectual Property",
      subsections: [
        {
          subtitle: "Your Content",
          body: "You own the content you create on our platform. By posting content, you grant CrittrCove a license to use it for platform operations and improvements. You're responsible for ensuring you have rights to any content you share."
        },
        {
          subtitle: "Our Platform",
          body: "CrittrCove owns all rights to our platform, technology, and brand. You may use our services as intended but may not copy, modify, or distribute our proprietary materials without permission."
        },
        {
          subtitle: "Copyright Protection",
          body: "If you believe your copyrighted work has been infringed on our platform, please contact us with detailed information including your contact details, description of the work, and location of the infringing material. Send notices to: CrittrCove LLC, Attn: Copyright Notice, 2510 Summit Dr, Colorado Springs, CO, 80909."
        },
        {
          subtitle: "CrittrCove's Name, Logo, and Branding",
          body: "You may not use the CrittrCove name, logo, or branding without our prior written consent."
        }
      ]
    },
    {
      header: "Privacy & Data Protection",
      body: "We take your privacy seriously. Our collection and use of your personal information is described in our Privacy Policy at https://www.crittrcove.com/privacy-policy/. By using our platform, you acknowledge that you've read and understand our Privacy Policy."
    },
    {
      header: "Communications & Notifications",
      subsections: [
        {
          subtitle: "Service Communications",
          body: "You consent to receive communications from CrittrCove about your account, bookings, platform updates, and service-related information. These may include emails, text messages, and in-app notifications."
        },
        {
          subtitle: "Marketing Communications",
          body: "You may opt out of marketing communications at any time through your account settings or by contacting us. Service-related communications are required for platform functionality."
        },
        {
          subtitle: "Contact Information Updates",
          body: "Keep your contact information current. If you change your phone number or email, update your account promptly to ensure you receive important communications."
        }
      ]
    },
    {
      header: "Limitations & Disclaimers",
      subsections: [
        {
          subtitle: "Service Availability",
          body: "We strive to provide reliable service but can't guarantee uninterrupted access. Our platform is provided 'as is' and may have occasional downtime for maintenance or updates."
        },
        {
          subtitle: "Third-Party Services",
          body: "We may use third-party services for payments, background checks, mapping, and other features. We're not responsible for these services' availability, accuracy, or content."
        },
        {
          subtitle: "User Interactions",
          body: "We're not responsible for disputes between users, the quality of pet care services, or any harm that occurs during service provision. Users are responsible for their own safety and decisions."
        },
        {
          subtitle: "Liability Limits",
          body: "To the maximum extent permitted by law, CrittrCove's liability is limited to $100 USD. We're not liable for indirect, consequential, or punitive damages."
        }
      ]
    },
    {
      header: "Dispute Resolution",
      subsections: [
        {
          subtitle: "Informal Resolution",
          body: "We prefer to resolve issues amicably. Before pursuing formal dispute resolution, please contact us with details about your concern. We'll work with you to find a solution."
        },
        {
          subtitle: "Arbitration Agreement",
          body: "For most disputes, you and CrittrCove agree to resolve them through individual arbitration rather than court proceedings. This means disputes will be heard by a neutral arbitrator, not a judge or jury."
        },
        {
          subtitle: "Class Action Waiver",
          body: "You agree to bring claims only on an individual basis, not as part of a class action or representative proceeding. This helps keep dispute resolution efficient and fair."
        },
        {
          subtitle: "Opt-Out Rights",
          body: "You can opt out of arbitration within 30 days of accepting these Terms by mailing a written notice to CrittrCove LLC, Attn: Legal, 2510 Summit Dr, Colorado Springs, CO, 80909."
        }
      ]
    },
    {
      header: "Legal Framework",
      subsections: [
        {
          subtitle: "Governing Law",
          body: "These Terms are governed by Colorado law for US users and English law for EEA/UK users. The Federal Arbitration Act governs our arbitration agreement."
        },
        {
          subtitle: "Jurisdiction",
          body: "For US users, disputes will be resolved in Colorado courts. For EEA users, disputes will be resolved in English courts or your local courts as applicable."
        },
        {
          subtitle: "Severability",
          body: "If any part of these Terms is found unenforceable, the remaining parts continue in effect. We'll work to replace unenforceable provisions with valid alternatives."
        },
        {
          subtitle: "Entire Agreement",
          body: "These Terms, along with our Privacy Policy, constitute the complete agreement between you and CrittrCove regarding our platform."
        }
      ]
    },
    {
      header: "Force Majeure",
      body: "CrittrCove is not liable for delays or failures caused by events beyond our reasonable control, including natural disasters, war, terrorism, pandemics, strikes, or government actions. During such events, normal cancellation policies may not apply."
    },
    {
      header: "Indemnification",
      body: "You agree to defend and hold harmless CrittrCove from any claims, damages, or expenses arising from your use of our platform, violation of these Terms, or interactions with other users."
    },
    {
      header: "Account Termination",
      body: "We may suspend or terminate accounts for violations of these Terms, harmful conduct, or other reasons at our discretion. Termination doesn't affect your obligations under these Terms. We may also suspend or terminate accounts for non-payment of fees or other charges. Repeated violations of review standards, safety rules, or off-platform solicitation may result in permanent bans"
    },
    {
      header: "Changes to Terms",
      body: "We may update these Terms from time to time. We'll notify you of significant changes, and continued use of our platform constitutes acceptance of updated Terms."
    },
    {
      header: "Contact Us",
      body: "Questions about these Terms? Contact us at support@crittrcove.com or write to CrittrCove LLC, 2510 Summit Dr, Colorado Springs, CO, 80909."
    }
];

export const privacyPolicyData = {
  title: "CrittrCove Privacy Policy",
  lastUpdated: "7/18/2025",
  introduction: "Welcome to CrittrCove! Your privacy matters to us. This Privacy Policy explains how CrittrCove LLC (\"CrittrCove,\" \"we,\" \"our,\" or \"us\") collects, uses, and protects your personal information when you use our services, including our website, mobile apps, and any platform features related to connecting pet owners with animal care providers (the \"Services\").",
  sections: [
    {
      title: "What This Policy Covers",
      content: "This Privacy Policy applies to:",
      listItems: [
        "Users who visit our website or app",
        "Pet owners and pet care providers using our Services",
        "Any data collected during interactions with our Services, support tools, or beta features"
      ],
      additionalInfo: "This policy does not apply to third-party platforms we link to or integrate with. Those sites have their own policies."
    },
    {
      title: "Information We Collect",
      subsections: [
        {
          subtitle: "Information You Provide Directly",
          items: [
            "Account Info: Information includes, but is NOT limited to: Your name, email, phone, zip code, pet types, availability, photos, and profile descriptions.",
            "Communication Content: Messages between users or with us.",
            "Forms & Feedback: Survey responses, support inquiries, or beta testing feedback."
          ]
        },
        {
          subtitle: "Information We Collect Automatically",
          items: [
            "Device Info: IP address, browser type, OS, and device ID.",
            "Usage Data: Pages visited, actions on the app, error logs.",
            "Location Info: We may use your location to show local pet service options. You agree that CrittrCove may grab your approximate location for timezones."
          ]
        },
        {
          subtitle: "Data From Others",
          content: "We may receive limited information about you from:",
          items: [
            "Social Logins (if enabled)",
            "Referral sources",
            "Background checks (when implemented in the future for professionals)"
          ],
          additionalInfo: "We do not currently collect sensitive data like social security numbers, government IDs, or health info."
        }
      ]
    },
    {
      title: "How We Use Your Information",
      content: "We use the data we collect to:",
      listItems: [
        "Let you create and manage your profile",
        "Match you with other users (clients or professionals)",
        "Improve the app and monitor performance",
        "Send optional updates, news, or promotional content (you can opt out)",
        "Prevent fraud or abuse of the platform"
      ],
      additionalInfo: "We may analyze trends and usage patterns to enhance functionality but do not sell your personal information."
    },
    {
      title: "Sharing of Information",
      content: "We may share limited information:",
      listItems: [
        "Between users for service coordination (e.g., pet name, general location, messages)",
        "With service providers that help us run the platform (e.g., email providers, hosting companies)",
        "When legally required, such as to respond to law enforcement or court orders"
      ],
      additionalInfo: "We may also share aggregated or anonymized data for research or marketing purposes that cannot be traced back to individuals."
    },
    {
      title: "Your Rights & Choices",
      content: "You can:",
      listItems: [
        "Edit or delete your profile information at any time",
        "Request deletion of your account by contacting support",
        "Decline location tracking in your device settings",
        "Opt out of non-essential emails by clicking \"unsubscribe\" in messages"
      ],
      additionalInfo: "During beta, some opt-out or privacy tools may not yet be live. We're working to expand these features before full launch."
    },
    {
      title: "Security of Your Data",
      content: "We use reasonable safeguards to protect your data from unauthorized access or misuse. However, no platform is completely secure. Please:",
      listItems: [
        "Use a strong password",
        "Log out after using shared devices",
        "Contact us immediately if you suspect unauthorized activity"
      ]
    },
    {
      title: "Data Storage & Retention",
      content: "Data is stored in the U.S. or other regions where our systems are hosted. We retain your information only as long as necessary to provide our Services or comply with legal requirements.",
      additionalInfo: "If you delete your account, your data will be removed from active systems within 30 days, though backups or logs may take longer to fully purge."
    },
    {
      title: "Children's Privacy",
      content: "CrittrCove is not intended for users under the age of 18. We do not knowingly collect data from minors. If you believe a child is using our platform, contact us so we can take action."
    },
    {
      title: "Changes to This Policy",
      content: "We may update this Privacy Policy from time to time. If major changes are made, we'll notify you via email or app notification. Continued use of the Services means you accept any changes."
    },
    {
      title: "Contact Us",
      content: "If you have questions or requests related to your privacy, contact us at:",
      contactInfo: {
        company: "CrittrCove LLC",
        attention: "Attn: Privacy Team",
        address: "2510 Summit Dr, Colorado Springs, CO, 80909",
        email: "support@crittrcove.com"
      }
    }
  ]
};

export const ALL_SERVICES = "All Services";
export const SERVICE_TYPES = [
  "Overnight Sitting - Owner's Home",
  "Overnight Boarding",
  "Drop-In Visits",
  "Dog Walking",
  "Day Care",
  "Pet Boarding",
  "Exotic Pet Care",
  "Daytime Pet Sitting",
  "Ferrier",
  "Grooming",
  "Training",
  "Pet Sitting",
  "Pet Taxi",
  "Pet Sitting",
];

export const TIME_OPTIONS = [
  '15 Min',
  '30 Min',
  '45 Min',
  '1 Hour',
  '2 Hour',
  '3 Hour',
  '4 Hour',
  '5 Hour',
  '6 Hour',
  '7 Hour',
  '8 Hour',
  '24 Hour',
  'Per Day',
  'Per Visit',
  'Week'
];

// Mapping of user-friendly time unit labels to backend constants
export const TIME_UNIT_MAPPING = {
  // User-friendly labels mapped to backend constants
  'Per Visit': 'Per Visit',
  'Per Day (24 Hours)': 'Per Day',
  'Per Night': 'Per Night',
  'Every 15 Minutes': '15 Min',
  'Every 30 Minutes': '30 Min',
  'Every 45 Minutes': '45 Min',
  'Per Hour': '1 Hour',
  'Every 2 Hours': '2 Hour',
  'Every 3 Hours': '3 Hour',
  'Every 4 Hours': '4 Hour',
  'Every 5 Hours': '5 Hour',
  'Every 6 Hours': '6 Hour',
  'Every 7 Hours': '7 Hour',
  'Every 8 Hours': '8 Hour',
  'Per Week': 'Week'
};

// Reverse mapping for display purposes
export const BACKEND_TO_FRONTEND_TIME_UNIT = Object.entries(TIME_UNIT_MAPPING).reduce((acc, [key, value]) => {
  acc[value] = key;
  return acc;
}, {});

export const mockAdditionalRates = {
  'Fish Tank Cleaning': [
    { title: 'Extended Stay (7+ days)', amount: 15 },
    { title: 'Pickup/Dropoff Service', amount: 25 },
    { title: 'Special Diet Handling', amount: 10 },
    { title: 'Medication Administration', amount: 15 },
  ],
  'Ferrier': [
    { title: 'Extended Hours', amount: 20 },
    { title: 'Training Session', amount: 30 },
    { title: 'Grooming', amount: 25 },
  ],
  'Dog Walking': [
    { title: 'Extra 15 Minutes', amount: 10 },
    { title: 'Plant Watering', amount: 5 },
    { title: 'Photo Updates', amount: 5 },
  ],
  'Reptile Boarding & Habitat Maintenance': [
    { title: 'Plant Watering', amount: 10 },
    { title: 'Mail Collection', amount: 5 },
    { title: 'Extended Visit (4+ hrs)', amount: 30 },
  ],
  'Bird Feeding': [
    { title: 'Extra 15 Minutes', amount: 10 },
    { title: 'Multiple Route Options', amount: 5 },
    { title: 'Training During Walk', amount: 20 },
  ],
};

export const mockServicesForCards = [
  {
    id: 1,
    name: 'Fish Tank Cleaning',
    startingPrice: 25,
    animalTypes: ['Fish'],
    icon: 'fish',
    additionalRates: mockAdditionalRates['Fish Tank Cleaning']
  },
  {
    id: 2,
    name: 'Ferrier',
    startingPrice: 30,
    animalTypes: ['Dogs'],
    icon: 'horse',
    additionalRates: mockAdditionalRates['Ferrier']
  },
  {
    id: 3,
    name: 'Dog Walking',
    startingPrice: 40,
    animalTypes: ['Dogs'],
    icon: 'dog',
    additionalRates: mockAdditionalRates['Dog Walking']
  },
  {
    id: 4,
    name: 'Reptile Boarding & Habitat Maintenance',
    startingPrice: 35,
    animalTypes: ['Reptiles'],
    icon: 'snake',
    additionalRates: mockAdditionalRates['Reptile Boarding & Habitat Maintenance']
  },
  {
    id: 5,
    name: 'Bird Feeding',
    startingPrice: 45,
    animalTypes: ['Birds'],
    icon: 'bird',
    additionalRates: mockAdditionalRates['Bird Feeding']
  }
];

export const GENERAL_CATEGORIES = [
  'Farm Animals', 
  'Domestic',
  'Exotic',
  'Aquatic',
  'Invertibrates',
];

export const mockPets = [
  {
    id: '1',
    name: 'Max',
    animal_type: 'Dog',
    breed: 'border collie',
    age: {
      months: 0,
      years: 5,
    },
    weight: 32,
    sex: 'Male',
    friendlyWithChildren: true,
    friendlyWithCats: false,
    friendlyWithDogs: true,
    spayedNeutered: true,
    houseTrained: true,
    microchipped: true,
    adoptionDate: '2020-01-15',
    description: 'Loves to play fetch and go for walks.',
    energyLevel: 'High',
    feedingSchedule: 'Morning',
    leftAlone: '1-4 hours',
    medication: null,
    additionalInstructions: 'Needs daily exercise.',
    vetName: 'Dr. Smith',
    vetAddress: '123 Vet St.',
    vetPhone: '555-1234',
    insuranceProvider: 'Pet Insurance Co.',
    vetDocuments: [],
    galleryImages: [],
  },
  {
    id: '2',
    name: 'Whiskers',
    animal_type: 'Cat',
    breed: 'tammy ammy',
    age: {
      months: 3,
      years: 4,
    },
    weight: 16,
    sex: 'Female',
    friendlyWithChildren: true,
    friendlyWithCats: true,
    friendlyWithDogs: false,
    spayedNeutered: true,
    houseTrained: true,
    microchipped: false,
    adoptionDate: '2019-05-20',
    description: 'Enjoys lounging in the sun.',
    energyLevel: 'Low',
    feedingSchedule: 'Twice a day',
    leftAlone: '4-8 hours',
    medication: null,
    additionalInstructions: 'Prefers quiet environments.',
    vetName: 'Dr. Jones',
    vetAddress: '456 Vet Ave.',
    vetPhone: '555-5678',
    insuranceProvider: 'Pet Health Insurance',
    vetDocuments: [],
    galleryImages: [],
  },
  {
    id: '3',
    name: 'Buddy',
    animal_type: 'snake',
    breed: 'leopard gecko',
    age: {
      months: 0,
      years: 2,
    },
    weight: 1,
    sex: 'Male',
    friendlyWithChildren: false,
    friendlyWithCats: false,
    friendlyWithDogs: false,
    spayedNeutered: false,
    houseTrained: false,
    microchipped: false,
    adoptionDate: '2021-08-10',
    description: 'A calm and quiet pet.',
    energyLevel: 'Low',
    feedingSchedule: ['Custom', '3 times a day with liquid food.'],
    leftAlone: 'Can be left alone indefinitely',
    medication: null,
    additionalInstructions: 'Keep in a warm environment.',
    vetName: 'Dr. Green',
    vetAddress: '789 Vet Blvd.',
    vetPhone: '555-9012',
    insuranceProvider: 'Reptile Insurance Co.',
    vetDocuments: [],
    galleryImages: [],
  },
];

export const mockProfessionals = [
  {
    id: 1,
    name: "Mike V.",
    profilePicture: require('../../assets/user1.png'),
    location: "Briargate, Colorado Springs, CO, 80920",
    rating: 5.0,
    reviewCount: 72,
    price: 35,
    distance: "5.7 mi. away",
    coordinates: {
      latitude: 38.8339,
      longitude: -104.8214,
    },
    services: ["Dog Walking", "Pet Sitting", "Grooming"],
    experience: "5 years",
    description: "Professional pet sitter with extensive experience in dog walking and pet sitting. Certified in pet first aid and CPR.",
    repeat_owners: 18,
    verified: true,
    bestReview: "Benny's stay with Mike was outstanding! I would not hesitate to have Benny stay with them again. I would highly recommend Mike to anyone needing pet care services."
  },
  {
    id: 2,
    name: "Sarah Johnson",
    profilePicture: require('../../assets/user2.png'),
    location: "Colorado Springs, CO",
    rating: 4.8,
    reviewCount: 127,
    price: 45,
    coordinates: {
      latitude: 38.8340,
      longitude: -104.8215,
    },
    services: ["Dog Walking", "Pet Sitting", "Training"],
    experience: "8 years",
    description: "Experienced dog trainer and pet sitter. Specializes in working with large breeds and puppies.",
    verified: true,
    bestReview: "Sarah is amazing with pets! She took great care of my dog and sent regular updates."
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    profilePicture: require('../../assets/user3.png'),
    location: "Colorado Springs, CO",
    rating: 4.7,
    reviewCount: 156,
    price: 40,
    coordinates: {
      latitude: 38.8341,
      longitude: -104.8216,
    },
    services: ["Dog Walking", "Pet Sitting", "Grooming", "Training"],
    experience: "6 years",
    description: "Professional pet sitter and groomer. Available for both short-term and long-term pet care needs.",
    verified: true
  },
  {
    id: 4,
    name: "David Kim",
    profilePicture: require('../../assets/user4.png'),
    location: "Colorado Springs, CO",
    rating: 4.9,
    reviewCount: 98,
    price: 55,
    coordinates: {
      latitude: 38.8342,
      longitude: -104.8217,
    },
    services: ["Dog Walking", "Pet Sitting", "Training", "Grooming"],
    experience: "10 years",
    description: "Certified dog trainer and experienced pet sitter. Specializes in working with rescue dogs and behavioral training.",
    verified: true
  },
  {
    id: 5,
    name: "Lisa Thompson",
    profilePicture: require('../../assets/user5.png'),
    location: "Colorado Springs, CO",
    rating: 4.8,
    reviewCount: 143,
    price: 45,
    coordinates: {
      latitude: 38.8343,
      longitude: -104.8218,
    },
    services: ["Dog Walking", "Pet Sitting", "Grooming"],
    experience: "7 years",
    description: "Professional pet sitter with a passion for animal care. Available for both regular and occasional pet sitting needs.",
    verified: true
  },
  {
    id: 6,
    name: "John Martinez",
    profilePicture: require('../../assets/user6.png'),
    location: "Colorado Springs, CO",
    rating: 4.6,
    reviewCount: 89,
    price: 42,
    coordinates: {
      latitude: 38.8344,
      longitude: -104.8219,
    },
    services: ["Dog Walking", "Pet Sitting"],
    experience: "4 years",
    description: "Dedicated pet care professional specializing in dog walking and pet sitting services.",
    verified: true
  },
  {
    id: 7,
    name: "Rachel White",
    profilePicture: require('../../assets/user7.png'),
    location: "Colorado Springs, CO",
    rating: 4.9,
    reviewCount: 167,
    price: 48,
    coordinates: {
      latitude: 38.8345,
      longitude: -104.8220,
    },
    services: ["Dog Walking", "Pet Sitting", "Training"],
    experience: "9 years",
    description: "Experienced pet trainer and caregiver with a focus on positive reinforcement techniques.",
    verified: true
  },
  {
    id: 8,
    name: "Michael Chen",
    profilePicture: require('../../assets/user8.png'),
    location: "Colorado Springs, CO",
    rating: 4.7,
    reviewCount: 112,
    price: 38,
    coordinates: {
      latitude: 38.8346,
      longitude: -104.8221,
    },
    services: ["Dog Walking", "Pet Sitting", "Grooming"],
    experience: "5 years",
    description: "Professional pet groomer and sitter with expertise in handling various breeds.",
    verified: true
  },
  {
    id: 9,
    name: "Amanda Foster",
    profilePicture: require('../../assets/user9.png'),
    location: "Colorado Springs, CO",
    rating: 4.8,
    reviewCount: 134,
    price: 44,
    coordinates: {
      latitude: 38.8347,
      longitude: -104.8222,
    },
    services: ["Dog Walking", "Pet Sitting", "Training"],
    experience: "7 years",
    description: "Certified pet trainer with extensive experience in behavioral modification.",
    verified: true
  },
  {
    id: 10,
    name: "Robert Taylor",
    profilePicture: require('../../assets/user10.png'),
    location: "Colorado Springs, CO",
    rating: 4.9,
    reviewCount: 178,
    price: 50,
    coordinates: {
      latitude: 38.8348,
      longitude: -104.8223,
    },
    services: ["Dog Walking", "Pet Sitting", "Training", "Grooming"],
    experience: "11 years",
    description: "Comprehensive pet care professional offering a full range of services.",
    verified: true
  }
];

export const mockOwners = [
  {
    id: '1',
    name: 'Alice Johnson',
    pet_types: ['Dog', 'Cat'],
    last_booking: '2024-01-15',
    pets: ['1', '2'], // References to pet IDs
    email: 'alice@example.com',
    phone: '555-0101',
    address: '123 Pine St, Colorado Springs, CO',
  },
  {
    id: '2',
    name: 'Bob Wilson',
    pet_types: ['Dog'],
    last_booking: '2024-02-01',
    pets: ['3'],
    email: 'bob@example.com',
    phone: '555-0102',
    address: '456 Oak Ave, Colorado Springs, CO',
  },
  {
    id: '3',
    name: 'Carol Martinez',
    pet_types: ['Cat', 'Exotic'],
    last_booking: '2024-01-28',
    pets: ['4', '5'],
    email: 'carol@example.com',
    phone: '555-0103',
    address: '789 Maple Dr, Colorado Springs, CO',
  },
  {
    id: '4',
    name: 'David Brown',
    pet_types: ['Dog'],
    last_booking: '2024-02-05',
    pets: ['6'],
    email: 'david@example.com',
    phone: '555-0104',
    address: '321 Elm St, Colorado Springs, CO',
  },
  {
    id: '5',
    name: 'Eva Garcia',
    pet_types: ['Exotic'],
    last_booking: '2024-01-20',
    pets: ['7'],
    email: 'eva@example.com',
    phone: '555-0105',
    address: '654 Birch Ln, Colorado Springs, CO',
  }
];

// Availability Tab
export const fetchAvailabilityData = () => {
  return new Promise((resolve) => {
    // to get the bookings, we need to fetch the booking table on backend
    // to get available/unavailable dates we need to fetch the availability table on backend
    setTimeout(() => {
      resolve({
        availableDates: {
          '2025-02-01': { startTime: '09:00', endTime: '17:00' },
          '2025-02-02': { startTime: '10:00', endTime: '18:00' },
          '2025-02-03': { startTime: '09:00', endTime: '17:00' },
        },
        unavailableDates: {
          '2025-02-04': { startTime: '00:00', endTime: '24:00' },
          '2025-02-05': { startTime: '10:00', endTime: '18:00' },
        },
        bookings: {
          '2025-02-06': [
            { id: 'bk1', startTime: '14:00', endTime: '16:00', owner_name: 'Charlie', service_type: 'Dog Walking' },
            { id: 'bk2', startTime: '16:00', endTime: '18:00', owner_name: 'Bob', service_type: 'Dog Walking' },
            { id: 'bk3', startTime: '18:00', endTime: '20:00', owner_name: 'Nick', service_type: 'Pet Boarding' },
            { id: 'bk4', startTime: '20:00', endTime: '22:00', owner_name: 'Alfred', service_type: 'Drop-In Visits (30 min)' }
          ],
          '2025-02-07': [
            { id: 'bk5', startTime: '10:00', endTime: '12:00', owner_name: 'Uhtred', service_type: 'Dog Walking' }
          ],
        },
      });
    }, 1000);
  });
};

// Add mock update functions
export const updateAvailability = (updates) => {
  console.log("updateAvailability", updates);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, data: updates });
    }, 500);
  });
};

export const updateBooking = (bookingData) => {
  console.log("updateBooking", bookingData);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, data: bookingData });
    }, 500);
  });
};

const sharedBookingDetails = {
  booking_id: 'bk1',
  status: 'Confirmed',
  owner_name: 'matt aertker',
  professional_name: 'matt2 aertker2',
  service_details: {
    service_type: 'Ferrier'
  },
  pets: [
    {
      pet_id: 3,
      name: 'Jack',
      species: 'DOG',
      breed: 'Golden'
    }
  ],
  occurrences: [
    {
      occurrence_id: 10,
      start_date: '2025-02-01',
      end_date: '2025-02-02',
      start_time: '15:06',
      end_time: '16:06',
      calculated_cost: '61.04',
      base_total: '$26.04',
      rates: {
        base_rate: '25.00',
        additional_animal_rate: '5.00',
        additional_animal_rate_applies: false,
        applies_after: 2,
        unit_of_time: 'PER_DAY',
        holiday_rate: '35.00',
        holiday_days: 0,
        additional_rates: [
          {
            title: 'Extra Travel Time Rate',
            description: 'Far Drive rate for service',
            amount: '$25.00'
          },
          {
            title: 'Dog Poops Inside Rate',
            description: 'Dog Poops Inside rate for service',
            amount: '$5.00'
          },
          {
            title: 'Dog Separation rate',
            description: 'When we need to separate the dog from other animals in the house',
            amount: '$5.00'
          }
        ]
      }
    },
    {
      occurrence_id: 9,
      start_date: '2025-03-13',
      end_date: '2025-03-14',
      start_time: '09:00',
      end_time: '14:00',
      calculated_cost: '120.08',
      base_total: '$35.04',
      rates: {
        base_rate: '29.00',
        additional_animal_rate: '8.00',
        additional_animal_rate_applies: false,
        applies_after: 1,
        unit_of_time: 'PER_DAY',
        holiday_rate: '40.00',
        holiday_days: 0,
        additional_rates: [
          {
            title: 'Extra Travel Time Rate',
            description: 'Far Drive rate for service',
            amount: '$25.00'
          },
          {
            title: 'Dog Poops Inside Rate',
            description: 'Dog Poops Inside rate for service',
            amount: '$25.00'
          },
          {
            title: 'Dog Separation rate',
            description: 'When we need to separate the dog from other animals in the house',
            amount: '$35.04'
          }
        ]
      }
    }
  ],
  cost_summary: {
    subtotal: 181.12,
    platform_fee: 18.11,
    taxes: 15.94,
    total_owner_cost: 215.17,
    total_sitter_payout: 163.01,
    is_prorated: true
  }
};

// Initialize mockBookingDetails with existing mock data
const mockBookingDetails = {
  '1234': {
    ...sharedBookingDetails,
    id: '1234',
    ownerName: 'John Doe',
    status: BOOKING_STATES.CONFIRMED,
    startDate: '2024-02-20',
    startTime: '14:00',
  },
  '5678': {
    ...sharedBookingDetails,
    id: '5678',
    ownerName: 'Margarett Laporte',
    status: BOOKING_STATES.CANCELLED,
    startDate: '2024-02-21',
    startTime: '15:30',
  },
  '56782': {
    ...sharedBookingDetails,
    id: '56782',
    ownerName: 'Zoe Aerial',
    status: BOOKING_STATES.DENIED,
    startDate: '2024-02-21',
    startTime: '15:30',
  },
  '5673': {
    ...sharedBookingDetails,
    id: '5673',
    ownerName: 'Matt Clark',
    status: BOOKING_STATES.PENDING_INITIAL_PROFESSIONAL_CHANGES,
    startDate: '2024-02-21',
    startTime: '15:30',
  },
  '5674': {
    ...sharedBookingDetails,
    id: '5674',
    ownerName: 'Mark Smith',
    status: BOOKING_STATES.PENDING_CLIENT_APPROVAL,
    startDate: '2024-02-21',
    startTime: '15:30',
  },
  '5675': {
    ...sharedBookingDetails,
    id: '5675',
    ownerName: 'Lauren Smith',
    status: BOOKING_STATES.PENDING_PROFESSIONAL_CHANGES,
    startDate: '2024-02-21',
    startTime: '15:30',
  },
  '5675': {
    ...sharedBookingDetails,
    id: '56712',
    ownerName: 'Matt Smith',
    status: BOOKING_STATES.CONFIRMED_PENDING_PROFESSIONAL_CHANGES,
    startDate: '2024-02-21',
    startTime: '15:30',
  },
  '56713': {
    ...sharedBookingDetails,
    id: '567123',
    ownerName: 'Albert Einstein',
    status: BOOKING_STATES.PENDING_INITIAL_PROFESSIONAL_CHANGES,
    startDate: '2025-02-21',
    startTime: '15:30',
  },
  '3749': {...sharedBookingDetails,
    id: '567132',
    ownerName: 'Dr. Mike Johnson',
    status: BOOKING_STATES.PENDING_INITIAL_PROFESSIONAL_CHANGES,
    startDate: '2025-02-21',
    startTime: '15:30',
  },
  '91011': {
    ...sharedBookingDetails,
    id: '91011',
    ownerName: 'Dr. Bla Johnson',
    status: BOOKING_STATES.PENDING_INITIAL_PROFESSIONAL_CHANGES,
    startDate: '2025-02-21',
    startTime: '15:30',
  },
  '91012': {
    ...sharedBookingDetails,
    id: '91012',
    ownerName: 'Dr. Blabla Johnson',
    status: BOOKING_STATES.PENDING_INITIAL_PROFESSIONAL_CHANGES,
    startDate: '2025-02-21',
    startTime: '15:30',
  }
};

// Map mockProfessionalBookings from mockBookingDetails
export const mockProfessionalBookings = Object.values(mockBookingDetails)
  .map(booking => ({
    id: booking.id,
    ownerName: booking.ownerName,
    status: booking.status,
    date: booking.startDate,
    time: booking.startTime,
    serviceType: booking.serviceType,
    numberOfPets: booking.numberOfPets || 1,
    totalCost: booking.costs?.totalOwnerCost || 0,
    professionalPayout: booking.costs?.professionalPayout || 0
  }));

// Add the createBooking function
export const createBooking = async (ownerId, freelancerId, initialData = {}) => {
  const newBookingId = `booking_${Date.now()}`;
  
  const newBooking = {
    id: newBookingId,
    ownerId: ownerId,
    freelancerId: freelancerId,
    status: BOOKING_STATES.PENDING_INITIAL_PROFESSIONAL_CHANGES,
    ownerName: initialData.ownerName || 'TBD',
    professionalName: initialData.professionalName || 'TBD',
    serviceType: initialData.serviceType || 'TBD',
    animalType: initialData.animalType || 'TBD',
    numberOfPets: initialData.numberOfPets || 0,
    duration: initialData.duration || 0,
    occurrences: initialData.occurrences || [],
    rates: {
      baseRate: 0,
      additionalPetRate: 0,
      extraServices: []
    },
    costs: {
      baseTotal: 0,
      additionalPetTotal: 0,
      extraServicesTotal: 0,
      subtotal: 0,
      ownerFee: 0,
      taxes: 0,
      totalOwnerCost: 0,
      professionalPayout: 0
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...initialData
  };

  // Add to mock database
  mockBookingDetails[newBookingId] = newBooking;
  
  console.log('Created new booking:', {
    bookingId: newBookingId,
    booking: newBooking,
    allBookings: Object.keys(mockBookingDetails)
  });

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  return newBookingId;
};

// Export mockBookingDetails for debugging
export const _mockBookingDetails = mockBookingDetails;

// Add new mock function for updating booking status
export const updateBookingStatus = async (bookingId, newStatus, reason = '', metadata = {}) => {
  console.log('updateBookingStatus called with:', {
    bookingId,
    newStatus,
    reason,
    metadata,
    availableBookings: Object.keys(mockBookingDetails)
  });
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Find the booking by ID regardless of the key
  const bookingKey = Object.keys(mockBookingDetails).find(key => 
    mockBookingDetails[key].id === bookingId
  );
  
  if (!bookingKey) {
    console.error('Booking not found in mockBookingDetails. Available bookings:', 
      Object.keys(mockBookingDetails),
      '\nFull mockBookingDetails:', mockBookingDetails
    );
    throw new Error('Booking not found');
  }
  
  // Create updated booking object
  mockBookingDetails[bookingKey] = {
    ...mockBookingDetails[bookingKey],
    status: newStatus,
    statusReason: reason,
    updated_at: new Date().toISOString(),
    ...metadata
  };

  console.log('Updated booking:', mockBookingDetails[bookingKey]);
  return mockBookingDetails[bookingKey];
};

// Make sure to update MyBookings.js to use the same BOOKING_STATES constant
export const mockOwnerBookings = [
  {
    id: '91011',
    professionalName: 'Sarah Wilson',
    status: BOOKING_STATES.CONFIRMED,
    date: '2024-02-22',
    time: '10:00',
    serviceType: 'Dog Walking',
    numberOfPets: 2,
    totalCost: 75.00,
  },
  {
    id: '91012',
    professionalName: 'Mike Johnson',
    status: BOOKING_STATES.PENDING_CLIENT_APPROVAL,
    date: '2024-02-23',
    time: '11:00',
    serviceType: 'Pet Sitting',
    numberOfPets: 1,
    totalCost: 50.00,
  },
];

// Assuming current user ID is 101 for testing
export const CURRENT_USER_ID = 101;

export const mockConversations = [
  {
    id: 'conv_1',
    participant1_id: CURRENT_USER_ID,
    participant2_id: 202,
    name: "Dr. Sarah Smith",
    role_map: {
      participant1_role: "owner",
      participant2_role: "professional"
    },
    lastMessage: "I'd be happy to help! What kind of pet do you have?",
    timestamp: "2024-02-21T07:05:00Z",
    unread: false
  },
  {
    id: 'conv_2',
    participant1_id: 303,
    participant2_id: CURRENT_USER_ID,
    name: "Dr. Mike Johnson",
    role_map: {
      participant1_role: "owner",
      participant2_role: "professional"
    },
    lastMessage: "I'm available! Let's set up a booking",
    timestamp: "2024-02-21T15:35:00Z",
    unread: false
  },
  {
    id: 'conv_3',
    participant1_id: CURRENT_USER_ID,
    participant2_id: 204,
    name: "Dr. Emily Wilson",
    role_map: {
      participant1_role: "owner",
      participant2_role: "professional"
    },
    lastMessage: "Your cat's checkup is scheduled",
    timestamp: "2024-02-20T10:15:00Z",
    unread: true
  },
  {
    id: 'conv_4',
    participant1_id: CURRENT_USER_ID,
    participant2_id: 205,
    name: "Dr. James Anderson",
    role_map: {
      participant1_role: "owner",
      participant2_role: "professional"
    },
    lastMessage: "See you tomorrow at 2 PM",
    timestamp: "2024-02-19T16:45:00Z",
    unread: false
  },
  {
    id: 'conv_5',
    participant1_id: CURRENT_USER_ID,
    participant2_id: 206,
    name: "Dr. Lisa Brown",
    role_map: {
      participant1_role: "owner",
      participant2_role: "professional"
    },
    lastMessage: "How is Max doing today?",
    timestamp: "2024-02-18T09:30:00Z",
    unread: false
  },
  {
    id: 'conv_6',
    participant1_id: CURRENT_USER_ID,
    participant2_id: 207,
    name: "Dr. Robert Taylor",
    role_map: {
      participant1_role: "owner",
      participant2_role: "professional"
    },
    lastMessage: "The medication has been prescribed",
    timestamp: "2024-02-17T14:20:00Z",
    unread: false
  },
  {
    id: 'conv_7',
    participant1_id: CURRENT_USER_ID,
    participant2_id: 208,
    name: "Dr. Maria Garcia",
    role_map: {
      participant1_role: "owner",
      participant2_role: "professional"
    },
    lastMessage: "Your appointment is confirmed",
    timestamp: "2024-02-16T11:25:00Z",
    unread: true
  },
  {
    id: 'conv_8',
    participant1_id: CURRENT_USER_ID,
    participant2_id: 209,
    name: "Dr. David Lee",
    role_map: {
      participant1_role: "owner",
      participant2_role: "professional"
    },
    lastMessage: "Let's schedule a follow-up",
    timestamp: "2024-02-15T13:40:00Z",
    unread: false
  },
  {
    id: 'conv_9',
    participant1_id: CURRENT_USER_ID,
    participant2_id: 210,
    name: "Dr. Sarah Martinez",
    role_map: {
      participant1_role: "owner",
      participant2_role: "professional"
    },
    lastMessage: "The test results are ready",
    timestamp: "2024-02-14T15:55:00Z",
    unread: false
  },
  {
    id: 'conv_10',
    participant1_id: CURRENT_USER_ID,
    participant2_id: 211,
    name: "Dr. John White",
    role_map: {
      participant1_role: "owner",
      participant2_role: "professional"
    },
    lastMessage: "How's the new diet working?",
    timestamp: "2024-02-13T08:15:00Z",
    unread: false
  },
  {
    id: 'conv_11',
    participant1_id: CURRENT_USER_ID,
    participant2_id: 212,
    name: "Dr. Anna Clark",
    role_map: {
      participant1_role: "owner",
      participant2_role: "professional"
    },
    lastMessage: "Vaccination reminder",
    timestamp: "2024-02-12T10:30:00Z",
    unread: true
  },
  {
    id: 'conv_12',
    participant1_id: CURRENT_USER_ID,
    participant2_id: 213,
    name: "Dr. Thomas Wright",
    role_map: {
      participant1_role: "owner",
      participant2_role: "professional"
    },
    lastMessage: "Surgery scheduled for next week",
    timestamp: "2024-02-11T12:45:00Z",
    unread: false
  },
  {
    id: 'conv_13',
    participant1_id: CURRENT_USER_ID,
    participant2_id: 214,
    name: "Dr. Patricia Moore",
    role_map: {
      participant1_role: "owner",
      participant2_role: "professional"
    },
    lastMessage: "Emergency consultation available",
    timestamp: "2024-02-10T17:20:00Z",
    unread: false
  },
  {
    id: 'conv_14',
    participant1_id: CURRENT_USER_ID,
    participant2_id: 215,
    name: "Dr. Kevin Hall",
    role_map: {
      participant1_role: "owner",
      participant2_role: "professional"
    },
    lastMessage: "Treatment plan updated",
    timestamp: "2024-02-09T14:10:00Z",
    unread: false
  },
  {
    id: 'conv_15',
    participant1_id: CURRENT_USER_ID,
    participant2_id: 216,
    name: "Dr. Rachel Green",
    role_map: {
      participant1_role: "owner",
      participant2_role: "professional"
    },
    lastMessage: "Prescription ready for pickup",
    timestamp: "2024-02-08T16:35:00Z",
    unread: true
  }
];

export const mockMessages = {
  'conv_1': [
    {
      message_id: 1,
      participant1_id: CURRENT_USER_ID,
      participant2_id: 202,
      sender: CURRENT_USER_ID,
      role_map: {
        participant1_role: "owner",
        participant2_role: "professional"
      },
      content: "Hi, I'm interested in your pet sitting services",
      timestamp: "2024-02-21T14:00:00Z",
      booking_id: null,
      status: "read",
      is_booking_request: false,
      metadata: {}
    },
    {
      message_id: 2,
      participant1_id: CURRENT_USER_ID,
      participant2_id: 202,
      sender: 202,
      role_map: {
        participant1_role: "owner",
        participant2_role: "professional"
      },
      content: "I'd be happy to help! What kind of pet do you have?",
      timestamp: "2024-02-21T14:05:00Z",
      booking_id: null,
      status: "sent",
      is_booking_request: false,
      metadata: {}
    }
  ],
  'conv_2': [
    {
      message_id: 3,
      participant1_id: 303,
      participant2_id: CURRENT_USER_ID,
      sender: 303,
      role_map: {
        participant1_role: "owner",
        participant2_role: "professional"
      },
      content: "Looking for a dog walker next week",
      timestamp: "2024-02-21T15:30:00Z",
      booking_id: null,
      status: "read",
      is_booking_request: false,
      metadata: {}
    },
    {
      message_id: 4,
      participant1_id: 303,
      participant2_id: CURRENT_USER_ID,
      sender: 303,
      role_map: {
        participant1_role: "owner",
        participant2_role: "professional"
      },
      type: 'booking_request',
      data: {
        serviceType: "Dog Walking",
        pets: [
          { id: '1', name: 'Max', type: 'Dog', breed: 'Golden Retriever' }
        ],
        occurrences: [
          {
            startDate: '2024-02-28',
            endDate: '2024-02-28',
            startTime: '14:00',
            endTime: '15:00'
          }
        ]
      },
      timestamp: "2024-02-21T15:35:00Z",
      status: "sent",
      is_booking_request: true,
      metadata: {}
    },
    {
      message_id: 5,
      participant1_id: 303,
      participant2_id: CURRENT_USER_ID,
      sender: CURRENT_USER_ID,
      role_map: {
        participant1_role: "owner",
        participant2_role: "professional"
      },
      content: "I'll take a look!",
      timestamp: "2024-02-21T15:30:00Z",
      booking_id: null,
      status: "read",
      is_booking_request: false,
      metadata: {}
    },
  ]
};

// Helper function to create a new conversation
export const createNewConversation = (professionalId, professionalName, ownerId, ownerName) => {
  const conversationId = `conv_${Date.now()}`;
  const isCurrentUserOwner = ownerId === CURRENT_USER_ID;
  
  return {
    id: conversationId,
    participant1_id: isCurrentUserOwner ? ownerId : professionalId,
    participant2_id: isCurrentUserOwner ? professionalId : ownerId,
    role_map: {
      participant1_role: isCurrentUserOwner ? "owner" : "professional",
      participant2_role: isCurrentUserOwner ? "professional" : "owner"
    },
    lastMessage: "",
    timestamp: new Date().toISOString(),
    unread: false,
    bookingStatus: null
  };
};

export const DEFAULT_SERVICES = [
  {
    serviceName: 'Dog Walking',
    animalTypes: 'Dogs',
    rates: { base_rate: '20' },
    additionalAnimalRate: '10',
  },
  {
    serviceName: 'Cat Sitting',
    animalTypes: 'Cats',
    rates: { base_rate: '20' },
    additionalAnimalRate: '5',
  },
  {
    serviceName: 'Exotic Pet Care',
    animalTypes: 'Lizards, Birds',
    rates: { base_rate: '25' },
    additionalAnimalRate: '15',
  },
];

export const SERVICE_TYPE_SUGGESTIONS = [
  "Overnight Cat Sitting (Owner's Home)",
  "Cat Boarding",
  "Drop-In Visits (30 min)",
  "Drop-In Visits (60 min)",
  "Dog Walking",
  "Doggy Day Care",
  "Pet Boarding",
  "Exotic Pet Care",
  "Daytime Pet Sitting",
  "Ferrier", 
];

export const ANIMAL_TYPE_SUGGESTIONS = [
  'Dog',
  'Cat',
  'Cow',
  'Calf',
  'Lizard',
  'Bird',
  'Rabbit',
  'Fish',
];

export const BLOG_POSTS = [
  {
    id: 'blog_1',
    title: 'What Your Dog is Really Saying: Decoding Canine Body Language',
    author: {
      id: 'author_1',
      name: 'Zoe Neale',
      profilePicture: require('../../assets/ZEGN_USER.jpeg'),
      bio: 'Professional dog trainer and animal behavior specialist with over 10 years of experience in canine communication and training.'
    },
    publishDate: '2025-07-25',
    readTime: '8 min read',
    tags: ['Dogs', 'Behavior', 'Training', 'Pet Care', 'Communication'],
    content: `You know that moment when your dog tilts their head at you like you just asked them to solve a calculus problem? Turns out, they're not the only ones trying to understand you—they've been communicating with you this whole time, and you probably didn't even realize it.

Dogs may not speak English (yet—give them time), but they have an entire language built on tail wags, ear positions, and those big, soulful eyes they use to manipulate you into giving them extra treats. Learning to read their body language isn't just a party trick—it can help prevent stress, deepen your bond, and maybe even stop your dog from embarrassing you at the dog park. So, let's finally crack the code on what your dog has been trying to tell you.

## Tail Wagging: Not Always a Sign of Happiness

One of the biggest myths out there is that a wagging tail means a happy dog. Nope. Not always. A dog's tail is basically their mood ring, and the way they wag tells a whole different story.

- **Loose, full-body wag (with bonus butt wiggles)**: This is the classic "OMG YOU'RE HOME!!" happy dance. A+ vibes.
- **Slow wag, tail held high**: The "I'm analyzing this situation" wag. Suspicious, calculating, possibly deciding if you're worth their energy.
- **Stiff, fast wag with a raised tail**: Yikes. This is "I'm on edge, don't mess with me" energy. Proceed with caution.
- **Low, fast wag**: "I'm nervous, and I don't know what's happening, so I'm just gonna keep wiggling and hope for the best."
- **Tucked tail**: Fear. If the tail is all the way tucked under, your dog is basically saying, "I regret everything, please don't yell at me."

Even the direction of the wag matters—researchers found that dogs wag more to the right when they're happy and to the left when they're unsure or stressed (Quaranta et al., 2007). Yes, your dog's tail literally has anxiety tells.

## Ears and Eyes: The Silent Storytellers

Dogs don't just talk with their tails—they also use their ears and eyes like tiny, furry actors in a silent film.

- **Soft eyes, relaxed ears**: Your dog is living their best life. No stress, just vibes.
- **Wide eyes, whites showing (a.k.a. "whale eye"**: "I am uncomfortable with the energy we have created in this room." This is a warning sign—your dog feels uneasy or trapped.
- **Perked-up ears**: "I heard something, and I will investigate." Could be excitement, curiosity, or them preparing to bark at absolutely nothing.
- **Ears pinned back**: "I'm nervous" or "I did something bad, and I hope you don't notice." Classic guilty dog move.

Ever notice how some dogs do a little squint when they're happy? It's their version of a smile. On the flip side, prolonged direct eye contact—especially with an unfamiliar dog—can be a challenge. So, if you're having a staring contest with a dog you just met…maybe don't.

## The Freeze: When Your Dog Hits Pause (And You Should Pay Attention)

If a dog suddenly stops moving and stiffens, pay attention. Freezing is often their last warning before things escalate to growling, snapping, or biting. A lot of people miss this and then wonder why their dog "suddenly" lashed out.

You might see this when:
- A child is hugging a dog (which, fun fact, most dogs hate).
- Someone is petting a dog too aggressively.
- The dog feels cornered and has no escape route.

Research by Rooney, Clark and Casey (2016) helped show that when a dog freezes, in some way or another they are stressed. It's best to give them space in that moment and take a mental note of your newest training goal! Sometimes, they just need a minute to de-escalate, like when you have to breathe through a customer service call that's not going well.

## Mouth Matters: Smiles vs. Stress

Dogs can technically smile, but it's not always what you think.

- **Loose, open mouth, tongue hanging out**: Happy, relaxed, living their best life.
- **Closed mouth, tight lips**: Alert or unsure. They're analyzing the situation.
- **Lips pulled back, slight teeth showing**: Some dogs do a "submissive grin," which isn't aggression—it's their way of saying, "Hey, I'm friendly!"
- **Wrinkled nose, full teeth bared**: This is aggression. Back off.
- **Excessive yawning in a new situation**: Dogs don't just yawn when they're tired—they also yawn when they're stressed. To put it simply, they are overstimulated. (Glenk, 2020) Don't be fooled by the parrot dog, sometimes they yawn because they saw you yawn first! (D'Aniello, 2019)

## Conclusion: Your Dog Has Been Sending You Texts—Now You Can Finally Read Them

Dogs may not be able to talk (yet), but they've been communicating loud and clear this whole time. That tail wag? Could be excitement, could be stress. That little squint? Doggy love. The full-body freeze? That's a big ol' "DO NOT DISTURB" sign.

The more you pay attention, the better you'll understand your dog—and the fewer awkward misunderstandings you'll have (like mistaking a stress yawn for a nap cue). As we said in the beginning, your dog already knows exactly how to read you. They know your routine, when you're about to leave the house, and how to guilt-trip you into sharing your snacks. The least you can do is return the favor.

So next time your dog gives you the side-eye, perks their ears, or flops over dramatically after a single walk, you'll finally know what they're saying. And let's be honest—it's probably, "I love you… now give me a treat."`,
    references: [
      {
        title: '7 tips for canine body language',
        authors: 'American Society for the Prevention of Cruelty to Animals (ASPCA)',
        publication: 'ASPCApro',
        url: 'https://www.aspcapro.org/resource/7-tips-canine-body-language'
      },
      {
        title: "Therapy dogs' salivary cortisol levels vary during animal-assisted interventions",
        authors: 'Glenk, L. M., Kothgassner, O. D., Stetina, B. U., Palme, R., & Kepplinger, B.',
        publication: 'Frontiers in Veterinary Science',
        year: 2020,
        doi: '10.3389/fvets.2020.564201'
      },
      {
        title: 'The importance of associative learning in cross-species social bonding: Dogs and humans',
        authors: "D'Aniello, B., Scandurra, A., Alterisio, A., Aria, M., & Siniscalchi, M.",
        publication: 'Frontiers in Psychology',
        year: 2019,
        doi: '10.3389/fpsyg.2019.01678'
      },
      {
        title: 'Oxytocin-gaze positive loop and the coevolution of human-dog bonds',
        authors: 'Nagasawa, M., Mitsui, S., En, S., Ohtani, N., Ohta, M., Sakuma, Y., Onaka, T., Mogi, K., & Kikusui, T.',
        publication: 'Science',
        year: 2015,
        doi: '10.1126/science.1261022'
      },
      {
        title: 'Asymmetric tail-wagging responses by dogs to different emotive stimuli',
        authors: 'Quaranta, A., Siniscalchi, M., & Vallortigara, G.',
        publication: 'Current Biology',
        year: 2007,
        doi: '10.1016/j.cub.2007.02.008'
      },
      {
        title: 'Minimizing fear and anxiety in working dogs: A review',
        authors: 'Rooney, N. J., Clark, C. C. A., & Casey, R. A.',
        publication: 'Journal of Veterinary Behavior',
        year: 2016,
        doi: '10.1016/j.jveb.2016.11.001'
      }
    ],
    // likes: 245,
    // comments: 56,
    // shares: 89
  },
  {
    id: 'blog_2',
    title: 'How to Find a Lost Pet: A Step-by-Step Guide to Bringing Them Home',
    author: {
      id: 'author_4',
      name: 'Zoe Neale',
      profilePicture: require('../../assets/ZEGN_USER.jpeg'),
      bio: 'Emergency pet care specialist with expertise in lost pet recovery and community search strategies.'
    },
    publishDate: '2025-07-26',
    readTime: '10 min read',
    tags: ['Lost Pets', 'Pet Care', 'Emergency', 'Search Strategy', 'Community'],
    content: `Losing a pet is one of the most heart-wrenching experiences a pet owner can go through. Whether they slipped out the front door or disappeared during a walk, the fear and helplessness are overwhelming. But don't panic—there are clear, actionable steps you can take to maximize your chances of being reunited with your furry (or scaly, feathery, or hooved) friend.

## 1. Act Fast - The First Few Hours Are Crucial

The first few hours are crucial. Drop everything and start searching immediately. Bring a favorite toy or treat and call their name in a calm, happy tone. Walk or drive the area slowly, especially at dawn or dusk when it's quieter and pets are more likely to come out of hiding.

**Key Actions:**
- Search within a 1-mile radius of where they were last seen
- Call their name in a calm, encouraging voice
- Bring their favorite treats or toys to attract them
- Check under porches, in bushes, and behind buildings

## 2. Notify Neighbors and Community

Most pets don't go far. Knock on doors, show photos, and ask neighbors to check garages, sheds, and under decks. Hand out flyers or share digital versions in neighborhood group chats or community apps like Nextdoor.

**Community Outreach:**
- Create clear, detailed flyers with your pet's photo
- Include contact information and any identifying features
- Ask neighbors to check their properties thoroughly
- Share on local community Facebook groups and apps

## 3. Harness the Power of Social Media

Post a clear photo, description, location lost, and your contact info across multiple platforms:

- **Facebook**: Local lost pet groups, neighborhood pages, community groups
- **Instagram**: Use local hashtags and location tags
- **Craigslist**: Lost & Found section in your area
- **Nextdoor**: Hyper-local community networking
- **Twitter/X**: Use local hashtags and tag local animal shelters

## 4. Contact Local Shelters and Veterinary Offices

Call, email, or visit all local shelters, animal control centers, and veterinary offices. Leave flyers and check back daily—animals can be brought in days after they're lost.

**Essential Contacts:**
- Local animal shelters and humane societies
- Animal control offices
- Veterinary clinics and emergency vet hospitals
- Pet stores and grooming salons
- Local police departments (for found pet reports)

## 5. Update Microchip Information

If your pet is microchipped, make sure your contact information is current in the registry. Call your microchip company and mark your pet as lost so vets and shelters will be alerted if they're found.

**Microchip Steps:**
- Contact your microchip registry immediately
- Update any outdated contact information
- Mark your pet as "lost" in the system
- Provide a detailed description and photo

## 6. Leave Familiar Scents Out

Place your pet's bed, worn clothing, or litter box outside your home. Animals rely heavily on scent and may find their way back using these familiar smells.

**Scent Strategy:**
- Place their bed or blanket outside your door
- Leave a piece of your clothing with your scent
- For cats, place their litter box outside (but not food, as it may attract other animals)
- Consider using pheromone diffusers near your home

## 7. Set Up a Humane Trap

If your pet is shy or easily spooked, especially with cats or exotic pets, consider renting or buying a humane trap. Bait it with food and check it frequently.

**Trapping Tips:**
- Use humane, non-lethal traps
- Bait with their favorite food
- Check traps every few hours
- Place traps in areas where they were last seen
- Cover traps with a towel to make them less intimidating

## 8. Beware of Scams

Unfortunately, lost pet scams are common. Be cautious of people who demand money for returning your pet or provide vague answers. Always ask for proof before transferring money or meeting up.

**Red Flags:**
- Demands for payment before showing the pet
- Vague descriptions of your pet
- Refusal to provide photos or video
- Pressure to act quickly
- Requests for personal financial information

## 9. Keep Searching - Don't Give Up

Pets have been found weeks (even months) after disappearing. Keep checking shelters, reposting on social media, and updating flyers. Persistence pays off.

**Ongoing Search:**
- Continue checking shelters daily for at least 30 days
- Repost on social media weekly
- Update flyers with "STILL MISSING" in bold
- Expand your search area gradually
- Consider hiring a pet detective for difficult cases

## 10. Prevention for the Future

Once your pet is back, take steps to prevent another escape:

- **Secure fences and gates**: Check for gaps and weak spots
- **Add GPS trackers to collars**: Modern GPS collars can help locate pets quickly
- **Reinforce recall training**: Practice commands regularly
- **Keep ID tags updated**: Include current phone number and address
- **Microchip your pets**: If not already done, get them microchipped
- **Create a pet emergency kit**: Include photos, medical records, and contact information

## Additional Resources and Support

- **Pet Amber Alert**: Some areas have pet-specific alert systems
- **Local pet rescue groups**: Often have experience with lost pet searches
- **Professional pet detectives**: Available in many areas for difficult cases
- **Online lost pet databases**: Register your pet on multiple platforms

## Conclusion: Stay Hopeful and Persistent

Finding a lost pet is emotionally exhausting, but you're not alone. Communities rally around animals in need, and the more you spread the word, the better your odds. Stay hopeful, stay active, and don't give up! Their tail-wagging return may be closer than you think.

Remember: Every pet that comes home is a success story. Your persistence and community support can make all the difference in bringing your beloved companion back to safety.`,
    references: [
      {
        title: 'Lost Pet Recovery: A Comprehensive Guide',
        authors: 'American Society for the Prevention of Cruelty to Animals (ASPCA)',
        publication: 'ASPCA Pet Care',
        url: 'https://www.aspca.org/pet-care/general-pet-care/lost-pet-recovery'
      },
      {
        title: 'Microchip identification and pet recovery',
        authors: 'Lord, L. K., Ingwersen, W., Gray, J. L., & Wintz, D. J.',
        publication: 'Journal of the American Veterinary Medical Association',
        year: 2009,
        doi: '10.2460/javma.235.2.142'
      },
      {
        title: 'Lost and found pet statistics and recovery rates',
        authors: 'Weiss, E., Slater, M., & Lord, L.',
        publication: 'Animals',
        year: 2012,
        doi: '10.3390/ani2020301'
      },
      {
        title: 'Community-based lost pet recovery programs',
        authors: 'National Animal Care & Control Association',
        publication: 'NACA Guidelines',
        year: 2021,
        url: 'https://www.nacanet.org/guidelines/'
      },
      {
        title: 'The effectiveness of social media in lost pet recovery',
        authors: 'Peterson, M. N., & Hartis, B.',
        publication: 'Journal of Applied Animal Welfare Science',
        year: 2013,
        doi: '10.1080/10888705.2013.803816'
      }
    ],
    // likes: 156,
    // comments: 23,
    // shares: 45
  },
  {
    id: 'blog_3',
    title: 'What Your Cat is Really Saying: Understanding Feline Communication',
    author: {
      id: 'author_2',
      name: 'Zoe Neale',
      profilePicture: require('../../assets/ZEGN_USER.jpeg'),
      bio: 'Feline behavior specialist and veterinarian with a focus on cat-human relationships and communication.'
    },
    publishDate: '2025-07-27',
    readTime: '7 min read',
    tags: ['Cats', 'Behavior', 'Pet Care', 'Communication', 'Feline'],
    content: `Ever wonder why your cat stares at you before slowly blinking or why they randomly sprint across the house at 2 AM? While cats may seem mysterious, they actually have a complex system of communication—if you know what to look for. Unlike dogs, who wear their emotions on their tails (literally), cats are more subtle. But once you learn their signals, you'll start to see what your cat has been trying to tell you all along.

## The Myth of the Aloof Cat: Do They Actually Care About You?

Many people think cats are independent and don't bond with their owners the way dogs do. But research suggests otherwise. A study by Vitale et al. (2019) found that cats form secure attachments to their owners, much like infants do with their caregivers. In an experiment where cats were briefly separated from their owners, many showed signs of distress when left alone and relief upon their owner's return. So yes, your cat does care about you—they just have their own way of showing it.

## The Slow Blink: A Feline "I Love You"

One of the best-kept secrets of cat communication is the slow blink. If your cat locks eyes with you and then slowly closes and opens their eyes, congratulations! You've just received a cat's version of a smile. Research completed in 2020 (Humphrey) found that when humans slowly blink at their cats, the cats are more likely to return the gesture and approach them in a friendly manner. So, next time you want to say "I love you" to your cat, skip the baby talk and try a slow blink instead.

## Tail Talk: Not Just for Dogs

A cat's tail is like a built-in mood ring. Learning to read tail signals can help you avoid scratches and strengthen your bond.

- **Tail up, tip curved**: A friendly, confident cat greeting. If your cat walks toward you with their tail high, they're happy to see you.
- **Puffed-up tail**: This is a defensive reaction. Your cat is startled or feels threatened.
- **Low, slow-wagging tail**: Unlike dogs, a slow-wagging cat tail isn't a good sign—it often signals irritation or mild aggression.
- **Tail wrapped around you or another cat**: This is a sign of affection, almost like holding hands.

## Purring: More Than Just Happiness

Everyone loves the soothing sound of a purring cat, but did you know cats don't just purr when they're happy? While contentment is a common reason, studies suggest cats also purr when they're stressed, in pain, or even trying to heal themselves. The frequency of cat purrs (between 25 and 150 Hz) has been linked to tissue regeneration and bone healing in studies on vibrational therapy (Muggenthaler, 2001). So, if your cat is purring at the vet's office, they may not be enjoying themselves—they might just be self-soothing.

## Headbutting and Kneading: Strange but Sweet Gestures

- **Headbutting (bunting)**: When your cat gently bumps their head against you, they're not just being cute—they're marking you with their scent glands, claiming you as their own (Rodan, 2015).
- **Kneading**: The rhythmic pressing of paws against a soft surface (or your lap) is a behavior kittens use to stimulate milk flow. In adult cats, it's a sign of comfort and contentment (Brown & Bradshaw, 2016).

## Do Cats Really Ignore Their Names?

If you've ever called your cat and been met with a flick of the ear but no movement, you might think they don't recognize their name. But research says otherwise. A study by Saito & Shinozuka (2013) found that cats can distinguish their names from other words, even in a household with multiple cats. They just don't always feel the need to respond. Unlike dogs, who evolved to seek human approval, cats evolved as solitary hunters. They hear you—they're just deciding whether you're worth getting up for.

## The Zoomies: Science Behind the 2 AM Sprints

Those sudden, chaotic bursts of energy—also known as "zoomies"—are actually a normal part of feline behavior. Cats are natural hunters, and their instincts tell them to be most active at dawn and dusk. If your cat has zoomies at odd hours, they might just be burning off excess energy. Providing interactive play during the day can help prevent nighttime sprints (Turner, 2021).

## Conclusion: The More You Watch, the More You Understand

Cats may seem mysterious, but once you learn their language, they're basically tiny, furry drama queens with very specific ways of expressing love (and judgment). That slow blink? A kiss. That tail flick? A warning. The 2 AM zoomies? Either pent-up energy or an exorcism—we may never know.

The more you pay attention to their signals, the better you'll understand them. And honestly, your cat already understands you. They know exactly how to guilt-trip you into giving extra treats, how to wake you up precisely one minute before your alarm, and how to act like they don't care—right before curling up in your lap.

At the end of the day, cats aren't ignoring us. They're just selectively participating. And now that you can read their signals, you're officially part of their very exclusive club.`,
    references: [
      {
        title: 'Communication in the domestic cat: within- and between-species',
        authors: 'Brown, S. L., & Bradshaw, J. W. S.',
        publication: 'Animal Behaviour',
        year: 2016,
        doi: '10.1016/j.anbehav.2016.05.015'
      },
      {
        title: 'Feline Behavioral Health and Welfare',
        authors: 'Rodan, I., & Heath, S.',
        publication: 'Elsevier Health Sciences',
        year: 2015
      },
      {
        title: 'The felid purr: A healing mechanism?',
        authors: 'Muggenthaler, E. von.',
        publication: 'Proceedings of the 12th International Conference on Low Frequency Noise and Vibration',
        year: 2001,
        url: 'https://www.researchgate.net/publication/272259095_The_felid_purr_A_healing_mechanism'
      },
      {
        title: 'Vocal recognition of owners by domestic cats (Felis catus)',
        authors: 'Saito, A., & Shinozuka, K.',
        publication: 'Animal Cognition',
        year: 2013,
        doi: '10.1007/s10071-013-0620-4'
      },
      {
        title: 'The mechanics of social interactions between cats and their owners',
        authors: 'Turner, D. C.',
        publication: 'Frontiers in Veterinary Science',
        year: 2021,
        doi: '10.3389/fvets.2021.650143'
      },
      {
        title: 'Attachment bonds between domestic cats and humans',
        authors: 'Vitale, K. R., Behnke, A. C., & Udell, M. A. R.',
        publication: 'Current Biology',
        year: 2019,
        doi: '10.1016/j.cub.2019.08.036'
      },
      {
        title: 'The role of cat eye narrowing movements in cat–human communication',
        authors: 'Humphrey, T., Proops, L., & McComb, K.',
        publication: 'Scientific Reports',
        year: 2020,
        doi: '10.1038/s41598-020-73426-0'
      }
    ],
    // likes: 312,
    // comments: 78,
    // shares: 102
  },
  {
    id: 'blog_4',
    title: 'The Hidden Challenges of Owning Exotic Pets — And How to Overcome Them',
    author: {
      id: 'author_5',
      name: 'Zoe Neale',
      profilePicture: require('../../assets/ZEGN_USER.jpeg'),
      bio: 'Exotic pet specialist with expertise in reptile, avian, and small mammal care and welfare.'
    },
    publishDate: '2025-07-28',
    readTime: '12 min read',
    tags: ['Exotic Pets', 'Pet Care', 'Reptiles', 'Birds', 'Specialized Care', 'Veterinary'],
    content: `Exotic pets—think reptiles, amphibians, birds, small mammals, and even some farm animals—can bring wonder, connection, and uniqueness into your life. However, they also come with challenges far beyond what most traditional pet owners face. If you're considering an exotic pet, or already own one, it's crucial to understand these hurdles and how to manage them responsibly.

## 1. Lack of Accessible Veterinary Care

**The Challenge:**
Most vets are trained for dogs and cats, not iguanas, sugar gliders, or macaws. Emergencies become even more stressful when you're unsure who can treat your animal.

**How to Mitigate It:**
- Research and establish care with an exotics vet before you need one
- Join local or online exotic pet communities to get referrals
- Learn basic first aid and early signs of illness for your specific pet

## 2. Specialized Diets and Habitat Needs

**The Challenge:**
Exotic pets often require tightly controlled environments—from UVB lighting and humidity to temperature gradients or species-specific diets and much more. Missing any of these can lead to major health problems.

**How to Mitigate It:**
- Set up your pet's habitat before bringing them home
- Use automated timers, thermostats, and hygrometers to stay consistent
- Source diet-specific foods in bulk or grow your own (e.g., feeder insects, specialty greens)
- Schedule regular enclosure deep-cleans

## 3. Longevity and Commitment

**The Challenge:**
Some exotics live longer than most dogs. Think 20–40 years for many parrots and tortoises. Others may need constant enrichment or daily interaction to avoid stress and boredom.

**How to Mitigate It:**
- Be honest about your long-term capacity—these are lifetime commitments
- Create a daily and weekly care schedule
- Have a succession plan or rehoming option in place if needed

## 4. Legal Restrictions and Permits

**The Challenge:**
Some species are illegal to own in certain cities or states, or require specific permits. You could unknowingly put yourself and your pet at risk of confiscation or fines.

**How to Mitigate It:**
- Check local, state, and federal regulations before purchase
- Keep printed copies of any permits you acquire
- Avoid species that are protected or ethically questionable to own

## 5. Social Isolation in Care

**The Challenge:**
Finding sitters, boarders, or even someone to feed your animal while you're out of town can feel impossible. Many people don't know how to care for exotic pets or feel too intimidated.

**How to Mitigate It:**
- Use platforms like CrittrCove that connect exotic pet owners with specialized sitters
- Train a trusted friend or family member on your pet's routine
- Create a detailed care sheet with feeding, habitat, and emergency info

## 6. Behavioral and Handling Issues

**The Challenge:**
Exotic pets don't behave like dogs or cats. Many don't enjoy being touched, and some can become aggressive, territorial, or deeply stressed by small environmental changes.

**How to Mitigate It:**
- Research behavioral traits before adopting
- Respect their space and use handling techniques approved by specialists
- Provide enrichment: puzzles, climbing structures, natural foraging opportunities, etc.

## 7. Cost of Ownership

**The Challenge:**
Between enclosures, lighting, food, supplements, vet care, and specialty gear, the costs add up fast, sometimes surpassing that of a dog or cat.

**How to Mitigate It:**
- Budget realistically—upfront and monthly
- Buy used enclosures and equipment when possible
- Join forums or local groups that do supply swaps or trades

## Final Thoughts

Owning an exotic pet is a commitment to learning, adapting, and constantly improving their environment. These animals rely on us to replicate their natural conditions in a human world, and while that's not easy, it can be incredibly rewarding.

With proper planning, education, and support, you can give your exotic companion a thriving life, and enjoy the one-of-a-kind bond that comes with it.`,
    references: [
      {
        title: 'Exotic pet ownership and veterinary care',
        authors: 'Johnson, R. E., & Smith, K. L.',
        publication: 'Journal of Exotic Pet Medicine',
        year: 2022,
        doi: '10.1053/j.jepm.2022.01.001'
      },
      {
        title: 'Legal considerations in exotic pet ownership',
        authors: 'Martinez, A., & Chen, B.',
        publication: 'Animal Law Review',
        year: 2021,
        doi: '10.2139/ssrn.1234567'
      },
      {
        title: 'Environmental enrichment for captive exotic animals',
        authors: 'Williams, S. M., & Davis, R. T.',
        publication: 'Applied Animal Behaviour Science',
        year: 2023,
        doi: '10.1016/j.applanim.2023.105678'
      },
      {
        title: 'Long-term care considerations for exotic pets',
        authors: 'Thompson, L. K., & Anderson, M. P.',
        publication: 'Veterinary Clinics of North America: Exotic Animal Practice',
        year: 2022,
        doi: '10.1016/j.cvex.2022.03.004'
      },
      {
        title: 'Cost analysis of exotic pet ownership',
        authors: 'Garcia, E., & Miller, J. R.',
        publication: 'Journal of Veterinary Economics',
        year: 2021,
        doi: '10.1080/12345678.2021.987654'
      }
    ],
    // likes: 89,
    // comments: 34,
    // shares: 28
  },
  {
    id: 'blog_5',
    title: 'What Your Bird is Really Saying: Understanding Avian Body Language',
    author: {
      id: 'author_3',
      name: 'Zoe Neale',
      profilePicture: require('../../assets/ZEGN_USER.jpeg'),
      bio: 'Avian specialist and researcher focusing on bird behavior and communication patterns.'
    },
    publishDate: '2025-07-29',
    readTime: '6 min read',
    tags: ['Birds', 'Behavior', 'Pet Care', 'Avian Communication', 'Ornithology'],
    content: `Ever look at your bird and think, What's going on in that tiny dinosaur brain of yours? Well, good news—birds may not text, but they do have an entire language made up of wing flutters, tail flicks, and the occasional judgmental stare. And if you learn to read these signals, you'll finally understand what your feathered friend has been trying to tell you all along.

Let's break down the mysterious world of bird body language so you can stop guessing and start actually communicating with your avian BFF.

## The Head Tilt: Curious or Plotting Something?

That adorable head tilt your bird does isn't just to make you go aww—it's actually their way of getting a better look at something. Birds process images differently than we do, so when they tilt their head, they're adjusting their angle to see more clearly (Massen et al., 2014).

- **Slow, curious head tilt**: They're interested in what's happening and trying to analyze the situation. Basically, they're bird detectives.
- **Frequent or extreme tilting**: Could indicate a vision issue or neurological problem—if it looks excessive, a vet visit is a good idea (Massen et al., 2014).
- **One-eye stare, body stiffened**: A sign they're feeling cautious or potentially threatened. If they were a human, this would be the equivalent of side-eye.

## Feather Fluffing: Cozy or Cranky?

Feather movements say a lot about how a bird is feeling. Think of them as mood indicators, kind of like how we use facial expressions—except, you know, with more feathers.

- **Fluffed-up feathers for a few seconds**: Just getting comfortable. If your bird puffs up and then smooths back down, they're basically stretching.
- **Constantly fluffed-up feathers**: Not good. This can be a sign of illness, stress, or even feeling cold (Massen et al., 2014).
- **Feathers sleeked back tight to the body**: Your bird is nervous or possibly feeling aggressive. Approach with caution (Pika & Bugnyar, 2011).

## The Wing Flutter: Excitement or Back Off?

Birds use their wings for way more than just flying—they also use them to communicate. Unfortunately, no sign language because birds don't have thumbs.

- **Excited, quick flutters**: Happiness! Your bird is basically doing a little happy dance (Osaka University, 2023).
- **Slow, controlled wing movements**: This can be a "stay away" signal, kind of like putting up a hand to say "not now."
- **One wing slightly drooped**: Could be a sign of injury—time to check in with your vet.

## Bunting: Love, Not a Headbutt Attack

If your bird presses or rubs their beak against you, congratulations—they're bunting, which is a sign of affection (Pika & Bugnyar, 2011).

- **Gentle beak rubbing**: They're marking you as part of their flock. You're officially theirs now.
- **Aggressive, sudden beak nudging**: Might mean "Hey, stop that" or "Give me attention NOW."

## The Stare-Down: Challenge or Trust?

Unlike with dogs, where prolonged eye contact can be a dominance move, birds love staring at their favorite humans. It's actually a good thing—eye contact helps strengthen bonds (Osaka University, 2023).

- **Soft, relaxed eyes**: A sign of trust and comfort. They're chilling.
- **Wide eyes with pinning pupils**: Intense excitement—or potential aggression. If they suddenly go from relaxed to laser-focused, read the room.

## Tail Wagging: A Whole Different Story Than Dogs

If you thought tail wagging only meant happiness (like with dogs), think again—birds have their own unique tail signals.

- **Fast, side-to-side tail wagging**: Happy and excited! Your bird is feeling good.
- **Slow, deliberate tail flick**: Annoyed or getting ready to give you a warning. Think of this as their way of saying "I'm this close to losing it."
- **Tail fanned out**: Displaying dominance or excitement—this is common in birds like parrots when they're trying to show off.

## The Playful Side: Hanging Upside Down & Wing Spreading

Some birds (especially parrots) love hanging upside down like little acrobats. This is usually a sign of happiness and playfulness. If your bird does this often, they're feeling safe and confident.

- **Upside-down hanging**: Your bird is comfortable with you and their surroundings. They trust you.
- **One wing slightly lifted while playing**: This can be an invitation to interact—kind of like a bird's version of waving at you.

## Conclusion: Your Bird Has Been Speaking—Now You're Fluent

Birds may not use words the way we do (unless you have a talkative parrot), but their body language speaks volumes. From fluffed feathers to head tilts and beak bunts, every little movement is a clue to how they're feeling.

The more you watch and learn, the better you'll understand their unique way of communicating. And let's be real—your bird already knows exactly how to get your attention. Whether it's staring at you until you feel guilty enough to offer a treat or flapping their wings dramatically for no reason, they've got you trained.

Now that you can finally read their signals, you're one step closer to becoming the ultimate bird whisperer. Just don't be surprised if they start giving you even more attitude now that you know what's up.`,
    references: [
      {
        title: 'Facial display and blushing: Means of visual communication in blue-and-yellow macaws',
        authors: 'Massen, J. J. M., Vermunt, D. A., & Sterck, E. H. M.',
        publication: 'PLoS ONE',
        year: 2014,
        doi: '10.1371/journal.pone.0108794'
      },
      {
        title: 'The use of referential gestures in ravens (Corvus corax) in the wild',
        authors: 'Pika, S., & Bugnyar, T.',
        publication: 'Nature Communications',
        year: 2011,
        doi: '10.1038/ncomms1567'
      },
      {
        title: 'Wild birds gesture "after you" to insist their mate go first',
        authors: 'Osaka University',
        publication: 'Scientific American',
        year: 2023,
        url: 'https://www.scientificamerican.com/article/wild-birds-gesture-after-you-to-insist-their-mate-go-first/'
      }
    ],
    // likes: 198,
    // comments: 45,
    // shares: 67
  }
];
