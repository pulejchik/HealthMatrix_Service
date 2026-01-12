import * as functions from "firebase-functions";
import { firestoreService, getCompanyId, YClientsChatMapping, yclientsService } from "../index";
import { handleFunctionError } from "./auth.functions";
import { YRecord } from "../types/yclients.types";
import { ChatStatus } from "../types/firestore.types";

interface SyncStats {
  recordsProcessed: number;
  chatsCreated: number;
  chatsUpdated: number;
}

interface ChatParticipants {
  userIds: string[];
}

function setCorsHeaders(response: functions.Response): void {
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.set("Access-Control-Allow-Headers", "Content-Type");
}

function validatePostMethod(request: functions.Request, response: functions.Response): boolean {
  if (request.method === "OPTIONS") {
    response.status(204).send("");
    return false;
  }

  if (request.method !== "POST") {
    response.status(405).json({
      success: false,
      error: "Method not allowed. Use POST.",
      errorCode: 405,
    });
    return false;
  }

  return true;
}

function getChatStatusFromRecord(record: YRecord): ChatStatus {
  return record.attendance === 1 ? "archived" : "active";
}

function getChatTitleFromRecord(record: YRecord): string | null {
  return record.services.length > 0
    ? record.services[0].title
    : null;
}

async function loadChatParticipants(record: YRecord): Promise<ChatParticipants> {
  const userIds: string[] = [];

  if (record.staff_id) {
    const staffMapping = await firestoreService.getYClientsUserMappingByStaffId(record.staff_id);
    if (staffMapping) {
      const staffUser = await firestoreService.getUserByYClientsId(staffMapping.id);
      if (staffUser) {
        userIds.push(staffUser.id);
      }
    }
  }

  if (record.client?.id) {
    const clientMapping = await firestoreService.getYClientsUserMappingByClientId(record.client.id);
    if (clientMapping) {
      const clientUser = await firestoreService.getUserByYClientsId(clientMapping.id);
      if (clientUser) {
        userIds.push(clientUser.id);
      }
    }
  }

  return { userIds };
}


async function updateExistingChat(
  record: YRecord,
  chatMapping: YClientsChatMapping,
  chatStatus: ChatStatus,
  chatTitle: string | null,
): Promise<boolean> {
  functions.logger.info("Chat mapping exists, updating", { mappingId: chatMapping?.id });

  const existingChat = await firestoreService.getChatByYClientsId(chatMapping.id);
  if (existingChat) {
    await firestoreService.updateChat({
      id: existingChat.id,
      title: chatTitle,
      status: chatStatus,
    });
    functions.logger.info("Chat updated", { chatId: existingChat.id });
    return true;
  } else {
    functions.logger.warn("Chat not found for existing mapping", {
      mappingId: chatMapping.id,
      recordId: record.id
    });
    return false;
  }
}

async function createNewChat(
  record: YRecord,
  chatTitle: string | null,
  chatUserIds: string[]
): Promise<boolean> {
  if (!record.client) {
    functions.logger.warn("Skipping record without client", { recordId: record.id });
    return false;
  }

  functions.logger.info("Creating new chat mapping and chat");

  const chatMapping = await firestoreService.createYClientsChatMapping({
    clientId: record.client.id,
    staffId: record.staff_id,
    recordId: record.id,
  });
  functions.logger.info("Chat mapping created", { mappingId: chatMapping.id });

  const now = Date.now();
  const newChat = await firestoreService.createChat({
    yclientsId: chatMapping.id,
    users: chatUserIds,
    title: chatTitle,
    status: "new",
    createdAt: now,
    updatedAt: now,
  });
  functions.logger.info("Chat created", { chatId: newChat.id });

  return true;
}

