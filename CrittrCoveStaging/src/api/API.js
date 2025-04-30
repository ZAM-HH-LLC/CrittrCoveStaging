import axios from 'axios';
import { API_BASE_URL } from '../config/config';
import { getStorage, debugLog } from '../context/AuthContext';
import { Platform } from 'react-native';
import { convertToUTC, formatDateForAPI, formatTimeForAPI } from '../utils/time_utils';

/**
 * Handles authentication errors (401) gracefully
 * This should be called by API functions when they receive a 401 response
 * @param {Object} error - The error object from catch block
 * @returns {Error} A standardized error that can be displayed to the user
 */
const handleAuthError = (error) => {
  // Only process if it's a 401 error with token_not_valid code
  if (error.response?.status === 401 && error.response?.data?.code === 'token_not_valid') {
    debugLog('MBA54321', 'Auth error handler: Token invalid detected');
    
    // Clear tokens from storage
    if (Platform.OS === 'web') {
      sessionStorage.removeItem('userToken');
      sessionStorage.removeItem('refreshToken');
      sessionStorage.setItem('explicitSignOut', 'true');
    } else {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      AsyncStorage.multiRemove(['userToken', 'refreshToken']);
    }
    
    // Navigate to sign-in page after a brief delay
    setTimeout(() => {
      const { navigate } = require('../../App');
      navigate('SignIn');
    }, 0);
    
    // Return standardized error message
    return new Error('Your session has expired. Please sign in again to continue.');
  }
  
  // If not a token error, return the original error
  return error;
};

// Create API client for standardized requests
const createApiClient = async () => {
  const token = await getStorage('userToken');
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    }
  });
};

// Helper function to get API client instance
const getApiClient = async () => {
  return await createApiClient();
};

// Get all professional services for service manager screen
export const getProfessionalServices = async () => {
  try {
    debugLog('MBA7890: Fetching professional services');
    
    const apiClient = await getApiClient();
    const response = await apiClient.get('/api/services/v1/professional/services/');
    
    return response.data;
  } catch (error) {
    debugLog('MBA7890: Error fetching professional services:', error);
    debugLog('MBA7890: Error details:', error.response?.data || error.message);
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
    debugLog('MBA12345 Error fetching available services:', error);
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
    debugLog('MBA12345 Error fetching available pets:', error);
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
    debugLog('Error approving booking:', error);
    throw error;
  }
};

/**
 * Get detailed booking information by ID
 * @param {string|number} bookingId - ID of the booking to retrieve
 * @returns {Promise<Object>} - Detailed booking information
 */
