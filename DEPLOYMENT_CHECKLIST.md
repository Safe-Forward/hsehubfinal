# ✅ Deployment Checklist - HSE Hub Platform

Use this checklist to track your deployment progress.

---

## 📋 Pre-Deployment

### Environment Setup
- [ ] Supabase CLI installed (`npm install -g supabase`)
- [ ] Logged into Supabase (`supabase login`)
- [ ] Project linked (`supabase link --project-ref zczaicsmeazucvsihick`)
- [ ] Git committed current changes (recommended)

### Documentation Review
- [ ] Read `DEPLOY_NOW.md`
- [ ] Read `FIXES_SUMMARY.md`
- [ ] Understand what will be deployed

---

## 🚀 Deployment Steps

### Step 1: Run Deployment Script
- [ ] Opened terminal in project directory
- [ ] Ran `deploy_fixes.bat` (Windows) or `./deploy_fixes.sh` (Mac/Linux)
- [ ] Script completed without errors

### Step 2: Database Migrations
- [ ] Migration `20260605000000_external_systems_integration.sql` applied
- [ ] Migration `20260605000001_comprehensive_activity_logging.sql` applied
- [ ] Migration `20260605000002_fix_billing_portal.sql` applied
- [ ] No migration errors in output

### Step 3: Edge Functions
- [ ] `manage-billing` function deployed
- [ ] `send-invoice-email` function verified/deployed
- [ ] `stripe-webhook` function verified/deployed
- [ ] No deployment errors in output

### Step 4: Environment Variables
Go to: https://supabase.com/dashboard/project/zczaicsmeazucvsihick/settings/functions

- [ ] `STRIPE_SECRET_KEY` set
- [ ] `STRIPE_WEBHOOK_SECRET` set
- [ ] `BREVO_API_KEY` set
- [ ] `SITE_URL` set

---

## 🧪 Testing Phase

### Test 1: Database Verification
Run these queries in Supabase SQL Editor:

```sql
-- Check external_systems table exists
SELECT COUNT(*) FROM external_systems;
```
- [ ] Query runs without error

```sql
-- Check audit_logs has new columns
SELECT module, severity FROM audit_logs LIMIT 1;
```
- [ ] Query runs without error (even if returns 0 rows)

```sql
-- Check triggers exist
SELECT tgname FROM pg_trigger WHERE tgname LIKE 'audit_%';
```
- [ ] Returns at least 7 trigger names

### Test 2: ERP Integration
1. Navigate to Settings → API Integration
- [ ] Page loads without errors
- [ ] "Add External System" button visible

2. Click "Add External System"
- [ ] Dialog opens
- [ ] Form shows Name, Type, Endpoint fields

3. Fill form:
   - Name: `Test SAP System`
   - Type: `SAP`
   - Endpoint: `https://test-api.sap.com`
- [ ] Submitted successfully
- [ ] System appears in table
- [ ] Status shows "Active"

4. Delete the test system
- [ ] Deletion successful
- [ ] System removed from table

### Test 3: Activity Logging
1. Navigate to Employees page
- [ ] Page loads

2. Create a new employee
- [ ] Employee created successfully

3. Navigate to Super Admin → Companies → Your Company → Activity tab
- [ ] Tab loads
- [ ] See "create_employees" log entry
- [ ] Log shows actor, timestamp, target name

4. Go back, edit the employee (change name)
- [ ] Employee updated

5. Check Activity tab again
- [ ] See new "update_employees" log entry
- [ ] Expand entry to see before/after states
- [ ] Before state shows old name
- [ ] After state shows new name

### Test 4: Invoices
1. Navigate to Invoices page
- [ ] Page loads without errors
- [ ] Invoice table visible (may be empty)

2. If invoices exist:
- [ ] Invoice numbers displayed correctly
- [ ] Amounts formatted correctly
- [ ] Status badges show correct colors
- [ ] Can click to view details
- [ ] Can download PDF
- [ ] Can send email

3. If no invoices:
- [ ] "No invoices found" message displays
- [ ] This is normal if no Stripe activity yet

### Test 5: Billing Management
1. Try to access billing info
   - Navigate to Settings → Invoices & Billing OR
   - Call manage-billing edge function

- [ ] Billing info loads
- [ ] Shows current plan details
- [ ] Shows subscription status

2. If you have Stripe customer ID:
- [ ] Can open Stripe portal
- [ ] Portal link works
- [ ] Redirects correctly

### Test 6: Super Admin Dashboard
1. Navigate to Super Admin dashboard
- [ ] Page loads
- [ ] "Monthly Revenue" card shows value
- [ ] "Total Companies" card shows count
- [ ] All metrics display correctly

