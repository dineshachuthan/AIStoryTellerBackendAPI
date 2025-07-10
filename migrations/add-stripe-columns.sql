-- Add Stripe payment fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR,
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR,
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50);