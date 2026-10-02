import React, { useState, useEffect } from "react";
import { X, Check, Edit3, Eye, FileText, RotateCcw } from "lucide-react";

export type PreviewTarget =
  | { field: "positionTitle"; label: string; section: string }
  | { field: "shopName"; label: string; section: string }
  | { field: "memoDate"; label: string; section: string }
  | { field: "slots"; label: string; section: string }
  | { field: "tierLevel"; label: string; section: string }
  | { field: "isSpecialty" | "termDuration"; label: string; section: string }
  | { field: "rankRequirement"; label: string; section: string }
  | { field: "eligibility"; index: number; label: string; section: string }
  | { field: "responsibility"; index: number; label: string; section: string }
  | { field: "pocRankName"; label: string; section: string }
  | { field: "pocEmail"; label: string; section: string }
  | { field: "closeDeadlineDate"; label: string; section: string }
  | { field: "signerNameCaps"; label: string; section: string }
  | { field: "signerRank"; label: string; section: string }
  | { field: "signerTitle"; label: string; section: string }
  | { field: "fullMemo"; label: string; section: string };

export const RANK_REQUIREMENT_OPTIONS = [
  "Open to all Soldiers",
  "SSG",
  "SFC",
  "MSG",
  "SGM",
  "SSG and above",
  "SFC and above",
  "MSG and above",
] as const;

interface VacancyMemoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  target: PreviewTarget | null;
  memoData: {
    positionTitle: string;
    shopName: string;
    memoDate: string;
    slots: number;
    tierLevel: string;
    isSpecialty: boolean;
    termDuration: string;
    paragraph1CustomText?: string;
    paragraph5CustomText?: string;
    eligibilityRequirements: string[];
    responsibilities: string[];
    pocRankName: string;
    pocEmail: string;
    closeDeadlineDate: string;
    signerNameCaps: string;
    signerRank: string;
    signerTitle: string;
  };
  onUpdateField: (fieldKey: string, value: any) => void;
  onUpdateEligibilityItem?: (index: number, value: string) => void;
  onUpdateResponsibilityItem?: (index: number, value: string) => void;
}

