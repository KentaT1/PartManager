# Fix Your .env.local File

## ❌ Current Issue

Your `.env.local` file has the **wrong Supabase URL**. You're using the dashboard URL instead of the API URL.

## ✅ Correct Format

Your `.env.local` should look like this:

```env
REACT_APP_SUPABASE_URL=https://kmiljqxqwudhnrkhifey.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImttaWxqcXhxd3VkaG5ya2hpZmV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MjI2NTIsImV4cCI6MjA4Mjk5ODY1Mn0.6fJ1LnJVMOwmdTZmdHabo4eMqPIFT9F2n4tKkOe0HRg
```

## 🔧 How to Fix

1. **Open your `.env.local` file**

2. **Change the URL from:**
   ```
   REACT_APP_SUPABASE_URL=https://supabase.com/dashboard/project/kmiljqxqwudhnrkhifey
   ```
   
   **To:**
   ```
   REACT_APP_SUPABASE_URL=https://kmiljqxqwudhnrkhifey.supabase.co
   ```

3. **Keep your anon key the same** (it looks correct)

4. **Save the file**

5. **Restart your dev server:**
   - Stop it (Ctrl+C)
   - Start it again: `npm start`

## 📍 Where to Find the Correct URL

In your Supabase dashboard:
1. Go to **Settings** (⚙️ icon)
2. Click **API** in the left sidebar
3. Look for **Project URL** - it should be `https://xxxxx.supabase.co`
4. Copy that exact URL (NOT the dashboard URL)

## ✅ After Fixing

- The warning banner should disappear
- You should be able to add parts
- Check the browser console - it should no longer show configuration warnings

