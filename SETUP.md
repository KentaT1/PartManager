# Quick Setup Guide

## Supabase Configuration for GitHub Pages

Since GitHub Pages serves static files, you need to handle Supabase credentials carefully. Here are your options:

### Option 1: GitHub Actions with Secrets (Recommended)

1. **Set up GitHub Secrets:**
   - Go to your repository: `Settings` > `Secrets and variables` > `Actions`
   - Add two secrets:
     - `SUPABASE_URL` - Your Supabase project URL
     - `SUPABASE_ANON_KEY` - Your Supabase anon/public key

2. **The GitHub Actions workflow** (`.github/workflows/deploy.yml`) will automatically:
   - Use these secrets during build
   - Deploy to GitHub Pages

3. **Deploy:**
   ```bash
   git push origin main
   ```
   The workflow will automatically build and deploy.

### Option 2: Direct Configuration (Simpler, but less secure)

1. **Edit `src/config/supabase.js`:**
   - Replace `YOUR_SUPABASE_URL` with your actual Supabase URL
   - Replace `YOUR_SUPABASE_ANON_KEY` with your actual anon key

2. **Deploy:**
   ```bash
   npm run deploy
   ```

**Note:** The anon key is designed to be public, but you should still use Row Level Security (RLS) policies in Supabase to protect your data.

## Getting Your Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and sign in
2. Select your project (or create a new one)
3. Go to **Settings** (gear icon) > **API**
4. You'll find:
   - **Project URL** - Copy this as `SUPABASE_URL`
   - **anon public** key - Copy this as `SUPABASE_ANON_KEY`

## Setting Up the Database

1. In your Supabase project, go to **SQL Editor**
2. Copy the contents of `database/schema.sql`
3. Paste and run it in the SQL Editor
4. This will create:
   - `subsystems` table
   - `parts` table
   - Row Level Security policies
   - Some default subsystems

## Local Development

1. Create a `.env.local` file:
   ```env
   REACT_APP_SUPABASE_URL=your_url_here
   REACT_APP_SUPABASE_ANON_KEY=your_key_here
   ```

2. Run:
   ```bash
   npm install
   npm start
   ```

## Security Best Practices

- ✅ The **anon key** is safe to expose in client-side code
- ❌ NEVER expose the **service_role key**
- ✅ Use Row Level Security (RLS) policies to protect your data
- ✅ Consider adding authentication for production use
- ✅ Add rate limiting if needed

