import React from "react";
import { Duty } from "../types";
import { X, Calendar, User, Briefcase, Award, Clock } from "lucide-react";

interface DutyInspectorModalProps {
  duty: Duty;
  onClose: () => void;
}

export default function DutyInspectorModal({ duty, onClose }: DutyInspectorModalProps) {
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-900 rounded-lg shadow-2xl border border-slate-800 max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 flex items-center justify-between border-b border-slate-850">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-200">Position Inspector</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white rounded p-1 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Two Column Layout */}
        <div className="flex flex-col md:flex-row flex-1 overflow-y-auto">
          
          {/* Left Column: Scope & Title */}
          <div className="flex-1 p-6 border-r border-slate-850 bg-slate-900/50">
            <div className="mb-6">
              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                {duty.category}
              </span>
              <h1 className="text-2xl font-black text-white leading-tight">
                {duty.jobTitle}
              </h1>
              {duty.seniorRaterAbbreviation && (
                <div className="mt-2 text-sm font-bold text-emerald-400 bg-emerald-950/30 inline-block px-2 py-1 rounded border border-emerald-900/50">
                  Senior Rater Abbreviation: {duty.seniorRaterAbbreviation}
                </div>
              )}
            </div>

            <div className="mt-8">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                Scope of Responsibilities
              </h3>
              <div className="prose prose-invert prose-sm max-w-none">
                {duty.scopeOfResponsibilities ? (
                  <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {duty.scopeOfResponsibilities}
                  </p>
                ) : (
                  <p className="text-slate-500 italic">No scope of responsibilities provided.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Position Details */}
          <div className="w-full md:w-72 p-5 bg-slate-950 shrink-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-850 pb-2">
              Position Details
            </h3>
            
            <div className="space-y-4">
              
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-slate-500 mt-0.5" />
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Assigned Personnel</span>
                  <div className="text-sm font-bold text-slate-200">
                    {duty.lastName.toUpperCase() === "VACANT" ? (
                      <span className="text-rose-400">VACANT</span>
                    ) : (
                      `${duty.rank} ${duty.lastName}`
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Award className="w-4 h-4 text-slate-500 mt-0.5" />
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Classification & Tier</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <span className="inline-flex px-1.5 py-0.5 text-xs font-bold bg-slate-800 text-slate-300 rounded border border-slate-700">
                      {duty.dutyType === "EL" ? "Element" : duty.dutyType === "U" ? "Unit" : "N/A"}
                    </span>
                    {duty.isNonTiered ? (
                      <span className="inline-flex px-1.5 py-0.5 text-xs font-bold bg-slate-800 text-slate-400 rounded border border-slate-700">
                        NON-TIERED
                      </span>
                    ) : duty.tierLevel !== null ? (
                      <span className={`inline-flex px-1.5 py-0.5 text-xs font-bold rounded border ${
                        duty.tierLevel === 4
                          ? "bg-purple-950/40 text-purple-400 border-purple-900/50"
                          : duty.tierLevel === 3
                          ? "bg-amber-950/40 text-amber-400 border-amber-900/50"
                          : duty.tierLevel === 2
                          ? "bg-slate-800 text-slate-300 border-slate-600"
                          : "bg-slate-900 text-slate-400 border-slate-700"
                      }`}>
                        Tier {duty.tierLevel}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-4 h-4 text-slate-500 mt-0.5" />
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Term Info</span>
                  {duty.isNonTiered ? (
                    <div className="text-xs text-slate-400">N/A (Non-Tiered)</div>
                  ) : (
                    <>
                      <div className="text-xs text-slate-300 font-medium">Length: {duty.termLength || "N/A"}</div>
                      <div className="text-xs text-slate-300 font-medium mt-0.5">End Date: {duty.termEndDate || "N/A"}</div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-slate-500 mt-0.5" />
                <div>
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Date Started</span>
                  <div className="text-sm font-medium text-slate-300">{duty.dateStarted || "N/A"}</div>
                </div>
              </div>

              {(duty.isCommandAppointed || duty.specialized) && (
                <div className="pt-2 border-t border-slate-850 mt-2 space-y-2">
                  {duty.isCommandAppointed && (
                    <div className="inline-flex items-center px-2 py-1 text-xs font-extrabold bg-sky-950/40 text-sky-400 rounded border border-sky-900/50 uppercase tracking-wider">
                      Command Appointed
                    </div>
                  )}
                  {duty.specialized && (
                    <div className="inline-flex items-center px-2 py-1 text-xs font-extrabold bg-emerald-950/40 text-emerald-400 rounded border border-emerald-900/50 uppercase tracking-wider">
                      Specialized Title
                    </div>
                  )}
                </div>
              )}
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
