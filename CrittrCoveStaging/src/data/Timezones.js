// Centralized timezone data for the entire application

// Complete mapping of all backend timezone IDs to display names
// This ensures any timezone returned by the backend can be translated to a user-friendly name
export const TIMEZONE_MAPPING = {
  // Eastern Time Zone (UTC-5)
  'America/New_York': 'Eastern Time',
  'America/Detroit': 'Eastern Time',
  'America/Indiana/Indianapolis': 'Eastern Time',
  'America/Indiana/Marengo': 'Eastern Time',
  'America/Indiana/Vincennes': 'Eastern Time',
  'America/Indiana/Tell_City': 'Eastern Time',
  'America/Indiana/Petersburg': 'Eastern Time',
  'America/Indiana/Vevay': 'Eastern Time',
  'America/Indiana/Winamac': 'Eastern Time',
  'America/Kentucky/Louisville': 'Eastern Time',
  'America/Kentucky/Monticello': 'Eastern Time',
  
  // Central Time Zone (UTC-6)
  'America/Chicago': 'Central Time',
  'America/Indiana/Knox': 'Central Time',
  'America/Menominee': 'Central Time',
  'America/North_Dakota/Center': 'Central Time',
  'America/North_Dakota/New_Salem': 'Central Time',
  'America/North_Dakota/Beulah': 'Central Time',
  
  // Mountain Time Zone (UTC-7)
  'America/Denver': 'Mountain Time',
  'America/Boise': 'Mountain Time',
  'America/Phoenix': 'Mountain Time (No DST)',
  
  // Pacific Time Zone (UTC-8)
  'America/Los_Angeles': 'Pacific Time',
  
  // Alaska Time Zone (UTC-9)
  'America/Anchorage': 'Alaska Time',
  'America/Juneau': 'Alaska Time',
  'America/Sitka': 'Alaska Time',
  'America/Metlakatla': 'Alaska Time',
  'America/Yakutat': 'Alaska Time',
  'America/Nome': 'Alaska Time',
  
  // Hawaii-Aleutian Time Zone (UTC-10)
  'Pacific/Honolulu': 'Hawaii Time',
  'America/Adak': 'Hawaii-Aleutian Time',
  
  // UTC
  'UTC': 'UTC',
};

// Simplified timezone options for user selection
// These are the only options users will see in the dropdown
export const USER_TIMEZONE_OPTIONS = [
  { 
    id: 'America/New_York', 
    displayName: 'Eastern Time', 
    searchTerms: ['eastern', 'est', 'edt', 'new york', 'florida', 'georgia', 'virginia', 'north carolina', 'south carolina', 'tennessee', 'kentucky', 'ohio', 'pennsylvania', 'new jersey', 'connecticut', 'rhode island', 'massachusetts', 'vermont', 'new hampshire', 'maine', 'delaware', 'maryland', 'west virginia', 'washington dc', 'michigan', 'indiana'],
    zone: 'Eastern'
  },
  { 
    id: 'America/Chicago', 
    displayName: 'Central Time', 
    searchTerms: ['central', 'cst', 'cdt', 'texas', 'illinois', 'alabama', 'arkansas', 'iowa', 'kansas', 'louisiana', 'minnesota', 'mississippi', 'missouri', 'nebraska', 'north dakota', 'oklahoma', 'south dakota', 'wisconsin', 'chicago'],
    zone: 'Central'
  },
  { 
    id: 'America/Denver', 
    displayName: 'Mountain Time', 
    searchTerms: ['mountain', 'mst', 'mdt', 'colorado', 'montana', 'utah', 'wyoming', 'new mexico', 'idaho', 'denver'],
    zone: 'Mountain'
  },
  { 
    id: 'America/Phoenix', 
    displayName: 'Mountain Time (No DST)', 
    searchTerms: ['arizona', 'phoenix', 'mountain no dst', 'mst arizona'],
    zone: 'Mountain'
  },
  { 
    id: 'America/Los_Angeles', 
    displayName: 'Pacific Time', 
    searchTerms: ['pacific', 'pst', 'pdt', 'california', 'washington', 'oregon', 'nevada', 'los angeles', 'san francisco', 'seattle', 'portland'],
    zone: 'Pacific'
  },
  { 
    id: 'America/Anchorage', 
    displayName: 'Alaska Time', 
    searchTerms: ['alaska', 'akst', 'akdt', 'anchorage', 'juneau', 'fairbanks'],
    zone: 'Alaska'
  },
  { 
    id: 'Pacific/Honolulu', 
    displayName: 'Hawaii Time', 
    searchTerms: ['hawaii', 'hst', 'honolulu', 'maui', 'big island', 'kauai', 'oahu'],
    zone: 'Hawaii'
  },
  { 
    id: 'UTC', 
    displayName: 'UTC', 
    searchTerms: ['utc', 'coordinated universal time', 'gmt', 'greenwich'],
    zone: 'UTC'
  },
];

// Function to get display name from backend timezone ID
export const getTimezoneDisplayName = (timezoneId) => {
  return TIMEZONE_MAPPING[timezoneId] || timezoneId;
};

// Function to search timezones based on query
export const searchTimezones = (query) => {
  if (!query) return USER_TIMEZONE_OPTIONS;
  
  const searchTerm = query.toLowerCase();
  return USER_TIMEZONE_OPTIONS.filter(tz => 
    tz.displayName.toLowerCase().includes(searchTerm) ||
    tz.searchTerms.some(term => term.includes(searchTerm))
  );
};

// Function to group timezones by zone for display
export const getGroupedTimezones = (timezones = USER_TIMEZONE_OPTIONS) => {
  return timezones.reduce((groups, tz) => {
    const zone = tz.zone;
    if (!groups[zone]) {
      groups[zone] = [];
    }
    groups[zone].push(tz);
    return groups;
  }, {});
}; 