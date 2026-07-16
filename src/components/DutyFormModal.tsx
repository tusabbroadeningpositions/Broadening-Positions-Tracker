import React, { useState, useEffect } from "react";
import { Duty } from "../types";
import { ELEMENT_MAP, calculateSoldierSummaries } from "../data/dutiesStore";
import { isCommandAppointedDuty } from "../data/rawDuties";
import { X, AlertTriangle, ShieldCheck } from "lucide-react";

interface DutyFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (duty: Omit<Duty, "id"> & { id?: string }) => void;
  editingDuty?: Duty | null;
  allDuties: Duty[];
  allowedCategory: string | null;
  isHR?: boolean;
}

export default function DutyFormModal({
  isOpen,
  onClose,
  onSave,
  editingDuty,
  allDuties,
  allowedCategory,
  isHR = false,
}: DutyFormModalProps) {
  const [category, setCategory] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [lastName, setLastName] = useState("");
  const [rank, setRank] = useState("SSG");
  const [dateStarted, setDateStarted] = useState("");
  const [termLength, setTermLength] = useState("");
  const [termEndDate, setTermEndDate] = useState("");
  const [elementOrGroup, setElementOrGroup] = useState("");
  const [tierLevel, setTierLevel] = useState<string>("N/A");
  const [specialized, setSpecialized] = useState(false);
  const [dutyType, setDutyType] = useState<"EL" | "U" | "N/A">("N/A");
  const [isCommandAppointed, setIsCommandAppointed] = useState(false);
  const [isNonTiered, setIsNonTiered] = useState(false);

  // Autocomplete / suggestions helpers
  const [lastNameSuggestions, setLastNameSuggestions] = useState<string[]>([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);

  // New shop states
  const [customShops, setCustomShops] = useState<string[]>([]);
  const [showNewShopPrompt, setShowNewShopPrompt] = useState(false);
  const [newShopName, setNewShopName] = useState("");

  // Pre-fill form when editing
  useEffect(() => {
    if (editingDuty) {
      setCategory(editingDuty.category);
      setJobTitle(editingDuty.jobTitle);
      setLastName(editingDuty.lastName);
      setRank(editingDuty.rank);
      setDateStarted(editingDuty.dateStarted);
      setTermLength(isHR ? "" : editingDuty.termLength);
      setTermEndDate(isHR ? "" : editingDuty.termEndDate);
      setElementOrGroup(editingDuty.elementOrGroup);
      setTierLevel(isHR ? "N/A" : (editingDuty.tierLevel !== null ? String(editingDuty.tierLevel) : "N/A"));
      setSpecialized(editingDuty.specialized);
      setDutyType(editingDuty.dutyType);
      setIsCommandAppointed(isHR ? true : (editingDuty.isCommandAppointed ?? isCommandAppointedDuty(editingDuty.category, editingDuty.jobTitle)));
      setIsNonTiered(isHR ? true : (editingDuty.isNonTiered ?? false));
    } else {
      // Set sensible defaults for a new duty
      let initialCategory = allowedCategory || "";
      if (allowedCategory) {
        // Try to find the full name in combinedShops that matches the prefix
        const fullShop = combinedShops.find(s => s.trim().toLowerCase().startsWith(allowedCategory.trim().toLowerCase()));
        if (fullShop) {
          initialCategory = fullShop;
        }
      }
      setCategory(initialCategory);
      setJobTitle("");
      setLastName("");
      setRank("SSG");
      setDateStarted("");
      setTermLength(isHR ? "" : "2-5 yrs");
      setTermEndDate("");
      setElementOrGroup("CT");
      setTierLevel(isHR ? "N/A" : "1");
      setSpecialized(false);
      setDutyType("U");
      setIsCommandAppointed(isHR ? true : false);
      setIsNonTiered(isHR ? true : false);
    }
  }, [editingDuty, isOpen, isHR]);

  // Auto-set command appointed based on title/category for new duties
  useEffect(() => {
    if (!editingDuty && isOpen && !isHR) {
      setIsCommandAppointed(isCommandAppointedDuty(category, jobTitle));
    }
  }, [category, jobTitle, editingDuty, isOpen, isHR]);

  // Extract unique names for autocomplete
  useEffect(() => {
    const names = new Set<string>();
    allDuties.forEach(d => {
      if (d.lastName && d.lastName.toUpperCase() !== "VACANT") {
        names.add(d.lastName.trim());
      }
    });
    setLastNameSuggestions(Array.from(names).sort());
  }, [allDuties]);

  // Dynamically compute the combined list of unique shops
  const combinedShops = React.useMemo(() => {
    const defaultShops = [
      "Ceremonial Band",
      "Concert Band",
      "Downrange",
      "Blues",
      "Strings",
      "Technical Support Group",
      "Chorus",
      "Operations",
      "Logistics",
      "Administration"
    ];
    const cats = new Set<string>();
    
    // 1. Add existing categories from the roster (highest priority)
    allDuties.forEach(d => {
      if (d.category && d.category.trim()) {
        cats.add(d.category.trim());
      }
    });

    // 2. Add custom shops
    customShops.forEach(cs => {
      if (cs.trim()) cats.add(cs.trim());
    });

    // 3. Add default shops ONLY if they aren't already represented by a more specific name
    defaultShops.forEach(s => {
      const exists = Array.from(cats).some(existing => 
        existing.toLowerCase().startsWith(s.toLowerCase())
      );
      if (!exists) {
        cats.add(s);
      }
    });
    if (category) {
      cats.add(category.trim());
    }
    return Array.from(cats).sort();
  }, [allDuties, customShops, category]);

  if (!isOpen) return null;

  // Real-time workload calculation check
  const getWorkloadImpact = () => {
    const trimmedName = lastName.trim();
    if (!trimmedName || trimmedName.toUpperCase() === "VACANT") return null;

    // Simulate duties with the pending edit/addition
    const selectedTier = tierLevel === "N/A" ? 0 : parseInt(tierLevel, 10);
    
    // Find existing duties for this soldier (excluding the current one we are editing)
    const existingSoldierDuties = allDuties.filter(d => 
      d.lastName.trim().toLowerCase() === trimmedName.toLowerCase() && 
      (!editingDuty || d.id !== editingDuty.id)
    );

    const currentAggregate = existingSoldierDuties.reduce((acc, d) => acc + (d.tierLevel || 0), 0);
    const newAggregate = currentAggregate + selectedTier;

    // Get limits based on rank
    const normalizedRank = rank.trim().toUpperCase();
    let max = null;
    if (normalizedRank.includes("SGM") || normalizedRank.includes("SGM")) max = 7;
    else if (normalizedRank.includes("CSM")) max = 7;
    else if (normalizedRank.includes("MSG")) max = 6;
    else if (normalizedRank.includes("SFC")) max = 5;
    else if (normalizedRank.includes("SSG")) max = 4;
    else if (normalizedRank.includes("SGT") || normalizedRank.includes("SPC")) max = 4;

    if (max === null) return { aggregate: newAggregate, max, overloaded: false };

    return {
      aggregate: newAggregate,
      max,
      overloaded: newAggregate > max,
      exceedsBy: newAggregate - max,
    };
  };

  const workloadInfo = getWorkloadImpact();

  const calculateAndSetEndDate = (start: string, tier: string) => {
    if (isNonTiered) return;
    if (!start || tier === "N/A") return;
    const yearsToAdd = tier === "1" ? 5 : tier === "2" ? 6 : tier === "3" ? 7 : 0;
    if (yearsToAdd === 0) return;

    const dateParts = start.split('/');
    if (dateParts.length === 3) {
      const m = dateParts[0];
      const d = dateParts[1];
      const yearStr = dateParts[2].trim();
      let year = parseInt(yearStr, 10);
      if (!isNaN(year)) {
        if (yearStr.length === 2) year += (year > 50 ? 1900 : 2000);
        setTermEndDate(`${m}/${d}/${year + yearsToAdd}`);
      }
    } else if (/^\d{4}$/.test(start.trim())) {
      const year = parseInt(start.trim(), 10);
      setTermEndDate(String(year + yearsToAdd));
    }
  };

  const handleTierChange = (val: string) => {
    setTierLevel(val);
    if (val === "1") {
      setTermLength("2-5 yrs");
    } else if (val === "2") {
      setTermLength("2-6 yrs");
    } else if (val === "3") {
      setTermLength("3-7 yrs");
    }
    calculateAndSetEndDate(dateStarted, val);
  };

  const handleDateStartedChange = (val: string) => {
    setDateStarted(val);
    calculateAndSetEndDate(val, tierLevel);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedTier = tierLevel === "N/A" ? null : parseInt(tierLevel, 10);
    onSave({
      id: editingDuty?.id,
      category: category.trim(),
      jobTitle: jobTitle.trim(),
      lastName: lastName.trim() || "VACANT",
      rank: lastName.trim().toUpperCase() === "VACANT" ? "" : rank.trim(),
      dateStarted: dateStarted.trim(),
      termLength: isNonTiered ? "" : termLength.trim(),
      termEndDate: isNonTiered ? "" : termEndDate.trim(),
      elementOrGroup: elementOrGroup.trim(),
      tierLevel: isNonTiered ? null : parsedTier,
      specialized,
      dutyType,
      isCommandAppointed,
      isNonTiered,
    });
  };

  // Filter lists for suggestions
  const filteredNames = lastNameSuggestions.filter(name =>
    name.toLowerCase().includes(lastName.toLowerCase()) && name.toLowerCase() !== lastName.toLowerCase()
  );

  // Auto-fill rank if an existing soldier name is clicked
  const handleSelectSoldier = (name: string) => {
    setLastName(name);
    setShowNameSuggestions(false);
    // Find their rank from existing duties
    const soldierDuty = allDuties.find(d => d.lastName.trim().toLowerCase() === name.toLowerCase() && d.rank);
    if (soldierDuty) {
      setRank(soldierDuty.rank);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-900 rounded-lg shadow-2xl border border-slate-800 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-850">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-3 h-3 bg-emerald-500 rounded-sm"></span>
            <h2 className="text-sm font-bold uppercase tracking-wider">
              {editingDuty ? "Edit Broadening Position" : "Assign New Broadening Position"}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors duration-150 rounded p-1 hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-900 text-slate-300">
          
          {/* Workload Impact Preview Section */}
          {workloadInfo && (
            <div className={`p-4 rounded border ${
              workloadInfo.overloaded 
                ? "bg-rose-950/60 border-rose-900 text-rose-200" 
                : "bg-emerald-950/60 border-emerald-900 text-emerald-200"
            }`}>
              {workloadInfo.overloaded ? (
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-bounce" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div className="text-xs">
                <span className="font-bold uppercase tracking-wide">
                  Workload Check for {lastName}:
                </span>{" "}
                Pending tier aggregate will be{" "}
                <span className="font-bold underline text-sm font-mono">
                  {workloadInfo.aggregate}
                </span>{" "}
                (Max recommended for {rank || "Rank"} is {workloadInfo.max ?? "N/A"}).
                {workloadInfo.overloaded ? (
                  <p className="mt-1 font-semibold text-rose-300">
                    ⚠ Warning: Assigning this duty exceeds recommended limit by {workloadInfo.exceedsBy}!
                  </p>
                ) : (
                  <p className="mt-0.5 text-emerald-300">
                    ✓ Recommended. Workload remains within standards.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Shop Dropdown */}
            <div className="relative md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Shop * {allowedCategory && "(Locked to Authorized Section)"}
              </label>
              <select
                required
                disabled={!!allowedCategory}
                className={`w-full px-3 py-2 border border-slate-850 rounded focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-xs bg-slate-950 text-slate-200 font-medium ${!!allowedCategory ? 'opacity-70 cursor-not-allowed bg-slate-900' : 'cursor-pointer'}`}
                value={category}
                onChange={(e) => {
                  if (e.target.value === "CREATE_NEW_SHOP") {
                    setShowNewShopPrompt(true);
                    setNewShopName("");
                  } else {
                    setCategory(e.target.value);
                  }
                }}
              >
                {!allowedCategory && <option value="" disabled>-- Select a Shop --</option>}
                {!allowedCategory && (
                  <option value="CREATE_NEW_SHOP" className="text-emerald-400 font-bold bg-slate-900">
                    + Create New Shop...
                  </option>
                )}
                {combinedShops.map((shop) => (
                  <option key={shop} value={shop}>
                    {shop}
                  </option>
                ))}
              </select>
            </div>

            {/* Job Title */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Duty / Position Title *
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-slate-850 rounded focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-xs bg-slate-950 text-slate-200 font-medium"
                placeholder="e.g. Lead Auditions Coordinator (NCOIC)"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>

            {/* Last Name */}
            <div className="relative">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Soldier's Last Name * (or "VACANT")
              </label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-slate-850 rounded focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-xs bg-slate-950 text-slate-200 font-medium"
                placeholder="e.g. Grebeldinger"
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                  setShowNameSuggestions(true);
                }}
                onFocus={() => setShowNameSuggestions(true)}
                onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
              />
              {showNameSuggestions && filteredNames.length > 0 && (
                <div className="absolute z-10 w-full bg-slate-950 mt-1 max-h-40 overflow-y-auto border border-slate-800 rounded shadow-2xl">
                  {filteredNames.slice(0, 5).map((name) => (
                    <button
                      key={name}
                      type="button"
                      className="w-full text-left px-3 py-2 text-xs hover:bg-slate-800 hover:text-white border-b border-slate-900 text-slate-300 last:border-0 cursor-pointer font-medium"
                      onClick={() => handleSelectSoldier(name)}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Rank */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Rank (leave blank if vacant or CIV)
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-850 rounded focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-xs bg-slate-950 text-slate-200 font-medium"
                value={rank}
                disabled={lastName.trim().toUpperCase() === "VACANT"}
                onChange={(e) => setRank(e.target.value)}
              >
                <option value="SSG">SSG</option>
                <option value="SFC">SFC</option>
                <option value="MSG">MSG</option>
                <option value="SGM">SGM</option>
                <option value="CIV">CIV</option>
                <option value="N/A">N/A</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Date Started
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-850 rounded focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-xs bg-slate-950 text-slate-200 font-medium"
                placeholder="e.g. 1/4/24 or 2021"
                value={dateStarted}
                onChange={(e) => handleDateStartedChange(e.target.value)}
              />
            </div>

            {/* Term Length */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Term Length {isNonTiered && "(Grayed out - Non-Tiered)"}
              </label>
              <input
                type="text"
                disabled={isNonTiered}
                className={`w-full px-3 py-2 border border-slate-850 rounded focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-xs text-slate-200 font-medium ${
                  isNonTiered ? "bg-slate-900/50 text-slate-500 cursor-not-allowed border-slate-850/50" : "bg-slate-950"
                }`}
                placeholder="e.g. 2-5 yrs, 3-7 yrs, or N/A"
                value={termLength}
                onChange={(e) => setTermLength(e.target.value)}
              />
              <p className="mt-1 text-[10px] text-slate-500 leading-normal">
                Standard: Tier 1 (2-5 yrs), Tier 2 (2-6 yrs), Tier 3 (3-7 yrs)
              </p>
            </div>

            {/* Term End Date */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Term End Date {isNonTiered && "(Grayed out - Non-Tiered)"}
              </label>
              <input
                type="text"
                disabled={isNonTiered}
                className={`w-full px-3 py-2 border border-slate-850 rounded focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-xs text-slate-200 font-medium ${
                  isNonTiered ? "bg-slate-900/50 text-slate-500 cursor-not-allowed border-slate-850/50" : "bg-slate-950"
                }`}
                placeholder="e.g. 1/4/31 or N/A"
                value={termEndDate}
                onChange={(e) => setTermEndDate(e.target.value)}
              />
            </div>

            {/* Element or Group */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Soldier Element
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-850 rounded focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-xs bg-slate-950 text-slate-200 font-medium"
                value={elementOrGroup}
                onChange={(e) => setElementOrGroup(e.target.value)}
              >
                {Object.entries(ELEMENT_MAP).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tier Level */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Tier Level of Duty {isNonTiered && "(Grayed out - Non-Tiered)"}
              </label>
              <select
                disabled={isNonTiered}
                className={`w-full px-3 py-2 border border-slate-850 rounded focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-xs text-slate-200 font-medium ${
                  isNonTiered ? "bg-slate-900/50 text-slate-500 cursor-not-allowed border-slate-850/50" : "bg-slate-950 cursor-pointer"
                }`}
                value={tierLevel}
                onChange={(e) => handleTierChange(e.target.value)}
              >
                <option value="N/A">N/A / None</option>
                <option value="1">Tier 1 (Value: 1)</option>
                <option value="2">Tier 2 (Value: 2)</option>
                <option value="3">Tier 3 (Value: 3)</option>
              </select>
            </div>

            {/* Element or Unit Duty */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Scope (Element / Unit)
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-850 rounded focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-xs bg-slate-950 text-slate-200 font-medium"
                value={dutyType}
                onChange={(e) => setDutyType(e.target.value as "EL" | "U" | "N/A")}
              >
                <option value="EL">EL (Element Duty)</option>
                <option value="U">U (Unit Duty)</option>
                <option value="N/A">N/A (Not Applicable)</option>
              </select>
            </div>

            {/* Specialized Duty Toggle */}
            <div className="md:col-span-2 flex items-center justify-between p-3 bg-slate-950/40 rounded border border-slate-850">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-200">
                  Specialized Duty (No Term Limit)
                </span>
                <span className="text-[10px] text-slate-400">
                  Mark as "SPEC/TITLE" with no rigid term limitation.
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={specialized}
                  onChange={(e) => setSpecialized(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {/* Command Appointed Toggle */}
            <div className="md:col-span-2 flex items-center justify-between p-3 bg-slate-950/40 rounded border border-slate-850">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-sky-400">
                  Command Appointed Position (Cmd Appt){isHR && " (Locked by HR Admin)"}
                </span>
                <span className="text-[10px] text-slate-400">
                  Highlight this position as Command Appointed (marked with a light blue badge and row background).
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  disabled={isHR}
                  checked={isCommandAppointed}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsCommandAppointed(checked);
                    if (!checked) {
                      setIsNonTiered(false);
                    }
                  }}
                  className="sr-only peer"
                />
                <div className={`w-11 h-6 bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-500 ${isHR ? "opacity-60 cursor-not-allowed" : ""}`}></div>
              </label>
            </div>

            {/* Non-Tiered Position Toggle (Only visible if Command Appointed is selected) */}
            {isCommandAppointed && (
              <div className="md:col-span-2 flex items-center justify-between p-3 bg-slate-950/40 rounded border border-slate-850 animate-in slide-in-from-top-2 duration-150">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-200">
                    Non-Tiered Position{isHR && " (Locked by HR Admin)"}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    If selected, this position will not have a specific tier level, term length, or term end date.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={isHR}
                    checked={isNonTiered}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIsNonTiered(checked);
                      if (checked) {
                        setTermLength("");
                        setTermEndDate("");
                        setTierLevel("N/A");
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className={`w-11 h-6 bg-slate-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 ${isHR ? "opacity-60 cursor-not-allowed" : ""}`}></div>
                </label>
              </div>
            )}

          </div>

          {/* Buttons Footer inside form */}
          <div className="pt-4 border-t border-slate-850 flex items-center justify-end space-x-3 bg-slate-900">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 rounded transition cursor-pointer flex items-center space-x-1 shadow-sm"
            >
              <span>{editingDuty ? "Save Changes" : "Create & Assign"}</span>
            </button>
          </div>

        </form>
      </div>

      {showNewShopPrompt && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-850 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Create New Shop</span>
              <button 
                type="button"
                onClick={() => {
                  setShowNewShopPrompt(false);
                  setNewShopName("");
                }}
                className="text-slate-400 hover:text-white rounded p-1 hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = newShopName.trim();
                if (trimmed) {
                  setCustomShops(prev => [...prev, trimmed]);
                  setCategory(trimmed);
                  setShowNewShopPrompt(false);
                  setNewShopName("");
                }
              }} 
              className="p-5 space-y-4"
            >
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Shop Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Auditions, SHARP, Training"
                  className="w-full px-3 py-2 border border-slate-850 rounded focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-xs bg-slate-950 text-slate-200 font-medium"
                  value={newShopName}
                  onChange={(e) => setNewShopName(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-850">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewShopPrompt(false);
                    setNewShopName("");
                  }}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-750 text-slate-300 rounded transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newShopName.trim()}
                  className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded transition cursor-pointer"
                >
                  Create Shop
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
