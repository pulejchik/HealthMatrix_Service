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
 * Helper to set CORS headers and handle OPTIONS requests
 */
function setCorsHeaders(response: functions.Response): void {
  response.set("Access-Control-Allow-Origin", "*");
  response.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.set("Access-Control-Allow-Headers", "Content-Type");
}

/**
 * Helper to check if request method is POST
 */
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
  setCorsHeaders(response);
  
  if (!validatePostMethod(request, response)) {
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

/**
 * Authenticate client with YClients using phone number and SMS code
 * 
 * Request body:
 * {
 *   "phoneNumber": "375255045466",
 *   "code": "7009"
 * }
 * 
 * Response (success):
 * {
 *   "yclientsId": "123456",
 *   "userToken": "abc123..."
 * }
 * 
 * Response (error):
 * {
 *   "success": false,
 *   "error": "Error message",
 *   "errorCode": 400
 * }
 */
export const authClient = functions.https.onRequest(async (request, response) => {
  setCorsHeaders(response);
  
  if (!validatePostMethod(request, response)) {
    return;
  }

  try {
    // Validate request body
    const { phoneNumber, code } = request.body;

    if (!phoneNumber || !code) {
      response.status(400).json({
        success: false,
        error: "Missing required fields: phoneNumber and code",
        errorCode: 400,
      });
      return;
    }

    // Validate input types
    if (typeof phoneNumber !== "string" || typeof code !== "string") {
      response.status(400).json({
        success: false,
        error: "Invalid field types. phoneNumber and code must be strings",
        errorCode: 400,
      });
      return;
    }

    // Authenticate user with YClients
    functions.logger.info(`Authenticating client: ${phoneNumber}`);
    
    const authResult = await yclientsService.authenticateUserByCode({
      phone: phoneNumber,
      code: code,
    });

    if (!authResult.success || !authResult.data) {
      functions.logger.error("Authentication failed", { authResult });
      response.status(401).json({
        success: false,
        error: "Authentication failed. Invalid phone number or code.",
        errorCode: 401,
      });
      return;
    }

    const userData = authResult.data;
    const clientId = userData.id;
    const userToken = userData.user_token;

    functions.logger.info("Client authenticated successfully", { clientId, phone: phoneNumber });

    // Check if user mapping already exists
    let userMapping = await firestoreService.getYClientsUserMappingByClientId(clientId);

    if (!userMapping) {
      // Create new user mapping
      functions.logger.info("Creating new user mapping for client", { clientId });
      
      userMapping = await firestoreService.createYClientsUserMapping({
        clientId: clientId,
        phone: phoneNumber,
        userToken: userToken,
        staffId: null, // Clients are not staff members
      });

      functions.logger.info("User mapping created", { mappingId: userMapping.id });
    } else {
      // Update existing mapping with latest token
      functions.logger.info("Updating existing user mapping", { mappingId: userMapping.id });
      
      userMapping = await firestoreService.updateYClientsUserMapping({
        id: userMapping.id,
        userToken: userToken,
        phone: phoneNumber,
      });
    }

    // Return success response
    response.status(200).json({
      yclientsId: clientId.toString(),
      userToken: userToken,
    });
  } catch (error: any) {
    handleFunctionError(error, response);
  }
});

/**
 * Authenticate staff member with YClients using login and password
 * 
 * Request body:
 * {
 *   "login": "375255045466",
 *   "password": "mabFad-duvwe4"
 * }
 * 
 * Response (success):
 * {
 *   "yclientsId": "123456",
 *   "userToken": "abc123..."
 * }
 * 
 * Response (error):
 * {
 *   "success": false,
 *   "error": "Error message",
 *   "errorCode": 400
 * }
 */
export const authStaff = functions.https.onRequest(async (request, response) => {
  setCorsHeaders(response);
  
  if (!validatePostMethod(request, response)) {
    return;
  }

  try {
    // Validate request body
    const { login, password } = request.body;

    if (!login || !password) {
      response.status(400).json({
        success: false,
        error: "Missing required fields: login and password",
        errorCode: 400,
      });
      return;
    }

    // Validate input types
    if (typeof login !== "string" || typeof password !== "string") {
      response.status(400).json({
        success: false,
        error: "Invalid field types. login and password must be strings",
        errorCode: 400,
      });
      return;
    }

    // Get company ID
    const companyId = getCompanyId();

    // Authenticate staff with YClients
    functions.logger.info(`Authenticating staff member: ${login}`);
    
    const authResult = await yclientsService.authenticateUserByPassword({
      login: login,
      password: password,
    });

    if (!authResult.success || !authResult.data) {
      functions.logger.error("Authentication failed", { authResult });
      response.status(401).json({
        success: false,
        error: "Authentication failed. Invalid login or password.",
        errorCode: 401,
      });
      return;
    }

    const userData = authResult.data;
    const userId = userData.id;
    const userToken = userData.user_token;

    functions.logger.info("Staff authenticated successfully", { userId, login });

    // Load staff list to find staffId (using default user token for authorization)
    functions.logger.info("Loading staff list to find staff record");
    const staffListResult = await yclientsService.getStaffList(
      companyId,
      undefined,
      { userToken: yclientsConfig.defaultUserToken }
    );

    if (!staffListResult.success || !staffListResult.data) {
      functions.logger.error("Failed to load staff list", { staffListResult });
      response.status(500).json({
        success: false,
        error: "Failed to load staff information",
        errorCode: 500,
      });
      return;
    }

    // Find staff member by user_id or phone
    const staffMember = staffListResult.data.find(staff => 
      staff.user_id === userId || staff.user?.phone === login
    );

    if (!staffMember) {
      functions.logger.error("Staff member not found in staff list", { userId, login });
      response.status(403).json({
        success: false,
        error: "User authenticated but not found in staff list. Access denied.",
        errorCode: 403,
      });
      return;
    }
    
    const staffId = staffMember.id;
    functions.logger.info("Staff member found in staff list", { staffId, userId });

    // Check if user mapping already exists
    let userMapping = await firestoreService.getYClientsUserMappingByClientId(userId);

    if (!userMapping) {
      // Create new user mapping
      functions.logger.info("Creating new user mapping for staff", { userId, staffId });
      
      userMapping = await firestoreService.createYClientsUserMapping({
        clientId: userId,
        phone: login,
        userToken: userToken,
        staffId: staffId,
      });

      functions.logger.info("User mapping created", { mappingId: userMapping.id });
    } else {
      // Update existing mapping with latest token and staffId
      functions.logger.info("Updating existing user mapping", { mappingId: userMapping.id });
      
      userMapping = await firestoreService.updateYClientsUserMapping({
        id: userMapping.id,
        userToken: userToken,
        phone: login,
        staffId: staffId,
      });
    }

    // Return success response
    response.status(200).json({
      yclientsId: userId.toString(),
      userToken: userToken,
    });
  } catch (error: any) {
    handleFunctionError(error, response);
  }
});
