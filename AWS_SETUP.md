# AWS Configuration Guide for BringIt Application

This guide will help you configure AWS services for your BringIt application to enable:
- **Database Storage**: AWS RDS PostgreSQL for persistent task storage
- **Image Storage**: AWS S3 for storing uploaded images
- **Push Notifications**: AWS SNS for real-time notifications
- **Real-time Communication**: WebSocket support for instant updates

## Prerequisites

1. An AWS account (free tier eligible)
2. AWS CLI installed and configured (optional but recommended)
3. Basic understanding of AWS services

---

## Step 1: Set Up AWS RDS PostgreSQL Database

### 1.1 Create RDS Instance

1. **Log in to AWS Console**
   - Go to https://console.aws.amazon.com
   - Navigate to **RDS** service

2. **Create Database**
   - Click **"Create database"**
   - Choose **"Standard create"**
   - Select **PostgreSQL** as engine type
   - Choose **PostgreSQL 15.x** or latest version
   - Select **Free tier** template (if available) or **Dev/Test** template

3. **Database Configuration**
   - **DB instance identifier**: `bringit-db` (or your preferred name)
   - **Master username**: `bringit_admin` (or your preferred username)
   - **Master password**: Create a strong password (save this!)
   - **DB instance class**: `db.t3.micro` (free tier eligible)

4. **Storage Configuration**
   - **Storage type**: General Purpose SSD (gp3)
   - **Allocated storage**: 20 GB (minimum for free tier)

5. **Connectivity**
   - **VPC**: Default VPC
   - **Public access**: **Yes** (for easier connection, or No if using VPN)
   - **VPC security group**: Create new security group
   - **Availability Zone**: No preference

6. **Database Authentication**
   - **Database authentication**: Password authentication

7. **Additional Configuration**
   - **Initial database name**: `bringit`
   - **Backup retention**: 7 days (or 0 for free tier)
   - **Enable encryption**: Optional (free tier may not support)

8. Click **"Create database"** and wait 5-10 minutes for provisioning

### 1.2 Configure Security Group

1. Go to **EC2 Console** → **Security Groups**
2. Find the security group created for your RDS instance
3. Click **"Edit inbound rules"**
4. Add rule:
   - **Type**: PostgreSQL
   - **Protocol**: TCP
   - **Port**: 5432
   - **Source**: Your IP address (or 0.0.0.0/0 for development - **NOT recommended for production**)

### 1.3 Get Database Connection String

1. Go back to **RDS Console**
2. Click on your database instance
3. Find **"Endpoint"** and **"Port"** in the **Connectivity & security** section
4. Your connection string will be:
   ```
   postgresql://bringit_admin:YOUR_PASSWORD@your-endpoint.region.rds.amazonaws.com:5432/bringit
   ```

### 1.4 Set Environment Variable

Add this to your `.env` file or environment variables:
```bash
DATABASE_URL=postgresql://bringit_admin:YOUR_PASSWORD@your-endpoint.region.rds.amazonaws.com:5432/bringit
```

---

## Step 2: Set Up AWS S3 for Image Storage

### 2.1 Create S3 Bucket

1. **Navigate to S3**
   - Go to AWS Console → **S3** service
   - Click **"Create bucket"**

2. **Bucket Configuration**
   - **Bucket name**: `bringit-app-storage-{your-unique-id}` (must be globally unique)
   - **AWS Region**: Choose the same region as your RDS instance (e.g., `us-east-1`)
   - **Object Ownership**: ACLs disabled (recommended)

3. **Block Public Access Settings**
   - **Uncheck** "Block all public access" (we need public read access for images)
   - Acknowledge the warning

4. **Bucket Versioning**: Disable (optional)

5. **Default encryption**: Enable (SSE-S3)

6. Click **"Create bucket"**

### 2.2 Configure Bucket Policy

