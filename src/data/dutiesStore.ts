import { Duty, SoldierSummary, UpdateRequest } from "../types";
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
    localStorage.setItem("army_collateral_duties", JSON.stringify(duties));
  } catch (error) {
    console.error("Failed to save duties to local storage", error);
  }
}

/**
 * Firestore Sync: Add or Update a duty
 */
export async function syncDutyToFirestore(duty: Duty): Promise<void> {
  const path = `duties/${duty.id}`;
  try {
    await setDoc(doc(db, "duties", duty.id), {
      ...duty,
      admin_secret: "DUTY_TRACKER_SECRET_2024",
      updatedAt: new Date().toISOString()
    });
  } catch (fsError) {
    handleFirestoreError(fsError, OperationType.WRITE, path);
  }
}

/**
 * Firestore Sync: Delete a duty
 */
export async function deleteDutyFromFirestore(id: string): Promise<void> {
  const path = `duties/${id}`;
  try {
    await deleteDoc(doc(db, "duties", id));
  } catch (fsError) {
    handleFirestoreError(fsError, OperationType.DELETE, path);
  }
}

/**
 * Firestore Sync: Bulk update for Soldier rank changes
 */
export async function syncSoldierRankToFirestore(lastName: string, newRank: string): Promise<void> {
  const path = 'duties';
  try {
    const q = query(collection(db, "duties"), where("lastName", "==", lastName));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    const updatedAt = new Date().toISOString();
    snapshot.forEach((d) => {
      batch.update(d.ref, { 
        rank: newRank, 
        admin_secret: "DUTY_TRACKER_SECRET_2024",
        updatedAt 
      });
    });
    await batch.commit();
  } catch (fsError) {
    handleFirestoreError(fsError, OperationType.WRITE, path);
  }
}

/**
 * Firestore Sync: Rename Category
 */
export async function syncRenameCategoryToFirestore(oldName: string, newName: string): Promise<void> {
  const path = 'duties';
  try {
    const q = query(collection(db, "duties"), where("category", "==", oldName));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    const updatedAt = new Date().toISOString();
    snapshot.forEach((d) => {
      batch.update(d.ref, { 
        category: newName, 
        admin_secret: "DUTY_TRACKER_SECRET_2024",
        updatedAt 
      });
    });
    await batch.commit();
  } catch (fsError) {
    handleFirestoreError(fsError, OperationType.WRITE, path);
  }
}

/**
 * Firestore Sync: Delete Category (Deletes all duties in that category)
 */
export async function syncDeleteCategoryToFirestore(categoryName: string): Promise<void> {
  const path = 'duties';
  try {
    const q = query(collection(db, "duties"), where("category", "==", categoryName));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.forEach((d) => {
      batch.delete(d.ref);
    });
    await batch.commit();
  } catch (fsError) {
    handleFirestoreError(fsError, OperationType.DELETE, path);
  }
}

/**
 * Firestore Sync: Bulk add/update duties
 */
export async function batchSyncDutiesToFirestore(duties: Duty[]): Promise<void> {
  const path = 'duties';
  try {
    const batch = writeBatch(db);
    const updatedAt = new Date().toISOString();
    duties.forEach((duty) => {
      const docRef = doc(db, "duties", duty.id);
      batch.set(docRef, { 
        ...duty, 
        admin_secret: "DUTY_TRACKER_SECRET_2024",
        updatedAt 
      }, { merge: true });
    });
    await batch.commit();
  } catch (fsError) {
    handleFirestoreError(fsError, OperationType.WRITE, path);
  }
}

/**
 * Retrieves the last updated timestamp from localStorage
 */
