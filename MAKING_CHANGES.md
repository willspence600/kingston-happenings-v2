# How to Make Changes to Your Website

Guide for updating your Kingston Happenings website after deployment.

## Quick Workflow

1. **Make changes locally** (on your computer)
2. **Test locally** (make sure it works)
3. **Push to GitHub** (save your changes)
4. **Vercel auto-deploys** (your site updates automatically)

## Step-by-Step Process

### Step 1: Make Changes Locally

1. **Open your project** in your code editor (VS Code, etc.)
2. **Edit files** - Make whatever changes you want
3. **Save your files**

### Step 2: Test Locally (Important!)

Before pushing to production, test your changes:

```bash
# Navigate to your project
cd /Users/jasminewu/kingston-happenings/webapp

# Start the development server
npm run dev
```

This starts your site at `http://localhost:3000`

**Test your changes:**
- Make sure the page loads
- Check if new features work
- Look for any errors in the browser console
- Verify it looks correct

**Stop the dev server:** Press `Ctrl + C` in Terminal when done testing

### Step 3: Commit and Push to GitHub

Once your changes work locally:

```bash
# Navigate to project root (not webapp folder)
cd /Users/jasminewu/kingston-happenings

# See what files changed
git status

# Add all changed files
git add .

# Commit with a descriptive message
git commit -m "Description of what you changed"

# Push to GitHub
git push
```

**Example commit messages:**
- `"Add new feature to filter events by date"`
- `"Fix bug in venue selector"`
- `"Update homepage design"`
- `"Add new event category"`

### Step 4: Vercel Auto-Deploys

**Automatic deployment:**
- When you push to the `main` branch, Vercel automatically deploys your changes
- You'll see a new deployment start in your Vercel dashboard
- Wait 2-5 minutes for it to finish
- Your live site will update automatically!

**Check deployment status:**
- Go to [vercel.com/dashboard](https://vercel.com/dashboard)
- Click on your project
- See the "Deployments" tab
- Watch the build progress

## Common Changes You Might Make

### Adding New Features

1. Edit the relevant files (e.g., `src/app/page.tsx` for homepage)
2. Test locally: `npm run dev`
3. Commit and push
4. Vercel deploys automatically

### Updating Content/Text

1. Edit the files with the text you want to change
2. Test locally to see the changes
3. Commit and push
4. Changes go live automatically

### Changing Styles/Design

1. Edit CSS/Tailwind classes in your components
2. Test locally to see the styling
3. Commit and push
4. New design goes live

### Adding New Pages

1. Create new files in `src/app/` (e.g., `src/app/contact/page.tsx`)
2. Test locally: Visit `http://localhost:3000/contact`
3. Commit and push
4. New page is live!

### Updating Database Schema

If you need to add new fields to your database:

```bash
cd /Users/jasminewu/kingston-happenings/webapp

# Edit prisma/schema.prisma to add new fields
# Then create a migration:
npx prisma migrate dev --name add_new_field

# Push to GitHub
git add .
git commit -m "Add new database field"
git push
```

**Important:** After deploying, run migrations on production:
```bash
# Set your production DATABASE_URL
export DATABASE_URL="your-production-connection-string"

# Run migrations
npx prisma migrate deploy
```

## Testing Changes

### Local Testing

Always test locally first:

```bash
cd /Users/jasminewu/kingston-happenings/webapp
npm run dev
```

Visit `http://localhost:3000` and test:
- Does it load?
- Do new features work?
- Are there any errors?
- Does it look right?

### Preview Deployments (Optional)

Vercel creates preview deployments for:
- **Pull requests** - Test changes before merging
- **Other branches** - Test experimental features

To use previews:
1. Create a new branch: `git checkout -b my-new-feature`
2. Make changes
3. Push branch: `git push origin my-new-feature`
4. Vercel creates a preview URL
5. Test the preview URL
6. If good, merge to main

## Quick Command Reference

```bash
# Start local dev server
cd /Users/jasminewu/kingston-happenings/webapp
npm run dev

# Make changes, then:

# Commit and push
cd /Users/jasminewu/kingston-happenings
git add .
git commit -m "Your change description"
git push

# That's it! Vercel deploys automatically.
```

## Troubleshooting

### "Changes aren't showing on live site"
- Check Vercel dashboard - is deployment complete?
- Hard refresh your browser (Cmd+Shift+R on Mac)
- Check if deployment succeeded (no errors)

### "Site is broken after deployment"
- Check build logs in Vercel dashboard
- Look for error messages
- Fix the errors and push again

### "Local dev server won't start"
```bash
# Make sure you're in the webapp folder
cd /Users/jasminewu/kingston-happenings/webapp

# Reinstall dependencies
npm install

# Try again
npm run dev
```

### "Git push failed"
- Make sure you're logged into GitHub
- Check your internet connection
- Verify you have write access to the repository

## Best Practices

1. **Test locally first** - Always test changes before pushing
2. **Write clear commit messages** - Helpful for tracking changes
3. **Commit often** - Small, frequent commits are better than huge ones
4. **Check deployment logs** - Make sure builds succeed
5. **Test production site** - After deployment, test the live site

## Making Changes to Environment Variables

If you need to change environment variables (like database URL):

1. **In Vercel:**
   - Go to Project → Settings → Environment Variables
   - Edit or add variables
   - **Redeploy** (important! Variables only apply to new deployments)

2. **To redeploy:**
   - Go to Deployments tab
   - Click "..." on latest deployment
   - Click "Redeploy"

## Need Help?

- **Local testing issues:** Check if `npm run dev` works
- **Git issues:** Check if you can push to GitHub
- **Deployment issues:** Check Vercel dashboard for error logs
- **Database issues:** Make sure migrations are run if schema changed

---

**Summary:** Make changes → Test locally → Commit & Push → Vercel auto-deploys! 🚀

