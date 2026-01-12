# Customize Email Templates - Kingston Happenings

This guide shows you how to customize Supabase email templates so verification emails appear to come from "Kingston Happenings" instead of Supabase.

## Step 1: Go to Authentication Email Templates

1. Go to [app.supabase.com](https://app.supabase.com)
2. Select your project
3. Click **Authentication** in the left sidebar
4. Click **Email Templates** (or **Templates**)

## Step 2: Customize the "Confirm signup" Template

1. Click on **"Confirm signup"** template
2. You'll see the email template editor

### Email Subject
Change from:
```
Confirm your signup
```

To:
```
Confirm your Kingston Happenings account
```
or
```
Welcome to Kingston Happenings - Confirm your email
```

### Email Body
Replace the default template with:

```html
<h2>Welcome to Kingston Happenings! 🎉</h2>

<p>Thanks for signing up! Please confirm your email address by clicking the link below:</p>

<p><a href="{{ .ConfirmationURL }}">Confirm your email address</a></p>

<p>Or copy and paste this URL into your browser:</p>
<p>{{ .ConfirmationURL }}</p>

<p>If you didn't sign up for Kingston Happenings, you can safely ignore this email.</p>

<p>Best regards,<br>The Kingston Happenings Team</p>
```

**Important variables:**
- `{{ .ConfirmationURL }}` - The confirmation link (REQUIRED - don't remove this!)
- `{{ .Email }}` - User's email address
- `{{ .Token }}` - Confirmation token (optional)

### Preview
You can use the **Preview** button to see how the email will look.

### Save
Click **Save** when you're done.

## Step 3: Customize Email Settings (Optional)

### Change Sender Name and Email

1. Still in **Authentication** settings
2. Click **SMTP Settings** (or **Email** settings)
3. Configure:
   - **Sender name**: `Kingston Happenings`
   - **Sender email**: You can use a custom domain email (if you have one) or keep the Supabase default

**Note:** To use a custom sender email (like `noreply@kingstonhappenings.ca`), you'll need to:
- Set up a custom SMTP server, OR
- Use Supabase's built-in email service (which requires verifying your domain)

For now, you can just customize the template content, and the sender name can be set in the email template itself.

## Step 4: Customize Other Templates (Optional)

You might also want to customize:

### "Magic Link" Template
If you use passwordless login:
```html
<h2>Your Kingston Happenings Login Link</h2>
<p>Click the link below to sign in:</p>
<p><a href="{{ .ConfirmationURL }}">Sign in to Kingston Happenings</a></p>
```

### "Change Email Address" Template
For when users change their email:
```html
<h2>Confirm Your New Email Address</h2>
<p>You requested to change your email address on Kingston Happenings.</p>
<p><a href="{{ .ConfirmationURL }}">Confirm new email address</a></p>
```

### "Reset Password" Template
For password resets:
```html
<h2>Reset Your Kingston Happenings Password</h2>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset password</a></p>
<p>This link will expire in 1 hour.</p>
<p>If you didn't request a password reset, you can safely ignore this email.</p>
```

## Step 5: Test It

1. Register a new account (or use a test email)
2. Check the email you receive
3. It should now say "Kingston Happenings" instead of Supabase

## Advanced: Custom Domain Email (Optional)

To send emails from `noreply@kingstonhappenings.ca`:

1. **Verify your domain** in Supabase:
   - Go to **Authentication** → **SMTP Settings**
   - Follow the domain verification process
   - This requires adding DNS records to your domain

2. **Or use custom SMTP**:
   - Set up an SMTP service (like SendGrid, Mailgun, etc.)
   - Configure it in Supabase SMTP settings
   - Then you can use any sender email address

For most users, just customizing the email template content is enough - it will say "Kingston Happenings" in the email body, even if the sender email is still from Supabase.

## Template Variables Reference

Available variables you can use in templates:

- `{{ .Email }}` - User's email address
- `{{ .Token }}` - Confirmation/reset token
- `{{ .TokenHash }}` - Hashed token
- `{{ .ConfirmationURL }}` - Full confirmation URL (for links)
- `{{ .SiteURL }}` - Your site URL
- `{{ .RedirectTo }}` - Redirect URL after confirmation

## Tips

- Keep the `{{ .ConfirmationURL }}` variable - it's required for the link to work
- Test with a real email before going live
- Use simple HTML - complex styling might not render well in all email clients
- Keep the message clear and friendly

