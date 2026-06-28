import React, { useMemo } from "react";
import { Duty } from "../types";
import { parseTermEndDate, getTermExpirationStatus } from "../data/dutiesStore";
import { Calendar, AlertCircle, CheckCircle, Clock, ExternalLink } from "lucide-react";

interface TermExpirationsViewProps {
  duties: Duty[];
  searchQuery: string;
}

export default function TermExpirationsView({ duties, searchQuery }: TermExpirationsViewProps) {
  const sortedExpirations = useMemo(() => {
    // Filter out VACANT or those without a date
    const withDates = duties.filter(d => {
      const name = d.lastName.trim().toUpperCase();
      if (!name || name === "VACANT") return false;
      const date = parseTermEndDate(d.termEndDate);
      return date !== null;
    });

    // Apply search query if present
    const filtered = withDates.filter(d => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        d.lastName.toLowerCase().includes(q) ||
        d.jobTitle.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q)
      );
    });

    // Sort by date ascending (oldest/past first)
    return filtered.sort((a, b) => {
      const dateA = parseTermEndDate(a.termEndDate)!;
      const dateB = parseTermEndDate(b.termEndDate)!;
      return dateA.getTime() - dateB.getTime();
    });
  }, [duties, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-500" />
            Term Expirations
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Tracking assignments by their mandatory removal date (MRD) or rotation term.
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Total Records</span>
          <span className="text-2xl font-black text-emerald-500">{sortedExpirations.length}</span>
        </div>
      </div>

      <div className="overflow-hidden bg-slate-900 border border-slate-800 rounded-lg shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th scope="col" className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">Expiration Date</th>
                <th scope="col" className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">Soldier</th>
                <th scope="col" className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">Position & Shop</th>
                <th scope="col" className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider">Term Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {sortedExpirations.length > 0 ? (
                sortedExpirations.map((duty) => {
                  const status = getTermExpirationStatus(duty.termEndDate, duty.lastName);
                  
                  return (
                    <tr key={duty.id} className="hover:bg-slate-850/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {status === "past" && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-950/40 border border-rose-900/50 text-[10px] font-bold text-rose-400 uppercase tracking-tight">
                            <AlertCircle className="w-3 h-3" />
                            Overdue
                          </span>
                        )}
                        {status === "warning" && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-950/40 border border-amber-900/50 text-[10px] font-bold text-amber-400 uppercase tracking-tight">
                            <Clock className="w-3 h-3" />
                            Expiring Soon
                          </span>
                        )}
                        {status === "ok" && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-900/50 text-[10px] font-bold text-emerald-400 uppercase tracking-tight">
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-bold font-mono ${status === 'past' ? 'text-rose-500' : status === 'warning' ? 'text-amber-400' : 'text-slate-300'}`}>
                          {duty.termEndDate}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-white uppercase">{duty.lastName}</span>
                          <span className="text-[10px] text-slate-500 font-medium">{duty.rank}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col max-w-xs">
                          <span className="text-xs font-semibold text-slate-300 truncate">{duty.jobTitle}</span>
                          <span className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-wider">{duty.category}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-sm font-mono border border-slate-700">
                          {duty.dutyType === 'EL' ? 'Element' : duty.dutyType === 'U' ? 'Unit' : 'N/A'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic text-sm">
                    No term expirations found matching your criteria.
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
