# Login Page Troubleshooting Guide

## Common Issues and Solutions

### Issue 1: "Page Not Loading" or Blank Screen

**Check:**
1. Open browser console (F12 or Cmd+Option+I)
2. Look for errors in the Console tab
3. Check the Network tab for failed requests

**Common causes:**
- Missing Supabase environment variables
- JavaScript errors blocking page load
- Build/deployment issues

**Fix:**
- Verify environment variables in Vercel are set correctly
- Check browser console for specific error messages

---

### Issue 2: "Login Fails" (Wrong Email/Password)

**Symptoms:**
- Clicking "Sign In" shows an error message
- Error says "Invalid login credentials"

**Solutions:**

1. **Make sure you have an account:**
   - Try registering first at `/register`
   - Or create account in Supabase Dashboard → Authentication → Users

2. **Check email/password:**
   - Email is case-insensitive but must be exact
   - Password must match exactly

3. **Reset password:**
   - Go to Supabase Dashboard → Authentication → Users
   - Find your user and click "Reset Password"
   - Or use "Forgot Password" link on login page (if implemented)

---

### Issue 3: "Error: Missing Supabase Environment Variables"

**Symptoms:**
- Page loads but shows error
- Console shows: "Missing NEXT_PUBLIC_SUPABASE_URL" or similar

**Fix:**

1. **In Vercel Dashboard:**
   - Go to Project → Settings → Environment Variables
   - Verify these are set:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   
2. **Redeploy:**
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Click "Redeploy"
   - Wait for deployment to complete

3. **Verify values:**
   - Check Supabase Dashboard → Settings → API
   - Copy fresh values if needed
   - Make sure no extra spaces in values

---

### Issue 4: "Network Error" or "Connection Failed"

**Symptoms:**
- Login button does nothing
- Network request fails
- Console shows connection errors

**Possible causes:**

1. **Supabase project is paused:**
   - Free tier projects pause after inactivity
   - Check Supabase Dashboard
   - Click "Restore" if paused

2. **CORS issues:**
   - Verify your domain is in Supabase allowed domains
   - Supabase Dashboard → Settings → API → Allowed origins
   - Add your Vercel domain (e.g., `https://your-app.vercel.app`)

3. **Network/Internet issues:**
   - Check your internet connection
   - Try different browser
   - Try incognito/private mode

---

### Issue 5: "Redirects Back to Login" After Login

**Symptoms:**
- Login seems to work
- But immediately redirects back to login page

**Possible causes:**

1. **Session not persisting:**
   - Check browser cookies are enabled
   - Check if cookies are being blocked
   - Try different browser

2. **Profile not found:**
   - User account exists but no profile
   - Check Supabase → Table Editor → `profiles` table
   - If missing, profile should auto-create on first login
   - If not, manually create profile:
     ```sql
     INSERT INTO profiles (id, role, name)
     VALUES ('user-uuid-here', 'user', 'User Name');
     ```

3. **AuthContext loading state:**
   - Sometimes auth state check fails
   - Check browser console for errors
   - Hard refresh (Cmd+Shift+R)

---

### Issue 6: Page Shows "Nothing" or Loading Forever

**Symptoms:**
- Page is blank
- Shows loading spinner forever

**Check AuthContext:**
- The login page hides itself if `authLoading` is true
- This means auth check is stuck

**Fix:**
1. Check browser console for errors
2. Check Network tab - is there a stuck request?
3. Hard refresh page
4. Clear browser cache
5. Check Supabase is accessible

---

## Debugging Steps

### Step 1: Check Browser Console

1. Open your live site
2. Press F12 (or Cmd+Option+I on Mac)
3. Go to "Console" tab
4. Try to login
5. Look for error messages (they'll be in red)

**Common errors:**
- `Missing NEXT_PUBLIC_SUPABASE_URL` → Environment variable not set
- `Invalid API key` → Wrong anon key
- `Network error` → Supabase unreachable or paused
- `Invalid credentials` → Wrong email/password

### Step 2: Check Network Requests

1. Open browser DevTools (F12)
2. Go to "Network" tab
3. Try to login
4. Look for requests to Supabase:
   - Should see requests to `*.supabase.co`
   - Check if they succeed (green) or fail (red)
   - Click on failed requests to see error details

### Step 3: Verify Environment Variables

1. Go to Vercel Dashboard
2. Project → Settings → Environment Variables
3. Verify:
   - `NEXT_PUBLIC_SUPABASE_URL` = Your Supabase URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Your anon key
4. If missing/wrong, add/correct them
5. Redeploy

### Step 4: Test Supabase Connection

1. Go to Supabase Dashboard
2. Check project status (not paused)
3. Go to Authentication → Users
4. See if you can see/create users
5. If project is paused, click "Restore"

### Step 5: Create Test Account

1. Go to your site's `/register` page
2. Create a new account
3. Try logging in with that account
4. If register works but login doesn't, it's a login-specific issue

---

## Quick Fixes to Try

1. **Hard refresh:** Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
2. **Clear browser cache:** Settings → Clear browsing data
3. **Try incognito/private mode:** Rules out browser extensions
4. **Try different browser:** Rules out browser-specific issues
5. **Check Vercel deployment logs:** Make sure latest deploy succeeded
6. **Redeploy:** Sometimes fixes environment variable issues

---

## What Specific Error Are You Seeing?

Please share:
1. **What happens when you try to login?**
   - Page doesn't load?
   - Login button does nothing?
   - Error message appears? (What does it say?)
   - Redirects somewhere?

2. **Browser console errors:**
   - Open DevTools (F12) → Console tab
   - What errors do you see? (Copy/paste them)

3. **Network requests:**
   - Open DevTools → Network tab
   - Try logging in
   - Are there any failed requests? (Red status)

---

## Still Not Working?

If none of the above works, share:
- The exact error message you see
- Browser console errors
- Screenshot of the login page
- Whether registration works (can you create an account?)

This will help diagnose the specific issue!

