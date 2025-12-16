# Reset RDS Password - Correct Steps

## Where to Find Password Change Option

The "Change master password" option is **NOT** in the "Database authentication" section. It's in a different place!

## Step-by-Step Instructions

### Step 1: Go to Modify Page
1. AWS Console → **RDS** → Click on **`bringit-db`**
2. Click **"Modify"** button (top right)

### Step 2: Find Master Password Section
Scroll down and look for one of these sections:

**Option A: "Settings" Section**
- Look for **"Settings"** section
- You'll see fields like:
  - DB instance identifier
  - Master username
  - **Master password** ← This is what you need!

**Option B: "Credentials" Section**
- Some RDS versions show it under "Credentials"
- Look for **"Master password"** field

### Step 3: Change Password
1. Find the **"Master password"** field
2. You'll see a checkbox or option: **"Change master password"**
   - OR it might say **"Reset master password"**
   - OR there might be a **"Modify"** link next to it
3. **Check the box** or **click the link**
4. Enter your **new password**:
   - Must be 8-128 characters
   - Use: uppercase, lowercase, numbers, special characters
   - Example: `BringIt2024!Secure`
5. **Confirm the password**

### Step 4: Apply Changes
1. Scroll to the very bottom
2. Under **"Scheduling of modifications"**:
   - Select **"Apply immediately"** ⚠️
3. Click **"Continue"**
4. Review the summary
5. Click **"Modify DB instance"**

### Step 5: Wait for Restart
- Status will change: **"Available"** → **"Modifying"** → **"Available"**
- Takes 5-10 minutes
- Database will be unavailable during this time

## Visual Guide - What to Look For

When you're on the Modify page, look for:

```
Settings
├── DB instance identifier: bringit-db
├── Master username: bringit_admin
└── Master password: [Change master password] ← CLICK THIS
```

OR

```
Master password
☑ Change master password
   New password: [Enter here]
   Confirm password: [Enter here]
```

## If You Still Can't Find It

### Alternative Method: Use AWS CLI

If the UI doesn't show the option, you can use AWS CLI:

```bash
aws rds modify-db-instance \
  --db-instance-identifier bringit-db \
  --master-user-password "YourNewPassword123!" \
  --apply-immediately
```

**Note**: You need AWS CLI installed and configured first.

### Or Try This:

1. On the Modify page, look for **"Additional configuration"** section
2. Expand it
3. Look for password options there

## After Password Reset

1. **Wait for database to restart** (5-10 minutes)
2. **Update your .env file**:
   ```
   DATABASE_URL=postgresql://bringit_admin:YOUR_NEW_PASSWORD@bringit-db.c722akseg3is.eu-north-1.rds.amazonaws.com:5432/bringit
   ```
3. **Test connection**:
   ```bash
   cd Bri-Application
   npm run db:push
   ```

## Troubleshooting

### "I don't see Master password field"
- Make sure you clicked **"Modify"** (not just viewing the database)
- Try refreshing the page
- Check if you have the right permissions (should be fine if you created the database)

### "Password field is grayed out"
- Some RDS configurations require you to check a box first
- Look for "Change master password" checkbox
- Or try the AWS CLI method above

### "Apply immediately is not available"
- This means there's another modification in progress
- Wait for it to complete, then try again

