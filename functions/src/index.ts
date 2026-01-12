import * as functions from "firebase-functions";
import { createYClientsService, YClientsService } from "./services/yclients.service";
import { createFirestoreService, FirestoreService } from "./services/firestore.service";
import { getYClientsConfig } from "./config/yclients.config";

export * from "./services";
export * from "./types";
export * from "./config";

// ========== Service Providers ==========

export const yclientsConfig = getYClientsConfig();
export const yclientsService: YClientsService = createYClientsService(yclientsConfig);
export const firestoreService: FirestoreService = createFirestoreService();

export function getCompanyId(): number {
  const companyId = yclientsConfig.companyId;
  
  if (!companyId) {
    throw new Error("YCLIENTS_COMPANY_ID is not configured. Please set the environment variable.");
  }
  
  return companyId;
}

export const health = functions.https.onRequest((request, response) => {
  const healthStatus = {
    status: "healthy",
    service: "HealthMatrix Service",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };

  response.status(200).json(healthStatus);
});

export { sendConfirmationCode, authClient, authStaff } from "./functions";
