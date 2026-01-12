# Quick Setup: Change Email Verification to Show "Kingston Happenings"

Follow these steps to make verification emails appear from "Kingston Happenings" instead of "Supabase".

## Step-by-Step Instructions

### 1. Go to Supabase Email Templates

1. Go to **[app.supabase.com](https://app.supabase.com)**
2. Select your **kingston-happenings** project
3. Click **Authentication** in the left sidebar
4. Click **Email Templates** (or **Templates**)

### 2. Edit the "Confirm signup" Template

Click on **"Confirm signup"** template.

#### Update the Subject Line:

**Change from:**
```
Confirm your signup
```

**To:**
```
Welcome to Kingston Happenings - Confirm your email
```

#### Replace the Entire Email Body:

**Delete everything in the email body** and paste this:

```html
<h2>Welcome to Kingston Happenings! 🎉</h2>

<p>Thanks for signing up! Please confirm your email address by clicking the link below to complete your registration.</p>

<p style="margin: 30px 0;">
  <a href="{{ .ConfirmationURL }}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
    Confirm your email address
  </a>
</p>

<p>Or copy and paste this URL into your browser:</p>
<p style="word-break: break-all; color: #6b7280;">{{ .ConfirmationURL }}</p>

<p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
  If you didn't sign up for Kingston Happenings, you can safely ignore this email.
</p>

<p style="margin-top: 20px;">
  Best regards,<br>
  <strong>The Kingston Happenings Team</strong>
</p>
```

**⚠️ IMPORTANT:** Keep `{{ .ConfirmationURL }}` exactly as written - it's required for the confirmation link to work!

### 3. Preview and Save

1. Click **Preview** to see how it looks
2. Click **Save** at the bottom
3. Done! ✅

### 4. Test It

1. Register a new test account
2. Check the verification email
3. It should now say "Kingston Happenings" instead of "Supabase"

---

## Optional: Customize Other Templates

You can also update these templates the same way:

### Magic Link Template (Passwordless Login)

**Subject:** `Your Kingston Happenings Login Link`

**Body:**
```html
<h2>Sign in to Kingston Happenings</h2>
<p>Click the link below to sign in:</p>
<p><a href="{{ .ConfirmationURL }}">Sign in to Kingston Happenings</a></p>
<p>This link will expire in 1 hour.</p>
```

### Reset Password Template

**Subject:** `Reset Your Kingston Happenings Password`

**Body:**
```html
<h2>Reset Your Password</h2>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset password</a></p>
<p>This link will expire in 1 hour.</p>
<p>If you didn't request a password reset, you can safely ignore this email.</p>
```

---

## Troubleshooting

**Email still says "Supabase"?**
- Make sure you clicked **Save** after editing
- Clear your email cache or check a different email
- Wait a few minutes for changes to take effect

**Confirmation link doesn't work?**
- Make sure `{{ .ConfirmationURL }}` is in the template (exactly as written)
- Check that your redirect URLs are set in Supabase (see EMAIL_CONFIRMATION_SETUP.md)

**Want to use your own email address as sender?**
- This requires setting up custom SMTP or domain verification
- For now, just changing the template content is enough - the email body will show "Kingston Happenings"

