# Quick Start Guide - AWS Integration

This guide will help you quickly set up AWS services for your BringIt application.

## Prerequisites

- AWS account created
- Node.js and npm installed
- Basic terminal/command line knowledge

## Step-by-Step Setup

### 1. Install Dependencies

```bash
cd Bri-Application
npm install
```

This will install the new AWS SDK packages:
- `@aws-sdk/client-s3` - For S3 image storage
- `@aws-sdk/client-sns` - For push notifications
- `@aws-sdk/s3-request-presigner` - For S3 URL generation

### 2. Set Up AWS RDS Database

1. **Go to AWS Console** → **RDS** → **Create database**
2. Choose **PostgreSQL** → **Free tier** template
3. Set:
   - DB identifier: `bringit-db`
   - Master username: `bringit_admin`
   - Master password: (create a strong password)
   - Public access: **Yes** (for development)
4. Wait 5-10 minutes for creation
5. **Note the endpoint** from the RDS dashboard

### 3. Set Up AWS S3 Bucket

1. **Go to AWS Console** → **S3** → **Create bucket**
2. Bucket name: `bringit-storage-{your-unique-id}`
3. **Uncheck** "Block all public access"
4. Create bucket
5. Go to **Permissions** → **Bucket policy** → Add:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
  }]
}
```

### 4. Create IAM User for AWS Access

1. **Go to AWS Console** → **IAM** → **Users** → **Create user**
2. Username: `bringit-app-user`
3. Attach policies:
   - `AmazonS3FullAccess`
   - `AmazonSNSFullAccess`
4. Create user → **Security credentials** → **Create access key**
5. **Save** Access Key ID and Secret Access Key

### 5. Create SNS Topic (Optional)

1. **Go to AWS Console** → **SNS** → **Topics** → **Create topic**
2. Name: `bringit-notifications`
3. **Copy the Topic ARN**

### 6. Configure Environment Variables

Create a `.env` file in the `Bri-Application` directory:

```bash
# Database
DATABASE_URL=postgresql://bringit_admin:YOUR_PASSWORD@your-endpoint.rds.amazonaws.com:5432/bringit

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_BUCKET_NAME=your-bucket-name
AWS_SNS_TOPIC_ARN=arn:aws:sns:region:account:bringit-notifications

# Server
PORT=3000
NODE_ENV=development
```

### 7. Set Up Database Schema

```bash
npm run db:push
```

This will create all necessary tables in your RDS database.

### 8. Start the Server

```bash
npm run server:dev
```

You should see:
- ✅ Server running on port 3000
- ✅ WebSocket server initialized
- ⚠️ AWS warnings (if credentials not set) - this is OK for local testing

### 9. Test the Integration

1. **Start your Expo app**:
   ```bash
   npm run expo:dev
   ```

2. **Create a task** from a parent account
3. **Check child device** - should receive task immediately via WebSocket
4. **Upload an image** - should be stored in S3
5. **Check AWS S3 console** - verify image appears in bucket

## Troubleshooting

### "AWS credentials not configured" warning
- This is OK if you're testing locally without AWS
- The app will fall back to local storage for images
- WebSocket will still work for real-time updates

### Database connection fails
- Check your `DATABASE_URL` format
- Verify RDS security group allows your IP
- Ensure RDS instance is running

### S3 upload fails
- Verify IAM user has S3 permissions
- Check bucket name matches environment variable
- Ensure bucket policy allows public read

### WebSocket not connecting
- Check server logs for errors
- Verify WebSocket URL in browser console
- Ensure firewall allows WebSocket connections

## What's New

### ✅ Real-time Communication
- WebSocket support for instant task updates
- No more manual refresh needed
- Tasks appear immediately on child devices

### ✅ Persistent Storage
- All tasks stored in AWS RDS PostgreSQL
- Images stored in AWS S3
- Data persists across app restarts

### ✅ Push Notifications
- AWS SNS integration ready
- Foundation for mobile push notifications
- Real-time notifications via WebSocket

## Next Steps

1. **Deploy to AWS** - See `AWS_SETUP.md` for deployment options
2. **Set up mobile push** - Integrate Expo Push Notifications with SNS
3. **Monitor costs** - Set up AWS Cost Explorer alerts
4. **Add logging** - Configure CloudWatch for error tracking

## Support

For detailed AWS setup instructions, see `AWS_SETUP.md`.

For issues:
1. Check server console logs
2. Verify environment variables
3. Check AWS service status in console

