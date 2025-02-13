// First, declare the BOOKING_STATES constant
export const BOOKING_STATES = {
  // # Initial States
  DRAFT: 'Draft',
  PENDING_INITIAL_PROFESSIONAL_CHANGES: 'Pending initial Professional Changes',
    
  // # Review States
  PENDING_PROFESSIONAL_CHANGES: 'Pending Professional Changes',
  PENDING_CLIENT_APPROVAL: 'Pending Client Approval',
    
  // # Active States
  CONFIRMED: 'Confirmed',
  CONFIRMED_PENDING_PROFESSIONAL_CHANGES: 'Confirmed Pending Professional Changes',
  CONFIRMED_PENDING_CLIENT_APPROVAL: 'Confirmed Pending Client Approval',
    
  // # Terminal States
  COMPLETED: 'Completed',
  DENIED: 'Denied',
  CANCELLED: 'Cancelled',

  // # States where professionals can edit
  PROFESSIONAL_EDITABLE_STATES: [
    'Draft',
    'Pending initial Professional Changes',
    'Pending Professional Changes',
    'Confirmed Pending Professional Changes',
    'Confirmed'
  ]
};

export const ALL_SERVICES = "All Services";
export const SERVICE_TYPES = [
  ALL_SERVICES,
  "Overnight Cat Sitting (Client's Home)",
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

export const TIME_OPTIONS = [
  '15 min',
  '30 min',
  '45 min',
  '1 hr',
  '2 hr',
  '4 hr',
  '8 hr',
  '24 hr',
  'overnight',
  'per day',
  'per visit'
];

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
    id: '1',
    name: 'John Doe',
    profilePicture: require('../../assets/user1.png'),
    reviews: 4.5,
    price: 25,
    bio: 'Experienced with all types of pets.Experienced with all types of pets.Experienced with all types of pets.Experienced with all types of pets.Experienced with all types of pets.Experienced with all types of pets.Experienced with all types of pets.Experienced with all types of pets.Experienced with all types of pets.Experienced with all types of pets.Experienced with all types of pets.Experienced with all types of pets.Experienced with all types of pets.Experienced with all types of pets.Experienced with all types of pets.Experienced with all types of pets.Experienced with all types of pets.Experienced with all types of pets.Experienced with all types of pets.Experienced with all types of pets.Experienced with all types of pets.Experienced with all types of pets.Experienced with all types of pets.Experienced with all types of pets.Experienced with all types of pets.Experienced with all types of pets.',
    location: 'Colorado Springs, CO',
    coordinates: { latitude: 38.8339, longitude: -104.8214 },
    serviceTypes: ['House Sitting', 'Dog Walking'],
    animalTypes: ['dogs', 'cats'],
  },
  {
    id: '2',
    name: 'Jane Smith',
    profilePicture: require('../../assets/user2.png'),
    reviews: 4.8,
    price: 30,
    bio: 'Specialized in exotic pets.',
    location: 'Manitou Springs, CO',
    coordinates: { latitude: 38.8597, longitude: -104.9172 },
    serviceTypes: ['House Sitting', 'Drop-ins'],
    animalTypes: ['exotics', 'cats'],
  },
  {
    id: '3',
    name: 'Mike Wilson',
    profilePicture: require('../../assets/user3.png'),
    reviews: 4.7,
    price: 28,
    bio: 'Dog trainer with 5 years experience.',
    location: 'Security-Widefield, CO',
    coordinates: { latitude: 38.7478, longitude: -104.7288 },
    serviceTypes: ['Dog Walking', 'Training'],
    animalTypes: ['dogs'],
  },
  {
    id: '4',
    name: 'Sarah Johnson',
    profilePicture: require('../../assets/user4.png'),
    reviews: 4.9,
    price: 35,
    bio: 'Veterinary technician, great with medical needs.',
    location: 'Fountain, CO',
    coordinates: { latitude: 38.6822, longitude: -104.7008 },
    serviceTypes: ['House Sitting', 'Drop-ins'],
    animalTypes: ['dogs', 'cats', 'exotics'],
  },
  {
    id: '5',
    name: 'Tom Brown',
    profilePicture: require('../../assets/user5.png'),
    reviews: 4.6,
    price: 27,
    bio: 'Experienced with large breeds.',
    location: 'Black Forest, CO',
    coordinates: { latitude: 39.0128, longitude: -104.7008 },
    serviceTypes: ['Dog Walking', 'House Sitting'],
    animalTypes: ['dogs'],
  },
  // Additional professionals further out
  {
    id: '6',
    name: 'Lisa Anderson',
    profilePicture: require('../../assets/user6.png'),
    reviews: 4.4,
    price: 32,
    bio: 'Experienced with birds and small animals.',
    location: 'Monument, CO',
    coordinates: { latitude: 39.0917, longitude: -104.8722 },
    serviceTypes: ['House Sitting', 'Drop-ins'],
    animalTypes: ['exotics', 'cats'],
  },
  {
    id: '7',
    name: 'David Clark',
    profilePicture: require('../../assets/user7.png'),
    reviews: 4.7,
    price: 29,
    bio: 'Specializing in puppy care and training.',
    location: 'Woodland Park, CO',
    coordinates: { latitude: 38.9939, longitude: -105.0569 },
    serviceTypes: ['Dog Walking', 'Training'],
    animalTypes: ['dogs'],
  },
  {
    id: '8',
    name: 'Emma White',
    profilePicture: require('../../assets/user8.png'),
    reviews: 4.8,
    price: 33,
    bio: 'Experienced with senior pets.',
    location: 'Pueblo West, CO',
    coordinates: { latitude: 38.3494, longitude: -104.7224 },
    serviceTypes: ['House Sitting', 'Drop-ins'],
    animalTypes: ['dogs', 'cats'],
  },
  {
    id: '9',
    name: 'James Miller',
    profilePicture: require('../../assets/user9.png'),
    reviews: 4.5,
    price: 26,
    bio: 'Great with high-energy dogs.',
    location: 'Castle Rock, CO',
    coordinates: { latitude: 39.3722, longitude: -104.8561 },
    serviceTypes: ['Dog Walking', 'House Sitting'],
    animalTypes: ['dogs'],
  },
  {
    id: '10',
    name: 'Rachel Green',
    profilePicture: require('../../assets/user10.png'),
    reviews: 4.9,
    price: 34,
    bio: 'Experienced with reptiles and amphibians.',
    location: 'Palmer Lake, CO',
    coordinates: { latitude: 39.1153, longitude: -104.9158 },
    serviceTypes: ['House Sitting', 'Drop-ins'],
    animalTypes: ['exotics'],
  }
];

