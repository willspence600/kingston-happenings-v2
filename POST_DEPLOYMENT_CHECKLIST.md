# Post-Deployment Checklist

What to do after your successful deployment.

## ✅ Step 1: Test Your Live Site

1. **Click "Continue to Dashboard"** in Vercel
2. Find your deployment URL (e.g., `https://kingston-happenings-xyz.vercel.app`)
3. Click to visit your live site
4. Verify it loads correctly

## ✅ Step 2: Run Database Migrations (CRITICAL!)

Your database tables don't exist yet. You need to create them:

### Option A: Using Prisma Migrate (Recommended)

1. **Get your database connection string:**
   - Go to Supabase Dashboard → Settings → Database
   - Copy the **Transaction mode** connection string (port 5432, NOT 6543)
   - Replace `[YOUR-PASSWORD]` with your actual password

2. **Run migrations from your local machine:**
   ```bash
   cd /Users/jasminewu/kingston-happenings/webapp
   
   # Set the database URL (use Transaction mode for migrations)
   export DATABASE_URL="postgresql://postgres:YOUR-PASSWORD@db.your-project-ref.supabase.co:5432/postgres"
   
   # Run migrations
   npx prisma migrate deploy
   ```

3. **Verify tables were created:**
   - Go to Supabase Dashboard → Table Editor
   - You should see tables: `Event`, `Venue`, `EventCategory`, `Like`, `User`

### Option B: Using Supabase SQL Editor

If migrations don't work, you can manually create tables:

1. Go to Supabase Dashboard → SQL Editor
2. Check if you have migration SQL files in `prisma/migrations/`
3. Run them in order in the SQL Editor

**⚠️ Important:** Without running migrations, your app won't be able to save events/venues!

## ✅ Step 3: Test Core Functionality

Test these on your live site:

- [ ] **Homepage loads** - Should show "Every Event. Every Day."
- [ ] **User registration** - Try creating an account
- [ ] **User login** - Sign in with the account you just created
- [ ] **Event submission** - Try submitting a test event
- [ ] **Browse events** - Check if events page loads

**Note:** If event submission doesn't work, it's likely because migrations haven't been run yet (Step 2).

## ✅ Step 4: Set Yourself as Admin

1. **Sign up on your live site** (if you haven't already)
2. **Go to Supabase Dashboard** → Table Editor → `profiles` table
3. **Find your row:**
   - Look for your email or name
   - Or look at the `id` column (it's a UUID)
4. **Edit the `role` column:**
   - Change from `user` to `admin`
   - Press Enter or click outside to save

5. **Refresh your live site** - You should now have admin access!

## ✅ Step 5: (Optional) Add Custom Domain

### In Vercel:

1. Go to your project → **Settings** → **Domains**
2. Enter your domain (e.g., `kingstonhappenings.ca` or `www.kingstonhappenings.ca`)
3. Click **"Add"**
4. Vercel will show you DNS records to add

### At Your Domain Registrar:

1. Go to where you bought your domain (GoDaddy, Namecheap, etc.)
2. Find **DNS Settings** or **DNS Management**
3. Add the DNS records Vercel provided:
   - **For root domain:** Add an `A` record pointing to Vercel's IP
   - **For www subdomain:** Add a `CNAME` record pointing to `cname.vercel-dns.com`
4. Wait 5-60 minutes for DNS to propagate
5. Vercel will automatically provision SSL certificate

### Verify Domain:

- Once DNS propagates, your site will be available at your custom domain
- SSL certificate will be active automatically
- Both `yourdomain.com` and `www.yourdomain.com` will work

## ✅ Step 6: (Optional) Set Up Preview Deployments

Vercel automatically creates preview deployments for:
- **Pull requests** - Each PR gets its own URL
- **Branches** - Each branch gets its own URL

This lets you test changes before merging to main!

## ✅ Step 7: Verify Everything Works

Final checklist:

- [ ] Site loads at your Vercel URL (or custom domain)
- [ ] Database migrations completed
- [ ] User registration works
- [ ] User login works
- [ ] Event submission works
- [ ] Events appear on the site
- [ ] Admin panel works (if you set yourself as admin)
- [ ] Data persists (try submitting an event, refresh, it should still be there)

## Troubleshooting

### "Events aren't saving"
- **Did you run migrations?** This is the #1 issue. Go back to Step 2.

### "Database connection error"
- Check `DATABASE_URL` in Vercel environment variables
- Make sure password is correct (no `[YOUR-PASSWORD]` placeholder)
- Verify connection string uses the correct port and format

### "Can't sign up/login"
- Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel
- Verify Supabase project is active

### "I'm not admin after changing role"
- Make sure you saved the change in Supabase dashboard
- Sign out and sign back in on your live site
- Check browser console for errors

## What's Next?

Now that you're deployed:

1. **Share your site** - Send the URL to friends/family
2. **Start adding events** - Submit real events happening in Kingston
3. **Promote your site** - Share on social media, local groups, etc.
4. **Monitor usage** - Check Vercel dashboard for traffic stats
5. **Iterate** - Make improvements based on feedback

## Quick Reference

**Your deployment URLs:**
- Production: `https://your-project-name.vercel.app`
- Custom domain: `https://yourdomain.com` (once configured)

**Important Dashboards:**
- Vercel: [vercel.com/dashboard](https://vercel.com/dashboard)
- Supabase: [app.supabase.com](https://app.supabase.com)

**Need to redeploy?**
- Push changes to GitHub main branch = automatic redeploy
- Or manually redeploy from Vercel dashboard

---

**Congratulations! Your site is live! 🎉**

