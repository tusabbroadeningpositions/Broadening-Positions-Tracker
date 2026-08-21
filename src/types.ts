export interface Duty {
  id: string;
  category: string;
  jobTitle: string;
  lastName: string;
  rank: string;
  dateStarted: string;
  termLength: string;
  termEndDate: string;
  elementOrGroup: string;
  tierLevel: number | null; // 1, 2, 3, 4, or null for N/A or empty
  specialized: boolean; // true if specialized with no term limit, false otherwise
  dutyType: "EL" | "U" | "N/A"; // Element (EL) or Unit (U) duty
  isCommandAppointed?: boolean; // true if the duty is Command Appointed (blue in spreadsheet)
  isNonTiered?: boolean; // true if the duty is Command Appointed but Non-Tiered
  scopeOfResponsibilities?: string; // Optional description of responsibilities
  seniorRaterAbbreviation?: string; // Optional senior rater abbreviation
  updatedAt?: string; // ISO timestamp of last modification
}

export interface SoldierSummary {
  lastName: string;
  rank: string;
  duties: Duty[];
  tierAggregate: number;
  maxTierAggregate: number | null; // null for ranks with no recommended limit
  isOverloaded: boolean;
}

export interface FilterOptions {
  searchQuery: string;
  shopFilter: string; // "All" or e.g. "element:CT", "category:Auditions", etc.
  overloadFilter: "all" | "overloaded" | "normal";
}

export interface UpdateRequest {
  id: string;
  dutyId: string;
  category: string;
  jobTitle: string;
  currentLastName: string;
  currentRank: string;
  currentDateStarted: string;
  currentScopeOfResponsibilities?: string;
  requestedLastName: string;
  requestedRank: string;
  requestedDateStarted: string;
  requestor: string;
  requestorEmail?: string;
  requestedScopeOfResponsibilities: string;
  isNewHire: boolean;
  isCsmApproved: boolean;
  justification?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt?: string;
  currentJobTitle?: string;
  requestedJobTitle?: string;
  currentTierLevel?: number | null;
  requestedTierLevel?: number | null;
  currentIsCommandAppointed?: boolean;
  requestedIsCommandAppointed?: boolean;
}

export interface ShopRelationship {
  id: string; // parentShop
  parentShop: string;
  subShops: string[];
}

export interface VacancyDraft {
  id?: string;
  dutyId: string;
  positionTitle: string;
  shopName: string;
  bpTitle?: string;
  slots?: number;
  tierLevel?: string;
  isSpecialty?: boolean;
  termDuration?: string;
  memoDate?: string;
  eligibilityRequirements?: string[];
  responsibilities?: string[];
  pocRankName?: string;
  pocEmail?: string;
  closeDeadlineDate?: string;
  signerNameCaps?: string;
  signerRank?: string;
  signerTitle?: string;
  status: "pending" | "reviewed" | "approved" | "rejected" | "filled";
  adminNotes?: string;
  createdAt: string;
  updatedAt?: string;
}
