# Deployment Guide - Host Your Website on a Custom Domain

Complete guide to deploy your Kingston Happenings website to production with a custom domain.

## Recommended: Vercel (Best for Next.js)

Vercel is made by the creators of Next.js and offers the best experience with:
- ✅ Free tier with generous limits
- ✅ Automatic HTTPS/SSL
- ✅ Easy custom domain setup
- ✅ Automatic deployments from GitHub
- ✅ Serverless functions (perfect for Next.js API routes)

## Option 1: Deploy to Vercel

### Step 1: Prepare Your Code

1. **Push your code to GitHub** (if not already):
   ```bash
   # Initialize git if needed
   git init
   git add .
   git commit -m "Initial commit"
   # Create a repository on GitHub, then:
   git remote add origin https://github.com/yourusername/kingston-happenings.git
   git push -u origin main
   ```

2. **Make sure `.env.local` is in `.gitignore`** (should already be there)

### Step 2: Sign Up for Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"**
3. Sign up with **GitHub** (recommended - easiest integration)

### Step 3: Import Your Project

1. In Vercel dashboard, click **"Add New..."** → **"Project"**
2. Click **"Import Git Repository"**
3. Select your `kingston-happenings` repository
4. Click **"Import"**

### Step 4: Configure Project Settings

1. **Framework Preset**: Should auto-detect "Next.js" - keep it
2. **Root Directory**: Set to `webapp` (since your Next.js app is in the webapp folder)
3. **Build Command**: `npm run build` (or leave default)
4. **Output Directory**: `.next` (leave default)
5. **Install Command**: `npm install` (leave default)

**Important**: Make sure **Root Directory** is set to `webapp`!

### Step 5: Add Environment Variables

Before deploying, add all your environment variables:

1. Click **"Environment Variables"**
2. Add each variable:

   **Variable Name:** `NEXT_PUBLIC_SUPABASE_URL`  
   **Value:** `https://your-project-id.supabase.co`  
   **Environments:** Production, Preview, Development (select all)

   **Variable Name:** `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
   **Value:** `your-anon-key-here`  
   **Environments:** Production, Preview, Development (select all)

   **Variable Name:** `DATABASE_URL`  
   **Value:** `postgresql://postgres:YOUR-PASSWORD@db.your-project-ref.supabase.co:6543/postgres?pgbouncer=true`  
   **Environments:** Production, Preview, Development (select all)

   **Note:** Replace `YOUR-PASSWORD` with your actual Supabase database password

3. Click **"Save"** for each variable

### Step 6: Deploy

1. Click **"Deploy"**
2. Wait for the build to complete (2-5 minutes)
3. Your site will be live at `https://your-project-name.vercel.app`

### Step 7: Set Up Custom Domain

1. In your Vercel project, go to **Settings** → **Domains**
2. Enter your domain (e.g., `kingstonhappenings.ca` or `www.kingstonhappenings.ca`)
3. Click **"Add"**
4. Vercel will show you DNS records to add:

   **Option A: Root Domain (kingstonhappenings.ca)**
   - Add a DNS record:
     - **Type:** `A`
     - **Name:** `@` or leave blank
     - **Value:** `76.76.21.21` (Vercel's IP - they'll show the exact IP)

   **Option B: Subdomain (www.kingstonhappenings.ca)**
   - Add a DNS record:
     - **Type:** `CNAME`
     - **Name:** `www`
     - **Value:** `cname.vercel-dns.com` (Vercel will show exact value)

5. **Add DNS records in your domain registrar:**
   - Go to where you bought your domain (GoDaddy, Namecheap, Google Domains, etc.)
   - Find DNS settings / DNS management
   - Add the records Vercel provided
   - Wait 5-60 minutes for DNS to propagate

6. **Verify in Vercel:** Once DNS propagates, Vercel will automatically provision SSL certificate (takes a few minutes)

### Step 8: Run Database Migrations

Your production database needs tables:

```bash
# Set your production database URL temporarily
export DATABASE_URL="postgresql://postgres:YOUR-PASSWORD@db.your-project-ref.supabase.co:5432/postgres"

# Run migrations
cd webapp
npx prisma migrate deploy
```

**Note:** Use port `5432` (transaction mode) for migrations, not `6543` (pooling mode).

### Step 9: Test Everything

1. Visit your custom domain
2. Test user registration
3. Test event submission
4. Verify data saves to Supabase

## Option 2: Deploy to Netlify

If you prefer Netlify:

### Step 1-2: Same as Vercel (GitHub + Sign Up)

