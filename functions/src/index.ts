import * as functions from "firebase-functions";
import { createYClientsService, YClientsService } from "./services/yclients.service";
import { createFirestoreService, FirestoreService } from "./services/firestore.service";
import { getYClientsConfig } from "./config/yclients.config";

export * from "./services";
export * from "./types";
export * from "./config";
export * from "./utils";

// ========== Service Providers ==========

export const yclientsConfigEntity = getYClientsConfig('companyEntity');
export const yclientsConfigChain = getYClientsConfig('companyChain');

export const yclientsServiceEntity: YClientsService = createYClientsService(yclientsConfigEntity);
export const yclientsServiceChain: YClientsService = createYClientsService(yclientsConfigChain);

export const firestoreService: FirestoreService = createFirestoreService();


export const health = functions.https.onRequest((request, response) => {
  const healthStatus = {
    status: "healthy",
    service: "HealthMatrix Service",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };

  response.status(200).json(healthStatus);
});

export { 
  sendConfirmationCode, 
  authClient, 
  authStaff, 
  syncChats, 
  syncYClientsRecordsScheduled,
  processPendingNotifications 
} from "./functions";
