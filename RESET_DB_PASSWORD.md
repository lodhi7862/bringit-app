# Reset RDS Database Password

## Step-by-Step Guide

### Step 1: Go to RDS Console
1. Open **AWS Console**
2. Navigate to **RDS** service
3. Click on **"Databases"** in the left sidebar

### Step 2: Select Your Database
1. Find your database: **`bringit-db`**
2. **Click on the database name** (not the checkbox)

### Step 3: Modify Database
1. Click the **"Modify"** button (top right)
2. Scroll down to **"Database authentication"** section

### Step 4: Change Master Password
1. Find **"Master password"** field
2. Select **"Change master password"**
3. Enter your **new password**:
   - Must be 8-128 characters
   - Should include uppercase, lowercase, numbers, and special characters
   - **IMPORTANT**: Save this password securely!
4. Confirm the password

### Step 5: Apply Changes
1. Scroll to the bottom of the page
2. Under **"Scheduling of modifications"**:
   - Select **"Apply immediately"** ⚠️ (This will restart the database)
   - OR select **"Maintenance window"** (safer, but you have to wait)
3. Click **"Continue"**
4. Review the changes
5. Click **"Modify DB instance"**

### Step 6: Wait for Restart
- Database will restart (takes 5-10 minutes)
- Status will show: **"Modifying"** → **"Available"**
- **⚠️ Your application will be down during this time**

### Step 7: Update .env File
Once the database is back online:
1. Open `Bri-Application/.env`
2. Update the `DATABASE_URL` with your new password:
   ```
   DATABASE_URL=postgresql://bringit_admin:YOUR_NEW_PASSWORD@bringit-db.c722akseg3is.eu-north-1.rds.amazonaws.com:5432/bringit
   ```

### Step 8: Test Connection
```bash
cd Bri-Application
npm run db:push
```

## Important Notes

### ⚠️ Downtime Warning
- Database will restart during password change
- Your application will be unavailable for 5-10 minutes
- Plan this during low-usage time if possible

### 🔒 Password Requirements
- Minimum 8 characters
- Maximum 128 characters
- Recommended: Mix of uppercase, lowercase, numbers, special characters
- Example: `BringIt2024!Secure`

### 💾 Save Your Password
- Write it down in a secure password manager
- Update your `.env` file immediately
- Don't lose it again! 😊

## Alternative: Use AWS Secrets Manager (Advanced)

For production, consider using AWS Secrets Manager:
1. Store password in Secrets Manager
2. Rotate passwords automatically
3. Access via IAM roles (no hardcoded passwords)

But for now, the manual reset is fine for development.

## Quick Checklist

- [ ] Go to RDS Console
- [ ] Click on `bringit-db`
- [ ] Click "Modify"
- [ ] Select "Change master password"
- [ ] Enter new password (save it!)
- [ ] Select "Apply immediately"
- [ ] Click "Modify DB instance"
- [ ] Wait 5-10 minutes for restart
- [ ] Update `.env` file with new password
- [ ] Test connection with `npm run db:push`

## Troubleshooting

### "Modification failed"
- Check if database is in a valid state
- Ensure no other modifications are in progress
- Try again after a few minutes

### Can't connect after password change
- Double-check password in `.env` file
- Verify database status is "Available"
- Check security group allows your IP
- Wait a few more minutes (changes take time to propagate)

### Forgot new password again
- You'll need to repeat this process
- Consider using a password manager!

