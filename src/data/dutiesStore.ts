import { Duty, SoldierSummary } from "../types";
import { parseRawDuties, isCommandAppointedDuty } from "./rawDuties";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  where, 
  getDocs,
  writeBatch,
  serverTimestamp
} from "firebase/firestore";

// Map short element codes to full human-readable names for display
export const ELEMENT_MAP: Record<string, string> = {
  CT: "Concert Band (CT)",
  BL: "Blues (BL)",
  DR: "Downrange (DR)",
  ST: "Strings (ST)",
  CH: "Chorus (CH)",
  CM: "Ceremonial Band (CM)",
  SU: "Support (SU)",
  TSG: "Technical Support Group (TSG)",
  HT: "Herald Trumpets (HT)",
  "N/A": "Not Applicable",
};

export const RANK_LIMITS: Record<string, number> = {
  SGM: 7,
  CSM: 7,
  MSG: 6,
  SFC: 5,
  SSG: 4,
  SGT: 4, // Assume same or lower for SGT
  SPC: 4,
};

/**
 * Gets the maximum recommended tier aggregate for a given rank string.
 * SSG: 4, SFC: 5, MSG: 6, SGM: 7
 */
export function getMaxTierAggregate(rank: string): number | null {
  const normalized = rank.trim().toUpperCase();
  if (normalized.includes("SGM") || normalized.includes("SGM")) return 7;
  if (normalized.includes("CSM")) return 7;
  if (normalized.includes("MSG")) return 6;
  if (normalized.includes("SFC")) return 5;
  if (normalized.includes("SSG")) return 4;
  if (normalized.includes("SGT")) return 4;
  if (normalized.includes("SPC")) return 4;
  return null; // CIV or other ranks have no limit
}

/**
 * Load duties from localStorage, or initialize with parsed raw duties if empty.
 */
export function loadDuties(): Duty[] {
  try {
    const saved = localStorage.getItem("army_collateral_duties");
    if (saved) {
      const parsed: Duty[] = JSON.parse(saved);
      return parsed.map(duty => ({
        ...duty,
        isCommandAppointed: duty.isCommandAppointed ?? isCommandAppointedDuty(duty.category || "General", duty.jobTitle || "")
      }));
    }
  } catch (error) {
    console.error("Failed to load duties from local storage", error);
  }
  
  // If nothing saved or failed, parse raw dataset
  const parsed = parseRawDuties();
  saveDuties(parsed);
  return parsed;
}

/**
 * Save duties to localStorage and track the update timestamp
 */
export function saveDuties(duties: Duty[]): void {
  try {
    const timestamp = new Date().toISOString();
    localStorage.setItem("army_collateral_duties", JSON.stringify(duties));
    localStorage.setItem("army_collateral_duties_updated", timestamp);
  } catch (error) {
    console.error("Failed to save duties to local storage", error);
  }
}

/**
 * Helper to call the admin API with password from localStorage
 */
