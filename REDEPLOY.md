# How to Redeploy on kingstonhappenings.ca

## Method 1: Vercel Dashboard (Easiest) ⭐

1. **Go to Vercel Dashboard**
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Sign in if needed

2. **Find Your Project**
   - Look for your `kingston-happenings` project
   - Click on it

3. **Redeploy**
   - Go to the **"Deployments"** tab
   - Find your latest deployment
   - Click the **"..."** menu (three dots) on the right
   - Click **"Redeploy"**
   - Confirm by clicking **"Redeploy"** again

4. **Wait for Build**
   - The deployment will start automatically
   - Watch the build logs in real-time
   - Usually takes 2-5 minutes

That's it! Your site will be redeployed with the latest code.

---

## Method 2: Push a Git Commit (Automatic)

If your project is connected to GitHub and has auto-deploy enabled:

1. **Make a small change** (or commit the TypeScript fixes we just made)
   ```bash
   cd webapp
   git add .
   git commit -m "Fix TypeScript errors"
   git push
   ```

2. **Vercel automatically deploys**
   - Go to Vercel dashboard
   - Watch the new deployment start automatically

---

## Method 3: Vercel CLI (Command Line)

If you have Vercel CLI installed:

```bash
cd webapp
vercel --prod
```

**To install Vercel CLI:**
```bash
npm install -g vercel
```

Then login:
```bash
vercel login
```

---

## Quick Redeploy Script

I can create a simple script to make this easier in the future. Would you like me to add one?

---

## Troubleshooting

**Build fails?**
- Check the build logs in Vercel dashboard
- Make sure all environment variables are set correctly
- Verify `DATABASE_URL` is configured in Vercel

**Changes not showing?**
- Wait a few minutes for deployment to complete
- Clear your browser cache (Cmd+Shift+R or Ctrl+Shift+R)
- Check that the deployment succeeded in Vercel dashboard

**Need to check environment variables?**
- Vercel Dashboard → Your Project → Settings → Environment Variables
- Make sure `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are all set

