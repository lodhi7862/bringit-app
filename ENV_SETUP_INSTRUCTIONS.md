# Environment Variables Setup Instructions

This guide will help you fill in the `.env` file with your AWS credentials and configuration.

## Step-by-Step: Filling Your .env File

### Step 1: Set Up AWS RDS Database

1. **Go to AWS Console** → **RDS** → Click on your database instance
2. **Find the Endpoint** in the **Connectivity & security** section
   - Example: `bringit-db.abc123.us-east-1.rds.amazonaws.com`
3. **Note your database credentials**:
   - Master username (usually `bringit_admin` or `postgres`)
   - Master password (the one you set when creating the database)
4. **Update DATABASE_URL** in `.env`:
   ```
   DATABASE_URL=postgresql://bringit_admin:YourPassword@bringit-db.abc123.us-east-1.rds.amazonaws.com:5432/bringit
   ```
   ⚠️ **Important**: Replace `YourPassword` with your actual RDS password

### Step 2: Get AWS Region

1. **Check the top-right corner** of AWS Console
2. **Note the region** (e.g., `us-east-1`, `us-west-2`, `ap-south-1`)
3. **Update AWS_REGION** in `.env`:
   ```
   AWS_REGION=us-east-1
   ```

### Step 3: Create IAM User and Get Access Keys

1. **Go to AWS Console** → **IAM** → **Users**
2. **Click "Create user"**
3. **User name**: `bringit-app-user`
4. **Click "Next"**
5. **Select "Attach policies directly"**
6. **Add these policies**:
   - `AmazonS3FullAccess`
   - `AmazonSNSFullAccess`
7. **Click "Create user"**
8. **Click on the user** → **Security credentials** tab
9. **Click "Create access key"**
10. **Select "Application running outside AWS"**
11. **Click "Next"** → **Create access key**
12. **IMPORTANT**: Copy both:
    - **Access key ID**
    - **Secret access key** (you won't see this again!)
13. **Update in .env**:
    ```
    AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
    AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
    ```
    ⚠️ **Use your actual keys, not the examples above!**

### Step 4: Get S3 Bucket Name

1. **Go to AWS Console** → **S3**
2. **Find your bucket** (the one you created for BringIt)
3. **Copy the bucket name**
4. **Update in .env**:
   ```
   AWS_S3_BUCKET_NAME=bringit-storage-123456789
   ```
   ⚠️ **Use your actual bucket name**

### Step 5: Get SNS Topic ARN (Optional)

1. **Go to AWS Console** → **SNS** → **Topics**
2. **Click on your topic** (e.g., `bringit-notifications`)
3. **Copy the ARN** from the topic details
4. **Update in .env**:
   ```
   AWS_SNS_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:bringit-notifications
   ```
   ⚠️ **Replace with your actual ARN**

### Step 6: Configure Server Settings

**PORT** (usually keep as 3000):
```
PORT=3000
```

**NODE_ENV** (use `development` for testing, `production` for live):
```
NODE_ENV=development
```

### Step 7: Configure Client Domain

**For local development**:
```
EXPO_PUBLIC_DOMAIN=localhost:3000
```

**For AWS deployment** (after deploying your server):
```
EXPO_PUBLIC_DOMAIN=your-ec2-ip:3000
```
or
```
EXPO_PUBLIC_DOMAIN=your-domain.com
```

## Complete Example .env File

Here's what a filled-in `.env` file might look like:

```bash
DATABASE_URL=postgresql://bringit_admin:MySecurePass123!@bringit-db.abc123.us-east-1.rds.amazonaws.com:5432/bringit
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_S3_BUCKET_NAME=bringit-storage-123456789
AWS_SNS_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:bringit-notifications
PORT=3000
NODE_ENV=development
EXPO_PUBLIC_DOMAIN=localhost:3000
```

## Security Checklist

- [ ] `.env` file is in `.gitignore` (should not be committed)
- [ ] Passwords are strong and unique
- [ ] IAM user has only necessary permissions
- [ ] RDS security group restricts access
- [ ] Access keys are stored securely
- [ ] Never share your `.env` file

## Verification Steps

After filling in your `.env` file:

1. **Check database connection**:
   ```bash
   npm run db:push
   ```
   Should create tables without errors

2. **Start server**:
   ```bash
   npm run server:dev
   ```
   Should see:
   - ✅ "express server serving on port 3000"
   - ✅ "WebSocket server initialized"
   - ⚠️ AWS warnings are OK if SNS not configured

3. **Test S3 upload** (upload an image in the app)
   - Check S3 bucket for uploaded files

## Common Issues

### "Cannot connect to database"
- Check DATABASE_URL format
- Verify RDS security group allows your IP
- Ensure RDS instance is running
- Check username/password are correct

### "Access Denied" for S3
- Verify IAM user has S3 permissions
- Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
- Ensure bucket name is correct

### "Invalid SNS Topic ARN"
- Check ARN format
- Verify topic exists in correct region
- Ensure IAM user has SNS permissions

## Next Steps

Once your `.env` file is configured:

1. **Run database migrations**:
   ```bash
   npm run db:push
   ```

2. **Start the server**:
   ```bash
   npm run server:dev
   ```

3. **Start Expo client** (in another terminal):
   ```bash
   npm run expo:dev
   ```

4. **Test the app** - Create tasks, upload images, test real-time updates!

For detailed AWS setup, see `AWS_SETUP.md`

