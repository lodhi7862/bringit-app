# Quick APK Build - Step by Step

## Prerequisites Checklist

- [ ] Server deployed to AWS EC2 (or have EC2 IP ready)
- [ ] Server is running and accessible
- [ ] Expo account created (free at https://expo.dev)
- [ ] Node.js installed on your PC

---

## Step 1: Deploy Server to EC2 (If Not Done)

### Quick EC2 Setup

1. **AWS Console** → **EC2** → **Launch Instance**
2. **Settings**:
   - Name: `bringit-server`
   - AMI: Amazon Linux 2023
   - Instance: `t2.micro` (free tier)
   - Key pair: Create new (save the .pem file!)
   - Security group: Allow port 3000 from anywhere (0.0.0.0/0)
3. **Launch** and note the **Public IP**

### Connect and Deploy

```bash
# Connect (Windows - use Git Bash or WSL)
ssh -i your-key.pem ec2-user@YOUR_EC2_IP

# On EC2, install Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# Upload your project (use SCP or Git)
# Then on EC2:
cd Bri-Application
npm install
npm run db:push

# Create .env with your AWS credentials
nano .env
# Paste your .env content, update EXPO_PUBLIC_DOMAIN to EC2_IP:3000

# Start server
npm install -g pm2
npm run server:build
pm2 start npm --name "bringit" -- run server:prod
pm2 save
```

**Your server URL**: `http://YOUR_EC2_IP:3000`

---

## Step 2: Install EAS CLI

```bash
npm install -g eas-cli
```

---

## Step 3: Login to Expo

```bash
eas login
```

Create account if needed: https://expo.dev

---

## Step 4: Configure Build

```bash
cd Bri-Application
eas build:configure
```

This creates `eas.json`.

---

## Step 5: Update .env for Build

Your `.env` should have:
```bash
EXPO_PUBLIC_DOMAIN=YOUR_EC2_IP:3000
```

Or use `http://YOUR_EC2_IP:3000` (the code handles both)

---

## Step 6: Build APK

```bash
# For testing (APK you can install directly)
eas build --platform android --profile preview

# Or set environment variable inline
EXPO_PUBLIC_DOMAIN=YOUR_EC2_IP:3000 eas build --platform android --profile preview
```

**First build takes 15-20 minutes** (subsequent builds are faster)

---

## Step 7: Download and Install APK

1. **Wait for build to complete** (you'll see a URL)
2. **Visit the URL** in browser
3. **Download the APK file**
4. **Transfer to your phone**:
   - Email it to yourself
   - Use USB cable
   - Use cloud storage (Google Drive, etc.)
5. **On your phone**:
   - Enable "Install from unknown sources" in Android settings
   - Open the APK file
   - Install

---

## Alternative: Build Locally (Faster, No Expo Account Needed)

### Install Android Studio

1. Download: https://developer.android.com/studio
2. Install Android SDK
3. Set environment variable:
   ```powershell
   [System.Environment]::SetEnvironmentVariable('ANDROID_HOME', 'C:\Users\YourName\AppData\Local\Android\Sdk', 'User')
   ```

### Build APK

```powershell
cd Bri-Application

# Set server URL
$env:EXPO_PUBLIC_DOMAIN="YOUR_EC2_IP:3000"

# Build
npx expo build:android -t apk
```

**Note**: This method is deprecated. Use EAS Build instead.

---

## Testing Your APK

1. **Install APK on phone**
2. **Open the app**
3. **Check if it connects to your server**:
   - Try creating a user
   - Try creating a task
   - Check server logs: `pm2 logs bringit-server`

---

## Troubleshooting

### "Cannot connect to server"
- Verify server is running: Check EC2 instance status
- Test server URL: Open `http://YOUR_EC2_IP:3000` in phone browser
- Check security group: Port 3000 must be open

### "EXPO_PUBLIC_DOMAIN not set"
- Make sure `.env` has `EXPO_PUBLIC_DOMAIN`
- Or set it during build: `EXPO_PUBLIC_DOMAIN=... eas build ...`

### Build fails
- Check Expo account is logged in: `eas whoami`
- Verify app.json is valid: `npx expo-doctor`
- Check build logs on Expo website

---

## Cost

- **EC2 t2.micro**: Free tier (750 hrs/month), then ~$8/month
- **Expo EAS Build**: Free tier available
- **Total**: ~$0-8/month

---

## Next Steps After APK Works

1. **Set up domain name** (optional): Point to EC2 IP
2. **Add SSL certificate**: Use Let's Encrypt (free)
3. **Update APK** with HTTPS URL
4. **Set up auto-updates**: Use Expo Updates

---

## Quick Command Reference

```bash
# Deploy server
ssh -i key.pem ec2-user@EC2_IP
# ... setup steps ...

# Build APK
eas login
EXPO_PUBLIC_DOMAIN=EC2_IP:3000 eas build --platform android --profile preview

# Download APK from Expo dashboard
# Install on phone
```

Good luck! 🚀