export function getLastUpdatedTime(duties: Duty[]): string | null {
  let latestTime: string | null = null;
  for (const duty of duties) {
    if (duty.updatedAt) {
      if (!latestTime || duty.updatedAt > latestTime) {
        latestTime = duty.updatedAt;
      }
    }
  }
  return latestTime;
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

/**
 * Submit an update request for a broadening position.
 */
export async function submitUpdateRequest(reqData: Omit<UpdateRequest, "id" | "status" | "createdAt">): Promise<void> {
  const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const path = `update_requests/${id}`;
  const requestObj: UpdateRequest = {
    ...reqData,
    id,
    status: "pending",
    createdAt: new Date().toISOString()
  };
  try {
    await setDoc(doc(db, "update_requests", id), requestObj);
  } catch (fsError) {
    handleFirestoreError(fsError, OperationType.WRITE, path);
  }
}

/**
 * Reject/update request status.
 */
export async function updateRequestStatus(id: string, status: "approved" | "rejected"): Promise<void> {
  const path = `update_requests/${id}`;
  try {
    await updateDoc(doc(db, "update_requests", id), {
      status,
      admin_secret: "DUTY_TRACKER_SECRET_2024",
      updatedAt: new Date().toISOString()
    });
  } catch (fsError) {
    handleFirestoreError(fsError, OperationType.WRITE, path);
  }
}

/**
 * Delete an update request document.
 */
export async function deleteUpdateRequest(id: string): Promise<void> {
  const path = `update_requests/${id}`;
  try {
    await deleteDoc(doc(db, "update_requests", id));
  } catch (fsError) {
    handleFirestoreError(fsError, OperationType.DELETE, path);
  }
}

/**
 * Approve update request: updates request status and original duty document atomically.
 */
export async function approveUpdateRequest(req: UpdateRequest): Promise<void> {
  const batch = writeBatch(db);
  const reqRef = doc(db, "update_requests", req.id);
  const dutyRef = doc(db, "duties", req.dutyId);
  const updatedAt = new Date().toISOString();

  batch.update(reqRef, {
    status: "approved",
    admin_secret: "DUTY_TRACKER_SECRET_2024",
    updatedAt
  });

  batch.update(dutyRef, {
    lastName: req.requestedLastName,
    rank: req.requestedRank,
    dateStarted: req.requestedDateStarted,
    scopeOfResponsibilities: req.requestedScopeOfResponsibilities,
    admin_secret: "DUTY_TRACKER_SECRET_2024",
    updatedAt
  });

  try {
    await batch.commit();

    if (req.requestedLastName && req.requestedLastName.toUpperCase() !== "VACANT") {
      await syncSoldierRankToFirestore(req.requestedLastName, req.requestedRank);
    }
  } catch (fsError) {
    handleFirestoreError(fsError, OperationType.WRITE, `approve_request/${req.id}`);
  }
}

/**
 * Update the status of a vacancy draft.
 */
export async function updateVacancyDraftStatus(id: string, status: "pending" | "reviewed" | "approved" | "rejected" | "filled"): Promise<void> {
  const path = `vacancy_drafts/${id}`;
  try {
    await updateDoc(doc(db, "vacancy_drafts", id), {
      status,
      admin_secret: "DUTY_TRACKER_SECRET_2024",
      updatedAt: new Date().toISOString()
    });
  } catch (fsError) {
    handleFirestoreError(fsError, OperationType.WRITE, path);
  }
}

/**
 * Update admin notes for a vacancy draft.
 */
export async function updateVacancyDraftAdminNotes(id: string, adminNotes: string): Promise<void> {
  const path = `vacancy_drafts/${id}`;
  try {
    await updateDoc(doc(db, "vacancy_drafts", id), {
      adminNotes,
      admin_secret: "DUTY_TRACKER_SECRET_2024",
      updatedAt: new Date().toISOString()
    });
  } catch (fsError) {
    handleFirestoreError(fsError, OperationType.WRITE, path);
  }
}

/**
 * Delete a vacancy draft.
 */
export async function deleteVacancyDraft(id: string): Promise<void> {
  const path = `vacancy_drafts/${id}`;
  try {
    await deleteDoc(doc(db, "vacancy_drafts", id));
  } catch (fsError) {
    handleFirestoreError(fsError, OperationType.WRITE, path);
  }
}



