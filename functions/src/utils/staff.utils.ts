import * as functions from "firebase-functions";
import { yclientsServiceChain, yclientsServiceEntity } from "../index";
import { Staff } from "../types/yclients.types";

/**
 * Fetch staff list from both yclientsServiceEntity and yclientsServiceChain,
 * merging and deduplicating by staff ID
 */
export async function fetchAllStaffFromBothServices(): Promise<Staff[]> {
  const [entityResult, chainResult] = await Promise.allSettled([
    yclientsServiceEntity.getStaffList(),
    yclientsServiceChain.getStaffList(),
  ]);

  const staffById = new Map<number, Staff>();

  if (entityResult.status === "fulfilled" && entityResult.value.success && entityResult.value.data) {
    for (const staff of entityResult.value.data) {
      staffById.set(staff.id, staff);
    }
  } else if (entityResult.status === "rejected") {
    functions.logger.warn("Failed to fetch staff list from entity service", {
      error: entityResult.reason?.message,
    });
  } else {
    functions.logger.warn("Entity service returned unexpected response", {
      success: entityResult.value.success,
      meta: entityResult.value.meta,
    });
  }

  if (chainResult.status === "fulfilled" && chainResult.value.success && chainResult.value.data) {
    for (const staff of chainResult.value.data) {
      staffById.set(staff.id, staff);
    }
  } else if (chainResult.status === "rejected") {
    functions.logger.warn("Failed to fetch staff list from chain service", {
      error: chainResult.reason?.message,
    });
  } else {
    functions.logger.warn("Chain service returned unexpected response", {
      success: chainResult.value.success,
      meta: chainResult.value.meta,
    });
  }

  if (staffById.size === 0) {
    throw new Error("Failed to fetch staff list from both services");
  }

  return Array.from(staffById.values());
}
