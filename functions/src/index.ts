import * as functions from "firebase-functions";

/**
 * Health check endpoint
 * Returns the service status and timestamp
 */
export const health = functions.https.onRequest((request, response) => {
  const healthStatus = {
    status: "healthy",
    service: "HealthMatrix Service",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };

  response.status(200).json(healthStatus);
});
