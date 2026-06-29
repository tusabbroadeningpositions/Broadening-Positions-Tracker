import React, { useState, useMemo, useEffect, useRef } from "react";
import { Duty, SoldierSummary } from "../types";
import { ELEMENT_MAP, getTermExpirationStatus } from "../data/dutiesStore";
import { Edit2, Trash2, ShieldAlert, BadgeInfo, Calendar, Layers, Sparkles, AlertCircle, RefreshCw } from "lucide-react";

interface DutiesListProps {
  duties: Duty[];
  soldierSummaries: SoldierSummary[];
  isAdmin: boolean;
  onEditDuty: (duty: Duty) => void;
  onDeleteDuty: (id: string) => void;
  searchQuery: string;
}

export default function DutiesList({
  duties,
  soldierSummaries,
  isAdmin,
  onEditDuty,
  onDeleteDuty,
  searchQuery,
}: DutiesListProps) {
  // Filter States
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [elementFilter, setElementFilter] = useState("All");
  const [tierFilter, setTierFilter] = useState("All"); // All, 1, 2, 3, N/A
  const [scopeFilter, setScopeFilter] = useState("All"); // All, EL, U, N/A
  const [expirationFilter, setExpirationFilter] = useState("All"); // All, Expired, Expiring, Active
  const [commandFilter, setCommandFilter] = useState("All"); // All, Yes, No
  const [personnelFilter, setPersonnelFilter] = useState("All");

  // Infinite Scroll States
  const [visibleCount, setVisibleCount] = useState(25);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLTableRowElement | null>(null);

  // Get unique categories and elements for dropdown filter lists
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    duties.forEach(d => {
      if (d.category) cats.add(d.category);
    });
    return Array.from(cats).sort();
  }, [duties]);

  const uniquePersonnel = useMemo(() => {
    const names = new Set<string>();
    duties.forEach(d => {
      const name = d.lastName.trim();
      if (name && name.toUpperCase() !== "VACANT") {
        names.add(name);
      }
    });
    return Array.from(names).sort();
  }, [duties]);

  const uniqueElements = useMemo(() => {
    const elms = new Set<string>();
    duties.forEach(d => {
      if ((d.dutyType === "EL" || d.dutyType === "U") && d.elementOrGroup) elms.add(d.elementOrGroup);
    });
    return Array.from(elms).sort();
  }, [duties]);

  const expiredCount = useMemo(() => {
    return duties.filter(d => getTermExpirationStatus(d.termEndDate, d.lastName) === "past").length;
  }, [duties]);

  const expiringCount = useMemo(() => {
    return duties.filter(d => getTermExpirationStatus(d.termEndDate, d.lastName) === "warning").length;
  }, [duties]);

  const activeCount = useMemo(() => {
    return duties.filter(d => {
      const s = getTermExpirationStatus(d.termEndDate, d.lastName);
      return s === "ok" || s === "none";
    }).length;
  }, [duties]);

  // Create a map of Soldier Last Name -> SoldierSummary for quick aggregate lookups
  const soldierSummaryMap = useMemo(() => {
    const map = new Map<string, SoldierSummary>();
    soldierSummaries.forEach(s => {
      map.set(s.lastName.toLowerCase(), s);
    });
    return map;
  }, [soldierSummaries]);

  // Reset visible items when filters change
  const handleFilterChange = (setter: (val: string) => void, val: string) => {
    setter(val);
    setVisibleCount(25);
  };

  // Filter & Search Logic
  const filteredDuties = useMemo(() => {
    const result = duties.filter((duty) => {
      // 1. Text Search (Matches Job Title or Soldier Last Name or Category or Rank)
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === "" ||
        duty.jobTitle.toLowerCase().includes(q) ||
        duty.lastName.toLowerCase().includes(q) ||
        duty.category.toLowerCase().includes(q) ||
        duty.rank.toLowerCase().includes(q) ||
        duty.elementOrGroup.toLowerCase().includes(q);

      // 2. Category Filter
      let matchesCategory = true;
      if (categoryFilter !== "All") {
        matchesCategory = duty.category === categoryFilter;
      }

      // 3. Element Filter
      let matchesElement = true;
      if (elementFilter !== "All") {
        matchesElement = duty.elementOrGroup === elementFilter && (duty.dutyType === "EL" || duty.dutyType === "U");
      }

      // 4. Tier Filter
      let matchesTier = true;
      if (tierFilter !== "All") {
        if (tierFilter === "N/A") {
          matchesTier = duty.tierLevel === null || duty.tierLevel === undefined;
        } else {
          matchesTier = duty.tierLevel === parseInt(tierFilter, 10);
        }
      }

      // 5. Scope Filter (EL vs U vs N/A)
      const matchesScope =
        scopeFilter === "All" ||
        (scopeFilter === "EL" && duty.dutyType === "EL") ||
        (scopeFilter === "U" && duty.dutyType === "U") ||
        (scopeFilter === "N/A" && duty.dutyType === "N/A");

      // 6. Expiration Filter
      let matchesExpiration = true;
      if (expirationFilter !== "All") {
        const expStatus = getTermExpirationStatus(duty.termEndDate, duty.lastName);
        if (expirationFilter === "Expired") {
          matchesExpiration = expStatus === "past";
        } else if (expirationFilter === "Expiring") {
          matchesExpiration = expStatus === "warning";
        } else if (expirationFilter === "Active") {
          matchesExpiration = expStatus === "ok" || expStatus === "none";
        }
      }

      // 7. Command Appointed Filter
      let matchesCommand = true;
      if (commandFilter !== "All") {
        matchesCommand = commandFilter === "Yes" ? !!duty.isCommandAppointed : !duty.isCommandAppointed;
      }

      // 8. Personnel Filter
      let matchesPersonnel = true;
      if (personnelFilter !== "All") {
        matchesPersonnel = duty.lastName.toLowerCase() === personnelFilter.toLowerCase();
      }

      return matchesSearch && matchesCategory && matchesElement && matchesTier && matchesScope && matchesExpiration && matchesCommand && matchesPersonnel;
    });

    // Sorting Logic: 
    // 1. Category (Shop) Alphabetical
    // 2. Tier Level Descending (Highest Tier first)
    // 3. Last Name Alphabetical
    return [...result].sort((a, b) => {
      // Primary: Category
      const catA = a.category || "";
      const catB = b.category || "";
      if (catA < catB) return -1;
      if (catA > catB) return 1;

      // Secondary: Tier Level (Descending: 3, 2, 1, null)
      const tierA = a.tierLevel ?? -1;
      const tierB = b.tierLevel ?? -1;
      if (tierA !== tierB) {
        return tierB - tierA;
      }

      // Tertiary: Last Name
      const nameA = a.lastName || "";
      const nameB = b.lastName || "";
      return nameA.localeCompare(nameB);
    });
  }, [duties, searchQuery, categoryFilter, elementFilter, tierFilter, scopeFilter, expirationFilter, commandFilter, personnelFilter]);

  // Reset visible count on any filter or query change
  useEffect(() => {
    setVisibleCount(25);
  }, [categoryFilter, elementFilter, tierFilter, scopeFilter, expirationFilter, commandFilter, searchQuery, personnelFilter]);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (visibleCount >= filteredDuties.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 25, filteredDuties.length));
        }
      },
      {
        rootMargin: "200px", // triggers loading slightly before scrolling to the absolute bottom
      }
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [visibleCount, filteredDuties.length]);

  // Get currently visible slice of duties
  const visibleDuties = useMemo(() => {
    return filteredDuties.slice(0, visibleCount);
  }, [filteredDuties, visibleCount]);

  const handleClearFilters = () => {
    setCategoryFilter("All");
    setElementFilter("All");
    setTierFilter("All");
    setScopeFilter("All");
    setExpirationFilter("All");
    setCommandFilter("All");
    setPersonnelFilter("All");
    setVisibleCount(25);
  };

  // Render Rank + Name cell with overload indicators
  const renderSoldierCell = (lastName: string, rank: string) => {
    const isVacant = lastName.toUpperCase() === "VACANT";
    if (isVacant) {
      return (
        <div className="flex items-center space-x-1 text-slate-500 font-mono text-xs italic tracking-wide">
          <span className="w-1.5 h-1.5 bg-slate-700 rounded-full"></span>
          <span>[VACANT POSITION]</span>
        </div>
      );
    }

    const summary = soldierSummaryMap.get(lastName.toLowerCase());

    let badgeColorClass = "bg-emerald-950/80 text-emerald-300 border-emerald-900";
    let badgeTooltip = "Within safe workload";
    let badgeText = "TA 0";

    if (summary) {
      const aggregate = summary.tierAggregate;
      const maxVal = summary.maxTierAggregate;
      badgeText = `TA ${aggregate}`;

      if (maxVal === null) {
        badgeColorClass = "bg-emerald-950/80 text-emerald-300 border-emerald-900/60";
        badgeTooltip = `Current aggregate: ${aggregate} tiers / No recommended limit`;
      } else if (aggregate > maxVal) {
        badgeColorClass = "bg-rose-950/80 text-rose-300 border-rose-900 animate-pulse";
        badgeTooltip = `Exceeds max aggregate: Hold ${aggregate} tiers / Limit is ${maxVal}`;
      } else if (aggregate === maxVal) {
        badgeColorClass = "bg-amber-950/80 text-amber-300 border-amber-900";
        badgeTooltip = `At recommended limit: Hold ${aggregate} tiers / Limit is ${maxVal}`;
      } else {
        badgeColorClass = "bg-emerald-950/80 text-emerald-300 border-emerald-900/60";
        badgeTooltip = `Within safe workload: Hold ${aggregate} tiers / Limit is ${maxVal}`;
      }
    }

    const isFiltered = personnelFilter.toLowerCase() === lastName.toLowerCase();

    return (
      <div className="flex items-center space-x-2">
        <span className="text-slate-300 font-mono text-xs font-semibold uppercase bg-slate-950 px-1.5 py-0.5 rounded-sm border border-slate-800">
          {rank || "N/A"}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (isFiltered) {
              setPersonnelFilter("All");
            } else {
              setPersonnelFilter(lastName);
            }
          }}
          className={`font-semibold text-sm transition-all text-left hover:text-emerald-400 hover:underline cursor-pointer ${
            isFiltered ? "text-emerald-400 underline font-extrabold" : "text-slate-200"
          }`}
          title={isFiltered ? "Click to clear filter" : `Click to show all positions occupied by ${lastName}`}
        >
          {lastName}
        </button>
        <span 
          className={`inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded border transition-all ${badgeColorClass}`}
          title={badgeTooltip}
        >
          {badgeText}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters Card */}
      <div className="bg-slate-900 p-4 rounded-lg border border-slate-800/80 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
          <div className="flex items-center space-x-2 text-slate-200">
            <Layers className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Roster Filter Console</h3>
          </div>
          {(categoryFilter !== "All" || elementFilter !== "All" || tierFilter !== "All" || scopeFilter !== "All" || expirationFilter !== "All" || commandFilter !== "All" || personnelFilter !== "All") && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 hover:underline cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Clear Filters ({filteredDuties.length} items found)
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Shop Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Shop
            </label>
            <select
              className="w-full text-xs border border-slate-750 rounded p-2 bg-slate-950 text-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              value={categoryFilter}
              onChange={(e) => handleFilterChange(setCategoryFilter, e.target.value)}
            >
              <option value="All">All Shops ({duties.length})</option>
              {uniqueCategories.map((cat) => (
                <option key={cat} value={cat} className="text-slate-300 bg-slate-950 font-normal">
                  {cat} ({duties.filter(d => d.category === cat).length})
                </option>
              ))}
            </select>
          </div>

          {/* Command Appointed Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Appointment Status
            </label>
            <select
              className="w-full text-xs border border-slate-750 rounded p-2 bg-slate-950 text-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              value={commandFilter}
              onChange={(e) => handleFilterChange(setCommandFilter, e.target.value)}
            >
              <option value="All">All Appointment Types</option>
              <option value="Yes">Command Appointed Only ({duties.filter(d => d.isCommandAppointed).length})</option>
              <option value="No">Standard Duties Only ({duties.filter(d => !d.isCommandAppointed).length})</option>
            </select>
          </div>

          {/* Personnel Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Personnel Focus
            </label>
            <select
              className="w-full text-xs border border-slate-750 rounded p-2 bg-slate-950 text-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
              value={personnelFilter}
              onChange={(e) => handleFilterChange(setPersonnelFilter, e.target.value)}
            >
              <option value="All">All Personnel ({uniquePersonnel.length})</option>
              {uniquePersonnel.map((name) => {
                const count = duties.filter(d => d.lastName.toLowerCase() === name.toLowerCase()).length;
                return (
                  <option key={name} value={name} className="text-slate-300 bg-slate-950 font-normal">
                    {name} ({count} {count === 1 ? 'position' : 'positions'})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mt-3 pt-2.5 border-t border-slate-800/80 text-[10px] text-slate-400">
          <span className="font-bold text-slate-300 uppercase tracking-wider">Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 bg-amber-500/20 border border-amber-500/40 rounded-sm"></span>
            <span>Gold Highlight = Command Appointed Duties</span>
          </div>
        </div>
      </div>

      {/* Roster Table Card */}
      <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800 text-left">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider">
                  Shop & Position Title
                </th>
                <th scope="col" className="px-6 py-3.5 text-[10px] font-bold uppercase tracking-wider">
                  Assigned Personnel
                </th>
                <th scope="col" className="px-6 py-2 w-28 min-w-[110px]">
                  <div className="flex items-center -ml-2">
                    <select
                      className={`w-24 text-[10px] font-bold bg-slate-950 border border-slate-800 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer uppercase tracking-wider truncate ${
                        elementFilter === "All"
                          ? "text-slate-400 hover:text-slate-300"
                          : "text-emerald-400 border-emerald-900/50"
                      }`}
                      value={elementFilter}
                      onChange={(e) => handleFilterChange(setElementFilter, e.target.value)}
                    >
                      <option value="All" className="text-slate-400 bg-slate-950 font-bold">Element</option>
                      {uniqueElements.map((elm) => (
                        <option key={elm} value={elm} className="text-slate-300 bg-slate-950 font-normal">
                          {elm} ({duties.filter(d => d.elementOrGroup === elm && (d.dutyType === "EL" || d.dutyType === "U")).length})
                        </option>
                      ))}
                    </select>
                  </div>
                </th>
                <th scope="col" className="px-6 py-2 w-24 min-w-[90px]">
                  <div className="flex items-center -ml-2">
                    <select
                      className={`w-20 text-[10px] font-bold bg-slate-950 border border-slate-800 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer uppercase tracking-wider truncate ${
                        tierFilter === "All"
                          ? "text-slate-400 hover:text-slate-300"
                          : "text-emerald-400 border-emerald-900/50"
                      }`}
                      value={tierFilter}
                      onChange={(e) => handleFilterChange(setTierFilter, e.target.value)}
                    >
                      <option value="All" className="text-slate-400 bg-slate-950 font-bold">Tier</option>
                      <option value="1" className="text-slate-300 bg-slate-950">T1 ({duties.filter(d => d.tierLevel === 1).length})</option>
                      <option value="2" className="text-slate-300 bg-slate-950">T2 ({duties.filter(d => d.tierLevel === 2).length})</option>
                      <option value="3" className="text-slate-300 bg-slate-950">T3 ({duties.filter(d => d.tierLevel === 3).length})</option>
                      <option value="N/A" className="text-slate-300 bg-slate-950">N/A ({duties.filter(d => d.tierLevel === null || d.tierLevel === undefined).length})</option>
                    </select>
                  </div>
                </th>
                <th scope="col" className="px-6 py-2 w-36 min-w-[140px]">
                  <div className="flex items-center -ml-2">
                    <select
                      className={`w-32 text-[10px] font-bold bg-slate-950 border border-slate-800 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer uppercase tracking-wider truncate ${
                        expirationFilter === "All"
                          ? "text-slate-400 hover:text-slate-300"
                          : expirationFilter === "Expired"
                          ? "text-rose-400 border-rose-900/50"
                          : expirationFilter === "Expiring"
                          ? "text-amber-400 border-amber-900/50"
                          : "text-emerald-400 border-emerald-900/50"
                      }`}
                      value={expirationFilter}
                      onChange={(e) => handleFilterChange(setExpirationFilter, e.target.value)}
                    >
                      <option value="All" className="text-slate-400 bg-slate-950 font-bold">Term Status</option>
                      <option value="Expired" className="text-rose-400 bg-slate-950">Expired ({expiredCount})</option>
                      <option value="Expiring" className="text-amber-400 bg-slate-950">Expiring ({expiringCount})</option>
                      <option value="Active" className="text-emerald-400 bg-slate-950">Active ({activeCount})</option>
                    </select>
                  </div>
                </th>
                <th scope="col" className="px-6 py-2 w-24 min-w-[90px]">
                  <div className="flex items-center -ml-2">
                    <select
                      className={`w-20 text-[10px] font-bold bg-slate-950 border border-slate-800 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer uppercase tracking-wider truncate ${
                        scopeFilter === "All"
                          ? "text-slate-400 hover:text-slate-300"
                          : "text-emerald-400 border-emerald-900/50"
                      }`}
                      value={scopeFilter}
                      onChange={(e) => handleFilterChange(setScopeFilter, e.target.value)}
                    >
                      <option value="All" className="text-slate-400 bg-slate-950 font-bold">Scope</option>
                      <option value="EL" className="text-slate-300 bg-slate-950">EL ({duties.filter(d => d.dutyType === "EL").length})</option>
                      <option value="U" className="text-slate-300 bg-slate-950">U ({duties.filter(d => d.dutyType === "U").length})</option>
                      <option value="N/A" className="text-slate-300 bg-slate-950">N/A ({duties.filter(d => d.dutyType === "N/A" || !d.dutyType).length})</option>
                    </select>
                  </div>
                </th>
                {isAdmin && (
                  <th scope="col" className="px-6 py-3.5 text-right text-[10px] font-bold uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-slate-900 divide-y divide-slate-800/80">
              {visibleDuties.length > 0 ? (
                <>
                  {visibleDuties.map((duty) => {
                    const isVacant = duty.lastName.toUpperCase() === "VACANT";
                    return (
                      <tr 
                        key={duty.id} 
                        className={`hover:bg-slate-850/50 transition-all duration-75 ${
                          duty.isCommandAppointed 
                            ? "bg-amber-500/10 border-y border-amber-500/20" 
                            : isVacant 
                            ? "bg-slate-950/20" 
                            : ""
                        }`}
                        onDoubleClick={() => isAdmin && onEditDuty(duty)}
                      >
                      {/* Job / Position Title */}
                      <td className="px-6 py-4">
                        <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                          {duty.category}
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span className={`text-sm leading-tight block rounded-sm ${
                            duty.isCommandAppointed 
                              ? "text-amber-400 font-extrabold bg-amber-950/40 border border-amber-900/50 px-1.5 py-0.5"
                              : "text-slate-200 font-bold"
                          }`}>
                            {duty.jobTitle}
                          </span>
                          {duty.isCommandAppointed && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[8px] font-extrabold bg-amber-600/80 text-amber-50 rounded-sm border border-amber-500/60 uppercase tracking-wider">
                              Cmd Appt
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Soldier Name */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderSoldierCell(duty.lastName, duty.rank)}
                      </td>

                      {/* Shop Code */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-mono">
                        <button 
                          onClick={() => duty.elementOrGroup && handleFilterChange(setElementFilter, duty.elementOrGroup)}
                          className="px-2 py-1 bg-slate-950 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/50 rounded font-semibold border border-slate-800 cursor-pointer text-left transition-colors"
                          title={`Filter by Element: ${ELEMENT_MAP[duty.elementOrGroup] || duty.elementOrGroup}`}
                        >
                          {duty.elementOrGroup || "N/A"}
                        </button>
                      </td>

                      {/* Tier Badge */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {duty.tierLevel !== null ? (
                          <button
                            onClick={() => handleFilterChange(setTierFilter, String(duty.tierLevel))}
                            className={`inline-flex items-center px-2 py-0.5 rounded-sm text-xs font-bold font-mono border cursor-pointer transition-colors ${
                              duty.tierLevel === 3
                                ? "bg-amber-400/20 text-amber-400 border-amber-400/40 hover:bg-amber-400/30" // Gold
                                : duty.tierLevel === 2
                                ? "bg-slate-400/20 text-slate-300 border-slate-400/40 hover:bg-slate-400/30" // Silver
                                : "bg-orange-900/30 text-orange-400 border-orange-800/40 hover:bg-orange-900/40" // Bronze
                            }`}
                            title={`Filter by Tier ${duty.tierLevel}`}
                          >
                            T{duty.tierLevel}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleFilterChange(setTierFilter, "N/A")}
                            className="text-slate-600 hover:text-emerald-400 text-xs font-mono cursor-pointer transition-colors"
                            title="Filter by N/A / No Tier"
                          >
                            -
                          </button>
                        )}
                      </td>

                      {/* Term details */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        <div className="flex flex-col space-y-1">
                          {duty.specialized ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold uppercase bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/40 self-start">
                              <Sparkles className="w-2.5 h-2.5" />
                              SPEC/TITLE (No limit)
                            </span>
                          ) : (
                            (() => {
                              const expStatus = getTermExpirationStatus(duty.termEndDate, duty.lastName);
                              return (
                                <>
                                  <span className={`font-medium flex items-center gap-1.5 ${
                                    expStatus === "past"
                                      ? "text-rose-400 font-bold"
                                      : expStatus === "warning"
                                      ? "text-amber-400 font-bold"
                                      : "text-slate-200"
                                  }`}>
                                    Term: {duty.termLength || "N/A"}
                                    {expStatus === "past" && (
                                      <button
                                        onClick={() => handleFilterChange(setExpirationFilter, "Expired")}
                                        className="inline-flex items-center px-1.5 py-0.2 rounded-xs text-[9px] font-bold bg-rose-950 text-rose-300 border border-rose-900/60 font-mono uppercase animate-pulse hover:bg-rose-900 cursor-pointer transition-colors"
                                        title="Filter by Expired terms"
                                      >
                                        Past End Date
                                      </button>
                                    )}
                                    {expStatus === "warning" && (
                                      <button
                                        onClick={() => handleFilterChange(setExpirationFilter, "Expiring")}
                                        className="inline-flex items-center px-1.5 py-0.2 rounded-xs text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-900/60 font-mono uppercase hover:bg-amber-900 cursor-pointer transition-colors"
                                        title="Filter by Expiring terms"
                                      >
                                        Expiring
                                      </button>
                                    )}
                                  </span>
                                  <button
                                    onClick={() => {
                                      const filterVal = expStatus === "past" ? "Expired" : expStatus === "warning" ? "Expiring" : "Active";
                                      handleFilterChange(setExpirationFilter, filterVal);
                                    }}
                                    className={`font-mono text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded-sm border w-fit text-left hover:border-emerald-500/50 cursor-pointer transition-colors ${
                                      expStatus === "past"
                                        ? "bg-rose-950/40 text-rose-300 border-rose-900/40 shadow-sm"
                                        : expStatus === "warning"
                                        ? "bg-amber-950/40 text-amber-300 border-amber-900/40 shadow-sm"
                                        : "bg-slate-950/20 text-slate-500 border-transparent"
                                    }`}
                                    title={`Filter by Term Status: ${expStatus === "past" ? "Expired" : expStatus === "warning" ? "Expiring" : "Active / Valid"}`}
                                  >
                                    <Calendar className={`w-3 h-3 ${
                                      expStatus === "past"
                                        ? "text-rose-400"
                                        : expStatus === "warning"
                                        ? "text-amber-400"
                                        : "text-slate-600"
                                    }`} />
                                    {duty.dateStarted || "N/A"} {duty.termEndDate ? `→ ${duty.termEndDate}` : ""}
                                  </button>
                                </>
                              );
                            })()
                          )}
                        </div>
                      </td>

                      {/* Scope Badge (EL vs U) */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleFilterChange(setScopeFilter, duty.dutyType || "N/A")}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer transition-colors ${
                            duty.dutyType === "EL"
                              ? "bg-indigo-950 text-indigo-300 border-indigo-900/50 hover:text-indigo-200 hover:border-indigo-700"
                              : duty.dutyType === "U"
                              ? "bg-teal-950 text-teal-300 border-teal-900/50 hover:text-teal-200 hover:border-teal-700"
                              : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-600"
                          }`}
                          title={`Filter by Scope: ${duty.dutyType || "N/A"}`}
                        >
                          {duty.dutyType || "N/A"}
                        </button>
                      </td>

                      {/* Admin Actions */}
                      {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                          {deletingId === duty.id ? (
                            <div className="flex items-center justify-end space-x-1.5 animate-pulse bg-rose-950/20 px-2 py-1 rounded border border-rose-900/40">
                              <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider">Delete?</span>
                              <button
                                onClick={() => {
                                  onDeleteDuty(duty.id);
                                  setDeletingId(null);
                                }}
                                className="bg-rose-600 hover:bg-rose-500 text-white rounded px-2 py-0.5 text-[9px] font-bold cursor-pointer transition-colors"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setDeletingId(null)}
                                className="bg-slate-800 hover:bg-slate-750 text-slate-300 rounded px-2 py-0.5 text-[9px] font-bold border border-slate-700 cursor-pointer transition-colors"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => onEditDuty(duty)}
                                className="text-slate-400 hover:text-white hover:bg-slate-800 rounded p-1.5 transition-colors cursor-pointer"
                                title="Edit duty assignment"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeletingId(duty.id)}
                                className="text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded p-1.5 transition-colors cursor-pointer"
                                title="Delete duty assignment"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {visibleCount < filteredDuties.length && (
                  <tr ref={sentinelRef} className="bg-slate-950/10">
                    <td colSpan={isAdmin ? 7 : 6} className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center space-x-2 text-xs text-slate-400 font-medium font-mono py-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                        <span>LOADING MORE BROADENING POSITIONS...</span>
                      </div>
                    </td>
                  </tr>
                )}
              </>) : (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <AlertCircle className="w-8 h-8 text-slate-600" />
                      <p className="text-sm font-semibold text-slate-400">No broadening positions found matching your filters.</p>
                      <button
                        onClick={handleClearFilters}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer"
                      >
                        Reset Filters
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Infinite Scroll Footer */}
        {filteredDuties.length > 0 && (
          <div className="px-6 py-4 bg-slate-950 border-t border-slate-850 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-400 font-medium">
              Showing <span className="font-bold text-slate-200">{Math.min(visibleCount, filteredDuties.length)}</span> of{" "}
              <span className="font-bold text-slate-200">{filteredDuties.length}</span> active records
            </div>

            {visibleCount < filteredDuties.length && (
              <div className="text-xs text-slate-500 font-medium italic animate-pulse">
                Scroll down to load more...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
