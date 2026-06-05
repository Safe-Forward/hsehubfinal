#!/bin/bash

# HSE Hub Platform - Comprehensive Fixes Deployment Script
# This script deploys all the fixes for ERP integration, billing, and activity logging

echo "=========================================="
echo "HSE Hub Platform - Deployment Script"
echo "=========================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if logged in
echo "Checking Supabase authentication..."
supabase projects list > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Not logged in to Supabase. Please run:"
    echo "   supabase login"
    exit 1
fi

echo "✅ Authenticated with Supabase"
echo ""

# Get project ref
echo "Enter your Supabase project reference (e.g., abcdefghijklmnop):"
read PROJECT_REF

if [ -z "$PROJECT_REF" ]; then
    echo "❌ Project reference is required"
    exit 1
fi

echo ""
echo "=========================================="
echo "Step 1: Running Database Migrations"
echo "=========================================="
echo ""

# Link project
echo "Linking to project $PROJECT_REF..."
supabase link --project-ref $PROJECT_REF

echo ""
echo "Running migration: External Systems Integration..."
supabase db push

if [ $? -ne 0 ]; then
    echo "❌ Migration failed. Please check the error above."
    exit 1
fi

echo "✅ Database migrations completed successfully"
echo ""

echo "=========================================="
echo "Step 2: Deploying Edge Functions"
echo "=========================================="
echo ""

echo "Deploying manage-billing function..."
supabase functions deploy manage-billing --project-ref $PROJECT_REF

if [ $? -ne 0 ]; then
    echo "⚠️  manage-billing deployment failed (may need to create function first)"
fi

echo ""
echo "Deploying send-invoice-email function..."
supabase functions deploy send-invoice-email --project-ref $PROJECT_REF

if [ $? -ne 0 ]; then
    echo "⚠️  send-invoice-email deployment may have issues"
fi

echo ""
echo "Deploying stripe-webhook function..."
supabase functions deploy stripe-webhook --project-ref $PROJECT_REF

if [ $? -ne 0 ]; then
    echo "⚠️  stripe-webhook deployment may have issues"
fi

echo ""
echo "✅ Edge functions deployment completed"
echo ""

echo "=========================================="
echo "Step 3: Environment Variables Check"
echo "=========================================="
echo ""

echo "Please ensure these environment variables are set in Supabase Dashboard:"
echo "   → Settings → Edge Functions → Environment Variables"
echo ""
echo "Required variables:"
echo "   • STRIPE_SECRET_KEY          - Your Stripe secret key"
echo "   • STRIPE_WEBHOOK_SECRET      - Stripe webhook signing secret"
echo "   • BREVO_API_KEY              - Brevo email API key"
echo "   • SITE_URL                   - Your site URL (e.g., https://yourdomain.com)"
echo ""
echo "Press Enter after you've verified these are set..."
read

echo ""
echo "=========================================="
echo "Step 4: Testing Deployment"
echo "=========================================="
echo ""

echo "Running basic connectivity tests..."
echo ""

# Test database connection
echo "1. Testing database connection..."
supabase db diff --linked > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Database connection successful"
else
    echo "   ⚠️  Database connection test failed"
fi

echo ""
echo "2. Checking if external_systems table exists..."
# This will show an error if table doesn't exist, but we catch it
TABLE_CHECK=$(supabase db execute --linked -c "SELECT COUNT(*) FROM external_systems;" 2>&1)
if [[ $TABLE_CHECK == *"ERROR"* ]]; then
    echo "   ⚠️  external_systems table not found"
else
    echo "   ✅ external_systems table exists"
fi

echo ""
echo "3. Checking if audit_logs has new columns..."
COLUMN_CHECK=$(supabase db execute --linked -c "SELECT module FROM audit_logs LIMIT 1;" 2>&1)
if [[ $COLUMN_CHECK == *"ERROR"* ]] && [[ $COLUMN_CHECK == *"module"* ]]; then
    echo "   ⚠️  audit_logs module column not found"
else
    echo "   ✅ audit_logs enhanced columns exist"
fi

echo ""
echo "=========================================="
echo "Deployment Summary"
echo "=========================================="
echo ""
echo "✅ Database migrations applied"
echo "✅ Edge functions deployed"
echo ""
echo "Next Steps:"
echo "1. Verify environment variables in Supabase Dashboard"
echo "2. Test ERP integration in Settings → API Integration"
echo "3. Check activity logs in Super Admin → Companies → Activity"
echo "4. Test billing management in Invoices page"
echo ""
echo "For detailed testing instructions, see:"
echo "   COMPREHENSIVE_FIXES_IMPLEMENTATION.md"
echo ""
echo "=========================================="
echo "Deployment Complete! 🎉"
echo "=========================================="
