import * as functions from "firebase-functions";
import { firestoreService, YClientsChatMapping, yclientsServiceChain } from "../index";
import { YRecord } from "../types";
import { dateStringToTimestamp } from "../utils";


// ========== Scheduled YClients Sync Function ==========

interface ScheduledSyncStats {
  totalRecordsProcessed: number;
  chatsCreated: number;
  chatsUpdated: number;
  recordsCreated: number;
  recordsUpdated: number;
  errors: number;
}

interface StaffClientPair {
  staffId: number;
  staffPhone?: string;
  clientId: number;
  clientPhone: string;
}

/**
 * Get or create a chat mapping for a staff-client pair
 * Uses OR query: staffId = X AND (clientId = Y OR clientPhone = Z)
 */
async function getOrCreateChatMapping(
  pair: StaffClientPair,
  stats: ScheduledSyncStats
): Promise<YClientsChatMapping> {
  // Try to find chat mapping using optimized OR query
  const chatMapping = await firestoreService.getYClientsChatMappingByStaffAndClientOrPhone(
    pair.staffId,
    pair.clientId,
    pair.clientPhone
  );

  if (chatMapping) {
    functions.logger.debug("Found existing chat mapping", {
      chatId: chatMapping.id,
      staffId: pair.staffId,
      clientId: pair.clientId,
      clientPhone: pair.clientPhone
    });
    return chatMapping;
  }

  // Create new chat mapping
  functions.logger.info("Creating new chat mapping", {
    staffId: pair.staffId,
    clientId: pair.clientId,
    clientPhone: pair.clientPhone
  });

  const newChatMapping = await firestoreService.createYClientsChatMapping({
    staffId: pair.staffId,
    staffPhone: pair.staffPhone,
    clientId: pair.clientId,
    clientPhone: pair.clientPhone,
  });

  stats.chatsCreated++;
  functions.logger.info("Chat mapping created", { chatId: newChatMapping.id });

  return newChatMapping;
}

/**
 * Create or update a record in the chat's records subcollection
 */
async function syncRecordToChat(
  chatId: string,
  record: YRecord,
  stats: ScheduledSyncStats
): Promise<void> {
  const recordId = String(record.id);
  
  const recordData = {
    id: recordId,
    recordId: record.id,
    deleted: record.deleted,
    serviceTitle: record.services.length > 0 ? record.services[0].title : null,
    serviceId: record.services.length > 0 ? record.services[0].id : null,
    datetime: dateStringToTimestamp(record.datetime),
    attendance: record.attendance,
    length: record.length,
    payment_status: record.payment_status,
    bookform_id: record.bookform_id,
  };

  // Check if record already exists
  const existingRecord = await firestoreService.getYClientsRecord(chatId, recordId);

  if (existingRecord) {
    // Check if update is needed (compare timestamps using isEqual)
    const needsUpdate = 
      existingRecord.deleted !== recordData.deleted ||
      existingRecord.serviceTitle !== recordData.serviceTitle ||
      existingRecord.serviceId !== recordData.serviceId ||
      !existingRecord.datetime.isEqual(recordData.datetime) ||
      existingRecord.attendance !== recordData.attendance ||
      existingRecord.length !== recordData.length ||
      existingRecord.payment_status !== recordData.payment_status ||
      existingRecord.bookform_id !== recordData.bookform_id;

    if (needsUpdate) {
      await firestoreService.setYClientsRecord(chatId, recordData);
      stats.recordsUpdated++;
      functions.logger.debug("Record updated", { chatId, recordId });
    } else {
      functions.logger.debug("Record unchanged, skipping", { chatId, recordId });
    }
  } else {
    // Create new record
    await firestoreService.createYClientsRecord(chatId, recordData);
    stats.recordsCreated++;
    functions.logger.debug("Record created", { chatId, recordId });
  }
}

/**
 * Fetch all records for a staff member with pagination
 */
