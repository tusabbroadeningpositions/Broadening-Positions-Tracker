import React, { useMemo, useState } from "react";
import { Duty, ShopRelationship } from "../types";
import { Search, Download, Layers, ShieldCheck, HelpCircle, Copy, Check } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface SRAbbreviationsViewProps {
  duties: Duty[];
  shopRelationships?: ShopRelationship[];
  customShops?: string[];
}

export default function SRAbbreviationsView({
  duties,
  shopRelationships = [],
  customShops = [],
}: SRAbbreviationsViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [shopFilter, setShopFilter] = useState("All");
  const [tierFilter, setTierFilter] = useState("All");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    });
  };

  // Recursive descendant shops helper to align with the rest of the application
  const getDescendantShops = (shop: string): string[] => {
    const result = new Set<string>([shop]);
    const findSubs = (current: string) => {
      const relation = (shopRelationships || []).find(r => r.parentShop === current);
      if (relation && relation.subShops) {
        for (const sub of relation.subShops) {
          if (!result.has(sub)) {
            result.add(sub);
            findSubs(sub);
          }
        }
      }
    };
    findSubs(shop);
    return Array.from(result);
  };

  // Extract unique category list for the filter
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    duties.forEach((d) => {
      if (d.category) cats.add(d.category);
    });
    customShops.forEach((cat) => {
      if (cat) cats.add(cat);
    });
    return Array.from(cats).sort();
  }, [duties, customShops]);

  // Compute unique positions (deduplicated by jobTitle and category) to prevent redundant rows
  const uniquePositions = useMemo(() => {
    const seen = new Set<string>();
    const list: {
      jobTitle: string;
      category: string;
      tierLevel: number | null;
      seniorRaterAbbreviation: string;
      isCommandAppointed: boolean;
    }[] = [];

    duties.forEach((d) => {
      const key = `${(d.jobTitle || "").trim().toLowerCase()}||${(d.category || "").trim().toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          jobTitle: (d.jobTitle || "").trim(),
          category: (d.category || "").trim(),
          tierLevel: d.tierLevel,
          seniorRaterAbbreviation: (d.seniorRaterAbbreviation || "").trim(),
          isCommandAppointed: !!d.isCommandAppointed,
        });
      }
    });

    // Apply shop filter
    let filtered = list;
    if (shopFilter !== "All") {
      const allowedShops = getDescendantShops(shopFilter);
      filtered = filtered.filter((p) => allowedShops.includes(p.category));
    }

    // Apply tier filter
    if (tierFilter !== "All") {
      if (tierFilter === "none") {
        filtered = filtered.filter((p) => p.tierLevel === null);
      } else {
        const tierNum = parseInt(tierFilter, 10);
        filtered = filtered.filter((p) => p.tierLevel === tierNum);
      }
    }

    // Apply search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (p) =>
          p.jobTitle.toLowerCase().includes(q) ||
          p.seniorRaterAbbreviation.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    // Sort: Tier Level Descending (Tier 4 -> Tier 1 -> Non-Tiered/null)
    // Secondary sort: Job Title alphabetically
    return filtered.sort((a, b) => {
      const tierA = a.tierLevel ?? -1;
      const tierB = b.tierLevel ?? -1;
      if (tierB !== tierA) {
        return tierB - tierA; // Higher tier first
      }
      return a.jobTitle.localeCompare(b.jobTitle);
    });
  }, [duties, shopFilter, tierFilter, searchQuery, shopRelationships]);

  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    // Header styling
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text("Senior Rater (SR) Abbreviations", 10, 15);

    doc.setFontSize(9);
    doc.setTextColor(100);
    const dateStr = new Date().toLocaleString();
    doc.text(`Export Date: ${dateStr}`, 10, 21);

    // Active filters label
    const activeFilters: string[] = [];
    if (shopFilter !== "All") activeFilters.push(`Shop: ${shopFilter}`);
    if (tierFilter !== "All") activeFilters.push(`Tier: ${tierFilter === "none" ? "Non-Tiered" : `Tier ${tierFilter}`}`);
    if (searchQuery) activeFilters.push(`Search: "${searchQuery}"`);
    
    if (activeFilters.length > 0) {
      doc.text(`Applied Filters: ${activeFilters.join(" | ")}`, 10, 26);
    } else {
      doc.text("Applied Filters: All Shops & Positions", 10, 26);
    }

    const headers = ["Tier", "Shop / Category", "Position Title", "SR Abbreviation"];
    const tableData = uniquePositions.map((p) => [
      p.tierLevel !== null ? `Tier ${p.tierLevel}` : "Non-Tiered",
      p.category,
      p.jobTitle,
      p.seniorRaterAbbreviation || "N/A",
    ]);

    autoTable(doc, {
      startY: 30,
      head: [headers],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: "bold",
        halign: "left",
      },
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
        valign: "middle",
      },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 28 },
        2: { cellWidth: 100 },
        3: { cellWidth: 40, fontStyle: "bold" },
      },
      margin: { top: 30, left: 10, right: 10, bottom: 15 },
    });

    doc.save(`Senior_Rater_Abbreviations_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* View Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-500" />
            Senior Rater Abbreviations
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic catalog of position titles and assigned Senior Rater Abbreviations that can be utilized on the NCOER in Successive and Broadening Assignment recommendations.
          </p>
        </div>
        
        <button
          onClick={handleExportPDF}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded shadow-lg shadow-emerald-500/10 active:scale-95 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          Export SR List PDF
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-900 p-4 rounded-lg border border-slate-800/80 shadow-md">
        
        {/* Search Input */}
        <div className="relative md:col-span-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-500" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-md text-sm placeholder-slate-500 text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-150"
            placeholder="Search by position title or SR abbreviation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-500 hover:text-white font-mono"
            >
              Clear
            </button>
          )}
        </div>

        {/* Shop Dropdown */}
        <div className="md:col-span-3">
          <select
            className="block w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-md text-sm text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
            value={shopFilter}
            onChange={(e) => setShopFilter(e.target.value)}
          >
            <option value="All">All Shops</option>
            {uniqueCategories.map((cat) => {
              const allowed = getDescendantShops(cat);
              const count = duties.filter(d => allowed.includes(d.category)).length;
              return (
                <option key={cat} value={cat}>
                  {cat} ({count})
                </option>
              );
            })}
          </select>
        </div>

        {/* Tier Dropdown */}
        <div className="md:col-span-3">
          <select
            className="block w-full py-2 px-3 bg-slate-950 border border-slate-800 rounded-md text-sm text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
          >
            <option value="All">All Tiers</option>
            <option value="4">Tier 4</option>
            <option value="3">Tier 3</option>
            <option value="2">Tier 2</option>
            <option value="1">Tier 1</option>
            <option value="none">Non-Tiered</option>
          </select>
        </div>

      </div>

      {/* Dynamic Grid / Table of Positions */}
      <div className="overflow-hidden bg-slate-900 border border-slate-800 rounded-lg shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th scope="col" className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider w-28">Tier</th>
                <th scope="col" className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider w-28">Shop</th>
                <th scope="col" className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider">Position Title</th>
                <th scope="col" className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider w-60">Senior Rater Abbreviation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {uniquePositions.length > 0 ? (
                uniquePositions.map((pos, idx) => {
                  return (
                    <tr
                      key={`${pos.jobTitle}-${pos.category}-${idx}`}
                      className="hover:bg-slate-850/50 transition-colors group"
                    >
                      {/* Tier Tag Column */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {pos.tierLevel === 4 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-950/40 border border-red-900/40 text-[10px] font-extrabold text-red-400 uppercase tracking-wide">
                            Tier 4
                          </span>
                        )}
                        {pos.tierLevel === 3 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950/40 border border-amber-900/40 text-[10px] font-bold text-amber-400 uppercase tracking-wide">
                            Tier 3
                          </span>
                        )}
                        {pos.tierLevel === 2 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-950/40 border border-blue-900/40 text-[10px] font-bold text-blue-400 uppercase tracking-wide">
                            Tier 2
                          </span>
                        )}
                        {pos.tierLevel === 1 && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-bold text-slate-300 uppercase tracking-wide">
                            Tier 1
                          </span>
                        )}
                        {pos.tierLevel === null && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-950 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                            Non-Tiered
                          </span>
                        )}
                      </td>

                      {/* Shop Column */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold text-slate-400 bg-slate-950 border border-slate-800">
                          {pos.category}
                        </span>
                      </td>

                      {/* Position Title Column */}
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
                          {pos.jobTitle}
                        </span>
                      </td>

                      {/* Senior Rater Abbreviation Column */}
                      <td className="px-4 py-3.5">
                        {pos.seniorRaterAbbreviation ? (
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span className="text-sm font-bold text-white font-mono bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                              {pos.seniorRaterAbbreviation}
                            </span>
                            <button
                              onClick={() => handleCopy(pos.seniorRaterAbbreviation)}
                              title="Copy abbreviation"
                              className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800 active:scale-90 transition-all cursor-pointer"
                            >
                              {copiedText === pos.seniorRaterAbbreviation ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-500 text-xs italic">
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>Unassigned / None</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-slate-500 text-sm italic">
                    No matching positions or senior rater abbreviations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