async function callAdminApi(endpoint: string, method: string, body?: any) {
  const password = localStorage.getItem("army_duty_admin_password");
  if (!password) throw new Error("Not logged in as admin");

  const response = await fetch(endpoint, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Password": password
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Firestore Sync: Add or Update a duty
 */
export async function syncDutyToFirestore(duty: Duty): Promise<void> {
  const path = `duties/${duty.id}`;
  try {
    await callAdminApi("/api/duties", "POST", duty);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Firestore Sync: Delete a duty
 */
export async function deleteDutyFromFirestore(id: string): Promise<void> {
  const path = `duties/${id}`;
  try {
    await callAdminApi(`/api/duties/${id}`, "DELETE");
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Firestore Sync: Bulk update for Soldier rank changes
 */
export async function syncSoldierRankToFirestore(lastName: string, newRank: string): Promise<void> {
  const path = 'duties';
  try {
    await callAdminApi("/api/duties/sync-rank", "POST", { lastName, newRank });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Firestore Sync: Rename Category
 */
export async function syncRenameCategoryToFirestore(oldName: string, newName: string): Promise<void> {
  const path = 'duties';
  try {
    await callAdminApi("/api/duties/rename-category", "POST", { oldName, newName });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Firestore Sync: Bulk add/update duties
 */
export async function batchSyncDutiesToFirestore(duties: Duty[]): Promise<void> {
  const path = 'duties';
  try {
    await callAdminApi("/api/duties/batch", "POST", { duties });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Retrieves the last updated timestamp from localStorage
 */
export function getLastUpdatedTime(): string | null {
  return localStorage.getItem("army_collateral_duties_updated");
}

/**
 * Computes individual soldier summaries from the active duties dataset.
 * Aggregates duties by Soldier's last name (excluding "VACANT" and empty names).
 */
export function calculateSoldierSummaries(duties: Duty[]): SoldierSummary[] {
  const soldierMap = new Map<string, Duty[]>();

  for (const duty of duties) {
    const name = duty.lastName.trim();
    if (!name || name.toUpperCase() === "VACANT") {
      continue;
    }

    if (!soldierMap.has(name)) {
      soldierMap.set(name, []);
    }
    soldierMap.get(name)!.push(duty);
  }

  const summaries: SoldierSummary[] = [];

  for (const [lastName, soldierDuties] of soldierMap.entries()) {
    // Find the first non-empty rank listed for this soldier
    const rankDuty = soldierDuties.find(d => d.rank.trim() !== "");
    const rank = rankDuty ? rankDuty.rank.trim() : "Unknown";

    // Calculate tier aggregate sum of their duties
    let tierAggregate = 0;
    for (const d of soldierDuties) {
      if (d.tierLevel !== null) {
        tierAggregate += d.tierLevel;
      }
    }

    const maxTierAggregate = getMaxTierAggregate(rank);
    const isOverloaded = maxTierAggregate !== null && tierAggregate > maxTierAggregate;

    summaries.push({
      lastName,
      rank,
      duties: soldierDuties,
      tierAggregate,
      maxTierAggregate,
      isOverloaded,
    });
  }

  // Sort alphabetically by last name
  return summaries.sort((a, b) => a.lastName.localeCompare(b.lastName));
}

/**
 * Renames a category across all duties.
 */
export function renameCategory(duties: Duty[], oldName: string, newName: string): Duty[] {
  const updated = duties.map(duty => {
    if (duty.category === oldName) {
      return { ...duty, category: newName };
    }
    return duty;
  });
  saveDuties(updated);
  return updated;
}

/**
 * Retrieves all unique categories present in the duties list.
 */
export function getUniqueCategories(duties: Duty[]): string[] {
  const categories = new Set<string>();
  for (const d of duties) {
    if (d.category) {
      categories.add(d.category);
    }
  }
  return Array.from(categories).sort();
}

/**
 * Retrieves all unique Element/Group codes present in the duties list.
 */
export function getUniqueElements(duties: Duty[]): string[] {
  const elements = new Set<string>();
  for (const d of duties) {
    if (d.elementOrGroup) {
      elements.add(d.elementOrGroup);
    }
  }
  return Array.from(elements).sort();
}

/**
 * Parses termEndDate strings into Date objects.
 * Supports standard M/D/YY and M/D/YYYY formats.
 */
export function parseTermEndDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;
  const cleanStr = dateStr.trim().toUpperCase();
  if (cleanStr === "" || cleanStr === "N/A" || cleanStr === "VACANT") {
    return null;
  }
  
  // Try to parse M/D/YY or M/D/YYYY
  const parts = cleanStr.split('/');
  if (parts.length === 3) {
    const month = parseInt(parts[0], 10) - 1;
    const day = parseInt(parts[1], 10);
    let year = parseInt(parts[2], 10);
    if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
      if (year < 100) {
        // Assume 2-digit years are in 2000s
        year += 2000;
      }
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d;
      }
    }
  }

  // Fallback to native Date parser
  const fallback = new Date(cleanStr);
  if (!isNaN(fallback.getTime())) {
    return fallback;
  }

  return null;
}

/**
 * Calculates whether a duty assignment is expired (past) or expiring soon (within 1 year).
 */
export function getTermExpirationStatus(
  termEndDateStr: string | undefined | null,
  lastName: string | undefined | null
): "past" | "warning" | "ok" | "none" {
  if (!lastName || lastName.toUpperCase() === "VACANT") {
    return "none";
  }
  if (!termEndDateStr) {
    return "none";
  }
  
  const expDate = parseTermEndDate(termEndDateStr);
  if (!expDate) {
    return "none";
  }

  const now = new Date();
  
  // Strip time parts to compare only dates
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());

  if (targetDate < today) {
    return "past";
  }

  // 1 year from today (365 days)
  const oneYearFromToday = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());
  if (targetDate <= oneYearFromToday) {
    return "warning";
  }

  return "ok";
}

