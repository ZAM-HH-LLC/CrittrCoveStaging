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

export const updateBookingDraftTimeAndDate = async (draftId, startDate, endDate, startTime, endTime, nightCountAdjustment = 0) => {
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
                end_time: endTime,
                night_count_adjustment: nightCountAdjustment
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
