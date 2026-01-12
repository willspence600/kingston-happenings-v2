# Quick Login Troubleshooting

## Most Common Issues

### Issue 1: Missing Supabase Environment Variables

**Check in Vercel:**
1. Go to Vercel → Project → Settings → Environment Variables
2. Verify these exist:
   - `NEXT_PUBLIC_SUPABASE_URL` 
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. If missing, add them:
   - Get values from: Supabase Dashboard → Settings → API

### Issue 2: No User Account

**Check:**
- Have you registered an account yet?
- Try going to `/register` and creating one
- Or create one in Supabase Dashboard → Authentication → Users

### Issue 3: Email Not Verified

**Solution:**
- In Supabase Dashboard → Authentication → Users
- Find your user
- Manually confirm the email (click the checkmark)

### Issue 4: Supabase Project Paused

**Check:**
- Go to Supabase Dashboard
- Is project paused? If so, click "Restore"

---

## Quick Checks

1. **Browser Console (F12):**
   - Look for errors when trying to login
   - Common errors:
     - "Missing Supabase environment variables"
     - "Invalid login credentials"
     - Network errors

2. **Vercel Environment Variables:**
   - Make sure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
   - Redeploy if you just added them

3. **Test Account:**
   - Try creating a new account at `/register`
   - Then try logging in with that account

