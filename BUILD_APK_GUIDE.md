# Build APK Guide - Standalone Mobile App

This guide will help you:
1. Deploy your server to AWS (so it runs 24/7)
2. Build an APK file for Android
3. Install it on your phone

## Prerequisites

1. ✅ AWS account with RDS, S3, SNS configured
2. ✅ Expo account (free) - sign up at https://expo.dev
3. ✅ EAS CLI installed (we'll install it)

---

## Part 1: Deploy Server to AWS

Your server needs to run on AWS so your phone can connect to it.

### Option A: Deploy to AWS EC2 (Recommended)

#### Step 1: Launch EC2 Instance

**Choose your OS:**

**For Linux (Free Tier)**:
1. **Go to AWS Console** → **EC2** → **Launch Instance**
2. **Name**: `bringit-server`
3. **AMI**: Amazon Linux 2023 (or Ubuntu)
4. **Instance type**: `t2.micro` (free tier eligible)
5. **Key pair**: Create new or use existing
6. **Network settings**:
   - Allow HTTP (port 80)
   - Allow HTTPS (port 443)
   - Allow Custom TCP (port 3000)
   - Source: `0.0.0.0/0` (or your IP for security)
7. **Launch instance**

**For Windows (Easier if you're familiar with Windows)**:
1. **Go to AWS Console** → **EC2** → **Launch Instance**
2. **Name**: `bringit-server-windows`
3. **AMI**: **Windows Server 2022 Base** (search in AMI)
4. **Instance type**: `t3.small` (~$15/month) or `t3.micro` (~$8/month)
   - ⚠️ Windows is NOT free tier eligible
5. **Key pair**: Create new (save .pem file!)
6. **Network settings**: Same as above
7. **Launch instance**
8. **See `DEPLOY_WINDOWS_EC2.md` for Windows-specific setup**

#### Step 2: Connect to EC2

**Windows (using PowerShell or PuTTY)**:
```bash
# If using SSH key
ssh -i your-key.pem ec2-user@YOUR_EC2_IP
```

#### Step 3: Install Node.js on EC2

```bash
# For Amazon Linux
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# Verify
node --version
npm --version
```

#### Step 4: Clone and Setup Project

```bash
# Install Git
sudo yum install git -y

# Clone your project (or upload files)
git clone YOUR_REPO_URL
cd Bri-Application

# Or upload files using SCP
# scp -r Bri-Application ec2-user@YOUR_EC2_IP:~/
```

#### Step 5: Configure Environment

```bash
cd Bri-Application

# Create .env file
nano .env
```

Paste your `.env` content (with AWS credentials):
```bash
DATABASE_URL=postgresql://bringit_admin:YOUR_PASSWORD@bringit-db.c722akseg3is.eu-north-1.rds.amazonaws.com:5432/postgres?sslmode=no-verify
AWS_REGION=eu-north-1
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_SNS_TOPIC_ARN=arn:aws:sns:eu-north-1:YOUR_ACCOUNT_ID:bringit-notifications
PORT=3000
NODE_ENV=production
EXPO_PUBLIC_DOMAIN=YOUR_EC2_IP:3000
```

**Important**: Replace `YOUR_EC2_IP` with your actual EC2 public IP.

#### Step 6: Install Dependencies and Run

```bash
# Install dependencies
npm install

# Run database migrations
npm run db:push

# Build server
npm run server:build

# Start server with PM2 (keeps it running)
npm install -g pm2
pm2 start npm --name "bringit-server" -- run server:prod
pm2 save
pm2 startup
```

#### Step 7: Get Your Server URL

Your server URL will be:
```
http://YOUR_EC2_IP:3000
```

Or if you set up a domain:
```
https://your-domain.com
```

**Note**: For production, set up a domain and SSL certificate (Let's Encrypt).

---

## Part 2: Build APK with Expo

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 2: Login to Expo

```bash
eas login
```

Create account at https://expo.dev if you don't have one.

### Step 3: Configure EAS

```bash
cd Bri-Application
eas build:configure
```

This creates `eas.json` file.

### Step 4: Update app.json with Server URL

Edit `app.json` or create `app.config.js`:

```javascript
// app.config.js
export default {
  expo: {
    name: "BringIt",
    slug: "bringit",
    version: "1.0.0",
    // ... other config
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_DOMAIN || "YOUR_EC2_IP:3000"
    }
  }
};
```

### Step 5: Set Environment Variable for Build

Create `.env` file in project root:
```bash
EXPO_PUBLIC_DOMAIN=YOUR_EC2_IP:3000
```

Or set it when building:
```bash
EXPO_PUBLIC_DOMAIN=YOUR_EC2_IP:3000 eas build --platform android
```

### Step 6: Build APK

```bash
# Build APK (takes 10-20 minutes)
eas build --platform android --profile preview

# Or for production build
eas build --platform android
```

**Note**: First build requires Expo account setup.

### Step 7: Download APK

1. Build will show a URL when complete
2. Visit the URL in browser
3. Download the APK file
4. Transfer to your phone and install

---

## Part 3: Alternative - Local Build (Faster for Testing)

If you want to build locally without Expo cloud:

### Step 1: Install Android Studio

1. Download from https://developer.android.com/studio
2. Install Android SDK
3. Set up environment variables:
   ```bash
   ANDROID_HOME=C:\Users\YourName\AppData\Local\Android\Sdk
   ```

### Step 2: Build Locally

```bash
# Install Expo CLI
npm install -g @expo/cli

# Set server URL
$env:EXPO_PUBLIC_DOMAIN="YOUR_EC2_IP:3000"

# Build APK
npx expo build:android -t apk
```

---

## Part 4: Update Code to Use Environment Variable

Make sure your app uses the server URL from environment:

The code already uses `EXPO_PUBLIC_DOMAIN` from `query-client.ts`, so you just need to set it during build.

---

## Quick Summary

1. **Deploy server to EC2** (or other AWS service)
2. **Get server URL**: `http://YOUR_EC2_IP:3000`
3. **Build APK**:
   ```bash
   EXPO_PUBLIC_DOMAIN=YOUR_EC2_IP:3000 eas build --platform android --profile preview
   ```
4. **Download and install APK** on your phone

---

## Troubleshooting

### Server not accessible from phone
- Check EC2 security group allows port 3000
- Verify server is running: `pm2 status`
- Check server logs: `pm2 logs bringit-server`

### APK connects to wrong server
- Verify `EXPO_PUBLIC_DOMAIN` is set correctly
- Rebuild APK with correct URL
- Check `getApiUrl()` in `query-client.ts`

### WebSocket not working
- Ensure WebSocket port is open in security group
- Check server supports WebSocket (already configured)
- Verify URL uses `ws://` or `wss://` protocol

---

## Cost Estimate

- **EC2 t2.micro**: Free tier (750 hours/month first year), then ~$8/month
- **Expo EAS Build**: Free tier available, then pay-as-you-go
- **Total**: ~$8-15/month after free tier

---

## Next Steps

1. Deploy server to EC2
2. Test server URL from your phone browser
3. Build APK with correct server URL
4. Install and test!

Need help with any step? Let me know!