export const mockClients = [
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
            { id: 'bk1', startTime: '14:00', endTime: '16:00', client_name: 'Charlie', service_type: 'Dog Walking' },
            { id: 'bk2', startTime: '16:00', endTime: '18:00', client_name: 'Bob', service_type: 'Dog Walking' },
            { id: 'bk3', startTime: '18:00', endTime: '20:00', client_name: 'Nick', service_type: 'Pet Boarding' },
            { id: 'bk4', startTime: '20:00', endTime: '22:00', client_name: 'Alfred', service_type: 'Drop-In Visits (30 min)' }
          ],
          '2025-02-07': [
            { id: 'bk5', startTime: '10:00', endTime: '12:00', client_name: 'Uhtred', service_type: 'Dog Walking' }
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
  client_name: 'matt aertker',
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
    total_client_cost: 215.17,
    total_sitter_payout: 163.01,
    is_prorated: true
  }
};

// Initialize mockBookingDetails with existing mock data
const mockBookingDetails = {
  '1234': {
    ...sharedBookingDetails,
    id: '1234',
    clientName: 'John Doe',
    status: BOOKING_STATES.CONFIRMED,
    startDate: '2024-02-20',
    startTime: '14:00',
  },
  '5678': {
    ...sharedBookingDetails,
    id: '5678',
    clientName: 'Margarett Laporte',
    status: BOOKING_STATES.CANCELLED,
    startDate: '2024-02-21',
    startTime: '15:30',
  },
  '56782': {
    ...sharedBookingDetails,
    id: '56782',
    clientName: 'Zoe Aerial',
    status: BOOKING_STATES.DENIED,
    startDate: '2024-02-21',
    startTime: '15:30',
  },
  '5673': {
    ...sharedBookingDetails,
    id: '5673',
    clientName: 'Matt Clark',
    status: BOOKING_STATES.PENDING_INITIAL_PROFESSIONAL_CHANGES,
    startDate: '2024-02-21',
    startTime: '15:30',
  },
  '5674': {
    ...sharedBookingDetails,
    id: '5674',
    clientName: 'Mark Smith',
    status: BOOKING_STATES.PENDING_CLIENT_APPROVAL,
    startDate: '2024-02-21',
    startTime: '15:30',
  },
  '5675': {
    ...sharedBookingDetails,
    id: '5675',
    clientName: 'Lauren Smith',
    status: BOOKING_STATES.PENDING_PROFESSIONAL_CHANGES,
    startDate: '2024-02-21',
    startTime: '15:30',
  },
  '5675': {
    ...sharedBookingDetails,
    id: '56712',
    clientName: 'Matt Smith',
    status: BOOKING_STATES.CONFIRMED_PENDING_PROFESSIONAL_CHANGES,
    startDate: '2024-02-21',
    startTime: '15:30',
  },
  '56713': {
    ...sharedBookingDetails,
    id: '567123',
    clientName: 'Albert Einstein',
    status: BOOKING_STATES.PENDING_INITIAL_PROFESSIONAL_CHANGES,
    startDate: '2025-02-21',
    startTime: '15:30',
  },
  '3749': {...sharedBookingDetails,
    id: '567132',
    clientName: 'Dr. Mike Johnson',
    status: BOOKING_STATES.PENDING_INITIAL_PROFESSIONAL_CHANGES,
    startDate: '2025-02-21',
    startTime: '15:30',
  },
  '91011': {
    ...sharedBookingDetails,
    id: '91011',
    clientName: 'Dr. Bla Johnson',
    status: BOOKING_STATES.PENDING_INITIAL_PROFESSIONAL_CHANGES,
    startDate: '2025-02-21',
    startTime: '15:30',
  },
  '91012': {
    ...sharedBookingDetails,
    id: '91012',
    clientName: 'Dr. Blabla Johnson',
    status: BOOKING_STATES.PENDING_INITIAL_PROFESSIONAL_CHANGES,
    startDate: '2025-02-21',
    startTime: '15:30',
  }
};

