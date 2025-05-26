import { debugLog } from '../context/AuthContext';

// Colorado bounds for validation
const COLORADO_BOUNDS = {
  north: 41.0,
  south: 37.0,
  east: -102.0,
  west: -109.0
};

class GeocodingQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.lastRequest = 0;
    this.minInterval = 1100; // 1.1 seconds to be safe with Nominatim rate limit
  }

  async geocode(address) {
    return new Promise((resolve, reject) => {
      this.queue.push({ address, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const { address, resolve, reject } = this.queue.shift();
      
      try {
        // Ensure we don't exceed rate limit
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequest;
        
        if (timeSinceLastRequest < this.minInterval) {
          const waitTime = this.minInterval - timeSinceLastRequest;
          debugLog('MBA7890', `Rate limiting: waiting ${waitTime}ms before next geocoding request`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastRequest = Date.now();
        const result = await this.performGeocode(address);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }

    this.processing = false;
  }

  async performGeocode(address) {
    const { street, apartment, city, state, zip } = address;
    
    // Build the address string
    let addressString = street;
    if (apartment) {
      addressString += ` ${apartment}`;
    }
    addressString += `, ${city}, ${state}`;
    if (zip) {
      addressString += ` ${zip}`;
    }
    addressString += ', USA';

    debugLog('MBA7890', 'Geocoding address:', addressString);

    const url = 'https://nominatim.openstreetmap.org/search';
    const params = new URLSearchParams({
      q: addressString,
      format: 'json',
      limit: '1',
      countrycodes: 'us',
      addressdetails: '1'
    });

    const response = await fetch(`${url}?${params}`, {
      headers: {
        'User-Agent': 'CrittrCove/1.0 (contact@crittrcove.com)' // Required by Nominatim
      }
    });

    if (response.status === 429) {
      throw new Error('RATE_LIMITED');
    }

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data || data.length === 0) {
      throw new Error('No results found');
    }

    const result = data[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    // Validate coordinates are within Colorado
    if (!this.isInColorado(lat, lng)) {
      debugLog('MBA7890', 'Address is outside Colorado bounds:', { lat, lng, address: addressString });
      throw new Error('Address must be within Colorado');
    }

    debugLog('MBA7890', 'Geocoding successful:', { lat, lng, address: addressString });
    
    return {
      latitude: lat,
      longitude: lng,
      formatted_address: result.display_name
    };
  }

  isInColorado(lat, lng) {
    return lat >= COLORADO_BOUNDS.south && 
           lat <= COLORADO_BOUNDS.north && 
           lng >= COLORADO_BOUNDS.west && 
           lng <= COLORADO_BOUNDS.east;
  }
}

// Create a singleton instance
const geocodingQueue = new GeocodingQueue();

/**
 * Geocode an address with retry logic and rate limiting
 * @param {Object} address - Address object with street, city, state, zip
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<Object>} - Coordinates object with latitude/longitude
 */
export const geocodeAddress = async (address, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await geocodingQueue.geocode(address);
      return result;
    } catch (error) {
      debugLog('MBA7890', `Geocoding attempt ${attempt} failed:`, error.message);
      
      if (error.message === 'RATE_LIMITED' && attempt < maxRetries) {
        // Exponential backoff for rate limiting
        const waitTime = Math.pow(2, attempt) * 1000;
        debugLog('MBA7890', `Rate limited, waiting ${waitTime}ms before retry`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      if (attempt === maxRetries) {
        throw error;
      }
    }
  }
};

/**
 * Geocode an address with graceful fallback
 * Returns coordinates if successful, null if failed (but doesn't throw)
 * @param {Object} address - Address object
 * @returns {Promise<Object|null>} - Coordinates or null
 */
export const geocodeAddressGraceful = async (address) => {
  try {
    return await geocodeAddress(address);
  } catch (error) {
    debugLog('MBA7890', 'Geocoding failed gracefully:', error.message);
    return null;
  }
};

/**
 * Validate if coordinates are within Colorado bounds
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean} - True if within Colorado
 */
export const isInColorado = (lat, lng) => {
  return lat >= COLORADO_BOUNDS.south && 
         lat <= COLORADO_BOUNDS.north && 
         lng >= COLORADO_BOUNDS.west && 
         lng <= COLORADO_BOUNDS.east;
}; 