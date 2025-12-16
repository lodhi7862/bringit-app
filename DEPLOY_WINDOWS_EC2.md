# Deploy Server to Windows EC2 - Step by Step

## Step 1: Launch Windows EC2 Instance

### 1.1 Create Instance

1. **Go to AWS Console** → **EC2** → **Launch Instance**
2. **Name**: `bringit-server-windows`
3. **AMI**: 
   - Search for: **"Microsoft Windows Server 2022"**
   - Select: **Windows Server 2022 Base** (or latest)
   - **Note**: Windows instances are NOT free tier eligible
4. **Instance type**: 
   - **t3.small** (recommended, ~$15/month)
   - Or **t3.micro** (cheaper, ~$8/month, but less RAM)
5. **Key pair**: 
   - Create new key pair
   - Name: `bringit` (or any name you prefer - just a label)
   - **Save the .pem file** (you'll need it!)
   - ⚠️ **IMPORTANT**: Download and save the `.pem` file - you can't download it again!
6. **Network settings**:
   - **Allow HTTP** (port 80)
   - **Allow HTTPS** (port 443)
   - **Allow Custom TCP** (port 3000)
   - **Source**: `0.0.0.0/0` (for development)
7. **Storage**: 30 GB (default is fine)
8. **Launch instance**

### 1.2 Get Windows Password

1. **Wait 2-3 minutes** for instance to initialize
2. **Select your instance** → **Connect** button
3. **Choose "RDP client"** tab
4. **Click "Get password"**
5. **Upload your .pem key file**
6. **Copy the password** (save it securely!)

---

## Step 2: Connect to Windows EC2

### 2.1 Using Remote Desktop (RDP)

**Windows PC**:
1. Press **Win + R**
2. Type: `mstsc` and press Enter
3. **Computer**: `YOUR_EC2_PUBLIC_IP`
4. **Username**: `Administrator`
5. **Password**: (the one you got from AWS)
6. Click **Connect**

**Note**: If connection fails, check Security Group allows RDP (port 3389)

### 2.2 Allow RDP in Security Group

1. **EC2 Console** → **Security Groups**
2. Find your instance's security group
3. **Edit inbound rules**
4. **Add rule**:
   - Type: **RDP**
   - Port: **3389**
   - Source: **My IP** (or `0.0.0.0/0` for testing)
5. **Save rules**

---

## Step 3: Install Node.js on Windows EC2

### 3.1 Download Node.js

1. **In Remote Desktop**, open **Internet Explorer** or **Edge**
2. Go to: https://nodejs.org/
3. Download **LTS version** (v18 or v20)
4. Run the installer
5. **Check "Add to PATH"** during installation
6. Click **Install**

### 3.2 Verify Installation

Open **PowerShell** (as Administrator):
```powershell
node --version
npm --version
```

Should show versions like `v18.17.0` and `9.6.7`

---

## Step 4: Install Git (Optional but Recommended)

1. Download Git: https://git-scm.com/download/win
2. Install with default settings
3. Verify:
```powershell
git --version
```

---

## Step 5: Upload Your Project

### Option A: Using Git (Recommended)

```powershell
# Clone your repository
git clone YOUR_REPO_URL
cd Bri-Application
```

### Option B: Using SCP (From Your PC)

**On your local PC** (PowerShell or Git Bash):
```powershell
# Install WinSCP or use PowerShell
scp -i your-key.pem -r Bri-Application Administrator@YOUR_EC2_IP:C:\
```

### Option C: Using RDP File Transfer

1. **In Remote Desktop**, you can copy-paste files
2. Or use **Remote Desktop's file sharing** feature
3. Copy your `Bri-Application` folder to `C:\`

---

## Step 6: Configure Environment

### 6.1 Create .env File

```powershell
cd C:\Bri-Application
notepad .env
```

Paste your configuration (update with EC2 IP):
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

**Important**: Replace `YOUR_EC2_IP` with your actual EC2 public IP address.

### 6.2 Install Dependencies

```powershell
cd C:\Bri-Application
npm install
```

This will take a few minutes.

---

## Step 7: Run Database Migrations

```powershell
npm run db:push
```

Should create all tables successfully.

---

## Step 8: Build and Start Server

### 8.1 Build Server

```powershell
npm run server:build
```

### 8.2 Test Server (Optional)

```powershell
npm run server:prod
```

If it works, press **Ctrl+C** to stop it.

### 8.3 Install PM2 for Windows

PM2 doesn't work well on Windows. Use **Windows Task Scheduler** or **NSSM** instead.

#### Option A: Use NSSM (Node Service Manager)

```powershell
# Download NSSM
# Go to: https://nssm.cc/download
# Extract nssm.exe to C:\nssm

# Install as Windows Service
C:\nssm\win64\nssm.exe install BringItServer
```

In the NSSM GUI:
- **Path**: `C:\Program Files\nodejs\npm.cmd`
- **Startup directory**: `C:\Bri-Application`
- **Arguments**: `run server:prod`
- Click **Install service**

Start service:
```powershell
C:\nssm\win64\nssm.exe start BringItServer
```

#### Option B: Use Windows Task Scheduler (Simpler)

1. Open **Task Scheduler**
2. **Create Basic Task**
3. **Name**: `BringIt Server`
4. **Trigger**: **When the computer starts**
5. **Action**: **Start a program**
   - **Program**: `C:\Program Files\nodejs\node.exe`
   - **Arguments**: `C:\Bri-Application\server_dist\index.js`
   - **Start in**: `C:\Bri-Application`
6. **Finish**

#### Option C: Simple Batch File (For Testing)

Create `start-server.bat`:
```batch
@echo off
cd C:\Bri-Application
npm run server:prod
```

Run it manually or add to Startup folder.

---

## Step 9: Configure Windows Firewall

1. **Windows Security** → **Firewall & network protection**
2. **Advanced settings**
3. **Inbound Rules** → **New Rule**
4. **Port** → **TCP** → **3000**
5. **Allow the connection**
6. **Apply to all profiles**
7. **Name**: `BringIt Server Port 3000`

---

## Step 10: Test Your Server

### From Your PC Browser

Open: `http://YOUR_EC2_IP:3000`

Should see your server response or landing page.

### From Your Phone

1. Make sure phone and EC2 are on internet (not same network)
2. Open browser: `http://YOUR_EC2_IP:3000`
3. Should connect successfully

---

## Step 11: Update .env for APK Build

On your **local PC**, update `.env`:
```bash
EXPO_PUBLIC_DOMAIN=YOUR_EC2_IP:3000
```

Then build APK (see `QUICK_APK_BUILD.md`)

---

## Troubleshooting

### Can't Connect via RDP
- Check Security Group allows port 3389
- Verify instance is running
- Try different RDP client

### Node.js Not Found
- Restart PowerShell after installing Node.js
- Check PATH environment variable
- Reinstall Node.js

### Server Won't Start
- Check port 3000 is not in use: `netstat -ano | findstr :3000`
- Check .env file exists and has correct values
- Check Windows Firewall allows port 3000
- Check EC2 Security Group allows port 3000

### Can't Access from Phone
- Verify EC2 Security Group allows port 3000 from `0.0.0.0/0`
- Check Windows Firewall allows port 3000
- Test from PC browser first
- Check server is running: `netstat -ano | findstr :3000`

---

## Cost Estimate

- **Windows EC2 t3.small**: ~$15/month (not free tier)
- **Windows EC2 t3.micro**: ~$8/month (less RAM)
- **Storage**: ~$1/month for 30GB

**Total**: ~$9-16/month

---

## Quick Command Reference

```powershell
# Connect to EC2
mstsc
# Enter: YOUR_EC2_IP

# On EC2, install Node.js
# Download from nodejs.org

# Setup project
cd C:\Bri-Application
npm install
npm run db:push

# Start server
npm run server:prod

# Or use NSSM/Task Scheduler for auto-start
```

---

## Next Steps

1. ✅ Server running on Windows EC2
2. ✅ Test from browser: `http://YOUR_EC2_IP:3000`
3. ✅ Build APK with server URL (see `QUICK_APK_BUILD.md`)
4. ✅ Install APK on phone and test!

Good luck! 🚀

