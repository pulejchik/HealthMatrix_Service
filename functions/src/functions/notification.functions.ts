import * as functions from "firebase-functions";
import { firestoreService } from "../index";
import { createNotificationService } from "../services/notification.service";

const notificationService = createNotificationService();

/**
 * Process Pending Notifications
 * 
 * This function runs every minute to process pending notifications:
 * 1. Reads all items in /notifications/references/pending collection
 * 2. For each notification:
 *    - Reads user model from /users/{userId} by notification.toUserId
 *    - Gets fcm_token and isNotificationsEnabled
 *    - If messageId and chatId present, loads message from /chats/{chatId}/messages/{messageId}
 *    - Checks message status and updatedAt
 *    - If status == "read", removes notification from pending
 *    - If updatedAt is more than 1 minute ago, processes notification
 *    - If no fcm_token or isNotificationsEnabled == false, skips FCM send
 *    - Sends notification via FCM if applicable
 *    - Moves notification to /notifications/references/sent (with status "sent" or "failed")
 *    - Removes notification from /notifications/references/pending
 */
export const processPendingNotifications = functions.pubsub
  .schedule("every 1 minutes")
  .onRun(async (context) => {
    functions.logger.info("Starting processPendingNotifications");

    try {
      // Step 1: Get all pending notifications
      const pendingNotifications = await firestoreService.getPendingNotifications();
      
      if (pendingNotifications.length === 0) {
        functions.logger.info("No pending notifications to process");
        return null;
      }

      functions.logger.info(`Found ${pendingNotifications.length} pending notifications`);

      // Step 2: Process each notification
      for (const notification of pendingNotifications) {
        try {
          await processNotification(notification);
        } catch (error: any) {
          functions.logger.error(`Error processing notification ${notification.id}`, {
            error: error.message,
            stack: error.stack,
            notificationId: notification.id,
          });
        }
      }

      functions.logger.info("Completed processPendingNotifications");
      return null;
    } catch (error: any) {
      functions.logger.error("Error in processPendingNotifications", {
        error: error.message,
        stack: error.stack,
      });
      return null;
    }
  });

async function processNotification(notification: any): Promise<void> {
  functions.logger.info(`Processing notification ${notification.id}`, {
    notificationId: notification.id,
    toUserId: notification.toUserId,
    type: notification.type,
  });

  // Step 1: Read user model
  const user = await firestoreService.getUser(notification.toUserId);
  if (!user) {
    functions.logger.warn(`User not found for notification ${notification.id}, removing`, {
      notificationId: notification.id,
      toUserId: notification.toUserId,
    });
    await firestoreService.deleteNotification(notification.id, true);
    return;
  }

  functions.logger.info(`User found for notification ${notification.id}`, {
    userId: user.id,
    hasFcmToken: !!user.fcm_token,
    isNotificationsEnabled: user.isNotificationsEnabled,
  });

  // Step 2: If messageId and chatId present, check message status
  if (notification.messageId && notification.chatId) {
    const message = await firestoreService.getMessage(
      notification.chatId,
      notification.messageId
    );

    if (!message) {
      functions.logger.warn(`Message not found for notification ${notification.id}, removing`, {
        notificationId: notification.id,
        chatId: notification.chatId,
        messageId: notification.messageId,
      });
      await firestoreService.deleteNotification(notification.id, true);
      return;
    }

    // Step 3: If status == "read", just remove notification from pending
    if (message.status === "read") {
      functions.logger.info(`Message already read, skipping notification ${notification.id}`, {
        notificationId: notification.id,
        messageId: message.id,
      });
      await firestoreService.deleteNotification(notification.id, true);
      return;
    }

    // Step 4: If updatedAt is less than 1 minute ago, skip
    const now = Date.now();
    const messageAge = now - message.updatedAt;
    const oneMinuteInMillis = 60 * 1000;

    if (messageAge < oneMinuteInMillis) {
      functions.logger.info(`Message too recent, skipping notification ${notification.id}`, {
        notificationId: notification.id,
        messageId: message.id,
        messageAge,
        oneMinuteInMillis,
      });
      return; // Don't process yet, will be picked up in next run
    }

    functions.logger.info(`Message age check passed for notification ${notification.id}`, {
      notificationId: notification.id,
      messageId: message.id,
      messageAge,
    });
  }

  // Step 5: If no fcm_token or isNotificationsEnabled == false, skip FCM send
  const shouldSendFcm = 
    user.fcm_token && 
    user.isNotificationsEnabled !== false;

  if (!shouldSendFcm) {
    functions.logger.info(`Skipping FCM send for notification ${notification.id}`, {
      notificationId: notification.id,
      userId: user.id,
      hasFcmToken: !!user.fcm_token,
      isNotificationsEnabled: user.isNotificationsEnabled,
    });
    // Step 7: Move to sent without sending FCM
    await moveNotificationToSent(notification, "sent");
    return;
  }

  // Step 6: Send notification via FCM
  functions.logger.info(`Sending FCM notification ${notification.id}`, {
    notificationId: notification.id,
    userId: user.id,
  });

  const fcmSuccess = await notificationService.sendPushNotification(
    user.fcm_token!,
    notification
  );

  const status = fcmSuccess ? "sent" : "failed";
  functions.logger.info(`FCM send result for notification ${notification.id}`, {
    notificationId: notification.id,
    status,
  });

  // Step 7: Move notification to sent collection and remove from pending
  await moveNotificationToSent(notification, status);
}

/**
 * Move notification to sent collection and remove from pending
 */
async function moveNotificationToSent(
  notification: any,
  status: "sent" | "failed"
): Promise<void> {
  const updatedNotification = {
    ...notification,
    status,
    updatedAt: Date.now(),
  };

  await firestoreService.moveNotificationToSent(updatedNotification);
  
  functions.logger.info(`Moved notification ${notification.id} to sent with status ${status}`, {
    notificationId: notification.id,
    status,
  });
}
