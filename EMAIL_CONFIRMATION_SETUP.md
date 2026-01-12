# Email Confirmation Redirect Setup

This guide explains how email confirmation links redirect users to kingstonhappenings.ca after they verify their email.

## How It Works

When users register, they receive an email with a confirmation link. After clicking the link, they are redirected to:
- **Production**: `https://kingstonhappenings.ca/auth/callback`
- **Development**: `http://localhost:3000/auth/callback`

The callback route then:
1. Exchanges the verification code for a session
2. Redirects the user to the home page (`/`)

## Supabase Dashboard Configuration

You also need to configure the redirect URL in your Supabase dashboard:

### Step 1: Go to Authentication Settings

1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Click **Authentication** in the left sidebar
4. Click **URL Configuration**

### Step 2: Add Redirect URLs

Under **Redirect URLs**, add these URLs (one per line):

```
https://kingstonhappenings.ca/auth/callback
http://localhost:3000/auth/callback
```

**Important:** Make sure to include both production and development URLs if you're testing locally.

### Step 3: Save

Click **Save** at the bottom of the page.

## Site URL

Also verify that your **Site URL** is set correctly:

- **Production**: `https://kingstonhappenings.ca`
- **Development**: `http://localhost:3000`

## Testing

1. Register a new account
2. Check your email for the confirmation link
3. Click the link
4. You should be redirected to `kingstonhappenings.ca` (or localhost if testing locally)
5. You should be automatically logged in

## Troubleshooting

### Users aren't redirected correctly

- Check that the redirect URLs are added in Supabase dashboard
- Verify the URLs match exactly (including `https://` vs `http://`)
- Clear browser cache and try again

### Email confirmation doesn't work

- Check that email confirmation is enabled in Supabase
- Verify the email isn't going to spam
- Check Supabase logs for errors

### Still having issues?

- Make sure the `/auth/callback` route is accessible (check Vercel deployment)
- Verify environment variables are set correctly in Vercel
- Check browser console for any errors

