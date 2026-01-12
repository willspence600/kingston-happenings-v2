# Account Deletion Setup

This guide explains how account deletion works and what environment variables are needed.

## How It Works

When a user deletes their account, the system will:

1. **Delete all events** they submitted (`submittedById` matches their user ID)
2. **Delete all likes** they created (`userId` matches their user ID)
3. **Delete their profile** from the `profiles` table in Supabase
4. **Delete their auth user** from Supabase Auth
5. **Sign them out** of the current session

## Required Environment Variable

For account deletion to work, you need the Supabase Service Role Key:

### Get Your Service Role Key

1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Find the **service_role** key (under "Project API keys")
5. **Copy it** - this key has admin privileges, so keep it secret!

### Add to Environment Variables

#### Local Development (`.env.local`)

Add this to your `webapp/.env.local` file:

```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

#### Production (Vercel)

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Select your `kingston-happenings` project
3. Go to **Settings** → **Environment Variables**
4. Add a new variable:
   - **Name**: `SUPABASE_SERVICE_ROLE_KEY`
   - **Value**: Your service role key from Supabase
   - **Environments**: Check all (Production, Preview, Development)
5. Click **Save**

**Important:** After adding the environment variable, you need to **redeploy** your application for it to take effect.

## Security Notes

⚠️ **Warning:** The service role key has admin privileges and can bypass Row Level Security (RLS). 

- **Never commit this key to Git** (it should be in `.gitignore`)
- **Only use it server-side** (which we do - it's only in API routes)
- **Keep it secret** - don't share it publicly

## Testing Account Deletion

1. Create a test account
2. Submit some events
3. Like some events
4. Go to Account page
5. Click "Delete Account"
6. Confirm deletion
7. Verify:
   - User is signed out
   - User cannot log in anymore
   - Their events are deleted
   - Their likes are deleted

## Troubleshooting

### "Missing SUPABASE_SERVICE_ROLE_KEY" error

- Make sure the environment variable is set in Vercel
- Redeploy your application after adding it
- Check the variable name is exactly `SUPABASE_SERVICE_ROLE_KEY`

### Account deletion fails

- Check Vercel logs for detailed error messages
- Verify the service role key is correct
- Check Supabase logs for any auth API errors

### User still exists after deletion

- Check if deletion actually succeeded (check Vercel logs)
- Verify Supabase Auth user is deleted (check Supabase dashboard)
- Check if profile was deleted (check `profiles` table)

