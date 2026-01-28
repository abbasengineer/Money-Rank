# Stripe Payment Integration Setup Guide

This guide will help you set up Stripe payments for MoneyRank.

## Prerequisites

1. Stripe account (sign up at https://stripe.com)
2. Access to Stripe Dashboard
3. Environment variables configured

## Step 1: Create Stripe Products and Prices

1. Go to Stripe Dashboard → Products
2. Create two products:
   - **Premium** - $9.99/month
   - **Pro** - $19.99/month

3. For each product, create a recurring price:
   - Set billing period to "Monthly"
   - Set the price amount
   - Save the **Price ID** (starts with `price_...`)

## Step 2: Configure Environment Variables

Add these to your `.env.staging` file (and production environment):

```bash
# Stripe Keys (Test Mode for staging)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Stripe Price IDs (from Step 1)
STRIPE_PRICE_ID_PREMIUM=price_...
STRIPE_PRICE_ID_PRO=price_...
```

## Step 3: Set Up Webhook Endpoint

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Set endpoint URL: `https://your-staging-url.com/api/webhooks/stripe`
4. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Signing secret** (starts with `whsec_...`) and add to `STRIPE_WEBHOOK_SECRET`

## Step 4: Run Database Migration

Run the migration to add Stripe fields to the users table:

```bash
tsx script/runStripeMigration.ts
```

Or manually run the SQL:

```bash
psql $DATABASE_URL -f script/migrate_add_stripe_fields.sql
```

## Step 5: Test the Integration

### Local Testing (Stripe CLI)

1. Install Stripe CLI: `brew install stripe/stripe-cli/stripe`
2. Login: `stripe login`
3. Forward webhooks: `stripe listen --forward-to localhost:5000/api/webhooks/stripe`
4. Test checkout with test card: `4242 4242 4242 4242`

### Staging Testing

1. Deploy to staging
2. Configure webhook endpoint in Stripe Dashboard
3. Test full checkout flow
4. Verify webhook events are received

## Step 6: Production Setup

1. Switch to **Live Mode** in Stripe Dashboard
2. Get live keys (starts with `pk_live_` and `sk_live_`)
3. Update environment variables in production
4. Create webhook endpoint for production URL
5. Test with a small real payment

## Troubleshooting

### Webhook Not Receiving Events

- Check webhook URL is correct and accessible
- Verify webhook secret matches
- Check Stripe Dashboard → Webhooks → Events for delivery status

### Subscription Not Updating

- Check webhook logs in Stripe Dashboard
- Verify database migration ran successfully
- Check server logs for webhook processing errors

### Price ID Not Found

- Verify `STRIPE_PRICE_ID_PREMIUM` and `STRIPE_PRICE_ID_PRO` are set
- Ensure price IDs match your Stripe Dashboard
- Check price IDs are from the correct Stripe mode (test vs live)

## Important Notes

- **Never commit Stripe keys to git** - use environment variables
- **Test mode keys** start with `pk_test_` and `sk_test_`
- **Live mode keys** start with `pk_live_` and `sk_live_`
- Webhook secrets are different for test and live modes
- Always test in staging before deploying to production

