import * as functions from "firebase-functions";
import { createYClientsService, YClientsService } from "./services/yclients.service";
import { createFirestoreService, FirestoreService } from "./services/firestore.service";
import { getYClientsConfig } from "./config/yclients.config";

export * from "./services";
export * from "./types";
export * from "./config";

const yclientsConfig = getYClientsConfig();
export const yclientsService: YClientsService = createYClientsService(yclientsConfig);

export const firestoreService: FirestoreService = createFirestoreService();

export function getCompanyId(): number {
  const companyId = yclientsConfig.companyId;
  
  if (!companyId) {
    throw new Error("YCLIENTS_COMPANY_ID is not configured. Please set the environment variable.");
  }
  
  return companyId;
}

interface ErrorResponse {
  success: false;
  error: string;
  errorCode: number;
  details?: any;
}

export function handleFunctionError(error: any, response: functions.Response): void {
  functions.logger.error("Function error", {
    error: error.message,
    stack: error.stack,
    status: error.status,
    errorCode: error.errorCode,
    data: error.data,
  });

  const statusCode = error.status || 500;
  const errorCode = error.errorCode || statusCode;
  const errorMessage = error.message || "An unexpected error occurred";

  const errorResponse: ErrorResponse = {
    success: false,
    error: errorMessage,
    errorCode: errorCode,
    details: error.data || undefined,
  };

  response.status(statusCode).json(errorResponse);
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

/**
 * Send confirmation code to phone number via YClients
 * 
 * Request body:
 * {
 *   "phoneNumber": "+79001234567"
 * }
 * 
 * Response (success):
 * {
 *   "success": true,
 *   "message": "Confirmation code sent successfully"
 * }
 * 
 * Response (error):
 * {
 *   "success": false,
 *   "error": "Error message",
 *   "errorCode": 400,
 *   "details": {...}
 * }
 */
export const sendConfirmationCode = functions.https.onRequest(async (request, response) => {
  // CORS headers
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.set("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight OPTIONS request
  if (request.method === "OPTIONS") {
    response.status(204).send("");
    return;
  }

  // Only allow POST requests
  if (request.method !== "POST") {
    response.status(405).json({
      success: false,
      error: "Method not allowed. Use POST.",
      errorCode: 405,
    });
    return;
  }

  try {
    // Validate request body
    const { phoneNumber } = request.body;

    if (!phoneNumber) {
      response.status(400).json({
        success: false,
        error: "Missing required field: phoneNumber",
        errorCode: 400,
      });
      return;
    }

    // Validate phone number format (basic validation)
    if (typeof phoneNumber !== "string" || phoneNumber.trim().length === 0) {
      response.status(400).json({
        success: false,
        error: "Invalid phoneNumber format",
        errorCode: 400,
      });
      return;
    }

    // Get company ID (validates it's configured)
    const companyId = getCompanyId();

    // Send SMS code via YClients
    functions.logger.info(`Sending confirmation code to: ${phoneNumber}`);
    
    const result = await yclientsService.sendSmsCode(companyId, {
      phone: phoneNumber,
    });

    functions.logger.info("Confirmation code sent successfully", { result });

    // Return success response
    response.status(200).json({
      success: true,
      message: result.meta?.message || "Confirmation code sent successfully",
    });
  } catch (error: any) {
    handleFunctionError(error, response);
  }
});
