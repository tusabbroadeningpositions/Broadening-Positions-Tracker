import React, { useState, useEffect } from "react";
import { UpdateRequest, Duty } from "../types";
import { approveUpdateRequest, updateRequestStatus, deleteUpdateRequest } from "../data/dutiesStore";
import { X, Check, AlertCircle, Calendar, Shield, Edit3, Trash2, ArrowRight, GitCompare, Maximize2, FileText } from "lucide-react";
import { getEmailTemplatesFromFirestore, formatEmailTemplate } from "../data/emailTemplates";

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

  // State for rejection reason modal
  const [rejectingRequest, setRejectingRequest] = useState<UpdateRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // State for deletion confirmation modal
  const [deletingRequest, setDeletingRequest] = useState<UpdateRequest | null>(null);

  // State for side-by-side scope review modal
  const [viewingScopeReq, setViewingScopeReq] = useState<UpdateRequest | null>(null);

  // Email templates state
  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      getEmailTemplatesFromFirestore()
        .then((temps) => setEmailTemplates(temps))
        .catch((err) => console.error("Error loading templates in requests console:", err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter requests
  const pendingRequests = requests.filter((r) => r.status === "pending");
  const resolvedRequests = requests.filter((r) => r.status !== "pending");
  const visibleRequests = activeTab === "pending" ? pendingRequests : resolvedRequests;

  const sendApprovalEmail = (req: UpdateRequest) => {
    if (!req.requestorEmail) return;

    const template = emailTemplates.find(t => t.id === "roster_update_approved");
    const replacements = {
      "{requestor}": req.requestor || "",
      "{jobTitle}": req.jobTitle || "",
      "{category}": req.category || "",
      "{requestedLastName}": req.requestedLastName || "",
      "{requestedRank}": req.requestedRank || ""
    };

    const subjectTemplate = template?.subject || `BP Tracker change request: {jobTitle}`;
    const bodyTemplate = template?.body || `Dear {requestor},

Your request to change {jobTitle} has been approved and updated.

Respectfully,

The BP Team`;

    const subject = formatEmailTemplate(subjectTemplate, replacements);
    const body = formatEmailTemplate(bodyTemplate, replacements);

    const mailtoUrl = `mailto:${encodeURIComponent(req.requestorEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  const sendRejectionEmail = (req: UpdateRequest, reason: string) => {
    if (!req.requestorEmail) return;

    const template = emailTemplates.find(t => t.id === "roster_update_rejected");
    const replacements = {
      "{requestor}": req.requestor || "",
      "{jobTitle}": req.jobTitle || "",
      "{category}": req.category || "",
      "{reason}": reason || ""
    };

    const subjectTemplate = template?.subject || `BP Tracker {jobTitle} update rejected`;
    const bodyTemplate = template?.body || `Dear {requestor},

Your request to change {jobTitle} on the BP tracker has been rejected.

Reason: {reason}

Respectfully,

The BP Team`;

    const subject = formatEmailTemplate(subjectTemplate, replacements);
    const body = formatEmailTemplate(bodyTemplate, replacements);

    const mailtoUrl = `mailto:${encodeURIComponent(req.requestorEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  const handleApprove = async (req: UpdateRequest) => {
    setProcessingId(req.id);
    setErrorMessage(null);
    try {
      await approveUpdateRequest(req);
      sendApprovalEmail(req);
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Failed to approve update request.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenRejectModal = (req: UpdateRequest) => {
    setRejectingRequest(req);
    setRejectionReason("");
  };

  const handleConfirmReject = async () => {
    if (!rejectingRequest) return;
    setProcessingId(rejectingRequest.id);
    setErrorMessage(null);
    const reqToReject = rejectingRequest;
    const reasonText = rejectionReason.trim();

    try {
      await updateRequestStatus(reqToReject.id, "rejected");
      sendRejectionEmail(reqToReject, reasonText);
      setRejectingRequest(null);
      setRejectionReason("");
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Failed to reject update request.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteRequest = (req: UpdateRequest) => {
    setDeletingRequest(req);
  };

  const handleConfirmDelete = async () => {
    if (!deletingRequest) return;
    setProcessingId(deletingRequest.id);
    setErrorMessage(null);
    try {
      await deleteUpdateRequest(deletingRequest.id);
      setDeletingRequest(null);
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Failed to delete history entry.");
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

    sendApprovalEmail(req);

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

                const targetDuty = allDuties.find((d) => d.id === req.dutyId);
                const currentScope = (req.currentScopeOfResponsibilities ?? targetDuty?.scopeOfResponsibilities ?? "").trim();
                const requestedScope = (req.requestedScopeOfResponsibilities || "").trim();
                const hasScopeData = currentScope !== "" || requestedScope !== "";
                const scopeChanged = currentScope !== requestedScope;

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
                        <span className="block text-[10px] uppercase font-black tracking-wider text-slate-500">Roster Field Changes</span>
                        
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
                            {req.requestorEmail && (
                              <span className="block text-[10px] text-emerald-400 font-mono mt-0.5 truncate">{req.requestorEmail}</span>
                            )}
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

                    {/* Side-by-Side Scope of Responsibility Review Panel */}
                    {hasScopeData && (
                      <div className="mx-4 mb-4 p-3 bg-slate-900/70 border border-slate-800 rounded-lg space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center space-x-2">
                            <GitCompare className="w-4 h-4 text-emerald-400" />
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-200">
                              Scope of Responsibility — Side-by-Side Review
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {scopeChanged ? (
                              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-800 rounded">
                                Scope Modified
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700 rounded">
                                Unchanged
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setViewingScopeReq(req)}
                              className="px-2.5 py-1 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded border border-slate-700 font-bold flex items-center space-x-1 cursor-pointer transition"
                            >
                              <Maximize2 className="w-3 h-3 text-emerald-400" />
                              <span>Full-Screen Comparison</span>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                          {/* Left Column: Current Scope */}
                          <div className="p-2.5 bg-slate-950 rounded border border-slate-800/80 space-y-1">
                            <div className="flex items-center justify-between border-b border-slate-850 pb-1 mb-1">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Current Scope</span>
                              <span className="text-[9px] font-mono text-slate-500">
                                {currentScope ? `${currentScope.length} chars` : "Empty"}
                              </span>
                            </div>
                            <p className="text-slate-300 text-[11px] leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto pr-1">
                              {currentScope || <span className="text-slate-500 italic">No current scope defined on duty record.</span>}
                            </p>
                          </div>

                          {/* Right Column: Requested Scope */}
                          <div className={`p-2.5 rounded border space-y-1 ${
                            scopeChanged ? "bg-amber-950/20 border-amber-800/50" : "bg-slate-950 border-slate-800/80"
                          }`}>
                            <div className="flex items-center justify-between border-b border-slate-850 pb-1 mb-1">
                              <span className={`text-[10px] font-black uppercase tracking-wider ${
                                scopeChanged ? "text-amber-300" : "text-slate-400"
                              }`}>
                                Requested Scope
                              </span>
                              <span className="text-[9px] font-mono text-slate-400">
                                {requestedScope ? `${requestedScope.length} chars` : "Empty"}
                              </span>
                            </div>
                            <p className={`text-[11px] leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto pr-1 ${
                              scopeChanged ? "text-amber-100 font-medium" : "text-slate-300"
                            }`}>
                              {requestedScope || <span className="text-slate-500 italic">No requested scope provided.</span>}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action buttons footer for PENDING requests */}
                    {req.status === "pending" ? (
                      <div className="px-4 py-3 bg-slate-950 border-t border-slate-850/80 flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          disabled={processingId !== null}
                          onClick={() => handleOpenRejectModal(req)}
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
                    ) : (
                      /* Action footer for RESOLVED history entries */
                      <div className="px-4 py-2.5 bg-slate-950 border-t border-slate-850/80 flex items-center justify-between">
                        <div className="text-[11px] font-medium text-slate-400 flex items-center space-x-2">
                          <span>Status:</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider ${
                              req.status === "approved"
                                ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/60"
                                : "bg-rose-950/80 text-rose-400 border border-rose-800/60"
                            }`}
                          >
                            {req.status}
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={processingId !== null}
                          onClick={() => handleDeleteRequest(req)}
                          className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-900/60 rounded text-xs font-semibold cursor-pointer transition flex items-center space-x-1.5 disabled:opacity-50"
                          title="Delete this history entry from database"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{processingId === req.id ? "Deleting..." : "Delete Entry"}</span>
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

      {/* Rejection Reason Modal */}
      {rejectingRequest && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-[70]">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">Reject Request</span>
                <h4 className="text-sm font-bold text-slate-100">{rejectingRequest.jobTitle}</h4>
              </div>
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Reason for rejection *
              </label>
              <p className="text-[11px] text-slate-400 mb-2">
                This explanation will be included in the automated rejection email to {rejectingRequest.requestor} ({rejectingRequest.requestorEmail || "no email provided"}).
              </p>
              <textarea
                rows={4}
                required
                placeholder="Enter reason for rejecting this change request..."
                className="w-full px-3 py-2 border border-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-rose-500 bg-slate-950 text-slate-200 text-xs font-medium resize-none"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setRejectingRequest(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingId !== null}
                onClick={handleConfirmReject}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded transition cursor-pointer disabled:opacity-50"
              >
                {processingId === rejectingRequest.id ? "Rejecting..." : "Done"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRequest && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-[70]">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Trash2 className="w-4 h-4 text-rose-500" />
                <h4 className="text-sm font-bold text-slate-100">Confirm Entry Deletion</h4>
              </div>
              <button
                type="button"
                onClick={() => setDeletingRequest(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete this <span className="font-bold text-rose-400 uppercase">{deletingRequest.status}</span> request entry for <strong className="text-white">{deletingRequest.jobTitle}</strong> submitted by <span className="text-amber-300">{deletingRequest.requestor}</span>?
              </p>
              <p className="text-[11px] text-slate-500 mt-2">
                This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingRequest(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingId !== null}
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded transition cursor-pointer disabled:opacity-50 flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{processingId === deletingRequest.id ? "Deleting..." : "Delete Permanently"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Side-by-Side Scope Review Modal */}
      {viewingScopeReq && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-[80]">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded">
                    {viewingScopeReq.category}
                  </span>
                  <h3 className="text-base font-bold text-slate-100">{viewingScopeReq.jobTitle}</h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Submitted by <strong className="text-slate-200">{viewingScopeReq.requestor}</strong> ({viewingScopeReq.requestorEmail || "No email"}) on {formatDate(viewingScopeReq.createdAt)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setViewingScopeReq(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Side-by-Side Comparison Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-slate-950/50">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                  <GitCompare className="w-4 h-4 text-emerald-400" />
                  <span>Scope of Responsibility Side-by-Side Comparison</span>
                </h4>

                {((viewingScopeReq.currentScopeOfResponsibilities ?? allDuties.find(d => d.id === viewingScopeReq.dutyId)?.scopeOfResponsibilities ?? "").trim() !== (viewingScopeReq.requestedScopeOfResponsibilities || "").trim()) ? (
                  <span className="px-2.5 py-1 text-xs font-bold bg-amber-950 text-amber-300 border border-amber-800 rounded">
                    MODIFIED SCOPE OF RESPONSIBILITY
                  </span>
                ) : (
                  <span className="px-2.5 py-1 text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700 rounded">
                    UNCHANGED SCOPE
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[400px]">
                {/* Left Panel: Current */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">Current Scope of Responsibility</span>
                    <span className="text-xs font-mono text-slate-500">Original Record</span>
                  </div>
                  <div className="p-4 bg-slate-950 rounded-lg border border-slate-800/80 flex-1 overflow-y-auto max-h-[450px]">
                    <p className="text-slate-200 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                      {(viewingScopeReq.currentScopeOfResponsibilities ?? allDuties.find(d => d.id === viewingScopeReq.dutyId)?.scopeOfResponsibilities ?? "").trim() ||
                        "No current scope defined for this position."}
                    </p>
                  </div>
                </div>

                {/* Right Panel: Requested */}
                <div className="bg-slate-900 border border-amber-900/60 rounded-xl p-4 flex flex-col">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-400">Requested Scope of Responsibility</span>
                    <span className="text-xs font-mono text-amber-500 font-bold">New Proposal</span>
                  </div>
                  <div className="p-4 bg-amber-950/20 rounded-lg border border-amber-800/40 flex-1 overflow-y-auto max-h-[450px]">
                    <p className="text-amber-100 text-xs leading-relaxed whitespace-pre-wrap font-sans font-medium">
                      {(viewingScopeReq.requestedScopeOfResponsibilities || "").trim() || "No requested scope provided."}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewingScopeReq(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
              >
                Close Comparison
              </button>

              {viewingScopeReq.status === "pending" && (
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={processingId !== null}
                    onClick={() => {
                      const req = viewingScopeReq;
                      setViewingScopeReq(null);
                      handleOpenRejectModal(req);
                    }}
                    className="px-3.5 py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white rounded text-xs font-semibold cursor-pointer transition flex items-center space-x-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                  <button
                    type="button"
                    disabled={processingId !== null}
                    onClick={() => {
                      const req = viewingScopeReq;
                      setViewingScopeReq(null);
                      handleEditManually(req);
                    }}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded text-xs font-semibold cursor-pointer transition flex items-center space-x-1"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Edit Manually</span>
                  </button>
                  <button
                    type="button"
                    disabled={processingId !== null}
                    onClick={() => {
                      const req = viewingScopeReq;
                      setViewingScopeReq(null);
                      handleApprove(req);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold cursor-pointer transition flex items-center space-x-1.5 shadow-lg shadow-emerald-950"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve & Update</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
