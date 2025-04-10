import axios from 'axios';
import { API_BASE_URL } from '../config/config';
import { getStorage, debugLog } from '../context/AuthContext';

// Get all professional services for service manager screen
export const getProfessionalServices = async () => {
  try {
    const token = await getStorage('userToken');
    const response = await axios.get(`${API_BASE_URL}/api/services/v1/professional/services/`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('MBA123: Error fetching professional services:', error);
    throw error;
  }
};

// Get all available services for a pro and
// return the selected ones in the draft
export const getBookingAvailableServices = async (bookingId) => {
  try {
    const token = await getStorage('userToken');
    const response = await axios.get(
      `${API_BASE_URL}/api/booking_drafts/v1/${bookingId}/available_services/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('MBA12345 Error fetching available services:', error);
    throw error;
  }
};

export const getBookingAvailablePets = async (bookingId) => {
  try {
    const token = await getStorage('userToken');
    const response = await axios.get(
      `${API_BASE_URL}/api/booking_drafts/v1/${bookingId}/available_pets/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('MBA12345 Error fetching available pets:', error);
    throw error;
  }
};

export const approveBooking = async (bookingId) => {
  try {
    const token = await getStorage('userToken');
    const response = await axios.post(
      `${API_BASE_URL}/api/bookings/v1/${bookingId}/approve/`,
      {},  // Empty body since we don't need to send any data
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error approving booking:', error);
    throw error;
  }
};

export const updateBookingDraftPetsAndServices = async (draftId, data) => {
  try {
    const token = await getStorage('userToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.patch(
      `${API_BASE_URL}/api/booking_drafts/v1/${draftId}/update_pets_and_services/`,
      data,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    debugLog('MBA12345 Draft update response:', response.data);

    return response.data;
  } catch (error) {
    debugLog('MBA12345 Error updating booking draft:', error);
    throw error;
  }
};

export const updateBookingDraftTimeAndDate = async (draftId, startDate, endDate, startTime, endTime) => {
    try {
        console.log('MBA1234 - Updating booking draft time and date:', {
            draftId,
            startDate,
            endDate,
            startTime,
            endTime
        });

        const response = await axios.post(
            `${API_BASE_URL}/api/booking_drafts/v1/update-time-and-date/${draftId}/`,
            {
                start_date: startDate,
                end_date: endDate,
                start_time: startTime,
                end_time: endTime
            },
            {
                headers: {
                    Authorization: `Bearer ${await getStorage('userToken')}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('MBA1234 - Booking draft time and date update response:', response.data);
        return response.data;
    } catch (error) {
        console.error('MBA98765 Error updating booking draft time and date:', error);
        throw error;
    }
};

/**
 * Get user's time settings (timezone and military time preference)
 * @returns {Promise<Object>} Object containing timezone and use_military_time
 */
export const getTimeSettings = async () => {
  try {
    const token = await getStorage('userToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.get(
      `${API_BASE_URL}/api/users/v1/time-settings/`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    debugLog('MBA12345 Error fetching time settings', error);
    throw error;
  }
};

/**
 * Update user's time settings
 * @param {Object} settings - Object containing timezone and/or use_military_time
 * @returns {Promise<Object>} Updated time settings
 */
export const updateTimeSettings = async (settings) => {
  try {
    const token = await getStorage('userToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Ensure settings is an object
    const data = typeof settings === 'object' ? settings : { timezone: settings };
    
    debugLog('MBA12345 Sending time settings update', data);

    const response = await axios.post(
      `${API_BASE_URL}/api/users/v1/update-time-settings/`,
      data,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    debugLog('MBA12345 Error updating time settings', error);
    throw error;
  }
};

/**
 * Get user's name from the backend
 * @returns {Promise<Object>} Object containing name and first_name
 */
export const getUserName = async () => {
  try {
    const token = await getStorage('userToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await axios.get(
      `${API_BASE_URL}/api/users/v1/get-name/`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    debugLog('MBA12345 Error fetching user name', error);
    throw error;
  }
};

/**
 * Get or update user profile data
 * @param {Object} data - Optional data for updating profile
 * @returns {Promise<Object>} - User profile data
 */
export const userProfile = async (data = null) => {
  const url = `${API_BASE_URL}/api/users/v1/profile/`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await getStorage('userToken')}`,
      },
      ...(data && { body: JSON.stringify(data) }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error in userProfile:', error);
    throw error;
  }
};

/**
 * Update user profile information
 * @param {Object} profileData - Data to update in the user profile
 * @returns {Promise<Object>} - Only the updated fields, not the entire profile data
 */
export const updateProfileInfo = async (profileData) => {
  try {
    const token = await getStorage('userToken');
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    debugLog('MBA76543', 'Updating profile info with data:', profileData);
    
    // Check if we're dealing with FormData (for image uploads) or regular JSON data
    const isFormData = profileData instanceof FormData;
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': isFormData ? 'multipart/form-data' : 'application/json'
    };
    
    const response = await axios.patch(
      `${API_BASE_URL}/api/users/v1/update_profile_info/`,
      profileData,
      { headers }
    );
    
    // The backend returns only the updated fields, not the complete profile
    const updatedFields = response.data;
    debugLog('MBA76543', 'Updated fields received:', updatedFields);
    
    return updatedFields;
  } catch (error) {
    debugLog('MBA76543', 'Error updating profile info:', error);
    throw error;
  }
};