2. Navigate to Super Admin → Invoices
- [ ] Invoice list loads
- [ ] Stats cards show (Total, Paid, Pending, Overdue)
- [ ] Can filter by company
- [ ] Can filter by status

### Test 7: Activity Logging Completeness
Perform these actions and verify logs appear:

- [ ] Create an incident → Check for "create_incidents" log
- [ ] Create a task → Check for "create_tasks" log
- [ ] Create an audit → Check for "create_audits" log
- [ ] Login → Check for "login" log

---

## 🔧 Verification Queries

### Tables
```sql
-- Verify external_systems table structure
\d external_systems

-- Verify audit_logs enhancements
\d audit_logs

-- Count external systems
SELECT COUNT(*) FROM external_systems;

-- Count activity logs by module
SELECT module, COUNT(*) 
FROM audit_logs 
WHERE module IS NOT NULL 
GROUP BY module;
```

- [ ] All queries run successfully

### Functions
```sql
-- List all new functions
SELECT proname 
FROM pg_proc 
WHERE proname IN (
  'encrypt_api_key',
  'decrypt_api_key',
  'test_external_system_connection',
  'log_table_changes',
  'log_document_activity',
  'log_report_generation',
  'get_activity_summary',
  'get_billing_summary',
  'generate_monthly_invoices',
  'mark_overdue_invoices'
);
```
- [ ] Returns 10 function names

### Triggers
```sql
-- List all audit triggers
SELECT 
  tgname as trigger_name,
  tgrelid::regclass as table_name
FROM pg_trigger 
WHERE tgname LIKE 'audit_%'
ORDER BY tgname;
```
- [ ] Returns 7 trigger entries

---

## 🐛 Troubleshooting Checklist

### If migrations fail:
- [ ] Check database connection
- [ ] Verify project is linked correctly
- [ ] Check for conflicting migrations
- [ ] Review error messages carefully
- [ ] Try `supabase db reset` (CAUTION: destroys data)

### If edge functions fail:
- [ ] Verify Supabase CLI is latest version
- [ ] Check function files exist in correct location
- [ ] Review deployment logs for errors
- [ ] Verify environment variables are set

### If tests fail:
- [ ] Check browser console for JavaScript errors
- [ ] Verify user has correct role
- [ ] Check RLS policies are active
- [ ] Review Supabase logs
- [ ] Clear browser cache and retry

### If activity logs don't appear:
- [ ] Verify triggers exist (query above)
- [ ] Check if RLS policies allow viewing
- [ ] Ensure user is in correct company
- [ ] Try manual log creation with `create_audit_log()`

### If invoices don't show:
- [ ] Check if Stripe webhook is configured
- [ ] Verify `STRIPE_WEBHOOK_SECRET` matches
- [ ] Look for webhook events in Stripe Dashboard
- [ ] Check Supabase edge function logs
- [ ] This is normal if no payments have been processed

---

## 📊 Success Criteria

### All Green Checks Mean:
- ✅ Database migrations applied successfully
- ✅ Edge functions deployed and working
- ✅ ERP integration fully functional
- ✅ Activity logging tracking all actions
- ✅ Invoices visible and manageable
- ✅ Billing management operational
- ✅ Revenue tracking accurate

---

## 📝 Post-Deployment Notes

### What to Monitor
- [ ] Activity log volume (should increase)
- [ ] ERP system connection status
- [ ] Invoice generation (after Stripe events)
- [ ] Error logs in Supabase dashboard
- [ ] User feedback on new features

### Optional Enhancements
- [ ] Setup cron jobs for auto-invoice generation
- [ ] Upgrade to pgcrypto encryption
- [ ] Add activity log export feature
- [ ] Create more detailed reports
- [ ] Setup monitoring alerts

---

## ✅ Completion Status

Mark when complete:

- [ ] **Pre-Deployment** - All requirements met
- [ ] **Deployment** - All steps completed
- [ ] **Testing** - All tests passed
- [ ] **Verification** - All queries successful
- [ ] **Documentation** - Team briefed on new features

---

## 🎉 Deployment Complete!

When all checkboxes above are checked:

**Your HSE Hub platform is fully deployed with:**
- ✅ ERP integration capabilities
- ✅ Real invoice management
- ✅ Complete activity logging
- ✅ Functional billing management
- ✅ Accurate revenue tracking

**Next Steps:**
1. Monitor the platform for 24 hours
2. Collect user feedback
3. Review activity logs
4. Plan future enhancements

---

**Deployment Date:** _____________  
**Deployed By:** _____________  
**Status:** ⬜ In Progress | ⬜ Complete | ⬜ Issues Found  

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________

---

**Need help?** Check `COMPREHENSIVE_FIXES_IMPLEMENTATION.md` section 10: Troubleshooting
