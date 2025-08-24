# Stripe Payments Setup Guide

This guide covers the setup and configuration of Stripe payments for CrittrCove's React Native + Django platform.

## Overview

The Stripe integration supports:
- **Card Payments**: Users can securely save payment methods using SetupIntents + Elements
- **Professional Payouts**: Professionals can receive payments via Stripe Connect Express accounts
- **Secure Processing**: All sensitive card/bank data is handled by Stripe (PCI compliant)

## Required Environment Variables

### Backend (Django)

Add these to your `.env` file or environment configuration:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...                    # Your Stripe secret key
STRIPE_PUBLISHABLE_KEY=pk_test_...               # Your Stripe publishable key  
STRIPE_WEBHOOK_SECRET=whsec_...                  # Webhook endpoint secret
STRIPE_CONNECT_CLIENT_ID=ca_...                  # Connect client ID (for Express)
FRONTEND_URL=https://yourdomain.com              # Frontend URL for Connect redirects
```

### Frontend (React Native/Expo)

Add to your `.env` file:

```bash
# Stripe Frontend Configuration  
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...   # Must match backend publishable key
```

## Stripe Dashboard Setup

### 1. Enable Stripe Connect

1. Go to [Stripe Dashboard](https://dashboard.stripe.com)
2. Navigate to **Connect** → **Settings**
3. Enable **Express accounts**
4. Set your platform settings:
   - **Platform name**: CrittrCove
   - **Support email**: Your support email
   - **Product description**: Pet care services marketplace

### 2. Configure Webhooks

Create a webhook endpoint at: `https://yourdomain.com/api/payments/v1/stripe-webhook/`

**Required Events:**
- `setup_intent.succeeded` - For saving payment methods
- `account.updated` - For Connect account status changes
- `account.external_account.created` - For new bank accounts
- `account.external_account.updated` - For bank account updates

### 3. Get Your Keys

From **Developers** → **API keys**:
- Copy **Publishable key** → `STRIPE_PUBLISHABLE_KEY` 
- Copy **Secret key** → `STRIPE_SECRET_KEY`

From **Developers** → **Webhooks** → Your webhook:
- Copy **Signing secret** → `STRIPE_WEBHOOK_SECRET`

From **Connect** → **Settings**:
- Copy **Client ID** → `STRIPE_CONNECT_CLIENT_ID`

## Database Setup

Run the migrations to add Stripe fields:

```bash
cd backend/zenexotics_backend
source venv/bin/activate
python3 manage.py migrate
```

This adds:
- `stripe_connect_account_id` to User model
- Changes Payment.user foreign key to SET_NULL (preserves transactions)

## Testing with Stripe CLI

For local webhook testing:

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login to your account
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:8000/api/payments/v1/stripe-webhook/

# Use the webhook secret from the CLI output in your .env
```

## Frontend Integration

The `PaymentMethodsManager` component automatically:
- Detects web vs mobile platform
- Shows appropriate UI for payment methods vs payouts
- Handles Stripe Elements integration on web
- Manages loading states and error handling

## Test Cards

Use these test cards in development:

**Successful payments:**
- `4242 4242 4242 4242` - Visa
- `5555 5555 5555 4444` - Mastercard  
- `3782 822463 10005` - American Express

**Declined payments:**
- `4000 0000 0000 0002` - Generic decline
- `4000 0000 0000 9995` - Insufficient funds

**Any future expiry date, any 3-4 digit CVC**

## Connect Express Testing

For testing professional onboarding:
1. Use the test mode Connect onboarding flow
2. Fill in test business information
3. Use test bank account: `000123456789` (routing: `110000000`)
4. Stripe will simulate the verification process

## Security Notes

✅ **What we implemented:**
- SetupIntents (no PCI exposure)
- Connect Express (bank details handled by Stripe)
- Webhook signature verification
- Official Stripe SDKs only

❌ **What we removed:**
- Manual card input fields  
- Direct bank account collection
- Client-side payment method storage

## API Endpoints

### POST `/api/payments/v1/onboard-professional/`
Create Connect Express onboarding link
- **Auth**: Required (professionals only)
- **Body**: `{refresh_url?, return_url?}`
- **Returns**: `{onboarding_url, account_id}`

### GET `/api/payments/v1/connect-status/`
Get professional's payout account status
- **Auth**: Required
- **Returns**: `{has_account, payouts_enabled, external_accounts[], is_verified}`

### POST `/api/payments/v1/stripe-webhook/`
Webhook handler for Stripe events
- **Auth**: Stripe signature verification
- **Handles**: setup_intent.succeeded, account.updated, account.external_account.*

## Troubleshooting

**"Stripe not initialized"**
- Check `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set
- Verify you're testing on web platform (mobile support coming later)

**Webhook signature verification fails**
- Ensure `STRIPE_WEBHOOK_SECRET` matches your webhook endpoint
- Check the endpoint URL matches exactly

**Connect onboarding fails**
- Verify `STRIPE_CONNECT_CLIENT_ID` is correct
- Check `FRONTEND_URL` points to your frontend domain
- Ensure Express accounts are enabled in Stripe Dashboard

**Database migration errors**
- Ensure virtual environment is activated
- Check all required Django packages are installed
- Verify database connection settings

## Production Deployment

1. Switch to live Stripe keys (remove `_test_` from key names)
2. Update webhook endpoint to production URL
3. Set `FRONTEND_URL` to production domain
4. Enable live mode in Stripe Dashboard
5. Complete Stripe account verification for production use

## File Structure

```
backend/zenexotics_backend/
├── payments/
│   ├── stripe_services.py          # Stripe business logic
│   └── v1/views.py                 # API endpoints
├── users/models.py                 # stripe_connect_account_id field
└── payments/models.py              # Updated CASCADE deletion

frontend/src/
├── components/
│   └── PaymentMethodsManager.tsx   # Main payments component
└── components/profile/
    └── SettingsPaymentsTab.js      # Integrated settings page
```

This implementation follows Stripe's best practices and PCI compliance requirements while providing a secure, user-friendly experience for both clients and professionals.