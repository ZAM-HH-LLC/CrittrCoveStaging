import axios from 'axios';
import { API_BASE_URL } from '../config/config';
import { debugLog } from '../context/AuthContext';
import { Platform } from 'react-native';
import { convertToUTC, formatDateForAPI, formatTimeForAPI } from '../utils/time_utils';

// Get all professional services for service manager screen
export const getProfessionalServices = async () => {
  try {
    debugLog('MBA7890: Fetching professional services');
    
    const response = await axios.get(`${API_BASE_URL}/api/services/v1/professional/services/`);
    
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
    const response = await axios.get(
      `${API_BASE_URL}/api/booking_drafts/v1/${bookingId}/available_services/`
    );
    return response.data;
  } catch (error) {
    debugLog('MBA12345 Error fetching available services:', error);
    throw error;
  }
};

export const getBookingAvailablePets = async (bookingId) => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/booking_drafts/v1/${bookingId}/available_pets/`
    );
    return response.data;
  } catch (error) {
    debugLog('MBA12345 Error fetching available pets:', error);
    throw error;
  }
};

export const approveBooking = async (bookingId) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/bookings/v1/${bookingId}/approve/`,
      {}  // Empty body since we don't need to send any data
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
    debugLog('MBA88899', 'Fetching booking details for ID:', bookingId);

    const response = await axios.get(
      `${API_BASE_URL}/api/bookings/v1/${bookingId}/details/`
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
    debugLog('MBA88899 Requesting changes for booking ID:', bookingId);
    debugLog('MBA88899 Change request message:', message);
    
    const response = await axios.post(
      `${API_BASE_URL}/api/bookings/v1/${bookingId}/request-changes/`,
      { message }
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
    const response = await axios.patch(
      `${API_BASE_URL}/api/booking_drafts/v1/${draftId}/update_pets_and_services/`,
      data
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
            }
        );

        debugLog('MBA5asdt3f4321 - Booking draft time and date update response:', response.data);
        return response.data;
    } catch (error) {
        debugLog('MBA5asdt3f4321 Error updating booking draft time and date:', error);
        throw error;
    }
};

