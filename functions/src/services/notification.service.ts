import * as admin from 'firebase-admin';
import { Notification } from '../types/firestore.types';

/**
 * Notification Service
 * Handles Firebase Cloud Messaging (FCM) operations
 */
export class NotificationService {
  private readonly messaging: admin.messaging.Messaging;

  constructor(messaging?: admin.messaging.Messaging) {
    this.messaging = messaging || admin.messaging();
  }

  /**
   * Send push notification via Firebase Cloud Messaging
   * 
   * @param fcmToken - User's FCM device token
   * @param notification - Notification data to send
   * @returns Promise<boolean> - true if sent successfully, false otherwise
   */
  async sendPushNotification(
    fcmToken: string,
    notification: Notification
  ): Promise<boolean> {
    try {
      const message: admin.messaging.Message = {
        token: fcmToken,
        notification: {
          title: notification.title,
          body: notification.text,
        },
        data: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          text: notification.text,
          fromUserId: notification.fromUserId,
          toUserId: notification.toUserId,
          chatId: notification.chatId || '',
          messageId: notification.messageId || '',
          createdAt: notification.createdAt.toString(),
          updatedAt: notification.updatedAt.toString(),
        },
        // Android-specific options
        android: {
          priority: 'high',
          notification: {
            channelId: 'chat_messages',
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        // iOS-specific options
        apns: {
          payload: {
            aps: {
              alert: {
                title: notification.title,
                body: notification.text,
              },
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await this.messaging.send(message);
      console.log('Successfully sent FCM message:', response);
      return true;
    } catch (error: any) {
      console.error('Error sending FCM message:', error);
      return false;
    }
  }

  /**
   * Send push notifications to multiple tokens
   * 
   * @param fcmTokens - Array of FCM device tokens
   * @param notification - Notification data to send
   * @returns Promise<{successCount: number, failureCount: number}>
   */
  async sendPushNotificationToMultiple(
    fcmTokens: string[],
    notification: Notification
  ): Promise<{ successCount: number; failureCount: number }> {
    if (fcmTokens.length === 0) {
      return { successCount: 0, failureCount: 0 };
    }

    const message: admin.messaging.MulticastMessage = {
      tokens: fcmTokens,
      notification: {
        title: notification.title,
        body: notification.text,
      },
      data: {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        text: notification.text,
        fromUserId: notification.fromUserId,
        toUserId: notification.toUserId,
        chatId: notification.chatId || '',
        messageId: notification.messageId || '',
        createdAt: notification.createdAt.toString(),
        updatedAt: notification.updatedAt.toString(),
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'chat_messages',
          priority: 'high',
          defaultSound: true,
          defaultVibrateTimings: true,
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: notification.title,
              body: notification.text,
            },
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    try {
      const response = await this.messaging.sendEachForMulticast(message);
      console.log(`Successfully sent ${response.successCount} messages`);
      if (response.failureCount > 0) {
        console.error(`Failed to send ${response.failureCount} messages`);
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.error(`Failed to send to token ${fcmTokens[idx]}:`, resp.error);
          }
        });
      }
      return {
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error: any) {
      console.error('Error sending multicast FCM message:', error);
      return { successCount: 0, failureCount: fcmTokens.length };
    }
  }
}

export function createNotificationService(
  messaging?: admin.messaging.Messaging
): NotificationService {
  return new NotificationService(messaging);
}
