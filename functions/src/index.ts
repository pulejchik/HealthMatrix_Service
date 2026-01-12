import * as functions from "firebase-functions";

export * from "./services";
export * from "./types";
export * from "./config";

export const health = functions.https.onRequest((request, response) => {
  const healthStatus = {
    status: "healthy",
    service: "HealthMatrix Service",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };

  response.status(200).json(healthStatus);
});
