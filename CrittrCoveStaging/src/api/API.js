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

export const markNoreplyAsNotSpam = async () => {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/clients/v1/mark-noreply-as-not-spam/`);
    return response.data;
  } catch (error) {
    debugLog('MBA12345 Error marking noreply as not spam:', error);
    throw error;
  }
};

export const approveBooking = async (bookingId, clientAgreedTos = false) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/bookings/v1/${bookingId}/approve/`,
      {
        client_agreed_tos: clientAgreedTos
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
 * Change user password
 * @param {string} currentPassword - The user's current password
 * @param {string} newPassword - The new password to set
 * @returns {Promise<Object>} - Response from the backend
 */
export const changePassword = async (currentPassword, newPassword) => {
  try {
    debugLog('MBA1234', 'Initiating password change request');
    
    const response = await axios.post(
      `${API_BASE_URL}/api/users/v1/change-password/`,
      {
        current_password: currentPassword,
        new_password: newPassword,
      }
    );
    
    debugLog('MBA1234', 'Password change successful');
    return response.data;
  } catch (error) {
    debugLog('MBA1234', 'Error changing password:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Upload a profile picture for the user
 * @param {FormData} formData - FormData containing the profile_picture file
 * @returns {Promise<Object>} - Object containing the profile_photo URL
 */
export const uploadProfilePicture = async (formData) => {
  try {
    debugLog('MBA3oin4f084', 'Starting profile picture upload');
    
    if (!(formData instanceof FormData)) {
      throw new Error('uploadProfilePicture requires FormData');
    }
    
    // Check if formData contains a profile_picture entry
    let hasFile = false;
    for (let pair of formData.entries()) {
      if (pair[0] === 'profile_picture') {
        hasFile = true;
        debugLog('MBA3oin4f084', `FormData contains profile_picture: ${typeof pair[1]}`);
        break;
      }
    }
    
    if (!hasFile) {
      throw new Error('FormData does not contain profile_picture');
    }
    
    // Ensure we're not setting Content-Type ourselves - let axios set it with boundary
    const response = await axios({
      method: 'post',
      url: `${API_BASE_URL}/api/users/v1/upload-profile-picture/`,
      data: formData,
      headers: {
        'Accept': 'application/json',
        // Let axios set the content-type with boundary
      },
      // Increase timeout for larger files
      timeout: 30000
    });
    
    debugLog('MBA3oin4f084', 'Profile picture upload successful with response:', response.data);
    return response.data;
  } catch (error) {
    debugLog('MBA3oin4f084', 'Error uploading profile picture:', error);
    if (error.response) {
      debugLog('MBA3oin4f084', 'Server error response:', error.response);
    }
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
 * @param {boolean} termsOfServiceAgreedByPro - Whether the professional agreed to terms
 * @returns {Promise<Object>} Response containing the new booking information and message
 */
export const createBookingFromDraft = async (conversationId, termsOfServiceAgreedByPro = false) => {
    try {
        debugLog('MBA66777 - Creating booking from draft:', {
            conversationId,
            termsOfServiceAgreedByPro
        });

        const response = await axios.post(
            `${API_BASE_URL}/api/bookings/v1/create-from-draft/`,
            {
                conversation_id: conversationId, 
                terms_of_service_agreed_by_pro: termsOfServiceAgreedByPro
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
 * Update notes from professional in a booking draft
 * @param {string} conversationId - The ID of the conversation containing the draft
 * @param {string} notesFromPro - Notes from the professional for the client
 * @returns {Promise<Object>} Response containing updated draft data
 */
export const updateDraftNotesFromPro = async (conversationId, notesFromPro) => {
    try {
        debugLog('MBA88888 - Updating draft notes from pro:', {
            conversationId,
            notesFromPro
        });

        const response = await axios.post(
            `${API_BASE_URL}/api/booking_drafts/v1/update-notes-from-pro/`,
            {
                conversation_id: conversationId,
                notes_from_pro: notesFromPro
            }
        );

        debugLog('MBA88888 - Draft notes updated successfully:', response.data);
        return response.data;
    } catch (error) {
        debugLog('MBA88888 Error updating draft notes:', error);
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
  if (!conversationId || conversationId === 'undefined' || conversationId === 'null') {
    debugLog('MBA4321: No conversation ID provided');
    throw new Error('No conversation ID provided');
  }
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
 * Get incomplete bookings for a conversation
 * @param {string|number} conversationId - The ID of the conversation
 * @returns {Promise<Object>} - Object containing incomplete bookings array
 */
export const getIncompleteBookings = async (conversationId) => {
  if (!conversationId || conversationId === 'undefined' || conversationId === 'null') {
    debugLog('MBA5678: No conversation ID provided');
    throw new Error('No conversation ID provided');
  }
  try {
    debugLog('MBA5678: Fetching incomplete bookings for conversation:', conversationId);
    
    const response = await axios.get(`${API_BASE_URL}/api/messages/v1/conversation/${conversationId}/incomplete-bookings/`);
    
    debugLog('MBA5678: Incomplete bookings fetched successfully:', response.data);
    return response.data;
  } catch (error) {
    debugLog('MBA5678: Error fetching incomplete bookings:', error);
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

/**
 * Upload an image to be attached to a message
 * @param {string|number} conversationId - The conversation ID
 * @param {File|Blob|string} imageData - The image file, blob, or base64 string
 * @returns {Promise<Object>} - Object containing image_url and message_id
 */
export const uploadMessageImage = async (conversationId, imageData) => {
  try {
    debugLog('MBA5678: Uploading message image for conversation:', conversationId);
    
    const formData = new FormData();
    formData.append('conversation_id', conversationId);
    
    // Handle different types of image data
    if (typeof imageData === 'string') {
      // If it's a base64 string, convert to file object
      debugLog('MBA5678: Image data is a string, sending as base64');
      
      // Use JSON format instead of FormData for base64
      const response = await axios.post(
        `${API_BASE_URL}/api/messages/v1/upload_image/`,
        {
          conversation_id: conversationId,
          image_data: imageData
        }
      );
      
      debugLog('MBA5678: Image uploaded successfully:', response.data);
      return response.data;
    } else {
      // If it's a File or Blob object
      debugLog('MBA5678: Image data is a File/Blob, sending as multipart/form-data');
      formData.append('image_file', imageData);
      
      const response = await axios.post(
        `${API_BASE_URL}/api/messages/v1/upload_image/`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      debugLog('MBA5678: Image uploaded successfully:', response.data);
      return response.data;
    }
  } catch (error) {
    debugLog('MBA5678: Error uploading message image:', error);
    throw error;
  }
};

/**
 * Compress an image to reduce its size before upload
 * @param {string} imageUri - The URI of the image to compress
 * @param {number} maxWidth - Maximum width of the compressed image (default: 1024)
 * @param {number} quality - Quality of the compressed image (0-1, default: 0.7)
 * @returns {Promise<string>} - Base64 string of the compressed image
 */
export const compressImage = async (imageUri, maxWidth = 1024, quality = 0.7) => {
  try {
    debugLog('MBA5511: Attempting to compress image:', {
      uriType: typeof imageUri,
      isBase64: typeof imageUri === 'string' && imageUri.startsWith('data:image'),
      platform: Platform.OS
    });
    
    // If we already have a base64 string, process it directly
    if (typeof imageUri === 'string' && imageUri.startsWith('data:image')) {
      // For base64 data URLs, use web-based compression if on web platform
      if (Platform.OS === 'web') {
        return compressWebBase64Image(imageUri, maxWidth, quality);
      }
      // On native, just return as is since we don't have image manipulation
      return imageUri;
    }
    
    // For mobile image URIs, we currently don't have a direct way to compress
    // without expo-image-manipulator, so we'll just return the original URI
    if (Platform.OS !== 'web' && imageUri) {
      // In a production app, you'd want to implement native compression here
      // using available libraries
      debugLog('MBA5511: Native image compression not implemented - using original image');
      return imageUri;
    }
    
    // For web environment
    if (Platform.OS === 'web') {
      return compressWebImage(imageUri, maxWidth, quality);
    }
    
    // Return original if we can't compress
    return imageUri;
  } catch (error) {
    debugLog('MBA5511: Error compressing image:', error);
    // Return original image if compression fails
    return imageUri;
  }
};

/**
 * Helper function to compress a web image
 * @param {string} imageUri - Image URI or URL
 * @param {number} maxWidth - Maximum width
 * @param {number} quality - Compression quality (0-1)
 * @returns {Promise<string>} - Compressed image as data URL
 */
const compressWebImage = (imageUri, maxWidth, quality) => {
  return new Promise((resolve, reject) => {
    // Only perform canvas operations on web platform
    if (Platform.OS !== 'web') {
      debugLog('MBA5511: Canvas compression not available on mobile platform, returning original image');
      resolve(imageUri);
      return;
    }

    // Check if required web APIs are available
    if (typeof document === 'undefined' || typeof Image === 'undefined') {
      debugLog('MBA5511: Web APIs not available, returning original image');
      resolve(imageUri);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous'; // Help with CORS issues
    img.src = imageUri;
    
    img.onload = () => {
      try {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        // For very large images, use more aggressive resizing
        if (width > 3000 || height > 3000) {
          // Extra compression for extremely large images
          maxWidth = Math.min(maxWidth, 600);
          quality = Math.min(quality, 0.4);
          debugLog('MBA5511: Extra compression applied for very large image', {
            originalWidth: width,
            originalHeight: height,
            newMaxWidth: maxWidth,
            newQuality: quality
          });
        }
        
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = height * ratio;
        }
        
        // Skip compression for small images
        if (width < maxWidth && (width * height < 250000)) { // less than ~0.25MP
          debugLog('MBA5511: Image already small enough, skipping compression');
          resolve(imageUri);
          return;
        }
        
        // Create canvas with appropriate size
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        // Draw image to canvas with resizing
        const ctx = canvas.getContext('2d');
        
        // For better quality, use a 2-step process for large downsampling
        if (img.width > width * 2) {
          // Create an intermediate canvas at half size
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          const tempWidth = Math.min(img.width, width * 2);
          const tempHeight = (tempWidth / img.width) * img.height;
          
          tempCanvas.width = tempWidth;
          tempCanvas.height = tempHeight;
          
          // First downsample
          tempCtx.drawImage(img, 0, 0, tempWidth, tempHeight);
          
          // Then final resize
          ctx.drawImage(tempCanvas, 0, 0, width, height);
        } else {
          // Direct resize for smaller downsampling
          ctx.drawImage(img, 0, 0, width, height);
        }
        
        // Convert to base64 with the specified quality
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        
        debugLog('MBA5511: Image compressed successfully', {
          originalDimensions: `${img.width}x${img.height}`,
          newDimensions: `${width}x${height}`,
          quality: quality,
          sizeReduction: imageUri.length > 0 ? 
            ((1 - (compressedDataUrl.length / imageUri.length)) * 100).toFixed(2) + '%' : 
            'unknown'
        });
        
        resolve(compressedDataUrl);
      } catch (err) {
        debugLog('MBA5511: Error in canvas compression:', err);
        resolve(imageUri); // Fall back to original
      }
    };
    
    img.onerror = (error) => {
      debugLog('MBA5511: Image loading error:', error);
      resolve(imageUri); // Fall back to original
    };
  });
};

/**
 * Helper function to compress a base64 image on web
 * @param {string} base64Data - Base64 image data URL
 * @param {number} maxWidth - Maximum width
 * @param {number} quality - Compression quality (0-1)
 * @returns {Promise<string>} - Compressed image as data URL
 */
const compressWebBase64Image = (base64Data, maxWidth, quality) => {
  return new Promise((resolve, reject) => {
    // Only perform canvas operations on web platform
    if (Platform.OS !== 'web') {
      debugLog('MBA5511: Canvas compression not available on mobile platform, returning original base64');
      resolve(base64Data);
      return;
    }

    // Check if required web APIs are available
    if (typeof document === 'undefined' || typeof Image === 'undefined') {
      debugLog('MBA5511: Web APIs not available, returning original base64');
      resolve(base64Data);
      return;
    }

    const img = new Image();
    img.src = base64Data;
    
    img.onload = () => {
      try {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;
        
        // For very large images, use more aggressive resizing
        if (width > 3000 || height > 3000) {
          // Extra compression for extremely large images
          maxWidth = Math.min(maxWidth, 600);
          quality = Math.min(quality, 0.4);
          debugLog('MBA5511: Extra compression applied for very large image', {
            originalWidth: width,
            originalHeight: height,
            newMaxWidth: maxWidth,
            newQuality: quality
          });
        }
        
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = height * ratio;
        }
        
        // Skip compression for small images
        if (width < maxWidth && (width * height < 250000)) { // less than ~0.25MP
          debugLog('MBA5511: Base64 image already small enough, skipping compression');
          resolve(base64Data);
          return;
        }
        
        // Create canvas with appropriate size
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        // Draw image to canvas with resizing
        const ctx = canvas.getContext('2d');
        
        // For better quality, use a 2-step process for large downsampling
        if (img.width > width * 2) {
          // Create an intermediate canvas at half size
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          const tempWidth = Math.min(img.width, width * 2);
          const tempHeight = (tempWidth / img.width) * img.height;
          
          tempCanvas.width = tempWidth;
          tempCanvas.height = tempHeight;
          
          // First downsample
          tempCtx.drawImage(img, 0, 0, tempWidth, tempHeight);
          
          // Then final resize
          ctx.drawImage(tempCanvas, 0, 0, width, height);
        } else {
          // Direct resize for smaller downsampling
          ctx.drawImage(img, 0, 0, width, height);
        }
        
        // Convert to base64 with the specified quality
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        
        debugLog('MBA5511: Base64 image compressed successfully', {
          originalDimensions: `${img.width}x${img.height}`,
          newDimensions: `${width}x${height}`,
          quality: quality,
          sizeReduction: base64Data.length > 0 ? 
            ((1 - (compressedDataUrl.length / base64Data.length)) * 100).toFixed(2) + '%' : 
            'unknown'
        });
        
        resolve(compressedDataUrl);
      } catch (err) {
        debugLog('MBA5511: Error in canvas compression:', err);
        resolve(base64Data); // Fall back to original
      }
    };
    
    img.onerror = (error) => {
      debugLog('MBA5511: Base64 image loading error:', error);
      resolve(base64Data); // Fall back to original
    };
  });
};

/**
 * Upload and send images in a single message using a direct approach with FormData
 * @param {string|number} conversationId - The conversation ID
 * @param {Array<File|Blob|string>} images - Array of image files, blobs, or base64 strings
 * @param {string} caption - Optional caption to include with the images
 * @returns {Promise<Object>} - Object containing message data including image_urls
 */
export const uploadAndSendImageMessage = async (conversationId, images, caption = '') => {
  try {
    debugLog('MBA5511: Uploading and sending image message directly:', {
      conversationId,
      imageCount: images.length,
      hasCaption: !!caption?.trim().length
    });
    
    if (!images || images.length === 0) {
      throw new Error('No images provided for upload');
    }
    
    // Determine total image size to set compression level
    const totalEstimatedSize = images.reduce((sum, img) => {
      if (img.base64) {
        // base64 size is roughly 4/3 of the raw data
        return sum + (img.base64.length * 0.75);
      } else if (img.size) {
        return sum + img.size;
      }
      // Assume 1MB if unknown
      return sum + 1000000;
    }, 0);
    
    // Set compression parameters based on total size
    let maxWidth = 1024;  // Default for small images
    let quality = 0.7;    // Default quality
    
    // Adjust based on total size
    if (totalEstimatedSize > 4 * 1024 * 1024) {
      // For large uploads (>4MB), use aggressive compression
      maxWidth = 800;
      quality = 0.5;
    } else if (totalEstimatedSize > 2 * 1024 * 1024) {
      // For medium uploads (>2MB), use moderate compression
      maxWidth = 1024;
      quality = 0.6;
    }
    
    debugLog('MBA5511: Compression settings:', {
      totalEstimatedSizeMB: (totalEstimatedSize / (1024 * 1024)).toFixed(2) + 'MB',
      maxWidth,
      quality
    });
    
    // Prepare images array for sending, with compression
    const processedImages = await Promise.all(images.map(async (image) => {
      let imageSource;
      
      if (image.base64) {
        imageSource = `data:image/jpeg;base64,${image.base64}`;
      } else if (image.uri) {
        imageSource = image.uri;
      } else {
        imageSource = image;
      }
      
      // Compress the image before sending
      return await compressImage(imageSource, maxWidth, quality);
    }));
    
    debugLog('MBA5511: Images compressed and ready for upload', {
      imageCount: processedImages.length
    });
    
    // Send a single request with all compressed images
    const response = await axios.post(
      `${API_BASE_URL}/api/messages/v1/upload_and_send/`,
      {
        conversation_id: conversationId,
        content: caption || '',
        images: processedImages
      }
    );
    
    debugLog('MBA5511: Image message uploaded and sent successfully:', {
      messageId: response.data.message_id,
      imageCount: images.length,
      hasCaption: !!caption
    });
    
    // Create a message object that can be directly added to the UI
    const messageObject = {
      message_id: response.data.message_id,
      content: caption || '',
      sent_by_other_user: false,
      timestamp: new Date().toISOString(),
      type_of_message: 'image_message',
      status: 'sent',
      is_clickable: false,
      image_urls: response.data.image_urls || [],
      metadata: {
        image_urls: response.data.image_urls || []
      }
    };
    
    return messageObject;
  } catch (error) {
    debugLog('MBA5511: Error uploading and sending image message:', error);
    throw error;
  }
};

/**
 * Upload multiple images in a single message (previous implementation)
 * @param {string|number} conversationId - The conversation ID
 * @param {Array<File|Blob|string>} images - Array of image files, blobs, or base64 strings
 * @param {string} caption - Optional caption to include with the images
 * @returns {Promise<Object>} - Object containing image_urls and message_id
 * @deprecated Use uploadAndSendImageMessage instead
 */
export const sendImageMessage = async (conversationId, images, caption = '') => {
  // Just call the new function
  return uploadAndSendImageMessage(conversationId, images, caption);
};

/**
 * Mark a booking as completed
 * @param {string|number} bookingId - ID of the booking to mark as completed
 * @returns {Promise<Object>} - Response from the API
 */
export const markBookingCompleted = async (bookingId) => {
  try {
    debugLog('MBA8675309: Marking booking as completed:', bookingId);
    
    const response = await axios.post(
      `${API_BASE_URL}/api/bookings/v1/${bookingId}/mark_completed/`,
      {} // Empty body since we don't need to send any data
    );
    
    debugLog('MBA8675309: Booking marked as completed successfully');
    return response.data;
  } catch (error) {
    debugLog('MBA8675309: Error marking booking as completed:', error);
    debugLog('MBA8675309: Error details:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Send a text message to a conversation
 * @param {string|number} conversationId - The conversation ID
 * @param {string} content - The message text content
 * @returns {Promise<Object>} - Response containing message data
 */
export const sendTextMessage = async (conversationId, content) => {
  try {
    debugLog('MBA5511: Sending text message:', {
      conversationId,
      contentLength: content?.length || 0
    });
    
    const response = await axios.post(
      `${API_BASE_URL}/api/messages/v1/send_norm_message/`,
      {
        conversation_id: conversationId,
        content: content.trim()
      }
    );
    
    debugLog('MBA5511: Text message sent successfully');
    return response.data;
  } catch (error) {
    debugLog('MBA5511: Error sending text message:', error);
    debugLog('MBA5511: Error details:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Submit a review for a booking
 * @param {object} reviewData - The review data
 * @param {string|number} reviewData.bookingId - ID of the booking to review
 * @param {number} reviewData.rating - Star rating (1-5)
 * @param {string} reviewData.reviewText - Review text content
 * @param {boolean} reviewData.isProfessional - Whether the reviewer is a professional
 * @returns {Promise<Object>} - Response from the API
 */
export const submitBookingReview = async (reviewData) => {
  try {
    debugLog('MBA8675309: Submitting booking review:', reviewData);
    
    const response = await axios.post(
      `${API_BASE_URL}/api/bookings/v1/${reviewData.bookingId}/review/`,
      {
        rating: reviewData.rating,
        review_text: reviewData.reviewText,
        is_professional_review: reviewData.isProfessional
      }
    );
    
    debugLog('MBA8675309: Review submitted successfully:', response.data);
    return response.data;
  } catch (error) {
    debugLog('MBA8675309: Error submitting review:', error);
    debugLog('MBA8675309: Error details:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get reviews for a user based on conversation ID
 * 
 * @param {string|number} conversationId - The ID of the conversation
 * @param {boolean} isProfessional - Whether the current user is a professional (true) or client (false)
 * @returns {Promise<Object>} - Object containing reviews, average rating, and review count
 */
export const getUserReviews = async (conversationId = null, professionalId = null, isProfessional = false) => {
  try {
    debugLog('MBA387c439h', 'Fetching user reviews for conversation:', conversationId, 'isProfessional:', isProfessional);
    
    // Make sure conversationId is provided
    if (!conversationId) {
      debugLog('MBA387c439h', 'No conversation_id provided to getUserReviews');
      if (!professionalId) {
        throw new Error('No conversation_id or professional_id provided');
      }
    }
    
    const response = await axios.get(`${API_BASE_URL}/api/reviews/v1/get-user-reviews/`, {
      params: {
        conversation_id: conversationId,
        professional_id: professionalId,
        is_professional: isProfessional ? 1 : 0
      }
    });
    
    debugLog('MBA387c439h', 'User reviews fetched successfully:', response.data);
    return response.data;
  } catch (error) {
    debugLog('MBA387c439h', 'Error fetching user reviews:', error.response?.data || error.message);
    throw error;
  }
};

