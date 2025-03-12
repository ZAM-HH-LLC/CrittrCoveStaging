import axios from 'axios';
import { API_BASE_URL } from '../config/config';
import { getStorage } from '../context/AuthContext';

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

export const approveBooking = async (bookingId) => {
  try {
    const token = await getStorage('userToken');
    const response = await axios.post(`${API_BASE_URL}/api/bookings/v1/${bookingId}/approve/`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error approving booking:', error);
    throw error;
  }
};
