import React, { useState } from "react";
import { UpdateRequest, Duty } from "../types";
import { approveUpdateRequest, updateRequestStatus } from "../data/dutiesStore";
import { X, Check, AlertCircle, Calendar, Shield, Edit3, Trash2, ArrowRight } from "lucide-react";

interface UpdateRequestsConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  requests: UpdateRequest[];
  allDuties: Duty[];
  onEditDuty: (duty: Duty) => void;
}

export default function UpdateRequestsConsole({
  isOpen,
  onClose,
  requests,
  allDuties,
  onEditDuty,
}: UpdateRequestsConsoleProps) {
  const [activeTab, setActiveTab] = useState<"pending" | "resolved">("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter requests
  const pendingRequests = requests.filter((r) => r.status === "pending");
  const resolvedRequests = requests.filter((r) => r.status !== "pending");
  const visibleRequests = activeTab === "pending" ? pendingRequests : resolvedRequests;

  const handleApprove = async (req: UpdateRequest) => {
    setProcessingId(req.id);
    setErrorMessage(null);
    try {
      await approveUpdateRequest(req);
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Failed to approve update request.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (req: UpdateRequest) => {
    setProcessingId(req.id);
    setErrorMessage(null);
    try {
      await updateRequestStatus(req.id, "rejected");
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Failed to reject update request.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleEditManually = (req: UpdateRequest) => {
    const targetDuty = allDuties.find((d) => d.id === req.dutyId);
    if (!targetDuty) {
      alert("Error: The corresponding duty record was not found or has been deleted.");
      return;
    }
    
    // Automatically approve/resolve this request, since we are doing it manually
    updateRequestStatus(req.id, "approved").catch(err => {
      console.error("Failed to automatically approve on manual edit:", err);
    });

    onEditDuty(targetDuty);
    onClose();
  };

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-4xl w-full overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-850 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-emerald-500 fill-emerald-500/10" />
            <div>
              <h3 className="text-sm font-bold text-slate-100 tracking-wider uppercase">Visitor Update Requests</h3>
              <p className="text-[11px] text-slate-400">Review, approve, or manually override requested changes for roster positions.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white rounded p-1 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-6 bg-slate-950/40 border-b border-slate-850 flex items-center justify-between">
          <div className="flex space-x-4">
            <button
              onClick={() => { setActiveTab("pending"); setErrorMessage(null); }}
              className={`py-3 text-xs font-bold uppercase tracking-wider relative cursor-pointer ${
                activeTab === "pending"
                  ? "text-emerald-400 border-b-2 border-emerald-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Pending Requests ({pendingRequests.length})
            </button>
            <button
              onClick={() => { setActiveTab("resolved"); setErrorMessage(null); }}
              className={`py-3 text-xs font-bold uppercase tracking-wider relative cursor-pointer ${
                activeTab === "resolved"
                  ? "text-slate-100 border-b-2 border-slate-300"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Resolved History ({resolvedRequests.length})
            </button>
          </div>
        </div>

        {/* Console Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-950/40 border border-rose-900/50 rounded flex items-start gap-2 text-rose-300 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {visibleRequests.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-lg">
              <Shield className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">No {activeTab} requests found</p>
              <p className="text-slate-500 text-[11px] mt-1">
                {activeTab === "pending" 
                  ? "Visitor-submitted roster updates will appear here." 
                  : "Approved and rejected requests are archived here."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleRequests.map((req) => {
                const nameChanged = req.currentLastName !== req.requestedLastName;
                const rankChanged = req.currentRank !== req.requestedRank;
                const dateChanged = req.currentDateStarted !== req.requestedDateStarted;

                return (
                  <div
                    key={req.id}
                    className="border border-slate-800 rounded-lg bg-slate-950/40 hover:bg-slate-950/60 transition overflow-hidden"
                  >
                    {/* Position Header Banner */}
                    <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-850 flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mr-2">{req.category}</span>
                        <span className="font-bold text-slate-200">{req.jobTitle}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{formatDate(req.createdAt)}</span>
                        
                        {/* Status tag */}
                        {req.status === "approved" && (
                          <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-400 border border-emerald-900 rounded font-bold uppercase">Approved</span>
                        )}
                        {req.status === "rejected" && (
                          <span className="px-2 py-0.5 bg-rose-950/80 text-rose-400 border border-rose-900 rounded font-bold uppercase">Rejected</span>
                        )}
                      </div>
                    </div>

                    {/* Comparison Card */}
                    <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
                      
                      {/* Comparison Columns (Grid width: 7) */}
                      <div className="md:col-span-7 space-y-2">
                        <span className="block text-[10px] uppercase font-black tracking-wider text-slate-500">Comparison (Current vs. Requested)</span>
                        
                        {/* Comparison rows */}
                        <div className="space-y-1.5 font-mono text-[11px]">
                          {/* Soldier Name */}
                          <div className={`p-2 rounded border flex items-center justify-between ${
                            nameChanged ? "bg-amber-950/20 border-amber-900/40 text-amber-300" : "bg-slate-900/40 border-slate-800/60 text-slate-400"
                          }`}>
                            <span className="text-[9px] uppercase font-semibold text-slate-500 shrink-0 w-24">Soldier</span>
                            <div className="flex items-center space-x-2 truncate w-full justify-end font-semibold">
                              <span className="truncate max-w-[120px] line-through text-slate-500">{req.currentLastName}</span>
                              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                              <span className={nameChanged ? "text-emerald-400 font-bold" : ""}>{req.requestedLastName}</span>
                            </div>
                          </div>

                          {/* Rank */}
                          <div className={`p-2 rounded border flex items-center justify-between ${
                            rankChanged ? "bg-amber-950/20 border-amber-900/40 text-amber-300" : "bg-slate-900/40 border-slate-800/60 text-slate-400"
                          }`}>
                            <span className="text-[9px] uppercase font-semibold text-slate-500 shrink-0 w-24">Rank</span>
                            <div className="flex items-center space-x-2 w-full justify-end font-semibold">
                              <span className="line-through text-slate-500">{req.currentRank || "N/A"}</span>
                              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                              <span className={rankChanged ? "text-emerald-400 font-bold" : ""}>{req.requestedRank}</span>
                            </div>
                          </div>

                          {/* Date Started */}
                          <div className={`p-2 rounded border flex items-center justify-between ${
                            dateChanged ? "bg-amber-950/20 border-amber-900/40 text-amber-300" : "bg-slate-900/40 border-slate-800/60 text-slate-400"
                          }`}>
                            <span className="text-[9px] uppercase font-semibold text-slate-500 shrink-0 w-24">Date Started</span>
                            <div className="flex items-center space-x-2 truncate w-full justify-end font-semibold">
                              <span className="truncate max-w-[120px] line-through text-slate-500">{req.currentDateStarted}</span>
                              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                              <span className={dateChanged ? "text-emerald-400 font-bold" : ""}>{req.requestedDateStarted}</span>
                            </div>
                          </div>

                          {/* Scope of Responsibilities */}
                          {req.requestedScopeOfResponsibilities && (
                            <div className="p-2 rounded border bg-slate-900/40 border-slate-800/60 text-slate-400">
                              <span className="block text-[9px] uppercase font-semibold text-slate-500 mb-1">Requested Scope of Responsibility</span>
                              <p className="text-[10px] text-slate-300 font-sans italic line-clamp-3">
                                {req.requestedScopeOfResponsibilities}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Meta Information & Justification (Grid width: 5) */}
                      <div className="md:col-span-5 flex flex-col justify-between space-y-3.5">
                        <div>
                          <span className="block text-[10px] uppercase font-black tracking-wider text-slate-500 mb-2">Meta & Attributes</span>
                          
                          <div className="grid grid-cols-2 gap-2 text-[11px]">
                            <div className="p-2 bg-slate-900/40 rounded border border-slate-800 flex flex-col items-center justify-center text-center">
                              <span className="text-[9px] text-slate-500 uppercase tracking-tight">New Hire?</span>
                              <span className={`font-bold mt-0.5 ${req.isNewHire ? "text-emerald-400" : "text-slate-400"}`}>
                                {req.isNewHire ? "YES" : "NO"}
                              </span>
                            </div>

                            {req.isNewHire && (
                              <div className="p-2 bg-slate-900/40 rounded border border-slate-800 flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95">
                                <span className="text-[9px] text-slate-500 uppercase tracking-tight">CSM Approved?</span>
                                <span className={`font-bold mt-0.5 ${req.isCsmApproved ? "text-emerald-400" : "text-amber-500"}`}>
                                  {req.isCsmApproved ? "APPROVED" : "PENDING"}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="mt-2 p-2 bg-slate-900/40 rounded border border-slate-800">
                            <span className="block text-[9px] text-slate-500 uppercase tracking-tight font-bold">Requestor</span>
                            <span className="text-slate-200 font-bold text-xs">{req.requestor}</span>
                          </div>
                        </div>

                        {req.justification && (
                          <div className="bg-slate-900/50 border border-slate-850 p-2.5 rounded text-xs">
                            <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-1">Justification</span>
                            <p className="text-slate-300 italic">"{req.justification}"</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons footer for PENDING requests */}
                    {req.status === "pending" && (
                      <div className="px-4 py-3 bg-slate-950 border-t border-slate-850/80 flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={processingId !== null}
                          onClick={() => handleReject(req)}
                          className="px-3 py-1.5 bg-rose-950/50 hover:bg-rose-900 text-rose-300 hover:text-white rounded text-xs font-semibold cursor-pointer transition flex items-center space-x-1 disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                        
                        <button
                          type="button"
                          disabled={processingId !== null}
                          onClick={() => handleEditManually(req)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 rounded text-xs font-semibold cursor-pointer transition flex items-center space-x-1 disabled:opacity-50"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Manually</span>
                        </button>

                        <button
                          type="button"
                          disabled={processingId !== null}
                          onClick={() => handleApprove(req)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-black cursor-pointer transition flex items-center space-x-1 shadow-sm disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{processingId === req.id ? "Approving..." : "Approve & Update"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-850 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-750 transition rounded cursor-pointer"
          >
            Close Console
          </button>
        </div>

      </div>
    </div>
  );
}
