# Quick Start Guide

## 🚀 Getting Started in 5 Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Supabase
1. Create account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to **SQL Editor** → Run `database/schema.sql`
4. Go to **Settings** → **API** → Copy your URL and anon key

### 3. Configure for Local Development
Create `.env.local`:
```env
REACT_APP_SUPABASE_URL=your_url_here
REACT_APP_SUPABASE_ANON_KEY=your_key_here
```

### 4. Run Locally
```bash
npm start
```

### 5. Deploy to GitHub Pages

**Option A: Using GitHub Actions (Recommended)**
1. Add secrets in GitHub: `Settings` → `Secrets and variables` → `Actions`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
2. Push to main branch - deployment happens automatically!

**Option B: Manual Deploy**
1. Edit `src/config/supabase.js` with your credentials
2. Run: `npm run deploy`

## 📋 What's Included

✅ React app with brand-compliant design (black/white, Team 1538 style)  
✅ Parts management with subsystem tabs  
✅ Status tracking (Ready to Manufacture, Ready to Review, Reviewed, Manufactured)  
✅ OnShape link integration  
✅ Team member and mentor tracking  
✅ Supabase backend integration  
✅ GitHub Pages deployment ready  

## 🎨 Brand Standards

The app follows Team 1538's 2015 Brand Standards:
- Black background with white accents
- Clean, minimal design
- Functional and unobtrusive interface

## 📚 More Information

- See `README.md` for full documentation
- See `SETUP.md` for detailed setup instructions
- See `database/schema.sql` for database structure

---

**Need Help?** Check the README or open an issue on GitHub.

