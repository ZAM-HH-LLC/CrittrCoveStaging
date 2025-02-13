import { Platform } from 'react-native';
import { getStripeModule } from './StripePlatform';
import { API_BASE_URL_ANDROID, API_BASE_URL_IOS, API_BASE_URL_WEB } from '@env';
import axios from 'axios';

let stripeInstance = null;

// Get the appropriate base URL based on platform
const getBaseUrl = () => {
  if (Platform.OS === 'android') {
    return API_BASE_URL_ANDROID;
  } else if (Platform.OS === 'ios') {
    return API_BASE_URL_IOS;
  }
  return API_BASE_URL_WEB;
};

export const initStripe = async () => {
  if (!stripeInstance) {
    stripeInstance = await getStripeModule();
  }
  return stripeInstance;
};

export const createPaymentMethod = async (paymentDetails) => {
  try {
    // This function now only handles native platform
    if (Platform.OS === 'web') {
      throw new Error('Web platform should use stripe.createPaymentMethod directly');
    }

    const stripe = await initStripe();
    const result = await stripe.createPaymentMethod({
      type: 'card',
      card: paymentDetails.card,
    });
    
    if (result.error) {
      console.error('Stripe error:', result.error);
      throw new Error(result.error.message);
    }

    return {
      paymentMethod: {
        id: result.paymentMethod.id,
        last4: result.paymentMethod.card.last4,
        brand: result.paymentMethod.card.brand,
        type: 'card'
      },
      error: null,
    };
  } catch (error) {
    console.error('Payment method creation error:', error);
    return {
      paymentMethod: null,
      error: {
        message: error.message || 'Failed to create payment method',
      },
    };
  }
};

export const useStripe = () => {
  if (Platform.OS === 'web') {
    return {
      createPaymentMethod: async (options) => {
        const stripe = await initStripe();
        return stripe.createPaymentMethod(options);
      },
    };
  }
  return stripeInstance;
}; 