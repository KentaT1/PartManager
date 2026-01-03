# GitHub Secrets Setup Guide

Your GitHub Actions workflow requires the following secrets to be configured in your GitHub repository.

## Required Secrets

Based on your `.github/workflows/deploy.yml` file, you need to set up these secrets:

1. **SUPABASE_URL** - Your Supabase project URL
2. **SUPABASE_ANON_KEY** - Your Supabase anonymous/public key

## How to Set Up GitHub Secrets

### Step 1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Settings** → **API**
4. You'll find:
   - **Project URL** - This is your `SUPABASE_URL` (format: `https://YOUR_PROJECT_REF.supabase.co`)
   - **anon public** key - This is your `SUPABASE_ANON_KEY`

### Step 2: Add Secrets to GitHub

1. Go to your GitHub repository: https://github.com/KentaT1/PartManager
2. Click on **Settings** (in the repository navigation bar)
3. In the left sidebar, click on **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add each secret:

   **Secret 1: SUPABASE_URL**
   - Name: `SUPABASE_URL`
   - Value: Your Supabase project URL (e.g., `https://abcdefghijklmnop.supabase.co`)
   - Click **Add secret**

   **Secret 2: SUPABASE_ANON_KEY**
   - Name: `SUPABASE_ANON_KEY`
   - Value: Your Supabase anon/public key (a long string starting with `eyJ...`)
   - Click **Add secret**

### Step 3: Verify Secrets Are Set

1. Go back to **Secrets and variables** → **Actions**
2. You should see both secrets listed:
   - ✅ SUPABASE_URL
   - ✅ SUPABASE_ANON_KEY

## Important Notes

- ⚠️ **Never commit your Supabase credentials directly in code** - They're already set up to use environment variables
- ✅ The **anon key** is safe to use in client-side code (it's public by design)
- ❌ **Never expose the service_role key** - That's for server-side only
- 🔒 Secrets are encrypted and only accessible during GitHub Actions workflows

## Testing the Setup

Once you've added the secrets:

1. Make a commit and push to the `main` branch
2. Go to **Actions** tab in your GitHub repository
3. You should see the workflow running
4. If successful, your app will be deployed to GitHub Pages at: https://kentat1.github.io/PartManager

## Troubleshooting

If the workflow fails:
- Check that both secrets are set correctly
- Verify the Supabase URL format (should NOT include `/dashboard`)
- Ensure the anon key is copied completely (it's a long string)
- Check the Actions logs for specific error messages

