# How to Find Your EC2 Public IP Address

## Method 1: EC2 Console (Easiest)

### Step 1: Go to EC2 Dashboard
1. **AWS Console** → **EC2** service
2. Click **"Instances"** in the left sidebar (or "Instances (running)")

### Step 2: Find Your Instance
1. You'll see a list of your EC2 instances
2. Find your instance: **`bringit-server-windows`** (or whatever you named it)
3. **Click on the instance name** (or checkbox to select it)

### Step 3: View Public IP
1. Look at the **bottom panel** (Instance details)
2. Scroll to **"Networking"** section
3. You'll see:
   - **Public IPv4 address**: `54.123.45.67` ← **This is your IP!**
   - **Public IPv4 DNS**: `ec2-54-123-45-67.compute-1.amazonaws.com` (also works)

**OR** look in the **table columns**:
- The **"Public IPv4 address"** column shows the IP directly

---

## Method 2: Instance Summary

1. **Select your instance** (click the checkbox)
2. Look at the **top panel** (Instance summary)
3. Find **"Public IPv4 address"** field
4. Copy the IP address

---

## Method 3: Instance Details Tab

1. **Select your instance**
2. Click **"Details"** tab at the bottom
3. Scroll to **"Network"** section
4. Find **"Public IPv4 address"**

---

## Visual Guide

When you're in EC2 Console, you'll see something like:

```
Instances
┌─────────────────────────────────────────────────────────┐
│ ☑ bringit-server-windows                               │
│   Instance ID: i-0123456789abcdef0                      │
│   State: running                                        │
│   Type: t3.small                                        │
│   Public IPv4 address: 54.123.45.67  ← COPY THIS!      │
│   Private IPv4 address: 10.0.1.123                     │
└─────────────────────────────────────────────────────────┘
```

---

## Important Notes

### Public IP vs Private IP
- **Public IPv4 address**: Use this to connect from your PC/phone
- **Private IPv4 address**: Only works within AWS network (ignore this)

### IP Changes on Restart
⚠️ **Important**: If you **stop and start** your EC2 instance, the public IP will change!
- **Solution**: Use an **Elastic IP** (static IP that doesn't change)
- Or just note the new IP after restart

### Elastic IP (Optional - For Static IP)

If you want a permanent IP that doesn't change:

1. **EC2 Console** → **Network & Security** → **Elastic IPs**
2. Click **"Allocate Elastic IP address"**
3. Click **"Allocate"**
4. Select the Elastic IP → **Actions** → **Associate Elastic IP address**
5. Select your instance → **Associate**

Now your IP won't change when you restart!

---

## Quick Checklist

- [ ] Go to EC2 Console
- [ ] Click "Instances"
- [ ] Find your Windows instance
- [ ] Copy "Public IPv4 address"
- [ ] Use it in Remote Desktop: `mstsc` → Enter IP

---

## Example

If your Public IPv4 address is: `54.123.45.67`

Then in Remote Desktop:
- **Computer**: `54.123.45.67`
- **Username**: `Administrator`
- **Password**: (from AWS Console → Connect → Get password)

That's it! 🎯

