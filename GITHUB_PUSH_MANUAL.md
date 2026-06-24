# GitHub Push - Manual Steps

## Current Issue
- Git user: `30047shivam` 
- Target repo: `techgeek30047-create/Campus--Mantri`
- Error: Permission denied (different accounts)

## SOLUTION: Two Options

---

## ✅ OPTION 1: Use Your Own GitHub Account (Recommended)

### Step 1: Create new repository on GitHub

1. Go to: https://github.com/new
2. Fill form:
   - **Repository name**: `Campus-Mantri` (or any name)
   - **Description**: Campus Mantri Task Management Portal
   - **Public/Private**: Choose as you like
   - **Initialize with README**: NO (don't check)
   - Click **"Create repository"**

3. Copy the repository URL you see:
   - Format: `https://github.com/30047shivam/Campus-Mantri.git`

### Step 2: Update local repository remote

```powershell
cd 'C:\gitGfg-campus-mantri-onboardingnew'

# Replace with YOUR repository URL
git remote set-url origin https://github.com/30047shivam/Campus-Mantri.git

# Verify
git remote -v
```

### Step 3: Push to your repository

```powershell
git push -u origin main
```

When prompted:
- **Username**: 30047shivam
- **Password**: Use GitHub Personal Access Token

**To create token:**
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Name: "Campus Mantri Push"
4. Select scope: `repo` (all options under repo)
5. Generate and COPY token
6. Use token as password when pushing

---

## ✅ OPTION 2: Get Access to techgeek30047-create Repository

Ask the owner to:

1. Go to repository: https://github.com/techgeek30047-create/Campus--Mantri/settings
2. Click "Collaborators" (left sidebar)
3. Click "Add people"
4. Type: `30047shivam`
5. Select your username and confirm

Then you can push directly.

---

## 📝 QUICK REFERENCE

### Check current git setup
```powershell
git config --global user.name
git config --global user.email
git remote -v
```

### Verify commits ready
```powershell
git log --oneline -5
git status
```

### Push (after fixing remote)
```powershell
git push -u origin main
```

---

## 🎯 RECOMMENDED FLOW

1. ✅ Create your own repository on GitHub
2. ✅ Update remote URL locally
3. ✅ Create Personal Access Token
4. ✅ Push with token authentication
5. ✅ Share your repo link with team

---

## 🔐 PERSONAL ACCESS TOKEN GUIDE

### Create Token:
- URL: https://github.com/settings/tokens/new?scopes=repo
- Token Expiration: 90 days recommended
- Scopes needed:
  - `repo` - Full control of private repositories

### Use Token as Password:
```powershell
# When running: git push -u origin main
# Username: 30047shivam
# Password: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxx (your token)
```

### Save Token (Optional - for future use):
```powershell
# Use git credential helper to save token
git config --global credential.helper wincred

# Then first push will save credentials automatically
git push -u origin main
```

---

## ✅ NEXT STEPS

1. **Choose Option 1 or 2**
2. **Follow the steps above**
3. **Run push command**
4. **Verify files on GitHub**
5. **Then deploy to Vercel**

---

## Need Help?

Check these links:
- GitHub Creating Repo: https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository
- Personal Access Token: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- Push to GitHub: https://docs.github.com/en/get-started/using-git/pushing-commits-to-a-remote-repository