// Map mockProfessionalBookings from mockBookingDetails
export const mockProfessionalBookings = Object.values(mockBookingDetails)
  .map(booking => ({
    id: booking.id,
    clientName: booking.clientName,
    status: booking.status,
    date: booking.startDate,
    time: booking.startTime,
    serviceType: booking.serviceType,
    numberOfPets: booking.numberOfPets || 1,
    totalCost: booking.costs?.totalClientCost || 0,
    professionalPayout: booking.costs?.professionalPayout || 0
  }));

// Add the createBooking function
export const createBooking = async (clientId, freelancerId, initialData = {}) => {
  const newBookingId = `booking_${Date.now()}`;
  
  const newBooking = {
    id: newBookingId,
    clientId: clientId,
    freelancerId: freelancerId,
    status: BOOKING_STATES.PENDING_INITIAL_PROFESSIONAL_CHANGES,
    clientName: initialData.clientName || 'TBD',
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
      clientFee: 0,
      taxes: 0,
      totalClientCost: 0,
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

// Update fetchBookingDetails with better logging
export const fetchBookingDetails = async (bookingId) => {
  // console.log('Fetching booking details');
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const bookingDetails = mockBookingDetails[bookingId];
  if (!bookingDetails) {
    console.error('Booking not found:', {
      requestedId: bookingId,
      availableBookings: Object.keys(mockBookingDetails)
    });
    throw new Error('Booking not found');
  }
  
  return bookingDetails;
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
export const mockClientBookings = [
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
      participant1_role: "client",
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
      participant1_role: "client",
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
      participant1_role: "client",
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
      participant1_role: "client",
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
      participant1_role: "client",
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
      participant1_role: "client",
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
      participant1_role: "client",
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
      participant1_role: "client",
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
      participant1_role: "client",
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
      participant1_role: "client",
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
      participant1_role: "client",
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
      participant1_role: "client",
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
      participant1_role: "client",
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
      participant1_role: "client",
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
      participant1_role: "client",
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
        participant1_role: "client",
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
        participant1_role: "client",
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
        participant1_role: "client",
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
        participant1_role: "client",
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
        participant1_role: "client",
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
export const createNewConversation = (professionalId, professionalName, clientId, clientName) => {
  const conversationId = `conv_${Date.now()}`;
  const isCurrentUserClient = clientId === CURRENT_USER_ID;
  
  return {
    id: conversationId,
    participant1_id: isCurrentUserClient ? clientId : professionalId,
    participant2_id: isCurrentUserClient ? professionalId : clientId,
    role_map: {
      participant1_role: isCurrentUserClient ? "client" : "professional",
      participant2_role: isCurrentUserClient ? "professional" : "client"
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
  "Overnight Cat Sitting (Client's Home)",
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
    title: 'What Your Dog is Really Saying',
    author: {
      id: 'author_1',
      name: 'Zoe Neale',
      profilePicture: require('../../assets/ZEGN_USER.jpeg'),
      bio: 'Professional dog trainer and animal behavior specialist with over 10 years of experience.'
    },
    publishDate: '2024-02-22',
    readTime: '8 min',
    tags: ['Dogs', 'Behavior', 'Training', 'Pet Care'],
    content: `You know that moment when your dog tilts their head at you like you just asked them to solve a calculus problem? Turns out, they're not the only ones trying to understand you—they've been communicating with you this whole time, and you probably didn't even realize it.

Dogs may not speak English (yet—give them time), but they have an entire language built on tail wags, ear positions, and those big, soulful eyes they use to manipulate you into giving them extra treats. Learning to read their body language isn't just a party trick—it can help prevent stress, deepen your bond, and maybe even stop your dog from embarrassing you at the dog park. So, let's finally crack the code on what your dog has been trying to tell you.

Tail Wagging: Not Always a Sign of Happiness
One of the biggest myths out there is that a wagging tail means a happy dog. Nope. Not always. A dog's tail is basically their mood ring, and the way they wag tells a whole different story.
Loose, full-body wag (with bonus butt wiggles): This is the classic "OMG YOU'RE HOME!!" happy dance. A+ vibes.
Slow wag, tail held high: The "I'm analyzing this situation" wag. Suspicious, calculating, possibly deciding if you're worth their energy.
Stiff, fast wag with a raised tail: Yikes. This is "I'm on edge, don't mess with me" energy. Proceed with caution.
Low, fast wag: "I'm nervous, and I don't know what's happening, so I'm just gonna keep wiggling and hope for the best."
Tucked tail: Fear. If the tail is all the way tucked under, your dog is basically saying, "I regret everything, please don't yell at me."
Even the direction of the wag matters—researchers found that dogs wag more to the right when they're happy and to the left when they're unsure or stressed (Quaranta et al., 2007). Yes, your dog's tail literally has anxiety tells.

Ears and Eyes: The Silent Storytellers
Dogs don't just talk with their tails—they also use their ears and eyes like tiny, furry actors in a silent film.
Soft eyes, relaxed ears: Your dog is living their best life. No stress, just vibes.
Wide eyes, whites showing (a.k.a. "whale eye"): "I am uncomfortable with the energy we have created in this room." This is a warning sign—your dog feels uneasy or trapped.
Perked-up ears: "I heard something, and I will investigate." Could be excitement, curiosity, or them preparing to bark at absolutely nothing.
Ears pinned back: "I'm nervous" or "I did something bad, and I hope you don't notice." Classic guilty dog move.
Ever notice how some dogs do a little squint when they're happy? It's their version of a smile. On the flip side, prolonged direct eye contact—especially with an unfamiliar dog—can be a challenge. So, if you're having a staring contest with a dog you just met…maybe don't.

The Freeze: When Your Dog Hits Pause (And You Should Pay Attention)
If a dog suddenly stops moving and stiffens, pay attention. Freezing is often their last warning before things escalate to growling, snapping, or biting. A lot of people miss this and then wonder why their dog "suddenly" lashed out.
You might see this when:
A child is hugging a dog (which, fun fact, most dogs hate).
Someone is petting a dog too aggressively.
The dog feels cornered and has no escape route.
Research by Rooney Clark and Casey (2016) helped show that when a dog freezes, in some way or another they are stressed, its best to give them space in that moment and take a mental note of your newest training goal! Sometimes, they just need a minute to de-escalate, like when you have to breathe through a customer service call that's not going well.

Mouth Matters: Smiles vs. Stress
Dogs can technically smile, but it's not always what you think.
Loose, open mouth, tongue hanging out: Happy, relaxed, living their best life.
Closed mouth, tight lips: Alert or unsure. They're analyzing the situation.
Lips pulled back, slight teeth showing: Some dogs do a "submissive grin," which isn't aggression—it's their way of saying, "Hey, I'm friendly!"
Wrinkled nose, full teeth bared: This is aggression. Back off.
Excessive yawning in a new situation: Dogs don't just yawn when they're tired—they also yawn when they're stressed. To put it simply, they are overstimulated. (Glenk, 2020) Don't be fooled by the parrot dog, sometimes they yawn because they saw you yawn first! (D'Aniello, 2019)

Conclusion: Your Dog Has Been Sending You Texts—Now You Can Finally Read Them
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
    likes: 245,
    comments: 56,
    shares: 89
  },
  {
    id: 'blog_2',
    title: 'What Your Cat is Really Saying',
    author: {
      id: 'author_2',
      name: 'Zoe Neale',
      profilePicture: require('../../assets/ZEGN_USER.jpeg'),
      bio: 'Feline behavior specialist and veterinarian with a focus on cat-human relationships.'
    },
    publishDate: '2024-02-23',
    readTime: '7 min',
    tags: ['Cats', 'Behavior', 'Pet Care', 'Communication'],
    content: `Ever wonder why your cat stares at you before slowly blinking or why they randomly sprint across the house at 2 AM? While cats may seem mysterious, they actually have a complex system of communication—if you know what to look for. Unlike dogs, who wear their emotions on their tails (literally), cats are more subtle. But once you learn their signals, you'll start to see what your cat has been trying to tell you all along.

The Myth of the Aloof Cat: Do They Actually Care About You?
Many people think cats are independent and don't bond with their owners the way dogs do. But research suggests otherwise. A study by Vitale et al. (2019) found that cats form secure attachments to their owners, much like infants do with their caregivers. In an experiment where cats were briefly separated from their owners, many showed signs of distress when left alone and relief upon their owner's return. So yes, your cat does care about you—they just have their own way of showing it.

The Slow Blink: A Feline "I Love You"
One of the best-kept secrets of cat communication is the slow blink. If your cat locks eyes with you and then slowly closes and opens their eyes, congratulations! You've just received a cat's version of a smile. Research completed in 2020 (Humphrey) found that when humans slowly blink at their cats, the cats are more likely to return the gesture and approach them in a friendly manner. So, next time you want to say "I love you" to your cat, skip the baby talk and try a slow blink instead.

Tail Talk: Not Just for Dogs
A cat's tail is like a built-in mood ring. Learning to read tail signals can help you avoid scratches and strengthen your bond.
Tail up, tip curved: A friendly, confident cat greeting. If your cat walks toward you with their tail high, they're happy to see you.
Puffed-up tail: This is a defensive reaction. Your cat is startled or feels threatened.
Low, slow-wagging tail: Unlike dogs, a slow-wagging cat tail isn't a good sign—it often signals irritation or mild aggression.
Tail wrapped around you or another cat: This is a sign of affection, almost like holding hands.

Purring: More Than Just Happiness
Everyone loves the soothing sound of a purring cat, but did you know cats don't just purr when they're happy? While contentment is a common reason, studies suggest cats also purr when they're stressed, in pain, or even trying to heal themselves. The frequency of cat purrs (between 25 and 150 Hz) has been linked to tissue regeneration and bone healing in studies on vibrational therapy (Muggenthaler, 2001). So, if your cat is purring at the vet's office, they may not be enjoying themselves—they might just be self-soothing.

Headbutting and Kneading: Strange but Sweet Gestures
Headbutting (bunting): When your cat gently bumps their head against you, they're not just being cute—they're marking you with their scent glands, claiming you as their own (Rodan, 2015).
Kneading: The rhythmic pressing of paws against a soft surface (or your lap) is a behavior kittens use to stimulate milk flow. In adult cats, it's a sign of comfort and contentment (Brown & Bradshaw, 2016).

Do Cats Really Ignore Their Names?
If you've ever called your cat and been met with a flick of the ear but no movement, you might think they don't recognize their name. But research says otherwise. A study by Saito & Shinozuka (2013) found that cats can distinguish their names from other words, even in a household with multiple cats. They just don't always feel the need to respond. Unlike dogs, who evolved to seek human approval, cats evolved as solitary hunters. They hear you—they're just deciding whether you're worth getting up for.

The Zoomies: Science Behind the 2 AM Sprints
Those sudden, chaotic bursts of energy—also known as "zoomies"—are actually a by normal part of feline behavior. Cats are natural hunters, and their instincts tell them to be most active at dawn and dusk. If your cat has zoomies at odd hours, they might just be burning off excess energy. Providing interactive play during the day can help prevent nighttime sprints (Turner, 2021).

Conclusion: The More You Watch, the More You Understand
Cats may seem mysterious, but once you learn their language, they're basically tiny, furry drama queens with very specific ways of expressing love (and judgment). That slow blink? A kiss. That tail flick? A warning. The 2 AM zoomies? Either pent-up energy or an exorcism—we may never know.

The more you pay attention to their signals, the better you'll understand them. And honestly your cat already understands you. They know exactly how to guilt-trip you into giving extra treats, how to wake you up precisely one minute before your alarm, and how to act like they don't care—right before curling up in your lap.

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
    likes: 312,
    comments: 78,
    shares: 102
  },
  {
    id: 'blog_3',
    title: 'What Your Bird is Really Saying',
    author: {
      id: 'author_3',
      name: 'Zoe Neale',
      profilePicture: require('../../assets/ZEGN_USER.jpeg'),
      bio: 'Avian specialist and researcher focusing on bird behavior and communication.'
    },
    publishDate: '2024-02-24',
    readTime: '6 min',
    tags: ['Birds', 'Behavior', 'Pet Care', 'Avian Communication'],
    content: `Ever look at your bird and think, What's going on in that tiny dinosaur brain of yours? Well, good news—birds may not text, but they do have an entire language made up of wing flutters, tail flicks, and the occasional judgmental stare. And if you learn to read these signals, you'll finally understand what your feathered friend has been trying to tell you all along.

Let's break down the mysterious world of bird body language so you can stop guessing and start actually communicating with your avian BFF.

The Head Tilt: Curious or Plotting Something?
That adorable head tilt your bird does isn't just to make you go aww—it's actually their way of getting a better look at something. Birds process images differently than we do, so when they tilt their head, they're adjusting their angle to see more clearly (Massen et al., 2014).

Slow, curious head tilt: They're interested in what's happening and trying to analyze the situation. Basically, they're bird detectives.
Frequent or extreme tilting: Could indicate a vision issue or neurological problem—if it looks excessive, a vet visit is a good idea (Massen et al., 2014).
One-eye stare, body stiffened: A sign they're feeling cautious or potentially threatened. If they were a human, this would be the equivalent of side-eye.

Feather Fluffing: Cozy or Cranky?
Feather movements say a lot about how a bird is feeling. Think of them as mood indicators, kind of like how we use facial expressions—except, you know, with more feathers.

Fluffed-up feathers for a few seconds: Just getting comfortable. If your bird puffs up and then smooths back down, they're basically stretching.
Constantly fluffed-up feathers: Not good. This can be a sign of illness, stress, or even feeling cold (Massen et al., 2014).
Feathers sleeked back tight to the body: Your bird is nervous or possibly feeling aggressive. Approach with caution (Pika & Bugnyar, 2011).

The Wing Flutter: Excitement or Back Off?
Birds use their wings for way more than just flying—they also use them to communicate. Unfortunately, no sign language because birds dont have thumbs

Excited, quick flutters: Happiness! Your bird is basically doing a little happy dance (Osaka University, 2023).
Slow, controlled wing movements: This can be a "stay away" signal, kind of like putting up a hand to say "not now."
One wing slightly drooped: Could be a sign of injury—time to check in with your vet.

Bunting: Love, Not a Headbutt Attack
If your bird presses or rubs their beak against you, congratulations—they're bunting, which is a sign of affection (Pika & Bugnyar, 2011).

Gentle beak rubbing: They're marking you as part of their flock. You're officially theirs now.
Aggressive, sudden beak nudging: Might mean "Hey, stop that" or "Give me attention NOW."

The Stare-Down: Challenge or Trust?
Unlike with dogs, where prolonged eye contact can be a dominance move, birds love staring at their favorite humans. It's actually a good thing—eye contact helps strengthen bonds (Osaka University, 2023).

Soft, relaxed eyes: A sign of trust and comfort. They're chilling.
Wide eyes with pinning pupils: Intense excitement—or potential aggression. If they suddenly go from relaxed to laser-focused, read the room.

Tail Wagging: A Whole Different Story Than Dogs
If you thought tail wagging only meant happiness (like with dogs), think again—birds have their own unique tail signals.

Fast, side-to-side tail wagging: Happy and excited! Your bird is feeling good.
Slow, deliberate tail flick: Annoyed or getting ready to give you a warning. Think of this as their way of saying "I'm this close to losing it."
Tail fanned out: Displaying dominance or excitement—this is common in birds like parrots when they're trying to show off.

The Playful Side: Hanging Upside Down & Wing Spreading
Some birds (especially parrots) love hanging upside down like little acrobats. This is usually a sign of happiness and playfulness. If your bird does this often, they're feeling safe and confident.

Upside-down hanging: Your bird is comfortable with you and their surroundings. They trust you.
One wing slightly lifted while playing: This can be an invitation to interact—kind of like a bird's version of waving at you.

Conclusion: Your Bird Has Been Speaking—Now You're Fluent
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
    likes: 198,
    comments: 45,
    shares: 67
  }
];