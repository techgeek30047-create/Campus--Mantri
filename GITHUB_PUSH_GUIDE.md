# Push to GitHub - Next Steps

## Your Git Setup is Complete ✓

Your project is ready at:
- **Local**: `C:\gitGfg-campus-mantri-onboardingnew`
- **Remote**: `https://github.com/techgeek30047-create/Campus--Mantri.git`
- **Branch**: `main`

## Why the Push Failed?

The error was: `Permission denied to 30047shivam`

This means your current Git credentials don't match the repository owner. You need to authenticate properly.

## CHOOSE ONE METHOD TO AUTHENTICATE:

### ✅ METHOD 1: GitHub CLI (EASIEST & RECOMMENDED)

```powershell
# Step 1: Download and Install GitHub CLI
# Go to: https://cli.github.com/
# Download for Windows and run the installer

# Step 2: Authenticate in PowerShell
gh auth login

# Follow the prompts:
# - Select: GitHub.com
# - Select: HTTPS
# - Authenticate with your browser
# - Select: Paste an authentication token (or yes for login)

# Step 3: Push to GitHub
cd 'C:\gitGfg-campus-mantri-onboardingnew'
git push -u origin main

# Done! Your code will now push successfully
```

---

### ✅ METHOD 2: Personal Access Token

```powershell
# Step 1: Create Token on GitHub
# 1. Go to: https://github.com/settings/tokens
# 2. Click "Generate new token" → "Generate new token (classic)"
# 3. Give it a name: "Campus Mantri Push"
# 4. Set expiration: 90 days or No expiration
# 5. Select scopes:
#    - repo (full control of private repositories)
#    - write:repo_hook
#    - admin:repo_hook
# 6. Click "Generate token" and COPY it (you won't see it again)

# Step 2: Push to GitHub
cd 'C:\gitGfg-campus-mantri-onboardingnew'
git push -u origin main

# When asked for password:
# Username: techgeek30047-create
# Password: paste your token here

# Done!
```

---

### ✅ METHOD 3: SSH Key (ADVANCED)

```powershell
# Step 1: Check if SSH key exists
Test-Path ~/.ssh/id_ed25519

# If not, generate SSH key:
ssh-keygen -t ed25519 -C "your-email@example.com"
# Press Enter for all prompts to use defaults

# Step 2: Add public key to GitHub
# 1. Open your public key:
type ~/.ssh/id_ed25519.pub

# 2. Copy the output
# 3. Go to: https://github.com/settings/ssh/new
# 4. Paste it as "SSH key" and save

# Step 3: Update remote to use SSH
cd 'C:\gitGfg-campus-mantri-onboardingnew'
git remote set-url origin git@github.com:techgeek30047-create/Campus--Mantri.git

# Step 4: Push
git push -u origin main

# Done!
```

---

## AFTER SUCCESSFUL PUSH TO GITHUB

Your repository will be ready for Vercel deployment. Follow these steps:

### Deploy to Vercel

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Login with your GitHub account (or create Vercel account)

2. **Import Project**
   - Click "Add New Project"
   - Select "Import Git Repository"
   - Find and select "Campus--Mantri"

3. **Configure Build Settings**
   - **Framework Preset**: Vite
   - **Root Directory**: `gitGfg-campus-mantri-1530e7079a1f`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Add Environment Variables**
   - Click "Environment Variables"
   - Add two variables:
     ```
     VITE_SUPABASE_URL = your_supabase_url
     VITE_SUPABASE_ANON_KEY = your_supabase_key
     ```
   - Get these from your Supabase project settings

5. **Deploy**
   - Click "Deploy"
   - Wait 2-5 minutes for build to complete
   - You'll get a live URL like: `https://campus-mantri-xxx.vercel.app`

---

## TROUBLESHOOTING

### Still getting permission error?

Make sure you're using the CORRECT GitHub username:
- Repository owner: `techgeek30047-create`
- Logged-in user: Should be the same or have permission

Check current git config:
```powershell
git config user.name
git config user.email
```

### Build fails on Vercel?

1. Check build logs on Vercel dashboard
2. Verify `.env` variables are set correctly
3. Ensure Supabase RLS policies allow the queries
4. Check for TypeScript errors: `npm run build` locally first

### Still stuck?

Run these commands to verify your setup:
```powershell
cd 'C:\gitGfg-campus-mantri-onboardingnew'
git remote -v                    # Check remote URL
git log --oneline -5             # Check commits
git status                        # Check working directory
```

---

## SUMMARY

✅ Git initialized  
✅ Files committed (2 commits)  
⏳ **PENDING**: Push to GitHub (choose authentication method above)  
⏳ **PENDING**: Deploy to Vercel (after GitHub push)

**Next Action**: Choose one authentication method above and run the push command!