export default function VacancyMemoPreviewModal({
  isOpen,
  onClose,
  target,
  memoData,
  onUpdateField,
  onUpdateEligibilityItem,
  onUpdateResponsibilityItem,
}: VacancyMemoPreviewModalProps) {
  const [editedParagraph, setEditedParagraph] = useState<string>("");
  const [selectedRank, setSelectedRank] = useState<string>("SSG and above");
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);

  // Helper to format rank requirement sentence in preview
  const formatRankSentence = (rawVal: string) => {
    const trimmed = (rawVal || "").trim();
    if (!trimmed) {
      return "Candidates must be [Rank Requirement] to apply for this position.";
    }
    const lower = trimmed.toLowerCase();
    if (
      lower.startsWith("candidates must be") ||
      lower.startsWith("this position is") ||
      lower.startsWith("open to all soldiers to apply")
    ) {
      return trimmed;
    }
    if (lower === "open to all soldiers") {
      return "Candidates must be open to all Soldiers to apply for this position.";
    }
    return `Candidates must be ${trimmed} to apply for this position.`;
  };

  // Helper to build standard text for each target
  const getStandardTextForTarget = (t: PreviewTarget) => {
    const slots = Number(memoData.slots) || 1;
    const posTitle = memoData.positionTitle || "[Position Title]";
    const shop = memoData.shopName || "[Shop Name]";
    const tier = memoData.tierLevel || "1";
    const term = memoData.termDuration || "2 to 5 years";
    const memoDate = memoData.memoDate || "[Memo Date]";
    const pocName = memoData.pocRankName || "[POC Rank & Name]";
    const pocEmail = memoData.pocEmail || "[poc.email@army.mil]";
    const closeDate = memoData.closeDeadlineDate || "[Close Date]";
    const signerName = memoData.signerNameCaps || "[SHOP NCOIC'S NAME]";
    const signerRank = memoData.signerRank || "[RANK, USA]";
    const signerTitle = memoData.signerTitle || "[Title, i.e., TUSAB Training NCOIC]";

    if (t.field === "rankRequirement") {
      const rawReq = (memoData.eligibilityRequirements?.[0] || "SSG and above").trim();
      if (/^a\.\s*/i.test(rawReq)) {
        return rawReq;
      }
      return `a.  ${formatRankSentence(rawReq)}`;
    }

    if (
      t.field === "positionTitle" ||
      t.field === "shopName" ||
      t.field === "slots" ||
      t.field === "tierLevel" ||
      t.field === "isSpecialty" ||
      t.field === "termDuration"
    ) {
      if (memoData.paragraph1CustomText && memoData.paragraph1CustomText.trim() !== "") {
        return memoData.paragraph1CustomText.trim();
      }
      return `1.  The ${shop} is seeking ${
        slots > 1 ? `${slots} highly motivated NCOs` : "a highly motivated NCO"
      } to fill the position${slots > 1 ? "s" : ""} of ${posTitle}. ${
        slots > 1 ? "These are" : "This is a"
      } Tier ${tier} Unit position${slots > 1 ? "s" : ""} with a term of ${term}.`;
    }

    if (t.field === "eligibility") {
      const letter = String.fromCharCode(97 + t.index);
      const reqText = (memoData.eligibilityRequirements?.[t.index] || `[Eligibility Requirement ${letter}]`).trim();
      if (new RegExp(`^${letter}\\.\\s*`, "i").test(reqText)) {
        return reqText;
      }
      return `${letter}.  ${reqText}`;
    }

    if (t.field === "responsibility") {
      const letter = String.fromCharCode(97 + t.index);
      const respText = (memoData.responsibilities?.[t.index] || `[Responsibility Description ${letter}]`).trim();
      if (new RegExp(`^${letter}\\.\\s*`, "i").test(respText)) {
        return respText;
      }
      return `${letter}.  ${respText}`;
    }

    if (t.field === "pocRankName" || t.field === "pocEmail" || t.field === "closeDeadlineDate") {
      if (memoData.paragraph5CustomText && memoData.paragraph5CustomText.trim() !== "") {
        return memoData.paragraph5CustomText.trim();
      }
      return `5.  Please submit all questions and application packets to ${pocName} at ${pocEmail} NLT ${closeDate}.`;
    }

    if (t.field === "signerNameCaps" || t.field === "signerRank" || t.field === "signerTitle") {
      return `${signerName}\n${signerRank}\n${signerTitle}`;
    }

    if (t.field === "memoDate") {
      return `TUSB-ZA                          ${memoDate}`;
    }

    if (t.field === "fullMemo") {
      return `MEMORANDUM FOR RECORD\nSUBJECT: Broadening Position Vacancy Announcement - ${posTitle}\n\n1.  The ${shop} is seeking ${
        slots > 1 ? `${slots} highly motivated NCOs` : "a highly motivated NCO"
      } to fill the position${slots > 1 ? "s" : ""} of ${posTitle}. ${
        slots > 1 ? "These are" : "This is a"
      } Tier ${tier} Unit position${slots > 1 ? "s" : ""} with a term of ${term}.\n\n2.  Eligibility requirements:\na.  ${formatRankSentence(
        memoData.eligibilityRequirements?.[0] || "SSG and above"
      )}\n\n3.  Duties and responsibilities:\na.  ${
        memoData.responsibilities?.[0] || "[Responsibility description]"
      }\n\n4.  To apply for this position, please submit a one-page memorandum...\n\n5.  Please submit all questions and application packets to ${pocName} at ${pocEmail} NLT ${closeDate}.\n\n${signerName}\n${signerRank}\n${signerTitle}`;
    }

    return "";
  };

  // Initialize edit box with the full paragraph/sub-paragraph
  useEffect(() => {
    if (isOpen && target) {
      const initialText = getStandardTextForTarget(target);
      setEditedParagraph(initialText);

      if (target.field === "rankRequirement") {
        const rawReq = memoData.eligibilityRequirements?.[0] || "SSG and above";
        if (RANK_REQUIREMENT_OPTIONS.includes(rawReq as any)) {
          setSelectedRank(rawReq);
        } else {
          setSelectedRank("custom");
        }
      }
      setSaveSuccessToast(false);
    }
  }, [isOpen, target, memoData]);

  if (!isOpen || !target) return null;

  const handleRankDropdownChange = (rankVal: string) => {
    setSelectedRank(rankVal);
    if (rankVal !== "custom") {
      const sentence = `a.  ${formatRankSentence(rankVal)}`;
      setEditedParagraph(sentence);
    }
  };

  const handleResetToStandard = () => {
    if (
      target.field === "positionTitle" ||
      target.field === "shopName" ||
      target.field === "slots" ||
      target.field === "tierLevel" ||
      target.field === "isSpecialty" ||
      target.field === "termDuration"
    ) {
      onUpdateField("paragraph1CustomText", "");
    }
    if (target.field === "pocRankName" || target.field === "pocEmail" || target.field === "closeDeadlineDate") {
      onUpdateField("paragraph5CustomText", "");
    }

    const slots = Number(memoData.slots) || 1;
    const posTitle = memoData.positionTitle || "[Position Title]";
    const shop = memoData.shopName || "[Shop Name]";
    const tier = memoData.tierLevel || "1";
    const term = memoData.termDuration || "2 to 5 years";
    const pocName = memoData.pocRankName || "[POC Rank & Name]";
    const pocEmail = memoData.pocEmail || "[poc.email@army.mil]";
    const closeDate = memoData.closeDeadlineDate || "[Close Date]";

    if (
      target.field === "positionTitle" ||
      target.field === "shopName" ||
      target.field === "slots" ||
      target.field === "tierLevel" ||
      target.field === "isSpecialty" ||
      target.field === "termDuration"
    ) {
      setEditedParagraph(
        `1.  The ${shop} is seeking ${
          slots > 1 ? `${slots} highly motivated NCOs` : "a highly motivated NCO"
        } to fill the position${slots > 1 ? "s" : ""} of ${posTitle}. ${
          slots > 1 ? "These are" : "This is a"
        } Tier ${tier} Unit position${slots > 1 ? "s" : ""} with a term of ${term}.`
      );
    } else if (target.field === "pocRankName" || target.field === "pocEmail" || target.field === "closeDeadlineDate") {
      setEditedParagraph(`5.  Please submit all questions and application packets to ${pocName} at ${pocEmail} NLT ${closeDate}.`);
    } else if (target.field === "rankRequirement") {
      setSelectedRank("SSG and above");
      setEditedParagraph("a.  Candidates must be SSG and above to apply for this position.");
    }
  };

  const handleApplyChanges = () => {
    const trimmed = editedParagraph.trim();

    if (target.field === "rankRequirement") {
      const cleanText = trimmed.replace(/^a\.\s*/i, "");
      if (onUpdateEligibilityItem) {
        onUpdateEligibilityItem(0, cleanText);
      } else {
        const updated = [...memoData.eligibilityRequirements];
        updated[0] = cleanText;
        onUpdateField("eligibilityRequirements", updated);
      }
    } else if (target.field === "eligibility") {
      const letter = String.fromCharCode(97 + target.index);
      const cleanText = trimmed.replace(new RegExp(`^${letter}\\.\\s*`, "i"), "");
      if (onUpdateEligibilityItem) {
        onUpdateEligibilityItem(target.index, cleanText);
      }
    } else if (target.field === "responsibility") {
      const letter = String.fromCharCode(97 + target.index);
      const cleanText = trimmed.replace(new RegExp(`^${letter}\\.\\s*`, "i"), "");
      if (onUpdateResponsibilityItem) {
        onUpdateResponsibilityItem(target.index, cleanText);
      }
    } else if (
      target.field === "positionTitle" ||
      target.field === "shopName" ||
      target.field === "slots" ||
      target.field === "tierLevel" ||
      target.field === "isSpecialty" ||
      target.field === "termDuration"
    ) {
      onUpdateField("paragraph1CustomText", trimmed);
    } else if (
      target.field === "pocRankName" ||
      target.field === "pocEmail" ||
      target.field === "closeDeadlineDate"
    ) {
      onUpdateField("paragraph5CustomText", trimmed);
    } else if (
      target.field === "signerNameCaps" ||
      target.field === "signerRank" ||
      target.field === "signerTitle"
    ) {
      const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines[0]) onUpdateField("signerNameCaps", lines[0].toUpperCase());
      if (lines[1]) onUpdateField("signerRank", lines[1]);
      if (lines[2]) onUpdateField("signerTitle", lines[2]);
    } else if (target.field === "memoDate") {
      const dateMatch = trimmed.match(/(\d{1,2}\s+[A-Za-z]+\s+\d{4})/);
      if (dateMatch) {
        onUpdateField("memoDate", dateMatch[1]);
      } else {
        onUpdateField("memoDate", trimmed.replace(/^TUSB-ZA\s*/i, ""));
      }
    }

    setSaveSuccessToast(true);
    setTimeout(() => {
      setSaveSuccessToast(false);
      onClose();
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 md:p-6 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-750 rounded-xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Memo Paragraph Preview & Editor</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {target.section}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Editing field: <span className="text-slate-200 font-semibold">{target.label}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Toast */}
        {saveSuccessToast && (
          <div className="bg-emerald-950/70 border-b border-emerald-800/80 px-6 py-2.5 flex items-center gap-2 text-xs text-emerald-300 font-semibold">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Changes applied successfully to the memo draft!</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5 bg-slate-950/40">
          
          {/* Section 1: Live Phrasing Display */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>How it will be phrased on the memo:</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Live Memo Preview</span>
            </div>

            {/* Rendered Live Box */}
            <div className="bg-white text-slate-900 rounded-lg p-4 md:p-5 font-sans text-sm leading-relaxed border border-slate-200 shadow-md select-text">
              <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 rounded text-slate-900 font-medium whitespace-pre-wrap leading-relaxed">
                {editedParagraph || "[Empty text]"}
              </div>
            </div>
          </div>

          {/* Section 2: Full Edit Box */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <Edit3 className="w-4 h-4" />
                <span>Edit Entire Paragraph / Sub-paragraph</span>
              </div>
              <button
                type="button"
                onClick={handleResetToStandard}
                className="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition cursor-pointer"
                title="Reset to default standard template wording"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to Standard</span>
              </button>
            </div>

            {/* Quick rank selection if on rank requirement */}
            {target.field === "rankRequirement" && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Quick Select Rank Option:
                </label>
                <select
                  value={selectedRank}
                  onChange={(e) => handleRankDropdownChange(e.target.value)}
                  className="w-full text-sm bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium cursor-pointer mb-2"
                >
                  {RANK_REQUIREMENT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                  {selectedRank === "custom" && (
                    <option value="custom">Custom wording</option>
                  )}
                </select>
              </div>
            )}

            {/* Main Textarea containing the ENTIRE paragraph or sub-paragraph */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Paragraph Text (editable):
              </label>
              <textarea
                rows={target.field === "fullMemo" || target.field === "signerNameCaps" || target.field === "signerRank" || target.field === "signerTitle" ? 5 : 3}
                value={editedParagraph}
                onChange={(e) => {
                  setEditedParagraph(e.target.value);
                  if (target.field === "rankRequirement") {
                    setSelectedRank("custom");
                  }
                }}
                placeholder="Enter or edit the full paragraph / sub-paragraph text..."
                className="w-full text-sm bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans leading-relaxed shadow-inner"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                You can edit, add, or delete any words in this paragraph. The preview above updates live as you type.
              </p>
            </div>

          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="text-xs bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleApplyChanges}
            className="text-xs bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 px-5 rounded-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Apply Wording</span>
          </button>
        </div>

      </div>
    </div>
  );
}
