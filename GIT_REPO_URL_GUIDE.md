# How to Get Git Repository URL

## Option 1: If You Already Have a GitHub/GitLab/Bitbucket Repository

### For GitHub:
1. Go to **https://github.com**
2. Find your repository (or create one)
3. Click the **green "Code"** button
4. Copy the **HTTPS URL**:
   ```
   https://github.com/your-username/bringit-app.git
   ```

### For GitLab:
1. Go to **https://gitlab.com**
2. Open your repository
3. Click **"Clone"** button
4. Copy the **HTTPS URL**

### For Bitbucket:
1. Go to **https://bitbucket.org**
2. Open your repository
3. Click **"Clone"** button
4. Copy the **HTTPS URL**

---

## Option 2: Create a New GitHub Repository (Recommended)

### Step 1: Create Repository on GitHub

1. Go to **https://github.com**
2. Click **"+"** (top right) → **"New repository"**
3. **Repository name**: `bringit-app` (or any name)
4. **Description**: "BringIt Family Task Management App"
5. Choose **Public** or **Private**
6. **Don't** initialize with README (you already have files)
7. Click **"Create repository"**

### Step 2: Get the Repository URL

After creating, GitHub will show you the URL:
```
https://github.com/your-username/bringit-app.git
```

Copy this URL!

### Step 3: Push Your Code to GitHub

**On your local PC** (in your project folder):

```powershell
cd C:\Users\Lodhi\Downloads\Bri-Application-1-1zip\Bri-Application

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Add remote repository
git remote add origin https://github.com/your-username/bringit-app.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Note**: You'll need to install Git first if you haven't: https://git-scm.com/download/win

---

## Option 3: Upload Files Directly (No Git Needed)

If you don't want to use Git, you can upload files directly to EC2:

### Method A: Using Remote Desktop File Transfer

1. **Connect to EC2** via Remote Desktop
2. In Remote Desktop, you can **copy-paste files** directly
3. Or use **Remote Desktop's file sharing**:
   - In RDP connection, go to **Local Resources** tab
   - Check **"Clipboard"** and **"Drives"**
   - Your local drives will appear in EC2's "This PC"

### Method B: Using SCP (From Your PC)

**On your local PC** (PowerShell or Git Bash):

```powershell
# Install WinSCP or use PowerShell
# First, convert .pem to .ppk (if using WinSCP) or use OpenSSH

# Using PowerShell (if OpenSSH is installed)
scp -i C:\path\to\bringit.pem -r C:\Users\Lodhi\Downloads\Bri-Application-1-1zip\Bri-Application Administrator@YOUR_EC2_IP:C:\
```

### Method C: Zip and Upload via Browser

1. **Zip your project** on your PC:
   - Right-click `Bri-Application` folder
   - Send to → Compressed (zipped) folder

2. **Upload to cloud storage**:
   - Upload zip to Google Drive, Dropbox, or OneDrive
   - Get shareable link

3. **On EC2**:
   - Open browser
   - Download the zip file
   - Extract to `C:\Bri-Application`

---

## Option 4: Use AWS CodeCommit (AWS Native)

If you prefer AWS services:

1. **AWS Console** → **CodeCommit**
2. **Create repository**: `bringit-app`
3. Get the **clone URL** (HTTPS or SSH)
4. Use it to clone on EC2

---

## Quick Decision Guide

**Use Git (GitHub) if**:
- ✅ You want version control
- ✅ You want to track changes
- ✅ You want to easily update code later
- ✅ You're comfortable with Git

**Upload directly if**:
- ✅ You just want to deploy quickly
- ✅ You don't need version control
- ✅ You prefer simple file transfer

---

## Recommended: Create GitHub Repo

**Easiest approach**:

1. **Create GitHub account** (if you don't have one): https://github.com/signup
2. **Create new repository** on GitHub
3. **Push your code** from local PC
4. **Clone on EC2** using the GitHub URL

This way you can easily update your code later!

---

## Example: Complete Workflow

### On Your Local PC:

```powershell
# 1. Install Git: https://git-scm.com/download/win

# 2. Go to your project
cd C:\Users\Lodhi\Downloads\Bri-Application-1-1zip\Bri-Application

# 3. Initialize Git
git init
git add .
git commit -m "Initial commit"

# 4. Create repo on GitHub, then:
git remote add origin https://github.com/your-username/bringit-app.git
git push -u origin main
```

### On EC2 (via Remote Desktop):

```powershell
# 1. Install Git (if not installed)
# Download from: https://git-scm.com/download/win

# 2. Clone repository
cd C:\
git clone https://github.com/your-username/bringit-app.git
cd bringit-app

# 3. Continue with setup
npm install
# ... etc
```

---

## Need Help?

- **Don't have GitHub account?** → Create one (free): https://github.com/signup
- **Don't want to use Git?** → Use file transfer methods above
- **Stuck?** → Ask me and I'll help!