1. Click on your bucket → **Permissions** tab
2. Scroll to **"Bucket policy"** → Click **"Edit"**
3. Add this policy (replace `YOUR-BUCKET-NAME`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*"
    }
  ]
}
```

4. Click **"Save changes"**

### 2.3 Create IAM User for S3 Access

1. **Navigate to IAM**
   - Go to AWS Console → **IAM** service
   - Click **"Users"** → **"Create user"**

2. **User Details**
   - **User name**: `bringit-s3-user`
   - Click **"Next"**

3. **Set Permissions**
   - Select **"Attach policies directly"**
   - Search and select: **"AmazonS3FullAccess"** (or create custom policy with only necessary permissions)
   - Click **"Next"** → **"Create user"**

4. **Create Access Keys**
   - Click on the user → **"Security credentials"** tab
   - Click **"Create access key"**
   - Select **"Application running outside AWS"**
   - Click **"Next"** → **"Create access key"**
   - **IMPORTANT**: Save both **Access Key ID** and **Secret Access Key** (you won't see the secret again!)

### 2.4 Set Environment Variables

Add to your `.env` file:
```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_BUCKET_NAME=your-bucket-name
```

---

## Step 3: Set Up AWS SNS for Push Notifications

### 3.1 Create SNS Topic

1. **Navigate to SNS**
   - Go to AWS Console → **SNS** service
   - Click **"Topics"** → **"Create topic"**

2. **Topic Configuration**
   - **Type**: Standard
   - **Name**: `bringit-notifications`
   - **Display name**: `BringIt Notifications`
   - Click **"Create topic"**

3. **Copy Topic ARN**
   - Note the **Topic ARN** (e.g., `arn:aws:sns:us-east-1:123456789012:bringit-notifications`)

### 3.2 Configure IAM Permissions

1. **Update IAM User**
   - Go to IAM → **Users** → Select `bringit-s3-user` (or create a new user)
   - Click **"Add permissions"** → **"Attach policies directly"**
   - Search and select: **"AmazonSNSFullAccess"**
   - Click **"Add permissions"**

### 3.3 Set Environment Variable

Add to your `.env` file:
```bash
AWS_SNS_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:bringit-notifications
```

**Note**: For mobile push notifications, you'll need to integrate with Expo Push Notifications or Firebase Cloud Messaging, which can then publish to SNS. The current implementation provides the foundation for this.

---

## Step 4: Deploy Your Server

### 4.1 Option A: Deploy to AWS EC2

1. **Launch EC2 Instance**
   - Go to **EC2 Console** → **Launch Instance**
   - Choose **Amazon Linux 2023** or **Ubuntu**
   - Instance type: `t2.micro` (free tier eligible)
   - Configure security group to allow:
     - Port 22 (SSH)
     - Port 3000 (your app port)
     - Port 80/443 (HTTP/HTTPS)
   - Launch and save your key pair

2. **Connect and Set Up**
   ```bash
   ssh -i your-key.pem ec2-user@your-instance-ip
   ```

3. **Install Node.js and Dependencies**
   ```bash
   # Install Node.js (example for Amazon Linux)
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
   nvm install 18
   nvm use 18
   
   # Clone your repository
   git clone your-repo-url
   cd Bri-Application
   
   # Install dependencies
   npm install
   ```

4. **Set Environment Variables**
   ```bash
   # Create .env file
   nano .env
   # Add all your environment variables
   ```

5. **Run Database Migrations**
   ```bash
   npm run db:push
   ```

6. **Start Server**
   ```bash
   # Using PM2 for process management
   npm install -g pm2
   pm2 start npm --name "bringit-server" -- run server:prod
   pm2 save
   pm2 startup
   ```

### 4.2 Option B: Deploy to AWS Elastic Beanstalk

1. **Install EB CLI**
   ```bash
   pip install awsebcli
   ```

2. **Initialize EB**
   ```bash
   cd Bri-Application
   eb init
   ```

3. **Create Environment**
   ```bash
   eb create bringit-env
   ```

4. **Set Environment Variables**
   ```bash
   eb setenv DATABASE_URL=your-database-url AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=...
   ```

5. **Deploy**
   ```bash
   eb deploy
   ```

### 4.3 Option C: Deploy to AWS Lambda (Serverless)

For serverless deployment, you'll need to refactor the Express app to work with Lambda. Consider using:
- **AWS Lambda** with **API Gateway**
- **AWS App Runner**
- **AWS Fargate** (ECS)

---

## Step 5: Configure Client App

### 5.1 Update API URL

In your client app, set the `EXPO_PUBLIC_DOMAIN` environment variable to your deployed server URL:

```bash
EXPO_PUBLIC_DOMAIN=your-server-domain.com
```

Or for development:
```bash
EXPO_PUBLIC_DOMAIN=your-ec2-instance-ip:3000
```

### 5.2 Test WebSocket Connection

The WebSocket will automatically connect when a user logs in. Ensure your server allows WebSocket connections on port 3000 (or your configured port).

---

## Step 6: Testing

### 6.1 Test Database Connection

```bash
# From your server directory
npm run db:push
```

If successful, your tables should be created in RDS.

### 6.2 Test S3 Upload

1. Start your server
2. Upload an image through your app
3. Check S3 bucket - you should see the image in the `images/` folder

### 6.3 Test WebSocket

1. Open your app on two devices (or emulators)
2. Create a task from one device
3. The other device should receive the task immediately via WebSocket

### 6.4 Test Push Notifications

1. Ensure device tokens are registered
2. Create a task
3. Check AWS SNS console for published messages

---

## Security Best Practices

1. **Never commit `.env` files** - Add `.env` to `.gitignore`
2. **Use IAM roles** instead of access keys when possible (for EC2/ECS)
3. **Restrict RDS access** - Only allow your server IP, not 0.0.0.0/0
4. **Enable S3 bucket encryption**
5. **Use VPC** for RDS in production (no public access)
6. **Rotate access keys** regularly
7. **Enable CloudWatch** logging for monitoring
8. **Set up CloudWatch alarms** for errors

---

## Cost Estimation (Free Tier)

- **RDS**: 750 hours/month free for `db.t3.micro` (first year)
- **S3**: 5 GB storage, 20,000 GET requests/month free (first year)
- **SNS**: 1 million requests/month free (first year)
- **EC2**: 750 hours/month free for `t2.micro` (first year)

**After free tier**: Approximately $15-30/month for small-scale usage.

---

## Troubleshooting

### Database Connection Issues

- Check security group allows your IP/EC2 instance
- Verify endpoint and credentials
- Check RDS instance is running

### S3 Upload Fails

- Verify IAM user has S3 permissions
- Check bucket policy allows public read
- Verify bucket name matches environment variable

### WebSocket Not Connecting

- Check firewall/security group allows WebSocket connections
- Verify WebSocket URL format (ws:// or wss://)
- Check server logs for errors

### Push Notifications Not Working

- Verify SNS topic ARN is correct
- Check IAM permissions for SNS
- Ensure device tokens are registered in database

---

## Additional Resources

- [AWS RDS Documentation](https://docs.aws.amazon.com/rds/)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS SNS Documentation](https://docs.aws.amazon.com/sns/)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)

---

## Support

If you encounter issues:
1. Check AWS CloudWatch logs
2. Review server console logs
3. Verify all environment variables are set correctly
4. Ensure AWS services are in the same region

Good luck with your deployment! 🚀

