import axios from 'axios';
import { API_BASE_URL } from '../config/config';
import { getStorage } from '../context/AuthContext';

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
