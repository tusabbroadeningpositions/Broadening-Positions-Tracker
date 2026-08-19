import React, { useState, useEffect } from "react";
import { Duty } from "../types";
import { updateVacancyDraftStatus, deleteVacancyDraft } from "../data/dutiesStore";
import { getShareableDraftUrl } from "../utils/shareUtils";
import { 
  X, Check, AlertCircle, Calendar, FileText, Trash2, 
  Copy, ExternalLink, ThumbsUp, ThumbsDown, User, Mail, Award, Clock
} from "lucide-react";
import { getEmailTemplatesFromFirestore, formatEmailTemplate } from "../data/emailTemplates";

interface VacancyDraftsConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  drafts: any[];
  allDuties: Duty[];
  onOpenDraft: (duty: Duty, draft: any) => void;
}

export default function VacancyDraftsConsole({
  isOpen,
  onClose,
  drafts,
  allDuties,
  onOpenDraft,
}: VacancyDraftsConsoleProps) {
  const [activeTab, setActiveTab] = useState<"pending" | "resolved">("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Email templates state
  const [emailTemplates, setEmailTemplates] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      getEmailTemplatesFromFirestore()
        .then((temps) => setEmailTemplates(temps))
        .catch((err) => console.error("Error loading templates in drafts console:", err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter drafts
  const pendingDrafts = drafts.filter((d) => d.status === "pending");
  const resolvedDrafts = drafts.filter((d) => d.status !== "pending");
  const visibleDrafts = activeTab === "pending" ? pendingDrafts : resolvedDrafts;

  const handleApproveClick = async (draft: any) => {
    const posTitle = draft.positionTitle || "Position";

    const template = emailTemplates.find(t => t.id === "vacancy_approved");
    const replacements = {
      "{positionTitle}": posTitle,
      "{shopName}": draft.shopName || "",
      "{pocRankName}": draft.pocRankName || ""
    };

    const subjectTemplate = template?.subject || `Vacancy Announcement for {positionTitle} has been approved.`;
    const bodyTemplate = template?.body || `Your vacancy announcement draft for {positionTitle} has been approved by the Broadening Positions Management Team and has been added to the BP vacancies page.

You may now send the vacancy announcement to ELs for full dissemination. Please use the EL distro list in Outlook.

Respectfully,

The Broadening Positions Management Team`;

    const emailSubject = formatEmailTemplate(subjectTemplate, replacements);
    const emailBody = formatEmailTemplate(bodyTemplate, replacements);

    const pocEmail = draft.pocEmail || "";
    const mailtoUrl = `mailto:${pocEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

    setProcessingId(draft.id);
    setErrorMessage(null);
    try {
      await updateVacancyDraftStatus(draft.id, "approved");
      window.location.href = mailtoUrl;
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Failed to approve draft and generate approval email.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleStatusChange = async (id: string, status: "pending" | "reviewed" | "approved" | "rejected") => {
    setProcessingId(id);
    setErrorMessage(null);
    try {
      await updateVacancyDraftStatus(id, status);
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Failed to update vacancy draft status.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectClick = (draft: any) => {
    setRejectingId(draft.id);
    setRejectFeedback("");
  };

  const handleConfirmReject = async (draft: any) => {
    const feedback = rejectFeedback.trim();
    const editUrl = getShareableDraftUrl(draft.id);
    const posTitle = draft.positionTitle || "Position";

    const template = emailTemplates.find(t => t.id === "vacancy_rejected");
    const replacements = {
      "{positionTitle}": posTitle,
      "{shopName}": draft.shopName || "",
      "{pocRankName}": draft.pocRankName || "",
      "{editUrl}": editUrl,
      "{feedback}": feedback || "Please see attached comments."
    };

    const subjectTemplate = template?.subject || `Vacancy Announcement Draft {positionTitle}: Feedback`;
    const bodyTemplate = template?.body || `Your Vacancy Announcement Draft needs edits: {editUrl}

Feedback: {feedback}

Respectfully,
Broadening Positions Team`;

    const emailSubject = formatEmailTemplate(subjectTemplate, replacements);
    const emailBody = formatEmailTemplate(bodyTemplate, replacements);

    const mailtoUrl = `mailto:${draft.pocEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    
    setProcessingId(draft.id);
    setErrorMessage(null);
    try {
      await updateVacancyDraftStatus(draft.id, "rejected");
      window.location.href = mailtoUrl;
      setRejectingId(null);
      setRejectFeedback("");
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Failed to reject draft and generate feedback email.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelReject = () => {
    setRejectingId(null);
    setRejectFeedback("");
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
  };

  const handleConfirmDeleteDraft = async () => {
    if (!deletingId) return;
    setProcessingId(deletingId);
    setErrorMessage(null);
    try {
      await deleteVacancyDraft(deletingId);
      setDeletingId(null);
    } catch (err: any) {
      console.error(err);
      setErrorMessage("Failed to delete vacancy draft.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleCopyLink = (draftId: string) => {
    const url = getShareableDraftUrl(draftId);
    navigator.clipboard.writeText(url)
      .then(() => {
        setCopiedId(draftId);
        setTimeout(() => setCopiedId(null), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy link:", err);
        alert("Failed to copy link to clipboard.");
      });
  };

  const handleOpenForReview = (draft: any) => {
    const targetDuty = allDuties.find((d) => d.id === draft.dutyId) || {
      id: draft.dutyId || "custom",
      category: draft.shopName,
      jobTitle: draft.positionTitle,
      lastName: "VACANT",
      rank: "",
      elementOrGroup: "",
      dutyType: "U"
    } as Duty;

    onOpenDraft(targetDuty, draft);
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
    <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-4xl w-full overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950 border-b border-slate-850 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-emerald-500 fill-emerald-500/10" />
            <div>
              <h3 className="text-sm font-bold text-slate-100 tracking-wider uppercase">Vacancy Drafts Review</h3>
              <p className="text-[11px] text-slate-400">Review, approve, copy shareable links, or export Word memos from submitted vacancy announcements.</p>
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
              Pending Reviews ({pendingDrafts.length})
            </button>
            <button
              onClick={() => { setActiveTab("resolved"); setErrorMessage(null); }}
              className={`py-3 text-xs font-bold uppercase tracking-wider relative cursor-pointer ${
                activeTab === "resolved"
                  ? "text-slate-100 border-b-2 border-slate-350"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Reviewed History ({resolvedDrafts.length})
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

          {visibleDrafts.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-800 rounded-lg">
              <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">No {activeTab} drafts found</p>
              <p className="text-slate-500 text-[11px] mt-1">
                {activeTab === "pending" 
                  ? "Visitor-submitted vacancy drafts will appear here for review." 
                  : "Reviewed drafts are archived here."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {visibleDrafts.map((draft) => {
                return (
                  <div
                    key={draft.id}
                    className="border border-slate-850 rounded-lg bg-slate-950/30 hover:bg-slate-950/50 transition overflow-hidden"
                  >
                    {/* Position Header Banner */}
                    <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-850 flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mr-2">{draft.shopName}</span>
                        <span className="font-bold text-slate-200">{draft.positionTitle}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        <span>{formatDate(draft.createdAt)}</span>
                        
                        {/* Status tag */}
                        {draft.status === "reviewed" && (
                          <span className="px-2 py-0.5 bg-sky-950/80 text-sky-400 border border-sky-900 rounded font-bold uppercase">Reviewed</span>
                        )}
                        {draft.status === "approved" && (
                          <span className="px-2 py-0.5 bg-emerald-950/80 text-emerald-400 border border-emerald-900 rounded font-bold uppercase">Approved</span>
                        )}
                        {draft.status === "rejected" && (
                          <span className="px-2 py-0.5 bg-rose-950/80 text-rose-400 border border-rose-900 rounded font-bold uppercase">Rejected</span>
                        )}
                      </div>
                    </div>

                    {/* Content details */}
                    <div className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4">
                      {/* Left: Metadata summary */}
                      <div className="md:col-span-8 space-y-3.5">
                        <div className="grid grid-cols-1 gap-4">
                          {/* POC Info block with POC Title */}
                          <div className="p-2.5 bg-slate-900/40 border border-slate-800 rounded space-y-1">
                            <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-400 flex items-center gap-1">
                              <User className="w-3.5 h-3.5" /> POC Info
                            </span>
                            <div className="text-[11px] font-semibold text-slate-300">
                              {draft.pocRankName || "N/A"}
                            </div>
                            {draft.signerTitle && (
                              <div className="text-[10px] text-slate-400 font-medium italic">
                                {draft.signerTitle}
                              </div>
                            )}
                            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1 pt-0.5">
                              <Mail className="w-3 h-3 text-slate-500" /> {draft.pocEmail || "No Email"}
                            </div>
                          </div>
                        </div>

                        {/* List details */}
                        <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono text-slate-400">
                          <div className="p-2 bg-slate-900/20 border border-slate-850 rounded">
                            <div className="text-slate-500 uppercase tracking-widest text-[8px] font-bold mb-0.5">Tier Level</div>
                            <span className="font-bold text-slate-300">Tier {draft.tierLevel || "N/A"}</span>
                          </div>
                          <div className="p-2 bg-slate-900/20 border border-slate-850 rounded">
                            <div className="text-slate-500 uppercase tracking-widest text-[8px] font-bold mb-0.5">Term Limits</div>
                            <span className="font-bold text-slate-300 truncate block max-w-full" title={draft.termDuration || (draft.isSpecialty ? "Specialty" : "N/A")}>
                              {draft.termDuration || (draft.isSpecialty ? "Specialty" : "N/A")}
                            </span>
                          </div>
                          <div className="p-2 bg-slate-900/20 border border-slate-850 rounded">
                            <div className="text-slate-500 uppercase tracking-widest text-[8px] font-bold mb-0.5">Deadline</div>
                            <span className="font-bold text-slate-300 text-amber-400">{draft.closeDeadlineDate || "N/A"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Quick Review Action Buttons */}
                      <div className="md:col-span-4 flex flex-col gap-2 justify-center border-t md:border-t-0 md:border-l border-slate-800/80 pt-4 md:pt-0 md:pl-4">
                        <button
                          onClick={() => handleOpenForReview(draft)}
                          className="w-full py-2 px-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 rounded text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Open full form to make edits and export Word document"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open & Export Word</span>
                        </button>

                        <button
                          onClick={() => handleCopyLink(draft.id)}
                          className="w-full py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-750 rounded text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {copiedId === draft.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedId === draft.id ? "Copied!" : "Copy Shareable Link"}</span>
                        </button>

                        {draft.status === "pending" ? (
                          rejectingId === draft.id ? (
                            <div className="flex flex-col gap-1.5 mt-1 bg-slate-950/60 p-2 border border-slate-800 rounded">
                              <span className="text-[9px] text-rose-400 font-bold uppercase tracking-wider">Rejection Feedback</span>
                              <textarea
                                value={rejectFeedback}
                                onChange={(e) => setRejectFeedback(e.target.value)}
                                placeholder="E.g., Please clarify close deadline or duty requirements..."
                                rows={2}
                                className="bg-slate-950 border border-slate-750 text-slate-200 text-[10px] rounded p-1.5 w-full focus:outline-none focus:ring-1 focus:ring-rose-500 font-sans resize-none"
                                disabled={processingId !== null}
                              />
                              <div className="flex gap-1">
                                <button
                                  disabled={processingId !== null}
                                  onClick={() => handleConfirmReject(draft)}
                                  className="flex-1 py-1 px-2 bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 border border-rose-500/30 rounded text-[9px] font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer"
                                  title="Confirm and send feedback email"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Send</span>
                                </button>
                                <button
                                  disabled={processingId !== null}
                                  onClick={handleCancelReject}
                                  className="py-1 px-2 bg-slate-850 hover:bg-slate-800 text-slate-400 border border-slate-750 rounded text-[9px] font-bold uppercase transition cursor-pointer font-semibold"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              <button
                                disabled={processingId !== null}
                                onClick={() => handleApproveClick(draft)}
                                className="py-1 px-2.5 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-400 border border-emerald-900/30 rounded text-[10px] font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer animate-pulse"
                                title="Approve this draft, publish to Vacancies list, and generate approval email to POC"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                disabled={processingId !== null}
                                onClick={() => handleRejectClick(draft)}
                                className="py-1 px-2.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-400 border border-rose-900/30 rounded text-[10px] font-bold uppercase transition flex items-center justify-center gap-1 cursor-pointer"
                                title="Reject this draft and email feedback to POC"
                              >
                                <ThumbsDown className="w-3 h-3" />
                                <span>Reject</span>
                              </button>
                            </div>
                          )
                        ) : (
                          <div className="flex items-center justify-between gap-2 mt-1">
                            <button
                              disabled={processingId !== null}
                              onClick={() => handleStatusChange(draft.id, "pending")}
                              className="text-[10px] text-slate-500 hover:text-slate-300 underline font-semibold cursor-pointer"
                            >
                              Mark Pending
                            </button>
                            <button
                              disabled={processingId !== null}
                              onClick={() => handleDelete(draft.id)}
                              className="py-1 px-2 text-rose-500 hover:bg-rose-500/10 rounded transition cursor-pointer"
                              title="Delete permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete Draft Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-[70]">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Trash2 className="w-4 h-4 text-rose-500" />
                <h4 className="text-sm font-bold text-slate-100">Confirm Draft Deletion</h4>
              </div>
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to permanently delete this vacancy announcement draft?
              </p>
              <p className="text-[11px] text-slate-500 mt-2">
                This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingId !== null}
                onClick={handleConfirmDeleteDraft}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded transition cursor-pointer disabled:opacity-50 flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{processingId === deletingId ? "Deleting..." : "Delete Permanently"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
