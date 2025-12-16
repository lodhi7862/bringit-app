import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiRequest, getApiUrl } from './query-client';
import { getState } from './store';

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

// Only set up notification handler if not in Expo Go on Android (not supported since SDK 53)
if (!(isExpoGo() && Platform.OS === 'android')) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (error) {
    // Notifications not supported in this environment
    console.log('Notification handler setup skipped');
  }
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') {
    console.log('Push notifications not supported on web');
    return null;
  }

  // Push notifications not supported in Expo Go on Android since SDK 53
  if (isExpoGo() && Platform.OS === 'android') {
    return null;
  }

  if (isExpoGo()) {
    console.log('Push notifications are limited in Expo Go. For full functionality, use a development build.');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.log('No projectId found - push notifications require a development build');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    const token = tokenData.data;
    console.log('Expo push token:', token);
    return token;
  } catch (error: any) {
    if (error?.message?.includes('projectId') || error?.message?.includes('Expo Go')) {
      console.log('Push notifications require a development build');
    } else {
      console.log('Push notification setup skipped:', error?.message || 'Unknown error');
    }
    return null;
  }
}

export async function registerDeviceToken(token: string): Promise<boolean> {
  const currentUser = getState().currentUser;
  if (!currentUser) {
    console.log('No user to register token for');
    return false;
  }

  try {
    await apiRequest('POST', '/api/device-tokens', {
      userId: currentUser.id,
      token,
      platform: Platform.OS,
    });
    console.log('Device token registered successfully');
    return true;
  } catch (error) {
    console.error('Failed to register device token:', error);
    return false;
  }
}

export async function unregisterDeviceToken(token: string): Promise<boolean> {
  try {
    await apiRequest('DELETE', '/api/device-tokens', { token });
    console.log('Device token unregistered');
    return true;
  } catch (error) {
    console.error('Failed to unregister device token:', error);
    return false;
  }
}

export async function syncFamilyConnection(
  parentId: string,
  childId: string,
  childName: string
): Promise<boolean> {
  try {
    await apiRequest('POST', '/api/family-connections', {
      parentId,
      childId,
      childName,
    });
    console.log('Family connection synced');
    return true;
  } catch (error) {
    console.error('Failed to sync family connection:', error);
    return false;
  }
}

export async function sendOrderNotification(
  parentId: string,
  receiverName: string,
  itemCount: number
): Promise<boolean> {
  try {
    await apiRequest('POST', '/api/notifications/send', {
      parentId,
      title: 'New Shopping Order',
      body: `You have a new order with ${itemCount} ${itemCount === 1 ? 'item' : 'items'} to pick up!`,
      data: {
        type: 'new_order',
        itemCount: String(itemCount),
      },
    });
    console.log('Order notification sent');
    return true;
  } catch (error) {
    console.error('Failed to send order notification:', error);
    return false;
  }
}

export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void
) {
  // Skip notification listeners on web and in Expo Go on Android (not supported)
  if (Platform.OS === 'web' || (isExpoGo() && Platform.OS === 'android')) {
    return () => {};
  }

  try {
    const receivedSubscription = Notifications.addNotificationReceivedListener(
      (notification: Notifications.Notification) => {
        console.log('Notification received:', notification);
        onNotificationReceived?.(notification);
      }
    );

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response: Notifications.NotificationResponse) => {
        console.log('Notification response:', response);
        onNotificationResponse?.(response);
      }
    );

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  } catch (error) {
    console.log('Notification listeners not available in this environment');
    return () => {};
  }
}