export const getBookingDetails = async (bookingId) => {
  try {
    const token = await getStorage('userToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    debugLog('MBA88899', 'Fetching booking details for ID:', bookingId);

    const response = await axios.get(
      `${API_BASE_URL}/api/bookings/v1/${bookingId}/details/`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    debugLog('MBA88899', 'Booking details fetched successfully');
    return response.data;
  } catch (error) {
    debugLog('MBA88899', 'Error fetching booking details:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Request changes to a booking
 * @param {string|number} bookingId - ID of the booking to request changes for
 * @param {string} message - Message explaining the requested changes
 * @returns {Promise<Object>} - Response from the API
 */
export const requestBookingChanges = async (bookingId, message) => {
  try {
    const token = await getStorage('userToken');
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    debugLog('MBA88899 Requesting changes for booking ID:', bookingId);
    debugLog('MBA88899 Change request message:', message);
    
    const response = await axios.post(
      `${API_BASE_URL}/api/bookings/v1/${bookingId}/request-changes/`,
      { message },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    debugLog('MBA88899 Change request submitted successfully');
    return response.data;
  } catch (error) {
    debugLog('MBA88899 Error requesting booking changes:', error);
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
        debugLog('MBA5asdt3f4321 - Updating booking draft time and date:', {
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

        debugLog('MBA5asdt3f4321 - Booking draft time and date update response:', response.data);
        return response.data;
    } catch (error) {
        debugLog('MBA5asdt3f4321 Error updating booking draft time and date:', error);
        throw error;
    }
};

export const updateBookingDraftMultipleDays = async (draftId, data) => {
    try {
        debugLog('MBA5asdt3f4321 - Updating booking draft multiple days:', {
            draftId,
            data
        });

        // Convert each date's times to UTC
        const utcDates = data.dates.map(date => {
            // Format the date for API
            const dateStr = formatDateForAPI(date);
            
            // Format and convert times to UTC
            const { date: utcStartDate, time: utcStartTime } = convertToUTC(
                dateStr,
                data.times.startTime,
                'US/Mountain'
            );

            const { date: utcEndDate, time: utcEndTime } = convertToUTC(
                dateStr,
                data.times.endTime,
                'US/Mountain'
            );

            return {
                date: utcStartDate,
                startTime: utcStartTime,
                endTime: utcEndTime
            };
        });

        debugLog('MBA5asdt3f4321 - Converted UTC dates:', utcDates);

        const response = await axios.post(
            `${API_BASE_URL}/api/booking_drafts/v1/update-multiple-days/${draftId}/`,
            { dates: utcDates },
            {
                headers: {
                    Authorization: `Bearer ${await getStorage('userToken')}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        debugLog('MBA5asdt3f4321 - Booking draft multiple days update response:', response.data);
        return response.data;
    } catch (error) {
        debugLog('MBA5asdt3f4321 Error updating booking draft multiple days:', error);
        throw error;
    }
};

export const updateBookingDraftRecurring = async (draftId, recurringData) => {
    try {
        debugLog('MBA5asdt3f4321 - Updating booking draft recurring dates:', {
            draftId,
            recurringData
        });

        const response = await axios.post(
            `${API_BASE_URL}/api/booking_drafts/v1/update-recurring/${draftId}/`,
            recurringData,
            {
                headers: {
                    Authorization: `Bearer ${await getStorage('userToken')}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        debugLog('MBA5asdt3f4321 - Booking draft recurring update response:', response.data);
        return response.data;
    } catch (error) {
        debugLog('MBA5asdt3f4321 Error updating booking draft recurring dates:', error);
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
 * Get user profile data
 * @returns {Promise<Object>} - User profile data
 */
export const userProfile = async () => {
  const url = `${API_BASE_URL}/api/users/v1/profile/`;
  
  try {
    const token = await getStorage('userToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    debugLog('MBA12345', 'Fetching user profile data');
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    debugLog('MBA12345', 'User profile data fetched successfully:', {
      name: data.name,
      email: data.email,
      address: data.address
    });
    
    return data;
  } catch (error) {
    debugLog('MBA12345', 'Error in userProfile:', error);
    throw error;
  }
};

/**
 * Update user profile information
 * @param {Object} profileData - Data to update in the user profile
 * @returns {Promise<Object>} - Only the updated fields
 */
export const updateProfileInfo = async (profileData) => {
  try {
    debugLog('MBA76543', 'Updating profile info with data:', profileData);
    
    const token = await getStorage('userToken');
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    // Handle FormData differently than JSON
    const isFormData = profileData instanceof FormData;
    
    debugLog('MBA76543', `Making ${isFormData ? 'FormData' : 'JSON'} request to update profile`);
    
    const response = await fetch(`${API_BASE_URL}/api/users/v1/update-profile/`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      },
      body: isFormData ? profileData : JSON.stringify(profileData),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    const updatedProfile = await response.json();
    
    debugLog('MBA76543', 'Profile updated successfully with response:', updatedProfile);
    return updatedProfile;
  } catch (error) {
    debugLog('MBA76543', 'Error updating profile info:', error);
    throw error;
  }
};

/**
 * Add a new pet to the user's account
 * This function sends pet data to the backend to create a new pet record
 * @param {Object} petData - Object containing the pet details
 * @returns {Promise<Object>} - Created pet data from the backend
 */
export const addPet = async (petData) => {
  try {
    const token = await getStorage('userToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    debugLog('MBA789', 'Adding new pet with data:', petData);

    const response = await axios.post(
      `${API_BASE_URL}/api/pets/v1/add-pet/`,
      petData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    debugLog('MBA789', 'Pet added successfully:', response.data);
    
    // Return the data in a standardized format
    return response.data;
  } catch (error) {
    debugLog('MBA789', 'Error adding pet:', error);
    throw error;
  }
};

/**
 * Update an existing pet
 * This function sends updated pet data to the backend to update an existing pet record
 * @param {string|number} petId - The ID of the pet to update
 * @param {Object} petData - Object containing the updated pet details
 * @returns {Promise<Object>} - Updated pet data from the backend
 */
export const updatePet = async (petId, petData) => {
  try {
    const token = await getStorage('userToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    debugLog('MBA789', 'Updating pet with ID:', petId, 'and data:', petData);

    const response = await axios.patch(
      `${API_BASE_URL}/api/pets/v1/${petId}/`,
      petData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    debugLog('MBA789', 'Pet updated successfully:', response.data);
    return response.data;
  } catch (error) {
    debugLog('MBA789', 'Error updating pet:', error);
    throw error;
  }
};

/**
 * Fix the owner of a pet by assigning the current user
 * This is used to repair pets that have a null owner field
 * @param {string|number} petId - The ID of the pet to fix
 * @returns {Promise<Object>} - Updated pet data from the backend
 */
export const fixPetOwner = async (petId) => {
  try {
    const token = await getStorage('userToken');
    if (!token) {
      throw new Error('No authentication token found');
    }

    debugLog('MBA789', 'Fixing owner for pet with ID:', petId);

    const response = await axios.post(
      `${API_BASE_URL}/api/pets/v1/${petId}/fix-owner/`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    debugLog('MBA789', 'Pet owner fixed successfully:', response.data);
    return response.data;
  } catch (error) {
    debugLog('MBA789', 'Error fixing pet owner:', error);
    throw error;
  }
};

/**
 * Creates a new professional service
 * @param {Object} serviceData - Data for the new service
 * @returns {Promise<Object>} - The created service data
 */
export const createService = async (serviceData) => {
  try {
    // Log the data we're sending to the server
    debugLog('MBA54321', 'Creating new service - sending data to backend:', serviceData);

    // Format animal_types as a dictionary mapping animal types to their categories
    let formattedAnimalTypes = {};
    
    if (serviceData.animal_types && Array.isArray(serviceData.animal_types)) {
      // Convert array format to dictionary
      serviceData.animal_types.forEach(animal => {
        if (typeof animal === 'object' && animal.name && animal.category) {
          formattedAnimalTypes[animal.name] = animal.category;
        } else if (typeof animal === 'string') {
          formattedAnimalTypes[animal] = 'Other';
        }
      });
    } else if (serviceData.animal_types && typeof serviceData.animal_types === 'object') {
      // If it's already a dictionary, use it directly
      formattedAnimalTypes = serviceData.animal_types;
    } else if (serviceData.animal_type) {
      // Fallback to legacy single animal_type
      formattedAnimalTypes[serviceData.animal_type] = 'Other';
    } else {
      // Default
      formattedAnimalTypes['Other'] = 'Other';
    }
    
    // Format additional rates to ensure rate values are strings
    const formattedAdditionalRates = (serviceData.additional_rates || []).map(rate => ({
      ...rate,
      rate: String(rate.rate)
    }));
    
    // Make sure all numeric values are properly formatted as strings to avoid type issues
    const formattedData = {
      ...serviceData,
      base_rate: String(serviceData.base_rate),
      additional_animal_rate: String(serviceData.additional_animal_rate || 0),
      holiday_rate: String(serviceData.holiday_rate || 0),
      animal_types: formattedAnimalTypes,
      additional_rates: formattedAdditionalRates
    };
    
    // Log we're sending the additional rates too
    debugLog('MBA54321', 'Sending additional rates to backend:', formattedData.additional_rates);

    const apiClient = await getApiClient();
    const response = await apiClient.post('/api/services/v1/create/', formattedData);

    debugLog('MBA54321', 'Service created successfully - backend response:', response.data);
    return response.data;
  } catch (error) {
    debugLog('MBA54321', 'Error creating service:', error);
    debugLog('MBA54321', 'Error response data:', error.response?.data);
    
    // Check for authentication errors using the centralized handler
    const authError = handleAuthError(error);
    if (authError !== error) {
      // If handleAuthError processed this as an auth error, throw the new error
      throw authError;
    }
    
    // Otherwise rethrow the original error
    throw error;
  }
};

/**
 * Delete a service by ID
 * @param {number} serviceId - ID of the service to delete
 * @returns {Promise<Object>} Response data with success message or error details
 */
export const deleteService = async (serviceId) => {
  try {
    debugLog('MBA7890: Deleting service with ID:', serviceId);

    const apiClient = await getApiClient();
    const response = await apiClient.delete(`/api/services/v1/delete/${serviceId}/`);

    debugLog('MBA7890: Service deleted successfully - backend response:', response.data);
    return response.data;
  } catch (error) {
    debugLog('MBA7890: Error deleting service:', error);
    debugLog('MBA7890: Error response data:', error.response?.data);
    throw error;
  }
};

// Function to update an existing service
export const updateService = async (serviceData) => {
  try {
    const apiClient = await getApiClient();
    debugLog('API updateService', 'Updating service with data:', serviceData);
    
    const response = await apiClient.patch(`/api/services/v1/update/${serviceData.service_id}/`, serviceData);
    
    debugLog('API updateService Response:', response.data);
    return response.data;
  } catch (error) {
    debugLog('API updateService Error:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get professional's client connections, returning necessary client data
 * @param {number} page - Page number for pagination
 * @returns {Promise<Object>} Object containing connections and pagination info
 */
export const getUserConnections = async (page = 1) => {
  try {
    debugLog('MBA4321 Fetching client connections, page:', page);
    
    const apiClient = await getApiClient();
    const response = await apiClient.get('/api/bookings/v1/connections/', {
      params: {
        page
      }
    });
    
    debugLog('MBA4321 Connections response:', response.data);
    
    return response.data;
  } catch (error) {
    debugLog('MBA4321 Error fetching connections:', error);
    debugLog('MBA4321 Error details:', error.response?.data || error.message);
    
    // Handle auth error gracefully
    if (error.response?.status === 401) {
      throw handleAuthError(error);
    }
    
    throw error;
  }
};

/**
 * Get profile details for a specific connection
 * @param {string} userId - The ID of the user to get profile details for
 * @param {string} type - The type of connection ('client' or 'professional')
 * @returns {Promise<Object>} Object containing detailed profile info
 */
export const getConnectionProfile = async (userId, type = 'client') => {
  try {
    debugLog('MBA4321 Fetching connection profile:', { userId, type });
    
    const apiClient = await getApiClient();
    const response = await apiClient.get(`/api/connections/v1/profile/${userId}/`, {
      params: { type }
    });
    
    debugLog('MBA4321 Connection profile response:', response.data);
    
    return response.data;
  } catch (error) {
    debugLog('MBA4321 Error fetching connection profile:', error);
    debugLog('MBA4321 Error details:', error.response?.data || error.message);
    
    // Handle auth error gracefully
    if (error.response?.status === 401) {
      throw handleAuthError(error);
    }
    
    throw error;
  }
};

/**
 * Invite a client to connect with a professional via email or link
 * 
 * @param {string} type - Type of invitation: 'email' or 'link'
 * @param {string} email - The email address of the client to invite (required if type is 'email')
 * @returns {Promise<Object>} Object containing result of invitation, including invitation_link for link invitations
 */
export const inviteClient = async (type = 'email', email = null) => {
  try {
    debugLog('MBA4321 Inviting client:', { type, email });
    
    const apiClient = await getApiClient();
    const response = await apiClient.post('/api/users/v1/invitations/', {
      type,
      email,
      is_professional_invite: true
    });
    
    debugLog('MBA4321 Invite client response:', response.data);
    
    return response.data;
  } catch (error) {
    debugLog('MBA4321 Error inviting client:', error);
    debugLog('MBA4321 Error details:', error.response?.data || error.message);
    
    // Handle auth error gracefully
    if (error.response?.status === 401) {
      throw handleAuthError(error);
    }
    
    throw error;
  }
};

/**
 * Send a referral to invite someone to join CrittrCove
 * 
 * @param {string} type - Type of invitation: 'email' or 'link'
 * @param {string} email - The email address to refer (required if type is 'email')
 * @param {string} referralType - The type of referral: 'client_to_client', 'client_to_professional', or 'professional_to_professional'
 * @returns {Promise<Object>} Object containing result of referral, including invitation_link for link referrals
 */
export const sendReferral = async (type = 'email', email = null, referralType) => {
  try {
    debugLog('MBA4321 Sending referral:', { type, email, referralType });
    
    const apiClient = await getApiClient();
    const response = await apiClient.post('/api/users/v1/invitations/', {
      type,
      email,
      is_professional_invite: false,
      referral_type: referralType
    });
    
    debugLog('MBA4321 Send referral response:', response.data);
    
    return response.data;
  } catch (error) {
    debugLog('MBA4321 Error sending referral:', error);
    debugLog('MBA4321 Error details:', error.response?.data || error.message);
    
    // Handle auth error gracefully
    if (error.response?.status === 401) {
      throw handleAuthError(error);
    }
    
    throw error;
  }
};

/**
 * Get a list of all invitations created by the current user
 * 
 * @param {string} type - Type of invitations to fetch: 'all', 'professional', or 'referral'
 * @returns {Promise<Array>} Array of invitation objects
 */
export const getInvitations = async (type = 'all') => {
  try {
    debugLog('MBA4321 Getting invitations:', { type });
    
    const apiClient = await getApiClient();
    const response = await apiClient.get(`/api/users/v1/invitations/?type=${type}`);
    
    debugLog('MBA4321 Get invitations response:', response.data);
    
    return response.data;
  } catch (error) {
    debugLog('MBA4321 Error getting invitations:', error);
    debugLog('MBA4321 Error details:', error.response?.data || error.message);
    
    // Handle auth error gracefully
    if (error.response?.status === 401) {
      throw handleAuthError(error);
    }
    
    throw error;
  }
};

/**
 * Get details of a specific invitation
 * 
 * @param {string} token - The invitation token
 * @returns {Promise<Object>} Invitation details
 */
export const getInvitationDetails = async (token) => {
  try {
    debugLog('MBA4321 Getting invitation details:', { token });
    
    const apiClient = await getApiClient();
    const response = await apiClient.get(`/api/users/v1/invitations/${token}/`);
    
    debugLog('MBA4321 Get invitation details response:', response.data);
    
    return response.data;
  } catch (error) {
    debugLog('MBA4321 Error getting invitation details:', error);
    debugLog('MBA4321 Error details:', error.response?.data || error.message);
    
    // Handle auth error gracefully
    if (error.response?.status === 401) {
      throw handleAuthError(error);
    }
    
    throw error;
  }
};

/**
 * Verify if an invitation is valid
 * This endpoint doesn't require authentication
 * 
 * @param {string} token - The invitation token
 * @returns {Promise<Object>} Object with valid flag and invitation details
 */
export const verifyInvitation = async (token) => {
  try {
    debugLog('MBA4321 Verifying invitation:', { token });
    debugLog('MBA4321 Verification endpoint:', `${API_BASE_URL}/api/users/v1/invitations/${token}/verify/`);
    
    // Don't use the authenticated API client since this doesn't require auth
    const response = await axios.get(`${API_BASE_URL}/api/users/v1/invitations/${token}/verify/`);
    
    debugLog('MBA4321 Verify invitation response:', response.data);
    
    return response.data;
  } catch (error) {
    debugLog('MBA4321 Error verifying invitation:', error);
    debugLog('MBA4321 Error details:', error.response?.data || error.message);
    
    throw error;
  }
};

/**
 * Accept an invitation and create a connection between client and professional
 * 
 * @param {string} token - The invitation token
 * @returns {Promise<Object>} Result of accepting the invitation
 */
export const acceptInvitation = async (token) => {
  try {
    debugLog('MBA4321 Accepting invitation:', { token });
    
    const apiClient = await getApiClient();
    const response = await apiClient.post(`/api/users/v1/invitations/${token}/accept/`);
    
    debugLog('MBA4321 Accept invitation response:', response.data);
    
    return response.data;
  } catch (error) {
    debugLog('MBA4321 Error accepting invitation:', error);
    debugLog('MBA4321 Error details:', error.response?.data || error.message);
    
    // Handle auth error gracefully
    if (error.response?.status === 401) {
      throw handleAuthError(error);
    }
    
    throw error;
  }
};

/**
 * Delete/cancel an invitation
 * 
 * @param {string} token - The invitation token
 * @returns {Promise<void>}
 */
export const deleteInvitation = async (token) => {
  try {
    debugLog('MBA4321 Deleting invitation:', { token });
    
    const apiClient = await getApiClient();
    await apiClient.delete(`/api/users/v1/invitations/${token}/`);
    
    debugLog('MBA4321 Delete invitation success');
    
    return true;
  } catch (error) {
    debugLog('MBA4321 Error deleting invitation:', error);
    debugLog('MBA4321 Error details:', error.response?.data || error.message);
    
    // Handle auth error gracefully
    if (error.response?.status === 401) {
      throw handleAuthError(error);
    }
    
    throw error;
  }
};

/**
 * Resend an invitation email
 * 
 * @param {string} token - The invitation token
 * @returns {Promise<Object>} Result of resending the invitation
 */
export const resendInvitation = async (token) => {
  try {
    debugLog('MBA4321 Resending invitation:', { token });
    
    const apiClient = await getApiClient();
    const response = await apiClient.post(`/api/users/v1/invitations/${token}/resend/`);
    
    debugLog('MBA4321 Resend invitation response:', response.data);
    
    return response.data;
  } catch (error) {
    debugLog('MBA4321 Error resending invitation:', error);
    debugLog('MBA4321 Error details:', error.response?.data || error.message);
    
    // Handle auth error gracefully
    if (error.response?.status === 401) {
      throw handleAuthError(error);
    }
    
    throw error;
  }
};

/**
 * Update booking draft rates and recalculate cost summary
 * @param {string} draftId - The ID of the booking draft to update
 * @param {Array} occurrences - Array of occurrence objects with updated rates
 * @returns {Promise<Object>} Updated draft data
 */
export const updateBookingDraftRates = async (draftId, occurrences) => {
    try {
        debugLog('MBA98765 - Updating booking draft rates:', {
            draftId,
            occurrences
        });

        const response = await axios.post(
            `${API_BASE_URL}/api/booking_drafts/v1/update-rates/${draftId}/`,
            {
                occurrences
            },
            {
                headers: {
                    Authorization: `Bearer ${await getStorage('userToken')}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        debugLog('MBA98765 - Booking draft rates update response:', response.data);
        return response.data;
    } catch (error) {
        debugLog('MBA98765 Error updating booking draft rates:', error);
        throw error;
    }
};

/**
 * Create a booking from a draft
 * Called when the professional confirms a booking from the booking step modal
 * @param {string} conversationId - The ID of the conversation containing the draft
 * @returns {Promise<Object>} Response containing the new booking information and message
 */
export const createBookingFromDraft = async (conversationId) => {
    try {
        debugLog('MBA66777 - Creating booking from draft:', {
            conversationId
        });

        const response = await axios.post(
            `${API_BASE_URL}/api/bookings/v1/create-from-draft/`,
            {
                conversation_id: conversationId
            },
            {
                headers: {
                    Authorization: `Bearer ${await getStorage('userToken')}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        debugLog('MBA66777 - Booking created from draft:', response.data);
        return response.data;
    } catch (error) {
        debugLog('MBA66777 Error creating booking from draft:', error);
        throw error;
    }
};

/**
 * Get count of unread messages for the current user
 * @returns {Promise<Object>} - Object containing unread message count
 */
export const getUnreadMessageCount = async () => {
  try {
    const apiClient = await getApiClient();
    debugLog("MBA4321: Fetching unread message count");
    
    const response = await apiClient.get('/api/messages/v1/unread-count/');
    
    debugLog("MBA4321: Unread count fetched:", response.data);
    return response.data;
  } catch (error) {
    debugLog("MBA4321: Error with unread message count:", error.message);
    
    // Handle auth error gracefully
    if (error.response?.status === 401) {
      throw handleAuthError(error);
    }
    
    // Return 0 as default in case of error
    return { unread_count: 0, unread_conversations: 0 };
  }
};