async function processRecord(record: YRecord, stats: SyncStats): Promise<void> {
  functions.logger.info(`Processing record ${ record.id }`, {
    recordId: record.id,
    staffId: record.staff_id,
    clientId: record.client?.id,
  });

  const chatMapping = await firestoreService.getYClientsChatMappingByRecordId(record.id);
  const chatStatus = getChatStatusFromRecord(record);
  const chatTitle = getChatTitleFromRecord(record);

  const { userIds: chatUserIds } = await loadChatParticipants(record);
  functions.logger.info(`Found ${ chatUserIds.length } chat participants`, { chatUserIds });

  // Update or create chat
  if (chatMapping) {
    const updated = await updateExistingChat(
      record,
      chatMapping,
      chatStatus,
      chatTitle,
    );
    if (updated) {
      stats.chatsUpdated++;
    }
  } else {
    const created = await createNewChat(record, chatTitle, chatUserIds);
    if (created) {
      stats.chatsCreated++;
    }
  }

  stats.recordsProcessed++;
}


function validateSyncRequest(
  body: any,
  response: functions.Response
): { valid: boolean; userId?: string } {
  const { userId } = body;

  if (!userId) {
    response.status(400).json({
      success: false,
      error: "Missing required field: userId",
      errorCode: 400,
    });
    return { valid: false };
  }

  if (typeof userId !== "string") {
    response.status(400).json({
      success: false,
      error: "Invalid field type. userId must be a string",
      errorCode: 400,
    });
    return { valid: false };
  }

  return { valid: true, userId };
}

// ========== Main Function ==========

/**
 * Synchronize YClients records to chats
 *
 * Request body:
 * {
 *   "userId": "firebase-user-id"
 * }
 *
 * Response (success):
 * {
 *   "success": true,
 *   "message": "Chats synchronized successfully",
 *   "stats": {
 *     "recordsProcessed": 10,
 *     "chatsCreated": 5,
 *     "chatsUpdated": 5
 *   }
 * }
 *
 * Response (error):
 * {
 *   "success": false,
 *   "error": "Error message",
 *   "errorCode": 400
 * }
 */
export const syncChats = functions.https.onRequest(async (request, response) => {
  setCorsHeaders(response);

  if (!validatePostMethod(request, response)) {
    return;
  }

  try {
    const validation = validateSyncRequest(request.body, response);
    if (!validation.valid || !validation.userId) {
      return;
    }

    const userId = validation.userId;
    functions.logger.info("Starting chat synchronization", { userId });

    const user = await firestoreService.getUser(userId);
    if (!user) {
      response.status(404).json({
        success: false,
        error: "User not found",
        errorCode: 404,
      });
      return;
    }

    functions.logger.info("User found", { userId, yclientsId: user.yclientsId });

    const currentUserMapping = await firestoreService.getYClientsUserMapping(user.yclientsId);
    if (!currentUserMapping) {
      response.status(404).json({
        success: false,
        error: "YClients user mapping not found",
        errorCode: 404,
      });
      return;
    }

    functions.logger.info("User mapping found", {
      staffId: currentUserMapping.staffId,
      clientId: currentUserMapping.clientId
    });

    const companyId = getCompanyId();
    const recordParams = currentUserMapping.staffId ? { staff_id: currentUserMapping.staffId } : { client_id: currentUserMapping.clientId };
    functions.logger.info("Loading records", recordParams);

    const recordsResult = await yclientsService.getRecords(
      companyId,
      recordParams,
      { userToken: currentUserMapping.userToken }
    );

    if (!recordsResult.success || !recordsResult.data) {
      functions.logger.error("Failed to load records", { recordsResult });
      response.status(500).json({
        success: false,
        error: "Failed to load records from YClients",
        errorCode: 500,
      });
      return;
    }

    const records = recordsResult.data;
    functions.logger.info(`Loaded ${ records.length } records`);

    const stats: SyncStats = {
      recordsProcessed: 0,
      chatsCreated: 0,
      chatsUpdated: 0,
    };
    for (const record of records) {
      try {
        await processRecord(record, stats);
      } catch (error: any) {
        functions.logger.error(`Error processing record ${ record.id }`, {
          error: error.message,
          stack: error.stack,
          recordId: record.id,
        });
      }
    }

    functions.logger.info("Chat synchronization completed", stats);

    // Return success response
    response.status(200).json({
      success: true,
      message: "Chats synchronized successfully",
      stats,
    });
  } catch (error: any) {
    handleFunctionError(error, response);
  }
});
