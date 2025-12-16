// AWS Configuration
export const awsConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  s3Bucket: process.env.AWS_S3_BUCKET_NAME || 'bringit-app-storage',
  snsTopicArn: process.env.AWS_SNS_TOPIC_ARN,
};

// Validate AWS configuration
export function validateAwsConfig(): void {
  if (!awsConfig.accessKeyId || !awsConfig.secretAccessKey) {
    console.warn('⚠️  AWS credentials not configured. Some features may not work.');
    console.warn('Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.');
  }
  if (!awsConfig.s3Bucket) {
    console.warn('⚠️  AWS S3 bucket not configured. Image uploads will use local storage.');
  }
}

