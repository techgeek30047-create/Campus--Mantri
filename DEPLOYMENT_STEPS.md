# GitHub & Vercel Deployment Steps

## Status: Ready for Push

Your project is ready to be pushed to GitHub. Follow these steps:

### Step 1: Authenticate with GitHub

You have a permission error. Use one of these methods:

**Option A: Using GitHub CLI (Recommended)**
```powershell
# Install GitHub CLI if not already installed
# Download from: https://cli.github.com/

# Login to GitHub
gh auth login

# Then run the push command
cd 'C:\gitGfg-campus-mantri-onboardingnew'
git push -u origin main
```

**Option B: Using Personal Access Token**
```powershell
# 1. Create a Personal Access Token on GitHub:
#    - Go to https://github.com/settings/tokens
#    - Click "Generate new token" → "Generate new token (classic)"
#    - Select: repo, write:repo_hook, admin:repo_hook
#    - Copy the token

# 2. When prompted for password, use the token as password
cd 'C:\gitGfg-campus-mantri-onboardingnew'
git push -u origin main
# Password: paste your personal access token here
```

**Option C: Using SSH Key**
```powershell
# 1. Generate SSH key (if you don't have one)
ssh-keygen -t ed25519 -C "your-email@example.com"

# 2. Add public key to GitHub:
#    - Go to https://github.com/settings/ssh/new
#    - Paste your public key from ~/.ssh/id_ed25519.pub

# 3. Update remote to use SSH
cd 'C:\gitGfg-campus-mantri-onboardingnew'
git remote set-url origin git@github.com:techgeek30047-create/Campus--Mantri.git
git push -u origin main
```

---

## Step 2: Deploy on Vercel

Once the code is pushed to GitHub:

### 1. Go to Vercel Dashboard
- Visit https://vercel.com
- Login with your account (or create one if needed)

### 2. Create New Project
- Click "Add New Project"
- Select "Import Git Repository"
- Search for "Campus--Mantri" repository
- Click "Import"

### 3. Configure Project Settings
- **Framework Preset**: Select "Vite"
- **Root Directory**: `gitGfg-campus-mantri-1530e7079a1f`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`

### 4. Add Environment Variables
- Add these variables in Vercel dashboard under "Environment Variables":
  ```
  VITE_SUPABASE_URL=your_supabase_url
  VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
  ```

### 5. Deploy
- Click "Deploy"
- Wait for build to complete
- Your app will be live at a `vercel.app` domain

### 6. Custom Domain (Optional)
- After deployment, add custom domain in "Settings" → "Domains"

---

## Project Structure for Vercel

The project is in: `gitGfg-campus-mantri-1530e7079a1f/`

Key files:
- `vite.config.ts` - Vite configuration
- `package.json` - Dependencies and build scripts
- `src/` - Source code
- `public/` - Static files

---

## Troubleshooting

### Build Fails
- Check if `.gitignore` is excluding necessary files
- Verify all environment variables are set
- Check build logs on Vercel dashboard

### Environment Variables Not Working
- Ensure prefix is `VITE_` for client-side variables
- Redeploy after adding/changing variables
- Check if using correct Supabase credentials

### Connection Issues
- Verify Supabase URL and keys are correct
- Check CORS settings in Supabase
- Ensure RLS policies allow necessary queries
