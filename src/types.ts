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
  tierLevel: number | null; // 1, 2, 3, or null for N/A or empty
  specialized: boolean; // true if specialized with no term limit, false otherwise
  dutyType: "EL" | "U" | "N/A"; // Element (EL) or Unit (U) duty
  isCommandAppointed?: boolean; // true if the duty is Command Appointed (blue in spreadsheet)
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
