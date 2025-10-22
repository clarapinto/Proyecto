# Troubleshooting Guide - E-Procurement Platform

This guide helps you diagnose and resolve common issues with the e-procurement platform.

## Table of Contents

1. [Row-Level Security (RLS) Errors](#row-level-security-rls-errors)
2. [Authentication Issues](#authentication-issues)
3. [Request Creation Failures](#request-creation-failures)
4. [Role Mismatch Problems](#role-mismatch-problems)
5. [Database Access Issues](#database-access-issues)
6. [Debugging Tools](#debugging-tools)
7. [Common Error Messages](#common-error-messages)

---

## Row-Level Security (RLS) Errors

### Symptom

Error message: `new row violates row-level security policy for table "requests"`

### Cause

This error occurs when:
- Your JWT token doesn't contain the correct role information
- Your user profile is missing or misconfigured
- There's a mismatch between your JWT role and database role
- Your session is outdated

### Solution

#### Step 1: Check Your Authentication Status

Open the browser console and run:

```javascript
await window.authDebug.diagnose()
```

This will show you:
- Whether you're authenticated
- Your current JWT role
- Your profile role
- Any mismatches or issues

#### Step 2: Try Automatic Fix

```javascript
await window.authDebug.autoFix()
```

This will:
- Refresh your session
- Update your JWT token
- Verify the fix was successful

#### Step 3: Manual Fix (if auto-fix fails)

1. **Log out completely**:
   - Click your profile menu
   - Select "Cerrar Sesión"

2. **Clear browser data**:
   - Press F12 to open DevTools
   - Go to Application tab
   - Clear all site data
   - Close and reopen browser

3. **Log back in**:
   - Use your credentials
   - Check console for any errors

#### Step 4: Verify Database Profile

If issues persist, verify your database profile:

```sql
-- Run in Supabase SQL Editor
SELECT
  au.id as user_id,
  au.email,
  au.raw_app_meta_data->>'role' as jwt_role,
  up.id as profile_id,
  up.role as profile_role,
  up.is_active
FROM auth.users au
LEFT JOIN users_profile up ON up.user_id = au.id
WHERE au.email = 'your-email@example.com';
```

Expected results:
- `profile_id` should NOT be null
- `jwt_role` should match `profile_role`
- `is_active` should be `true`

---

## Authentication Issues

### Can't Log In

#### Check 1: User Exists

```sql
SELECT id, email, email_confirmed_at
FROM auth.users
WHERE email = 'your-email@example.com';
```

If no results: User doesn't exist. Contact administrator.

#### Check 2: Profile Exists

```sql
SELECT *
FROM users_profile
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'your-email@example.com');
```

If no results: Profile is missing. Contact administrator.

#### Check 3: Password

If you see "Invalid login credentials":
- Verify you're using the correct password
- Passwords are case-sensitive
- Check for extra spaces

### Session Expires Too Quickly

This is normal. Sessions expire after a period of inactivity. Simply log in again.

---

## Request Creation Failures

### General Debugging Process

When "Enviar para Aprobación" fails:

#### Step 1: Check Browser Console

Press F12 and look for error messages. The new logging system will show:

```
🚀 Request Submission Started
  📋 Step 1: Validation
    ✓ Profile ID: xxx
    ✓ Profile Role: request_creator
    ...
```

Find where the ❌ appears and what error message follows.

#### Step 2: Verify Prerequisites

Run in console:

```javascript
await window.authDebug.validate(['request_creator', 'admin'])
```

This checks if you have the required permissions.

#### Step 3: Check Profile Integrity

```javascript
await window.authDebug.checkIntegrity()
```

This performs a comprehensive check of your profile data.

### Specific Error: "Usuario no autenticado"

**Cause**: No profile.id available

**Solution**:
1. Check console logs for profile object
2. Run: `await window.authDebug.diagnose()`
3. If profile_id is null, contact administrator

### Specific Error: "No suppliers selected"

**Cause**: You didn't select any suppliers in Step 4

**Solution**:
1. Go back to Step 4
2. Select at least one supplier from the list
3. Continue to Step 6

### Specific Error: "Error de permisos de seguridad"

**Cause**: RLS policy blocking the insert

**Solution**:
1. Note the technical details shown in the error
2. Run: `await window.authDebug.autoFix()`
3. If that doesn't work, log out and log back in
4. If still failing, provide the technical details to administrator

---

## Role Mismatch Problems

### Symptom

Console shows:
```
⚠️ ROLE MISMATCH DETECTED!
JWT Role: supplier
Profile Role: request_creator
```

### Cause

Your JWT token has outdated role information.

### Solution

#### Automatic

```javascript
await window.authDebug.autoFix()
```

#### Manual

1. Log out
2. Log back in
3. Check: `await window.authDebug.diagnose()`

### If Mismatch Persists

Contact administrator. They may need to run:

```sql
-- Sync roles (administrator only)
SELECT sync_user_role_to_jwt();
```

---

## Database Access Issues

### Can't See Suppliers List

**For Request Creators:**

```sql
-- Verify your role grants access
SELECT
  up.role,
  COUNT(s.id) as supplier_count
FROM users_profile up
CROSS JOIN suppliers s
WHERE up.user_id = auth.uid()
GROUP BY up.role;
```

If count is 0, suppliers table might be empty.

**To add test suppliers:**

```sql
INSERT INTO suppliers (name, contact_name, contact_email, contact_phone, contract_fee_percentage)
VALUES
  ('Event Pro', 'Maria Rodriguez', 'maria@eventpro.com', '+1234567890', 12.00),
  ('BTL Masters', 'Juan Perez', 'juan@btlmasters.com', '+1234567891', 10.00),
  ('Creative Agency', 'Ana Garcia', 'ana@creative.com', '+1234567892', 15.00);
```

### Can't See Your Own Requests

**Check permissions:**

```javascript
await window.authDebug.validate()
```

**Verify requests exist:**

```sql
SELECT r.*, up.email as creator_email
FROM requests r
JOIN users_profile up ON up.id = r.creator_id
WHERE up.user_id = auth.uid();
```

If empty: You haven't created any requests yet.

---

## Debugging Tools

### Browser Console Commands

The application includes powerful debugging tools accessible via browser console (F12):

#### Full Diagnostics

```javascript
await window.authDebug.diagnose()
```

Shows complete authentication status, roles, and any issues.

#### Validate Permissions

```javascript
// Check if you can create requests
await window.authDebug.validate(['request_creator', 'admin'])

// Check if you can approve requests
await window.authDebug.validate(['procurement_approver', 'admin'])
```

#### Check Profile Integrity

```javascript
await window.authDebug.checkIntegrity()
```

Returns detailed analysis of your profile data with specific recommendations.

#### Automatic Fix

```javascript
await window.authDebug.autoFix()
```

Attempts to automatically resolve common authentication issues.

#### Decode JWT Token

```javascript
await window.authDebug.decodeToken()
```

Shows the contents of your JWT token, including role and metadata.

### Enhanced Logging

The CreateRequestWizard now includes comprehensive logging:

- **Step-by-step progress**: See exactly where the process is
- **Validation checks**: Know what's being validated
- **Error details**: Get technical information about failures
- **Success confirmation**: See confirmation when it works

All logs are organized in collapsible groups for easy reading.

---

## Common Error Messages

### "Error: Usuario no autenticado"

**Meaning**: You're not logged in or your session expired.

**Fix**: Log in again.

---

### "Por favor completa todos los campos requeridos"

**Meaning**: Some required fields in the form are empty.

**Fix**:
- Go back through the steps
- Fill in all required fields (Event Type, Title, Description)
- Continue to final step

---

### "Por favor selecciona al menos un proveedor"

**Meaning**: No suppliers selected in Step 4.

**Fix**:
- Return to Step 4
- Check at least one supplier checkbox
- Continue

---

### "Error al contar solicitudes"

**Meaning**: Database query to count existing requests failed.

**Fix**:
- Check your internet connection
- Verify you're still logged in
- Try again in a few moments

---

### "Error al invitar proveedores"

**Meaning**: Request was created but supplier invitations failed.

**Fix**:
- Note the request number from any success message
- Contact administrator with the request number
- They can manually add the supplier invitations

---

### "Role mismatch: JWT has 'X' but profile has 'Y'"

**Meaning**: Your JWT token has a different role than your database profile.

**Fix**:
```javascript
await window.authDebug.autoFix()
```

Or log out and log back in.

---

## Getting Help

If you've tried the solutions above and still have issues:

### Information to Provide

1. **Your email address** (used for login)

2. **Error message** (exact text or screenshot)

3. **Console diagnostics**:
   ```javascript
   await window.authDebug.diagnose()
   ```
   Take a screenshot of the output

4. **Integrity check**:
   ```javascript
   await window.authDebug.checkIntegrity()
   ```
   Take a screenshot of the output

5. **Steps to reproduce**: What were you doing when the error occurred?

6. **Browser and version**: Chrome 120, Firefox 115, etc.

### Contact Administrator

Provide all the above information to your system administrator. They can:
- Check server logs
- Verify your profile configuration
- Run database diagnostics
- Update your permissions if needed

---

## Preventive Measures

To avoid issues:

1. **Log out properly**: Always use the "Cerrar Sesión" button
2. **One browser tab**: Don't use multiple tabs for the same account
3. **Keep browser updated**: Use latest version of Chrome, Firefox, or Edge
4. **Clear cache periodically**: If you experience strange behavior
5. **Don't share sessions**: Each user should have their own account

---

## For Administrators

### Verify User Setup

```sql
-- Complete user verification
SELECT
  au.id,
  au.email,
  au.email_confirmed_at,
  au.raw_app_meta_data->>'role' as jwt_role,
  up.id as profile_id,
  up.role as profile_role,
  up.full_name,
  up.is_active,
  CASE
    WHEN au.raw_app_meta_data->>'role' = up.role::text THEN '✓ OK'
    ELSE '✗ MISMATCH'
  END as role_status
FROM auth.users au
LEFT JOIN users_profile up ON up.user_id = au.id
ORDER BY au.email;
```

### Fix User Metadata

```sql
-- Update all users' JWT metadata
SELECT sync_user_role_to_jwt();
```

### Check RLS Policies

```sql
-- List all policies on requests table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'requests'
ORDER BY policyname;
```

### Verify Migrations Applied

```sql
-- Check migration history
SELECT * FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 10;
```

---

## Version History

- **v1.0** (2025-10-14): Initial troubleshooting guide
  - Added RLS error solutions
  - Included debugging tools documentation
  - Created comprehensive error reference
