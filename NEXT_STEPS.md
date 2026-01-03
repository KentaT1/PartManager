# Next Steps After Installation

## ✅ Installation Complete!

Your dependencies are installed. The warnings you see are normal deprecation notices and won't affect functionality.

## 🚀 Quick Start

### 1. Set Up Supabase (Required)

1. **Create a Supabase account:**
   - Go to [supabase.com](https://supabase.com)
   - Sign up for a free account

2. **Create a new project:**
   - Click "New Project"
   - Choose a name and database password
   - Select a region close to you

3. **Set up the database:**
   - In your Supabase project, go to **SQL Editor**
   - Open the file `database/schema.sql` from this project
   - Copy and paste the entire SQL script
   - Click "Run" to execute it

4. **Get your API credentials:**
   - Go to **Settings** (gear icon) → **API**
   - Copy these two values:
     - **Project URL** (looks like: `https://xxxxx.supabase.co`)
     - **anon public** key (long string starting with `eyJ...`)

### 2. Configure for Local Development

Create a file named `.env.local` in the root directory:

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important:** Replace the values with your actual Supabase credentials!

### 3. Start the Development Server

```bash
npm start
```

This will:
- Start the React development server
- Open your browser to `http://localhost:3000`
- Hot-reload when you make changes

### 4. Test the Application

Once running, you should see:
- The Team 1538 header
- Default subsystems (Drivetrain, Intake, Shooter, etc.)
- Ability to add parts to each subsystem

Try adding a test part to verify everything works!

## 📦 Deploy to GitHub Pages

### Option 1: Automatic Deployment (Recommended)

1. **Add GitHub Secrets:**
   - Go to your GitHub repo: `Settings` → `Secrets and variables` → `Actions`
   - Click "New repository secret"
   - Add two secrets:
     - Name: `SUPABASE_URL`, Value: your Supabase URL
     - Name: `SUPABASE_ANON_KEY`, Value: your anon key

2. **Push to main branch:**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

3. **The GitHub Action will automatically:**
   - Build your app
   - Deploy to GitHub Pages
   - Your site will be live at: `https://kentat1.github.io/PartManager`

### Option 2: Manual Deployment

1. Edit `src/config/supabase.js` and replace the placeholder values with your credentials
2. Run:
   ```bash
   npm run deploy
   ```
3. Go to GitHub repo → Settings → Pages → Select `gh-pages` branch

## 🔒 Security Notes

- ✅ The **anon key** is safe to expose in client-side code
- ✅ Supabase uses Row Level Security (RLS) to protect your data
- ❌ NEVER expose the **service_role key**

## 🐛 Troubleshooting

**"Supabase credentials not configured" warning:**
- Make sure `.env.local` exists and has the correct values
- Restart the dev server after creating `.env.local`

**Database errors:**
- Make sure you ran the SQL script from `database/schema.sql`
- Check that RLS policies are enabled in Supabase

**Build errors:**
- Make sure all dependencies are installed: `npm install`
- Clear cache: `npm start -- --reset-cache`

## 📚 More Help

- See `README.md` for full documentation
- See `SETUP.md` for detailed setup instructions
- See `QUICK_START.md` for a quick reference

---

**Ready to go!** Start with step 1 (Supabase setup) and you'll be up and running in minutes.

