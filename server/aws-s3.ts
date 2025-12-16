import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { awsConfig } from './aws-config';
import * as fs from 'fs';
import * as path from 'path';

const s3Client = new S3Client({
  region: awsConfig.region,
  credentials: awsConfig.accessKeyId && awsConfig.secretAccessKey ? {
    accessKeyId: awsConfig.accessKeyId,
    secretAccessKey: awsConfig.secretAccessKey,
  } : undefined,
});

/**
 * Upload file to S3
 */
export async function uploadToS3(
  localFilePath: string,
  s3Key: string,
  contentType: string = 'image/jpeg'
): Promise<string> {
  if (!awsConfig.accessKeyId || !awsConfig.secretAccessKey || !awsConfig.s3Bucket) {
    // Fallback to local storage
    throw new Error('S3 not configured, using local storage');
  }

  try {
    const fileContent = fs.readFileSync(localFilePath);
    
    const command = new PutObjectCommand({
      Bucket: awsConfig.s3Bucket,
      Key: s3Key,
      Body: fileContent,
      ContentType: contentType,
      ACL: 'public-read', // Make images publicly accessible
    });

    await s3Client.send(command);
    
    // Return public URL
    return `https://${awsConfig.s3Bucket}.s3.${awsConfig.region}.amazonaws.com/${s3Key}`;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error;
  }
}

/**
 * Delete file from S3
 */
export async function deleteFromS3(s3Key: string): Promise<void> {
  if (!awsConfig.accessKeyId || !awsConfig.secretAccessKey || !awsConfig.s3Bucket) {
    return; // S3 not configured
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: awsConfig.s3Bucket,
      Key: s3Key,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error('Error deleting from S3:', error);
    // Don't throw - deletion failures shouldn't break the app
  }
}

/**
 * Get presigned URL for S3 object (for temporary access)
 */
export async function getS3PresignedUrl(s3Key: string, expiresIn: number = 3600): Promise<string> {
  if (!awsConfig.accessKeyId || !awsConfig.secretAccessKey || !awsConfig.s3Bucket) {
    throw new Error('S3 not configured');
  }

  const command = new GetObjectCommand({
    Bucket: awsConfig.s3Bucket,
    Key: s3Key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