async function fetchAllRecordsForStaff(
  staffId: number
): Promise<YRecord[]> {
  const allRecords: YRecord[] = [];
  let currentPage = 1;
  const pageSize = 100; // Max records per page
  let hasMorePages = true;

  while (hasMorePages) {
    functions.logger.debug(`Fetching page ${currentPage} for staff ${staffId}`);

    const recordsResponse = await yclientsServiceChain.getRecords({
      staff_id: staffId,
      with_deleted: true,
      page: currentPage,
      count: pageSize,
    });

    if (!recordsResponse.success || !recordsResponse.data) {
      functions.logger.error("Failed to fetch records page", {
        staffId,
        page: currentPage,
        response: recordsResponse
      });
      throw new Error(`Failed to fetch records for staff ${staffId}`);
    }

    const pageRecords = recordsResponse.data;
    allRecords.push(...pageRecords);

    functions.logger.debug(`Fetched ${pageRecords.length} records from page ${currentPage}`);

    // Check if there are more pages
    const totalCount = recordsResponse.meta?.total_count || 0;
    const fetchedSoFar = currentPage * pageSize;
    hasMorePages = fetchedSoFar < totalCount;

    currentPage++;
  }

  return allRecords;
}

/**
 * Process all records for a staff member
 */
async function processStaffRecords(
  staffId: number,
  staffPhone: string | undefined,
  stats: ScheduledSyncStats
): Promise<void> {
  functions.logger.info("Processing records for staff", { staffId });

  try {
    // Fetch all records for this staff member with pagination
    const records = await fetchAllRecordsForStaff(staffId);
    functions.logger.info(`Found ${records.length} total records for staff ${staffId}`);

    // Group records by client
    const recordsByClient = new Map<number, YRecord[]>();
    
    for (const record of records) {
      if (!record.client) {
        functions.logger.debug("Skipping record without client", { recordId: record.id });
        continue;
      }

      const clientId = record.client.id;
      if (!recordsByClient.has(clientId)) {
        recordsByClient.set(clientId, []);
      }
      recordsByClient.get(clientId)!.push(record);
    }

    // Process each staff-client pair
    for (const [clientId, clientRecords] of recordsByClient.entries()) {
      try {
        const firstRecord = clientRecords[0];
        const clientPhone = firstRecord.client!.phone;

        const pair: StaffClientPair = {
          staffId,
          staffPhone,
          clientId,
          clientPhone,
        };

        // Get or create chat mapping
        const chatMapping = await getOrCreateChatMapping(pair, stats);

        // Sync all records for this chat
        for (const record of clientRecords) {
          try {
            await syncRecordToChat(chatMapping.id, record, stats);
            stats.totalRecordsProcessed++;
          } catch (error: any) {
            functions.logger.error("Error syncing record", {
              chatId: chatMapping.id,
              recordId: record.id,
              error: error.message,
              stack: error.stack
            });
            stats.errors++;
          }
        }
      } catch (error: any) {
        functions.logger.error("Error processing client records", {
          staffId,
          clientId,
          error: error.message,
          stack: error.stack
        });
        stats.errors++;
      }
    }
  } catch (error: any) {
    functions.logger.error("Error processing staff", {
      staffId,
      error: error.message,
      stack: error.stack
    });
    stats.errors++;
  }
}

/**
 * Scheduled function that syncs YClients records every minute
 * Fetches all staff members and their records, then creates/updates chats and records
 */
export const syncYClientsRecordsScheduled = functions.pubsub
  .schedule("every 1 minutes")
  .timeZone("UTC")
  .onRun(async (context) => {
    functions.logger.info("Starting scheduled YClients records sync");

    const stats: ScheduledSyncStats = {
      totalRecordsProcessed: 0,
      chatsCreated: 0,
      chatsUpdated: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      errors: 0,
    };

    try {
      // Fetch all staff members
      const staffResponse = await yclientsServiceChain.getStaffList();

      if (!staffResponse.success || !staffResponse.data) {
        functions.logger.error("Failed to fetch staff list", { response: staffResponse });
        return;
      }

      const allStaff = staffResponse.data;
      functions.logger.info(`Found ${allStaff.length} staff members`);

      // Process each staff member
      for (const staff of allStaff) {
        // Skip fired or deleted staff
        if (staff.is_fired || staff.is_deleted) {
          functions.logger.debug("Skipping fired/deleted staff", {
            staffId: staff.id,
            name: staff.name
          });
          continue;
        }

        const staffPhone = staff.user?.phone;
        await processStaffRecords(staff.id, staffPhone, stats);
      }

      functions.logger.info("Scheduled YClients sync completed", stats);
    } catch (error: any) {
      functions.logger.error("Error in scheduled sync", {
        error: error.message,
        stack: error.stack
      });
      stats.errors++;
    }

    // Log final stats
    functions.logger.info("Sync statistics", stats);
  });