export const updateBookingDraftMultipleDays = async (draftId, data, timeSettings) => {
    try {
        // Get the user's timezone from timeSettings, with fallback to US/Mountain
        const userTimezone = timeSettings?.timezone || 'US/Mountain';
        
        debugLog('MBA8800: Updating booking draft multiple days:', {
            draftId,
            data,
            userTimezone
        });

        // Handle different formats of dates array
        const utcDates = data.dates.map(dateItem => {
            // Check what format the date is in
            let dateStr, startTimeStr, endTimeStr, endDateStr;
            let isServiceOvernight = false;
            
            // If the dateItem already has date and times (from non-overnight date range)
            if (dateItem.date && dateItem.start_time && dateItem.end_time) {
                debugLog('MBA8800: Using provided occurrence data format', dateItem);
                return {
                    date: dateItem.date,
                    startTime: dateItem.start_time,
                    endDate: dateItem.end_date || dateItem.date, // Always include endDate
                    endTime: dateItem.end_time,
                    is_overnight: dateItem.is_overnight || false
                };
            }
            
            // If the dateItem already has date and times (formatted in BookingStepModal)
            if (dateItem.date && dateItem.startTime && dateItem.endTime) {
                debugLog('MBA8800: Using provided date and times', dateItem);
                return {
                    date: dateItem.date,
                    startTime: dateItem.startTime,
                    endDate: dateItem.endDate || dateItem.date, // Always include endDate
                    endTime: dateItem.endTime,
                    is_overnight: dateItem.is_overnight || false
                };
            }
            
            // For multiple days format from DateSelectionCard
            if (dateItem instanceof Date) {
                // Format the date for API
                dateStr = formatDateForAPI(dateItem);
                
                // Determine which time to use - if individual times exist, use those
                let dayTimes = data.times;
                const dateKey = dateItem.toISOString().split('T')[0];
                
                if (data.times[dateKey] && data.times.hasIndividualTimes) {
                    dayTimes = data.times[dateKey];
                }
                
                // Get the time strings
                if (typeof dayTimes.startTime === 'string') {
                    startTimeStr = dayTimes.startTime;
                } else if (dayTimes.startTime?.hours !== undefined) {
                    startTimeStr = `${String(dayTimes.startTime.hours).padStart(2, '0')}:${String(dayTimes.startTime.minutes || 0).padStart(2, '0')}`;
                } else {
                    // Default time if missing
                    startTimeStr = '09:00';
                }
                
                if (typeof dayTimes.endTime === 'string') {
                    endTimeStr = dayTimes.endTime;
                } else if (dayTimes.endTime?.hours !== undefined) {
                    endTimeStr = `${String(dayTimes.endTime.hours).padStart(2, '0')}:${String(dayTimes.endTime.minutes || 0).padStart(2, '0')}`;
                } else {
                    // Default time if missing
                    endTimeStr = '17:00';
                }
                
                debugLog('MBA8800: Formatted times for date:', dateKey, { startTimeStr, endTimeStr });
                
                // Determine if the end time might cross to the next day
                // Check if end time is midnight or earlier than start time, indicating day boundary crossing
                const isMidnightEnd = endTimeStr === '00:00';
                const isTimeBeforeStart = 
                    (parseInt(endTimeStr.split(':')[0], 10) < parseInt(startTimeStr.split(':')[0], 10)) ||
                    (parseInt(endTimeStr.split(':')[0], 10) === parseInt(startTimeStr.split(':')[0], 10) && 
                     parseInt(endTimeStr.split(':')[1], 10) < parseInt(startTimeStr.split(':')[1], 10));
                
                const needsNextDayDate = isMidnightEnd || isTimeBeforeStart;
                
                // Calculate end date - either same day or next day
                const endDateObj = needsNextDayDate 
                  ? new Date(dateItem.getTime() + 24*60*60*1000) // Next day if crossing midnight
                  : new Date(dateItem);
                
                endDateStr = formatDateForAPI(endDateObj);
                
                debugLog('MBA8800: End date calculation in API.js:', {
                  needsNextDayDate,
                  isMidnightEnd,
                  isTimeBeforeStart,
                  startTimeStr,
                  endTimeStr,
                  originalDate: dateStr,
                  calculatedEndDate: endDateStr
                });
                
                // Set overnight based on service, not just time
                isServiceOvernight = dayTimes.isOvernightForced || false;
            } else {
                // If the data is in some other format, we need to extract the date and times
                debugLog('MBA8800: Unexpected date format', dateItem);
                throw new Error('Unexpected date format');
            }
            
            // Convert to UTC using user's timezone
            const { date: utcStartDate, time: utcStartTime } = convertToUTC(
                dateStr,
                startTimeStr,
                userTimezone
            );

            const { date: utcEndDate, time: utcEndTime } = convertToUTC(
                endDateStr || dateStr, // Use endDateStr if available, otherwise use dateStr
                endTimeStr,
                userTimezone
            );

            return {
                date: utcStartDate,
                startTime: utcStartTime,
                endDate: utcEndDate, // Always include endDate
                endTime: utcEndTime,
                is_overnight: isServiceOvernight
            };
        });

        debugLog('MBA8800: Converted UTC dates:', utcDates);

        const response = await axios.post(
            `${API_BASE_URL}/api/booking_drafts/v1/update-multiple-days/${draftId}/`,
            { dates: utcDates }
        );

        debugLog('MBA8800: Booking draft multiple days update response:', response.data);
        return response.data;
    } catch (error) {
        debugLog('MBA8800: Error updating booking draft multiple days:', error);
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
            recurringData
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
    const response = await axios.get(
      `${API_BASE_URL}/api/users/v1/time-settings/`
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
    // Ensure settings is an object
    const data = typeof settings === 'object' ? settings : { timezone: settings };
    
    debugLog('MBA12345 Sending time settings update', data);

    const response = await axios.post(
      `${API_BASE_URL}/api/users/v1/update-time-settings/`,
      data
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
    const response = await axios.get(
      `${API_BASE_URL}/api/users/v1/get-name/`
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
  try {
    debugLog('MBA12345', 'Fetching user profile data');
    
    const response = await axios.get(`${API_BASE_URL}/api/users/v1/profile/`);
    
    debugLog('MBA12345', 'User profile data fetched successfully:', {
      name: response.data.name,
      email: response.data.email,
      address: response.data.address
    });
    
    return response.data;
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
    
    // Handle FormData differently than JSON
    const isFormData = profileData instanceof FormData;
    
    debugLog('MBA76543', `Making ${isFormData ? 'FormData' : 'JSON'} request to update profile`);
    
    const config = {
      method: 'patch',
      url: `${API_BASE_URL}/api/users/v1/update-profile/`,
      data: profileData
    };
    
    // Only set content-type for non-FormData
    if (!isFormData) {
      config.headers = { 'Content-Type': 'application/json' };
    }
    
    const response = await axios(config);
    
    debugLog('MBA76543', 'Profile updated successfully with response:', response.data);
    return response.data;
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
    debugLog('MBA789', 'Adding new pet with data:', petData);

    const response = await axios.post(
      `${API_BASE_URL}/api/pets/v1/add-pet/`,
      petData
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
    debugLog('MBA789', 'Updating pet with ID:', petId, 'and data:', petData);

    const response = await axios.patch(
      `${API_BASE_URL}/api/pets/v1/${petId}/`,
      petData
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
    debugLog('MBA789', 'Fixing owner for pet with ID:', petId);

    const response = await axios.post(
      `${API_BASE_URL}/api/pets/v1/${petId}/fix-owner/`,
      {}
    );
    
    debugLog('MBA789', 'Pet owner fixed successfully:', response.data);
    return response.data;
  } catch (error) {
    debugLog('MBA789', 'Error fixing pet owner:', error);
    throw error;
  }
};

/**
 * Delete a pet from the user's account
 * This function sends a DELETE request to remove a pet record
 * @param {string|number} petId - The ID of the pet to delete
 * @returns {Promise<Object>} - Success response from the backend
 */
export const deletePet = async (petId) => {
  try {
    debugLog('MBA789', 'Deleting pet with ID:', petId);

    const response = await axios.delete(
      `${API_BASE_URL}/api/pets/v1/${petId}/`
    );
    
    debugLog('MBA789', 'Pet deleted successfully:', response.data);
    return response.data;
  } catch (error) {
    debugLog('MBA789', 'Error deleting pet:', error);
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

    const response = await axios.post(`${API_BASE_URL}/api/services/v1/create/`, formattedData);

    debugLog('MBA54321', 'Service created successfully - backend response:', response.data);
    return response.data;
  } catch (error) {
    debugLog('MBA54321', 'Error creating service:', error);
    debugLog('MBA54321', 'Error response data:', error.response?.data);
    
    // Rethrow the original error - axios interceptor will handle auth errors
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

    const response = await axios.delete(`${API_BASE_URL}/api/services/v1/delete/${serviceId}/`);

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
    debugLog('API updateService', 'Updating service with data:', serviceData);
    
    const response = await axios.patch(`${API_BASE_URL}/api/services/v1/update/${serviceData.service_id}/`, serviceData);
    
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
    
    const response = await axios.get(`${API_BASE_URL}/api/bookings/v1/connections/`, {
      params: {
        page
      }
    });
    
    debugLog('MBA4321 Connections response:', response.data);
    
    return response.data;
  } catch (error) {
    debugLog('MBA4321 Error fetching connections:', error);
    debugLog('MBA4321 Error details:', error.response?.data || error.message);
    
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
    
    const response = await axios.get(`${API_BASE_URL}/api/connections/v1/profile/${userId}/`, {
      params: { type }
    });
    
    debugLog('MBA4321 Connection profile response:', response.data);
    
    return response.data;
  } catch (error) {
    debugLog('MBA4321 Error fetching connection profile:', error);
    debugLog('MBA4321 Error details:', error.response?.data || error.message);
    
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
    
    const response = await axios.post(`${API_BASE_URL}/api/users/v1/invitations/`, {
      type,
      email,
      is_professional_invite: true
    });
    
    debugLog('MBA4321 Invite client response:', response.data);
    
    return response.data;
  } catch (error) {
    debugLog('MBA4321 Error inviting client:', error);
    debugLog('MBA4321 Error details:', error.response?.data || error.message);
    
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
    
    const response = await axios.post(`${API_BASE_URL}/api/users/v1/invitations/`, {
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
    
    const response = await axios.get(`${API_BASE_URL}/api/users/v1/invitations/?type=${type}`);
    
    debugLog('MBA4321 Get invitations response:', response.data);
    
    return response.data;
  } catch (error) {
    debugLog('MBA4321 Error getting invitations:', error);
    debugLog('MBA4321 Error details:', error.response?.data || error.message);
    
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
    
    const response = await axios.get(`${API_BASE_URL}/api/users/v1/invitations/${token}/`);
    
    debugLog('MBA4321 Get invitation details response:', response.data);
    
    return response.data;
  } catch (error) {
    debugLog('MBA4321 Error getting invitation details:', error);
    debugLog('MBA4321 Error details:', error.response?.data || error.message);
    
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
 * Requires authentication - the user must be logged in
 * 
 * Note: If the user registered with an invitation token, the backend
 * automatically accepts the invitation during registration.
 * 
 * @param {string} token - The invitation token
 * @returns {Promise<Object>} Result of accepting the invitation
 */
export const acceptInvitation = async (token) => {
  try {
    debugLog('MBAnb23ou4bf954 Accepting invitation with token:', token);
    
    // Backend requires authentication - make a simple authenticated request
    const response = await axios.post(
      `${API_BASE_URL}/api/users/v1/invitations/${token}/accept/`,
      {}, // Empty body - backend just needs the auth token
      {
        headers: {
          'Content-Type': 'application/json'
          // Auth header will be added automatically by the interceptor
        }
      }
    );
    
    debugLog('MBAnb23ou4bf954 Invitation accepted successfully:', response.data);
    return response.data;
  } catch (error) {
    debugLog('MBAnb23ou4bf954 Error accepting invitation:', error.message);
    
    // Log detailed error information
    if (error.response) {
      debugLog('MBAnb23ou4bf954 Error status:', error.response.status);
      debugLog('MBAnb23ou4bf954 Error data:', error.response.data);
      
      // Special case: "already used" isn't really an error for our purposes
      // Since invitations are accepted automatically during registration
      if (error.response.status === 400 && error.response.data?.error === 'Invitation has already been used') {
        debugLog('MBAnb23ou4bf954 Invitation was already accepted (likely during registration), treating as success');
        return { 
          success: true, 
          already_accepted: true,
          message: 'Invitation was already accepted'
        };
      }
    }
    
    // Add context about requirements to the error
    if (error.response?.status === 401) {
      error.message = 'You must be logged in to accept this invitation';
    } else if (error.response?.data?.error) {
      error.message = error.response.data.error;
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
    
    await axios.delete(`${API_BASE_URL}/api/users/v1/invitations/${token}/`);
    
    debugLog('MBA4321 Delete invitation success');
    
    return true;
  } catch (error) {
    debugLog('MBA4321 Error deleting invitation:', error);
    debugLog('MBA4321 Error details:', error.response?.data || error.message);
    
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
    
    const response = await axios.post(`${API_BASE_URL}/api/users/v1/invitations/${token}/resend/`);
    
    debugLog('MBA4321 Resend invitation response:', response.data);
    
    return response.data;
  } catch (error) {
    debugLog('MBA4321 Error resending invitation:', error);
    debugLog('MBA4321 Error details:', error.response?.data || error.message);
    
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
 * Gets the dates and times for a booking draft
 * @param {string} draftId - The ID of the draft
 * @returns {Promise<Object>} - Draft dates and times data
 */
export const getBookingDraftDatesAndTimes = async (draftId) => {
  try {
    debugLog('MBA9876: Fetching booking draft dates and times:', draftId);
    
    const response = await axios.get(
      `${API_BASE_URL}/api/booking_drafts/v1/${draftId}/dates_and_times/`
    );
    
    debugLog('MBA9876: Draft dates and times fetched successfully');
    return response.data;
  } catch (error) {
    debugLog('MBA9876: Error fetching booking draft dates and times:', error);
    throw error;
  }
};

/**
 * Creates a draft from an existing booking for editing purposes
 * @param {number} bookingId - The ID of the booking to create a draft from
 * @returns {Promise<Object>} Response containing the draft ID and draft data
 */
export const createDraftFromBooking = async (bookingId) => {
  try {
    debugLog('MBA6428: Creating draft from booking:', { bookingId });
    
    const response = await axios.post(
      `${API_BASE_URL}/api/booking_drafts/v1/create-from-booking/${bookingId}/`,
      {}  // No body needed for this request
    );
    
    debugLog('MBA6428: Draft created successfully:', response.data);
    return response.data;
  } catch (error) {
    debugLog('MBA6428: Error creating draft from booking:', error);
    // Return a structured error object instead of throwing
    if (error.response?.data) {
      return {
        error: true,
        status: error.response.status,
        message: error.response.data.error || 'Failed to create draft from booking',
        data: error.response.data
      };
    }
    // Still throw for network errors or other unexpected issues
    throw error;
  }
};

/**
 * Search for professionals based on various criteria
 * @param {Object} searchParams - Search parameters
 * @param {Array} searchParams.animal_types - Array of animal types (e.g., ['dogs', 'cats'])
 * @param {string} searchParams.location - Location string (city, zip, etc.)
 * @param {string} searchParams.service_query - Service search query
 * @param {boolean} searchParams.overnight_service - Whether overnight service is required
 * @param {number} searchParams.price_min - Minimum price
 * @param {number} searchParams.price_max - Maximum price
 * @param {number} searchParams.radius_miles - Search radius in miles (default 30)
 * @param {number} searchParams.page - Page number for pagination (default 1)
 * @param {number} searchParams.page_size - Number of results per page (default 20)
 * @returns {Promise<Object>} - Search results with professionals array and pagination info
 */
export const searchProfessionals = async (searchParams = {}) => {
  try {
    debugLog('MBA9999', 'Searching professionals with params:', searchParams);
    
    const response = await axios.post(`${API_BASE_URL}/api/professionals/v1/search/`, searchParams);
    
    debugLog('MBA9999', 'Professional search completed successfully');
    return response.data;
  } catch (error) {
    debugLog('MBA9999', 'Error searching professionals:', error.response?.data || error.message);
    
    throw error;
  }
};

/**
 * Get detailed services for a specific professional (for client view)
 * @param {number} professionalId - The ID of the professional
 * @returns {Promise<Array>} - Array of detailed service objects with rates and descriptions
 */
export const getProfessionalServicesDetailed = async (professionalId) => {
  try {
    debugLog('MBA9999', 'Getting detailed services for professional:', professionalId);
    
    const response = await axios.get(`${API_BASE_URL}/api/professionals/v1/services/${professionalId}/`);
    
    debugLog('MBA9999', 'Professional services fetched successfully');
    return response.data;
  } catch (error) {
    debugLog('MBA9999', 'Error fetching professional services:', error.response?.data || error.message);
    
    throw error;
  }
};

/**
 * Create a conversation between the current user (client) and a professional
 * @param {number} professionalId - The ID of the professional to contact
 * @returns {Promise<Object>} - Object containing conversation_id, is_professional, and other_user_name
 */
export const createConversation = async (professionalId) => {
  try {
    debugLog('MBA3456', 'Creating conversation with professional:', professionalId);
    
    const response = await axios.post(`${API_BASE_URL}/api/conversations/v1/create/`, {
      professional_id: professionalId
    });
    
    debugLog('MBA3456', 'Conversation created successfully:', response.data);
    return response.data;
  } catch (error) {
    debugLog('MBA3456', 'Error creating conversation:', error.response?.data || error.message);
    
    throw error;
  }
};

/**
 * Get count of unread messages for the current user
 * @returns {Promise<Object>} - Object containing unread message count
 */
export const getUnreadMessageCount = async () => {
  try {
    debugLog("MBA4321: Fetching unread message count");
    
    const response = await axios.get(`${API_BASE_URL}/api/messages/v1/unread-count/`);
    
    debugLog("MBA4321: Unread count fetched:", response.data);
    return response.data;
  } catch (error) {
    debugLog("MBA4321: Error with unread message count:", error.message);
    
    throw error;
  }
};

/**
 * Get all conversations for the current user with online status data
 * @returns {Promise<Array>} - Array of conversation objects with participant online status
 */
export const getConversations = async () => {
  try {
    debugLog('MBA3210: Fetching conversations with online status data');
    
    const response = await axios.get(`${API_BASE_URL}/api/conversations/v1/`);
    
    debugLog(`MBA3210: Fetched ${response.data?.length || 0} conversations with online status data`);
    return response.data;
  } catch (error) {
    debugLog('MBA3210: Error fetching conversations:', error);
    throw error;
  }
};

/**
 * Get messages for a conversation with pagination
 * @param {string|number} conversationId - The ID of the conversation
 * @param {number} page - Page number for pagination (default 1)
 * @returns {Promise<Object>} - Object containing messages array, pagination info, and draft data
 */
export const getConversationMessages = async (conversationId, page = 1) => {
  try {
    debugLog('MBA4321: Fetching messages for conversation:', conversationId, 'page:', page);
    
    const response = await axios.get(`${API_BASE_URL}/api/messages/v1/conversation/${conversationId}/`, {
      params: { page }
    });
    
    debugLog('MBA4321: Messages fetched successfully:', response.data);
    return response.data;
  } catch (error) {
    debugLog('MBA4321: Error fetching messages:', error);
    throw error;
  }
};

/**
 * Get dashboard data for professionals
 * @returns {Promise<Object>} - Dashboard data including bookings and onboarding progress
 */
export const getProfessionalDashboard = async () => {
  try {
    debugLog('MBA5677: Fetching professional dashboard data');
    
    const response = await axios.get(`${API_BASE_URL}/api/professionals/v1/dashboard/`);
    
    debugLog('MBA5677: Professional dashboard data fetched successfully:', response.data);
    return response.data;
  } catch (error) {
    debugLog('MBA5677: Error fetching professional dashboard data:', error);
    throw error;
  }
};

/**
 * Get dashboard data for clients/owners
 * @returns {Promise<Object>} - Dashboard data including bookings and onboarding progress
 */
export const getClientDashboard = async () => {
  try {
    debugLog('MBA5677: Fetching client dashboard data');
    
    const response = await axios.get(`${API_BASE_URL}/api/clients/v1/dashboard/`);
    
    debugLog('MBA5677: Client dashboard data fetched successfully:', response.data);
    return response.data;
  } catch (error) {
    debugLog('MBA5677: Error fetching client dashboard data:', error);
    throw error;
  }
};

/**
 * Logs input focus events to the backend for debugging mobile keyboard issues
 * @param {string} eventType - Type of event (focus/blur)
 * @param {Object} eventData - Additional event data
 */
export const logInputEvent = async (eventType, eventData = {}) => {
  try {
    await axios.post(`${API_BASE_URL}/api/core/v1/debug_log/`, {
      message: `MBA92hc3h4kl: Input ${eventType} event`,
      data: {
        ...eventData,
        platform: Platform.OS,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    // Silently fail - don't disrupt the app if logging fails
    console.error('Failed to log input event:', error);
  }
};

/**
 * Get client pets
 * 
 * Retrieves all pets for a specific client based on conversation ID
 * The backend will determine the client ID from the conversation and user roles
 * 
 * @param {string|number} conversationId - The ID of the conversation 
 * @returns {Promise<Array>} - Array of pet objects for the client
 */
export const getClientPets = async (conversationId) => {
  try {
    debugLog('MBA3456', 'Fetching client pets for conversation:', conversationId);
    
    // Make sure conversationId is provided
    if (!conversationId) {
      debugLog('MBA3456', 'Error: No conversation_id provided to getClientPets');
      throw new Error('No conversation_id provided');
    }
    
    const response = await axios.get(`${API_BASE_URL}/api/clients/v1/get-pets/`, {
      params: {
        conversation_id: conversationId
      }
    });
    
    debugLog('MBA3456', 'Client pets fetched successfully:', response.data);
    return response.data;
  } catch (error) {
    debugLog('MBA3456', 'Error fetching client pets:', error.response?.data || error.message);
    throw error;
  }
};

