# Parts Management System - Team 1538 / The Holy Cows

A modern parts management system for FIRST Robotics Team 1538, built with React and Supabase, following the team's 2015 Brand Standards.

## Features

- **Parts Management**: Track parts with names, OnShape links, and status indicators
- **Subsystem Organization**: Organize parts by subsystem using tabs
- **Status Tracking**: Track part status (Ready to Manufacture, Ready to Review, Reviewed, Manufactured)
- **Team Collaboration**: Track who drew each part and which mentor reviewed it
- **Brand Compliant**: Follows Team 1538's brand standards (black/white color scheme, clean design)

## Tech Stack

- **React 18** - Frontend framework
- **Supabase** - Backend database and API
- **GitHub Pages** - Hosting

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/KentaT1/PartManager.git
cd PartManager
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to **SQL Editor** and run the SQL script from `database/schema.sql`
4. Go to **Settings** > **API** and copy:
   - Your Project URL
   - Your `anon` public key (this is safe to expose in client-side code)

### 3. Configure Supabase Credentials

#### For Local Development:

Create a `.env.local` file in the root directory:

```env
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### For GitHub Pages Deployment:

Since GitHub Pages serves static files, you have two options:

**Option 1: Use Environment Variables in Build (Recommended)**
- Set up GitHub Actions to build with environment variables
- Add secrets in GitHub repository settings:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`

**Option 2: Direct Configuration (Less Secure but Simpler)**
- Edit `src/config/supabase.js` directly with your credentials
- The `anon` key is designed to be public, but you should still use RLS policies to protect your data

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Locally

```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

### 6. Build for Production

```bash
npm run build
```

### 7. Deploy to GitHub Pages

#### First Time Setup:

1. Install gh-pages if not already installed:
   ```bash
   npm install --save-dev gh-pages
   ```

2. The `package.json` already includes the deploy script. Just run:
   ```bash
   npm run deploy
   ```

3. Go to your GitHub repository settings:
   - Navigate to **Settings** > **Pages**
   - Under **Source**, select **gh-pages** branch
   - Your site will be available at `https://kentat1.github.io/PartManager`

#### Subsequent Deployments:

Just run:
```bash
npm run deploy
```

## Security Notes

### Supabase Keys

- **Anon Key**: This is safe to expose in client-side code. It's designed for public use and relies on Row Level Security (RLS) policies to protect your data.
- **Service Role Key**: NEVER expose this key. It bypasses RLS and should only be used server-side.

### Row Level Security (RLS)

The database schema includes RLS policies that allow public read/write access. For production use, you should:

1. Add authentication to your Supabase project
2. Update RLS policies to restrict access based on user roles
3. Consider adding rate limiting

## Database Schema

### Subsystems Table
- `id` - Primary key
- `name` - Subsystem name (unique)
- `created_at` - Timestamp
- `updated_at` - Timestamp

### Parts Table
- `id` - Primary key
- `subsystem_id` - Foreign key to subsystems
- `name` - Part name
- `onshape_link` - Link to OnShape drawing
- `status` - Part status (ready-to-manufacture, ready-to-review, reviewed, manufactured)
- `drawn_by` - Name of person who created the drawing
- `reviewed_by` - Name of mentor who reviewed it
- `created_at` - Timestamp
- `updated_at` - Timestamp

## Brand Standards Compliance

This application follows Team 1538's 2015 Brand Standards:

- **Colors**: Black background with white accents
- **Typography**: Oswald for headings (League Gothic substitute), Inter for body text (Myriad Pro substitute)
- **Design Philosophy**: Clean, minimal design inspired by Dieter Rams' principles
- **Layout**: Functional and unobtrusive

## Development

### Project Structure

```
PartManager/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── PartsManager.js
│   │   └── PartsManager.css
│   ├── config/
│   │   └── supabase.js
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   └── index.css
├── database/
│   └── schema.sql
├── package.json
└── README.md
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Test locally
4. Submit a pull request

## License

© 2024 Robotics Team 1538 / The Holy Cows

## Support

For issues or questions, please open an issue on GitHub or contact the team.

---

**Team 1538 / The Holy Cows**  
*Be The Dedicated*

