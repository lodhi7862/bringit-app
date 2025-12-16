import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { awsConfig } from './aws-config';
import { db } from './db';
import { deviceTokens } from '@shared/schema';
import { eq, inArray } from 'drizzle-orm';

const snsClient = new SNSClient({
  region: awsConfig.region,
  credentials: awsConfig.accessKeyId && awsConfig.secretAccessKey ? {
    accessKeyId: awsConfig.accessKeyId,
    secretAccessKey: awsConfig.secretAccessKey,
  } : undefined,
});

/**
 * Send push notification via AWS SNS
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!awsConfig.accessKeyId || !awsConfig.secretAccessKey) {
    console.warn('AWS SNS not configured. Skipping push notification.');
    return { success: false, error: 'SNS not configured' };
  }

  try {
    // Get device tokens for the user
    const tokens = await db.select()
      .from(deviceTokens)
      .where(eq(deviceTokens.userId, userId));

    if (tokens.length === 0) {
      return { success: false, error: 'No device tokens found' };
    }

    const results = [];
    for (const tokenRecord of tokens) {
      try {
        // For mobile push notifications, we need to use platform-specific endpoints
        // This is a simplified version - in production, you'd use Expo Push Notifications
        // or Firebase Cloud Messaging, which integrate with SNS
        
        // For now, we'll use SNS to send to a topic or directly to endpoints
        // Note: For Expo apps, you should use Expo's push notification service instead
        
        const message = JSON.stringify({
          default: `${title}: ${body}`,
          APNS: JSON.stringify({
            aps: {
              alert: { title, body },
              sound: 'default',
              badge: 1,
              data: data || {},
            },
          }),
          GCM: JSON.stringify({
            notification: { title, body },
            data: data || {},
          }),
        });

        // If using SNS topic
        if (awsConfig.snsTopicArn) {
          const command = new PublishCommand({
            TopicArn: awsConfig.snsTopicArn,
            Message: message,
            MessageStructure: 'json',
            MessageAttributes: {
              userId: { DataType: 'String', StringValue: userId },
            },
          });
          const result = await snsClient.send(command);
          results.push({ success: true, messageId: result.MessageId });
        } else {
          // For direct endpoint publishing, you'd need endpoint ARNs
          // This is a placeholder - implement based on your notification setup
          console.warn('SNS Topic ARN not configured');
          results.push({ success: false, error: 'SNS Topic not configured' });
        }
      } catch (error: any) {
        console.error(`Error sending notification to token ${tokenRecord.token}:`, error);
        results.push({ success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    return {
      success: successCount > 0,
      messageId: results.find(r => r.messageId)?.messageId,
    };
  } catch (error: any) {
    console.error('Error sending push notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send notifications to multiple users
 */
export async function sendPushNotificationsToUsers(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const userId of userIds) {
    const result = await sendPushNotification(userId, title, body, data);
    if (result.success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}

