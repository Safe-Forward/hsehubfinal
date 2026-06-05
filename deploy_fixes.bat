@echo off
REM HSE Hub Platform - Comprehensive Fixes Deployment Script (Windows)
REM This script deploys all the fixes for ERP integration, billing, and activity logging

echo ==========================================
echo HSE Hub Platform - Deployment Script
echo ==========================================
echo.

REM Check if Supabase CLI is installed
where supabase >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X Supabase CLI not found. Please install it first:
    echo    npm install -g supabase
    pause
    exit /b 1
)

echo ✓ Supabase CLI found
echo.

REM Check if logged in
echo Checking Supabase authentication...
supabase projects list >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X Not logged in to Supabase. Please run:
    echo    supabase login
    pause
    exit /b 1
)

echo ✓ Authenticated with Supabase
echo.

REM Get project ref
set /p PROJECT_REF="Enter your Supabase project reference (e.g., abcdefghijklmnop): "

if "%PROJECT_REF%"=="" (
    echo X Project reference is required
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Step 1: Running Database Migrations
echo ==========================================
echo.

REM Link project
echo Linking to project %PROJECT_REF%...
supabase link --project-ref %PROJECT_REF%

echo.
echo Running migrations...
supabase db push

if %ERRORLEVEL% NEQ 0 (
    echo X Migration failed. Please check the error above.
    pause
    exit /b 1
)

echo ✓ Database migrations completed successfully
echo.

echo ==========================================
echo Step 2: Deploying Edge Functions
echo ==========================================
echo.

echo Deploying manage-billing function...
supabase functions deploy manage-billing --project-ref %PROJECT_REF%

echo.
echo Deploying send-invoice-email function...
supabase functions deploy send-invoice-email --project-ref %PROJECT_REF%

echo.
echo Deploying stripe-webhook function...
supabase functions deploy stripe-webhook --project-ref %PROJECT_REF%

echo.
echo ✓ Edge functions deployment completed
echo.

echo ==========================================
echo Step 3: Environment Variables Check
echo ==========================================
echo.

echo Please ensure these environment variables are set in Supabase Dashboard:
echo    -^> Settings -^> Edge Functions -^> Environment Variables
echo.
echo Required variables:
echo    * STRIPE_SECRET_KEY          - Your Stripe secret key
echo    * STRIPE_WEBHOOK_SECRET      - Stripe webhook signing secret
echo    * BREVO_API_KEY              - Brevo email API key
echo    * SITE_URL                   - Your site URL (e.g., https://yourdomain.com)
echo.
echo Press any key after you've verified these are set...
pause >nul

echo.
echo ==========================================
echo Step 4: Verification
echo ==========================================
echo.

echo Testing database connection...
supabase db diff --linked >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo    ✓ Database connection successful
) else (
    echo    ⚠ Database connection test failed
)

echo.
echo ==========================================
echo Deployment Summary
echo ==========================================
echo.
echo ✓ Database migrations applied
echo ✓ Edge functions deployed
echo.
echo Next Steps:
echo 1. Verify environment variables in Supabase Dashboard
echo 2. Test ERP integration in Settings -^> API Integration
echo 3. Check activity logs in Super Admin -^> Companies -^> Activity
echo 4. Test billing management in Invoices page
echo.
echo For detailed testing instructions, see:
echo    COMPREHENSIVE_FIXES_IMPLEMENTATION.md
echo.
echo ==========================================
echo Deployment Complete! 🎉
echo ==========================================
echo.
pause
