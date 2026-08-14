import React, { useState } from "react";
import { Duty } from "../types";
import { submitUpdateRequest } from "../data/dutiesStore";
import { X, Send, AlertCircle, HelpCircle } from "lucide-react";

interface RequestUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  duty: Duty;
  onSubmitSuccess?: () => void;
}

const MILITARY_RANKS = ["CSM", "SGM", "MSG", "SFC", "SSG", "SGT", "SPC", "PFC", "PV2", "PV1", "CIV", "N/A"];

export default function RequestUpdateModal({
  isOpen,
  onClose,
  duty,
  onSubmitSuccess,
}: RequestUpdateModalProps) {
  const [requestor, setRequestor] = useState("");
  const [requestorEmail, setRequestorEmail] = useState("");
  const [requestedLastName, setRequestedLastName] = useState(duty.lastName);
  const [requestedRank, setRequestedRank] = useState(duty.rank || "SPC");
  const [requestedDateStarted, setRequestedDateStarted] = useState(duty.dateStarted || "");
  const [requestedScopeOfResponsibilities, setRequestedScopeOfResponsibilities] = useState(duty.scopeOfResponsibilities || "");
  const [isNewHire, setIsNewHire] = useState(false);
  const [isCsmApproved, setIsCsmApproved] = useState(false);
  const [justification, setJustification] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingScope, setIsEditingScope] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestor.trim()) {
      setError("Your Name (Requestor) is required.");
      return;
    }
    if (!requestorEmail.trim()) {
      setError("Your Email Address (.mil) is required.");
      return;
    }
    if (!requestedLastName.trim()) {
      setError("Soldier's Last Name is required.");
      return;
    }
    if (!requestedDateStarted.trim()) {
      setError("Date Started is required.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await submitUpdateRequest({
        dutyId: duty.id,
        category: duty.category,
        jobTitle: duty.jobTitle,
        currentLastName: duty.lastName,
        currentRank: duty.rank,
        currentDateStarted: duty.dateStarted || "N/A",
        currentScopeOfResponsibilities: duty.scopeOfResponsibilities || "",
        requestedLastName: requestedLastName.trim(),
        requestedRank,
        requestedDateStarted: requestedDateStarted.trim(),
        requestor: requestor.trim(),
        requestorEmail: requestorEmail.trim(),
        requestedScopeOfResponsibilities: requestedScopeOfResponsibilities.trim(),
        isNewHire,
        isCsmApproved: isNewHire ? isCsmApproved : false,
        justification: justification.trim() || undefined,
      });

      if (onSubmitSuccess) {
        onSubmitSuccess();
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setError("Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-[60] overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-850 flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-black uppercase tracking-wider text-emerald-400">Request Information Update</span>
            <h3 className="text-sm font-bold text-slate-100 truncate max-w-[320px]">{duty.jobTitle}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white rounded p-1 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-900/50 rounded flex items-start gap-2 text-rose-300 text-xs animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Info Row */}
          <div className="bg-slate-950/40 border border-slate-850 p-3 rounded text-xs space-y-1.5">
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current Roster Info</span>
            <div className="grid grid-cols-3 gap-2 text-slate-300 font-mono text-[11px]">
              <div>
                <span className="block text-[9px] text-slate-500">SOLDIER</span>
                <span className="font-semibold text-slate-200">{duty.lastName}</span>
              </div>
              <div>
                <span className="block text-[9px] text-slate-500">RANK</span>
                <span className="font-semibold text-slate-200">{duty.rank || "N/A"}</span>
              </div>
              <div>
                <span className="block text-[9px] text-slate-500">DATE STARTED</span>
                <span className="font-semibold text-slate-200">{duty.dateStarted || "N/A"}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-850 my-3"></div>

          {/* New Requested Fields */}
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-yellow-400 mb-1">
                  Who is making this request? *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SFC Smith or HR Office"
                  className="w-full px-3 py-2 border border-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-950 text-slate-200 text-xs font-semibold"
                  value={requestor}
                  onChange={(e) => setRequestor(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-yellow-400 mb-1">
                  Your Email Address (.mil) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. john.smith.mil@army.mil"
                  className="w-full px-3 py-2 border border-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-950 text-slate-200 text-xs font-semibold"
                  value={requestorEmail}
                  onChange={(e) => setRequestorEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Requested Scope of Responsibility
              </label>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingScope(true)}
                  className="w-full px-3 py-2 border border-slate-800 rounded bg-slate-950 text-emerald-400 text-xs font-bold hover:bg-slate-900 transition flex items-center justify-center gap-2 cursor-pointer border-dashed"
                >
                  {requestedScopeOfResponsibilities ? "✎ Edit Scope Details..." : "+ Add Scope of Responsibility..."}
                </button>
                {requestedScopeOfResponsibilities && (
                  <div className="text-[10px] text-slate-500 italic px-1 line-clamp-2">
                    "{requestedScopeOfResponsibilities}"
                  </div>
                )}
              </div>

              {/* Large Editing Area Overlay */}
              {isEditingScope && (
                <div className="fixed inset-0 bg-slate-950/95 flex flex-col z-[70] animate-in fade-in duration-200">
                  <div className="px-6 py-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Deep Editing Mode</span>
                      <h4 className="text-sm font-bold text-slate-100">Scope of Responsibilities</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditingScope(false)}
                      className="px-4 py-1.5 bg-emerald-500 text-slate-950 text-xs font-black rounded hover:bg-emerald-400 transition cursor-pointer"
                    >
                      Save & Close
                    </button>
                  </div>
                  <div className="flex-1 p-6">
                    <textarea
                      autoFocus
                      className="w-full h-full bg-transparent text-slate-200 text-sm font-medium leading-relaxed resize-none focus:outline-none placeholder:text-slate-700"
                      placeholder="Enter the full scope of responsibilities, duties, and key performance indicators for this position..."
                      value={requestedScopeOfResponsibilities}
                      onChange={(e) => setRequestedScopeOfResponsibilities(e.target.value)}
                    />
                  </div>
                  <div className="p-4 bg-slate-950 text-[10px] text-slate-500 border-t border-slate-900 text-center">
                    Changes are stored locally until you submit the main request.
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Requested Soldier's Name (Last Name) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. SMITH or VACANT"
                className="w-full px-3 py-2 border border-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-950 text-slate-200 text-xs font-semibold"
                value={requestedLastName}
                onChange={(e) => setRequestedLastName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Requested Rank *
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-950 text-slate-200 text-xs font-semibold cursor-pointer"
                  value={requestedRank}
                  onChange={(e) => setRequestedRank(e.target.value)}
                >
                  {MILITARY_RANKS.map((r) => (
                    <option key={r} value={r} className="bg-slate-950 text-slate-300">
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Date Started *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 10/15/24 or N/A"
                  className="w-full px-3 py-2 border border-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-950 text-slate-200 text-xs font-semibold"
                  value={requestedDateStarted}
                  onChange={(e) => setRequestedDateStarted(e.target.value)}
                />
              </div>
            </div>

            {/* Switch Toggles */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-2.5 bg-slate-950/40 rounded border border-slate-850">
                <div className="flex flex-col pr-4">
                  <span className="text-[11px] font-bold text-slate-300">Is this a new hire?</span>
                  <span className="text-[9px] text-slate-500">Check this if the soldier is newly assigned to this broadening position.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isNewHire}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setIsNewHire(val);
                      if (!val) {
                        setIsCsmApproved(false);
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {isNewHire && (
                <div className="flex items-center justify-between p-2.5 bg-slate-950/40 rounded border border-slate-850 animate-in slide-in-from-top-1 duration-150">
                  <div className="flex flex-col pr-4">
                    <span className="text-[11px] font-bold text-slate-300">Has the hire been approved by the CSM?</span>
                    <span className="text-[9px] text-slate-500">Check if Command Sergeant Major approval is secured.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isCsmApproved}
                      onChange={(e) => setIsCsmApproved(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Justification (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Provide reasons, reference orders, or notes for the admin..."
                className="w-full px-3 py-2 border border-slate-800 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-slate-950 text-slate-200 text-xs font-semibold resize-none"
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
              />
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="pt-3 border-t border-slate-850 flex items-center justify-end space-x-2 bg-slate-900">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-black text-slate-950 bg-emerald-500 hover:bg-emerald-400 rounded transition cursor-pointer flex items-center space-x-1 shadow-sm disabled:opacity-50"
            >
              <Send className="w-3 h-3" />
              <span>{isSubmitting ? "Submitting..." : "Submit Request"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
