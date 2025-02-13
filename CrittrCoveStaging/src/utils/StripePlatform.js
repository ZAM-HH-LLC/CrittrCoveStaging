import { Platform } from 'react-native';
import { STRIPE_PUBLISHABLE_KEY } from '@env';

export const getStripeModule = async () => {
  if (Platform.OS === 'web') {
    const { loadStripe } = await import('@stripe/stripe-js');
    const stripe = await loadStripe(STRIPE_PUBLISHABLE_KEY);
    if (!stripe) {
      throw new Error('Failed to initialize Stripe');
    }
    return stripe;
  } else {
    const { useStripe } = await import('@stripe/stripe-react-native');
    return useStripe();
  }
}; 