import React, { useMemo, useState } from "react";
import { Duty } from "../types";
import { parseTermEndDate, getTermExpirationStatus } from "../data/dutiesStore";
import { Calendar, AlertCircle, CheckCircle, Clock, Megaphone, X } from "lucide-react";
import VacancyAnnouncementModal from "./VacancyAnnouncementModal";
import { motion, AnimatePresence } from "motion/react";

interface TermExpirationsViewProps {
  duties: Duty[];
  searchQuery: string;
}

export default function TermExpirationsView({ duties, searchQuery }: TermExpirationsViewProps) {
  const [selectedDutyForVacancy, setSelectedDutyForVacancy] = useState<Duty | null>(null);
  const [dutyPendingConfirmation, setDutyPendingConfirmation] = useState<Duty | null>(null);

  const handleAnnounceClick = (duty: Duty) => {
    if (duty.dutyType === 'EL') {
      setDutyPendingConfirmation(duty);
    } else {
      setSelectedDutyForVacancy(duty);
    }
  };

  const confirmAnnouncement = () => {
    if (dutyPendingConfirmation) {
      setSelectedDutyForVacancy(dutyPendingConfirmation);
      setDutyPendingConfirmation(null);
    }
  };

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
                <th scope="col" className="px-2 py-4 text-[10px] font-bold uppercase tracking-wider w-24">Status</th>
                <th scope="col" className="px-2 py-4 text-[10px] font-bold uppercase tracking-wider w-32">Expiration Date</th>
                <th scope="col" className="px-3 py-4 text-[10px] font-bold uppercase tracking-wider">Soldier</th>
                <th scope="col" className="px-3 py-4 text-[10px] font-bold uppercase tracking-wider">Position & Shop</th>
                <th scope="col" className="px-3 py-4 text-[10px] font-bold uppercase tracking-wider">Scope</th>
                <th scope="col" className="px-3 py-4 text-[10px] font-bold uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {sortedExpirations.length > 0 ? (
                sortedExpirations.map((duty) => {
                  const status = getTermExpirationStatus(duty.termEndDate, duty.lastName);
                  
                  return (
                    <tr key={duty.id} className="hover:bg-slate-850/50 transition-colors group">
                      <td className="px-2 py-4 whitespace-nowrap">
                        {status === "past" && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-950/40 border border-rose-900/50 text-[10px] font-bold text-rose-400 uppercase tracking-tight">
                            <AlertCircle className="w-3 h-3" />
                            Overdue
                          </span>
                        )}
                        {status === "warning" && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-950/40 border border-amber-900/50 text-[10px] font-bold text-amber-400 uppercase tracking-tight">
                            <Clock className="w-3 h-3" />
                            Expiring
                          </span>
                        )}
                        {status === "ok" && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-900/50 text-[10px] font-bold text-emerald-400 uppercase tracking-tight">
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-4 whitespace-nowrap">
                        <div className={`text-sm font-bold font-mono ${status === 'past' ? 'text-rose-500' : status === 'warning' ? 'text-amber-400' : 'text-slate-300'}`}>
                          {duty.termEndDate}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                           <span className="text-sm font-bold text-white uppercase">{duty.lastName}</span>
                          <span className="text-[10px] text-slate-500 font-medium">{duty.rank}</span>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex flex-col max-w-xs">
                          <span className="text-xs font-semibold text-slate-300 truncate">{duty.jobTitle}</span>
                          <span className="text-[10px] text-emerald-500/70 font-bold uppercase tracking-wider">{duty.category}</span>
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <span className="text-[10px] px-2 py-0.5 bg-slate-800 text-slate-400 rounded-sm font-mono border border-slate-700">
                          {duty.dutyType === 'EL' ? 'EL' : duty.dutyType === 'U' ? 'U' : 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleAnnounceClick(duty)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 text-xs font-bold rounded shadow-sm shadow-emerald-500/10 transition-all cursor-pointer"
                        >
                          <Megaphone className="w-3.5 h-3.5" />
                          Announce Vacancy
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic text-sm">
                    No term expirations found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vacancy Announcement Modal */}
      {selectedDutyForVacancy && (
        <VacancyAnnouncementModal
          duty={selectedDutyForVacancy}
          onClose={() => setSelectedDutyForVacancy(null)}
        />
      )}

      {/* Confirmation Modal for Element Positions */}
      <AnimatePresence>
        {dutyPendingConfirmation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDutyPendingConfirmation(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md overflow-hidden bg-slate-900 border border-slate-800 rounded-xl shadow-2xl"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4 text-amber-400">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Assignment Policy</h3>
                </div>
                
                <p className="text-slate-300 text-sm leading-relaxed mb-6">
                  Most <span className="font-bold text-white">Element</span> positions are assigned directly by the Element Leader and typically do not require a vacancy announcement. 
                  <br /><br />
                  Are you sure you want to proceed with a vacancy announcement for this position?
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setDutyPendingConfirmation(null)}
                    className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmAnnouncement}
                    className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-sm font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Yes, Proceed
                  </button>
                </div>
              </div>
              
              <button 
                onClick={() => setDutyPendingConfirmation(null)}
                className="absolute top-4 right-4 p-1 text-slate-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
