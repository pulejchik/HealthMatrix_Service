import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { firestoreService, YClientsChatMapping } from "../index";
import { ChatStatus, YClientsRecord } from "../types";
import { randomUUID } from "node:crypto";

/**
 * Sync YClients Chat Mappings to /chats Collection
 * Scheduled function that runs every 1 minute
 */

interface ChatSyncStats {
  chatsProcessed: number;
  chatsCreated: number;
  chatsUpdated: number;
  errors: number;
}

interface RecordInfo {
  title: string | null;
  date: number; // epochMillis
}

/**
 * Check if a record is currently active
 * Active if: datetime >= (now - length * 3) AND attendance != 1 AND attendance != -1 AND deleted = false
 */
function isRecordActive(record: YClientsRecord, now: admin.firestore.Timestamp): boolean {
  if (record.deleted) {
    return false;
  }

  if (record.attendance === 1 || record.attendance === -1) {
    return false;
  }

  // Calculate threshold: now - (length * 3) seconds
  const thresholdMillis = now.toMillis() - (record.length * 3 * 1000);
  const threshold = admin.firestore.Timestamp.fromMillis(thresholdMillis);

  return record.datetime.toMillis() >= threshold.toMillis();
}

/**
 * Determine chat status based on records
 * Returns 'active' if any record is active, otherwise 'archived'
 */
function determineChatStatus(records: YClientsRecord[]): ChatStatus {
  const now = admin.firestore.Timestamp.now();

  for (const record of records) {
    if (isRecordActive(record, now)) {
      return 'active';
    }
  }

  return 'archived';
}

/**
 * Find the nearest active record, or the last record if no active ones
 * Returns title and date for the chat
 */
function findRecordForChatInfo(records: YClientsRecord[]): RecordInfo | null {
  if (records.length === 0) {
    return null;
  }

  const now = admin.firestore.Timestamp.now();

  // Find active records
  const activeRecords = records.filter(record => isRecordActive(record, now));

  // If there are active records, find the nearest one by datetime
  if (activeRecords.length > 0) {
    const nearest = activeRecords.reduce((prev, curr) => {
      return curr.datetime.toMillis() < prev.datetime.toMillis() ? curr : prev;
    });

    return {
      title: nearest.serviceTitle,
      date: nearest.datetime.toMillis(),
    };
  }

  // No active records, return the last record (most recent by datetime)
  const lastRecord = records.reduce((prev, curr) => {
    return curr.datetime.toMillis() > prev.datetime.toMillis() ? curr : prev;
  });

  return {
    title: lastRecord.serviceTitle,
    date: lastRecord.datetime.toMillis(),
  };
}

/**
 * Map YClients IDs to User IDs
 * Tries to find users by ID first, then by phone as fallback
 */
async function mapYClientsUsersToUserIds(
  clientId: number,
  clientPhone: string,
  staffId: number,
  staffPhone: string | undefined
): Promise<string[]> {
  const userIds: string[] = [];

  // Map client
  let clientMapping = await firestoreService.getYClientsUserMappingByClientId(clientId);
  
  if (!clientMapping && clientPhone) {
    // Fallback to phone
    clientMapping = await firestoreService.getYClientsUserMappingByPhone(clientPhone);
  }

  if (clientMapping) {
    const clientUser = await firestoreService.getUserByYClientsId(clientMapping.id);
    if (clientUser) {
      userIds.push(clientUser.id);
    }
  }

  // Map staff
  let staffMapping = await firestoreService.getYClientsUserMappingByStaffId(staffId);
  
  if (!staffMapping && staffPhone) {
    // Fallback to phone
    staffMapping = await firestoreService.getYClientsUserMappingByPhone(staffPhone);
  }

  if (staffMapping) {
    const staffUser = await firestoreService.getUserByYClientsId(staffMapping.id);
    if (staffUser) {
      userIds.push(staffUser.id);
    }
  }

  return userIds;
}

/**
 * Process a single YClients chat mapping and sync it to /chats
 */
async function processYClientsChat(
  chatMapping: YClientsChatMapping,
  stats: ChatSyncStats
): Promise<void> {
  functions.logger.debug("Processing YClients chat", { chatId: chatMapping.id });

  try {
    // Get all records for this chat
    const records = await firestoreService.getYClientsRecordsByChat(chatMapping.id);

    if (records.length === 0) {
      functions.logger.debug("No records found for chat, skipping", { chatId: chatMapping.id });
      return;
    }

    // Determine chat status
    const status = determineChatStatus(records);

    // Find record for title and date
    const recordInfo = findRecordForChatInfo(records);
    
    const title = recordInfo?.title || null;
    const date = recordInfo?.date || null;

    // Map users
    const users = await mapYClientsUsersToUserIds(
      chatMapping.clientId,
      chatMapping.clientPhone,
      chatMapping.staffId,
      chatMapping.staffPhone
    );

    functions.logger.debug("Chat info determined", {
      chatId: chatMapping.id,
      status,
      title,
      usersCount: users.length,
      recordsCount: records.length
    });

    // Check if chat already exists
    const existingChat = await firestoreService.getChatByYClientsId(chatMapping.id);

    if (existingChat) {
      // Check if update is needed
      const needsUpdate =
        existingChat.status !== status ||
        existingChat.title !== title ||
        existingChat.date !== date ||
        JSON.stringify(existingChat.users.sort()) !== JSON.stringify(users.sort());

      if (needsUpdate) {
        await firestoreService.updateChat({
          id: existingChat.id,
          status,
          title,
          date,
          users,
        });

        stats.chatsUpdated++;
        functions.logger.debug("Chat updated", { chatId: existingChat.id });
      } else {
        functions.logger.debug("Chat unchanged, skipping update", { chatId: existingChat.id });
      }
    } else {
      // Create new chat
      const now = Date.now();
      await firestoreService.createChat({
        id: randomUUID(),
        yclientsId: chatMapping.id,
        users,
        title,
        date,
        status,
        createdAt: now,
        updatedAt: now,
      });

      stats.chatsCreated++;
      functions.logger.debug("Chat created", { yclientsId: chatMapping.id });
    }

    stats.chatsProcessed++;
  } catch (error: any) {
    functions.logger.error("Error processing YClients chat", {
      chatId: chatMapping.id,
      error: error.message,
      stack: error.stack
    });
    stats.errors++;
  }
}

/**
 * Scheduled function that syncs YClients chat mappings to /chats collection
 * Runs every 5 minute
 */
export const syncYClientsChatsToChats = functions.pubsub
  .schedule("every 5 minutes")
  .timeZone("UTC")
  .onRun(async (context) => {
    functions.logger.info("Starting scheduled YClients chats to chats sync");

    const stats: ChatSyncStats = {
      chatsProcessed: 0,
      chatsCreated: 0,
      chatsUpdated: 0,
      errors: 0,
    };

    try {
      // Get all YClients chat mappings
      const allChatMappings = await firestoreService.getAllYClientsChatMappings();
      functions.logger.info(`Found ${allChatMappings.length} YClients chat mappings`);

      // Process each chat mapping
      for (const chatMapping of allChatMappings) {
        await processYClientsChat(chatMapping, stats);
      }

      functions.logger.info("YClients chats to chats sync completed", stats);
    } catch (error: any) {
      functions.logger.error("Error in scheduled chats sync", {
        error: error.message,
        stack: error.stack
      });
      stats.errors++;
    }

    // Log final stats
    functions.logger.info("Chat sync statistics", stats);
  });