1. Push code to GitHub
2. Sign up at [netlify.com](https://netlify.com)

### Step 3: Import Project

1. Click **"Add new site"** → **"Import an existing project"**
2. Choose **"Deploy with GitHub"**
3. Select your repository

### Step 4: Configure Build Settings

- **Base directory:** `webapp`
- **Build command:** `npm run build`
- **Publish directory:** `webapp/.next` (wait, actually Netlify needs `webapp/out` - see below)

**Note:** Netlify needs static export for Next.js, or you can use their Next.js runtime. Let's use their Next.js runtime:

1. Create `netlify.toml` in your project root:
   ```toml
   [build]
     base = "webapp"
     command = "npm run build"
     publish = "webapp/.next"

   [[plugins]]
     package = "@netlify/plugin-nextjs"
   ```

2. Install the plugin in `package.json`:
   ```bash
   npm install --save-dev @netlify/plugin-nextjs
   ```

### Step 5: Add Environment Variables

In Netlify: **Site settings** → **Environment variables**

Add the same variables as Vercel.

### Step 6: Deploy & Add Domain

Similar to Vercel - Netlify will guide you through adding your custom domain.

## Option 3: Other Hosting Options

### Railway
- Good for full-stack apps
- [railway.app](https://railway.app)

### Render
- Similar to Heroku
- [render.com](https://render.com)

### DigitalOcean App Platform
- More control, slightly more complex
- [digitalocean.com](https://digitalocean.com)

## Domain Setup Details

### Where to Buy a Domain

Popular registrars:
- **Google Domains** / **Google Workspace** - Simple, straightforward
- **Namecheap** - Good prices, good interface
- **GoDaddy** - Popular but can be expensive
- **Cloudflare** - Best prices, great DNS management
- **Hover** - Simple, no upsells

### DNS Configuration

After adding DNS records at your registrar:

1. **Wait for propagation** (5 minutes to 48 hours, usually 15-60 minutes)
2. **Check DNS propagation:** Use [whatsmydns.net](https://whatsmydns.net)
3. **Verify SSL:** Both Vercel and Netlify automatically provision SSL certificates

### Recommended DNS Setup

For best results:
- Add both `www` and root domain
- Vercel/Netlify will handle redirects automatically
- Root domain (`kingstonhappenings.ca`) and `www.kingstonhappenings.ca` both work

## Environment Variables Checklist

Make sure these are set in production:

- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `DATABASE_URL` (with your actual password)

**Important:** Never commit `.env.local` or share these values publicly!

## Post-Deployment Checklist

- [ ] Site loads at custom domain
- [ ] HTTPS/SSL certificate is active (green lock in browser)
- [ ] User registration works
- [ ] User login works
- [ ] Event submission works
- [ ] Venue creation works
- [ ] Data persists (check Supabase dashboard)
- [ ] Admin panel works (if you're an admin)
- [ ] Images upload correctly (if you have image upload)

## Troubleshooting

### "Build Failed"
- Check build logs in Vercel/Netlify dashboard
- Make sure `webapp` is set as root directory
- Verify all dependencies are in `package.json`
- Check for TypeScript errors: `npm run build` locally

### "Database Connection Error"
- Verify `DATABASE_URL` is set correctly
- Check password is correct (no special characters need URL encoding)
- Make sure you're using connection pooling mode (port 6543) for app
- Verify Supabase database is accessible

### "Domain Not Working"
- Wait longer for DNS propagation (can take up to 48 hours)
- Check DNS records are correct (use [whatsmydns.net](https://whatsmydns.net))
- Verify DNS records at your registrar match Vercel's instructions exactly
- Make sure SSL certificate has been provisioned (can take 5-10 minutes after DNS)

### "Environment Variables Not Working"
- Make sure variables are added for **Production** environment
- Variable names must match exactly (case-sensitive)
- Redeploy after adding variables (they don't update on existing deployments)
- Check variable values don't have extra spaces

### "Site Shows 404 or Blank Page"
- Check build logs for errors
- Verify root directory is set to `webapp`
- Make sure `package.json` is in the `webapp` folder
- Check Next.js configuration is correct

## Continuous Deployment

Once set up:
- **Every push to main branch** = automatic deployment
- **Pull requests** = preview deployments (Vercel/Netlify create unique URLs)
- **Manual deployments** = possible from dashboard

## Free Tier Limits

### Vercel Free Tier:
- ✅ 100 GB bandwidth/month
- ✅ Unlimited requests
- ✅ Automatic SSL
- ✅ Custom domains
- ✅ Preview deployments
- ✅ 100 serverless function executions/day

### Netlify Free Tier:
- ✅ 100 GB bandwidth/month
- ✅ 300 build minutes/month
- ✅ Automatic SSL
- ✅ Custom domains

**Both are very generous for a small-to-medium site!**

## Cost Estimate

- **Domain:** $10-15/year (varies by registrar and TLD)
- **Hosting:** **FREE** (Vercel/Netlify free tiers are very generous)
- **Database:** **FREE** (Supabase free tier: 500 MB, plenty for thousands of events)
- **Total:** ~$10-15/year (just the domain)

## Quick Start Command Reference

```bash
# 1. Push to GitHub
git init
git add .
git commit -m "Ready for deployment"
git remote add origin https://github.com/yourusername/kingston-happenings.git
git push -u origin main

# 2. Deploy to Vercel (via dashboard, then):
# - Import project
# - Set root directory to "webapp"
# - Add environment variables
# - Deploy

# 3. Run migrations for production
export DATABASE_URL="postgresql://postgres:PASSWORD@db.REF.supabase.co:5432/postgres"
cd webapp
npx prisma migrate deploy

# 4. Add custom domain in Vercel
# - Settings → Domains → Add domain
# - Add DNS records at registrar
# - Wait for SSL
```

## Need Help?

- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)
- **Netlify Docs:** [docs.netlify.com](https://docs.netlify.com)
- **Next.js Deployment:** [nextjs.org/docs/deployment](https://nextjs.org/docs/deployment)
- **Supabase Docs:** [supabase.com/docs](https://supabase.com/docs)

---

**Summary:** Deploy to Vercel (easiest for Next.js), add your custom domain, set environment variables, run migrations, and you're live! 🚀
