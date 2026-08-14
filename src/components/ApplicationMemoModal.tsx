import React, { useState, useEffect } from "react";
import { X, Download, FileText, User, Award, HelpCircle, Check, Plus, Trash2 } from "lucide-react";
import { downloadApplicationMemo, ApplicationMemoData } from "../utils/docxExporter";

interface ApplicationMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  vacancy: {
    id?: string;
    positionTitle?: string;
    officeLocation?: string;
    pocName?: string;
    pocRankName?: string;
    pocEmail?: string;
    pocPhone?: string;
    shopName?: string;
  } | null;
}

const RANKS_REGEX = /^(PV1|PV2|PFC|SPC|CPL|SGT|SSG|SFC|MSG|1SG|SGM|CSM|WO1|CW2|CW3|CW4|CW5|2LT|1LT|CPT|MAJ|LTC|COL|BG|MG|LTG|GEN)\b/i;

function extractRankAndName(input: string) {
  const trimmed = input.trim();
  const match = trimmed.match(RANKS_REGEX);
  if (match) {
    const rank = match[1].toUpperCase();
    const name = trimmed.slice(match[0].length).trim();
    return {
      derivedNameCaps: name.toUpperCase(),
      derivedRankBranch: `${rank}, USA`,
    };
  }
  return {
    derivedNameCaps: trimmed.toUpperCase(),
    derivedRankBranch: "",
  };
}

export const ApplicationMemoModal: React.FC<ApplicationMemoModalProps> = ({
  isOpen,
  onClose,
  vacancy,
}) => {
  const [formData, setFormData] = useState<{
    memoDate: string;
    shopNcoicRankName: string;
    positionTitle: string;
    applicantRankName: string;
    qualifications: string[];
    otherRoles: string;
    interestReason: string;
    pertinentInfo: string;
    soldierNameCaps: string;
    soldierRankBranch: string;
    elementLeaderNameCaps: string;
    elementLeaderRankBranch: string;
    elementLeaderTitle: string;
  }>({
    memoDate: "",
    shopNcoicRankName: "",
    positionTitle: "",
    applicantRankName: "",
    qualifications: ["", ""],
    otherRoles: "",
    interestReason: "",
    pertinentInfo: "",
    soldierNameCaps: "",
    soldierRankBranch: "SSG, USA",
    elementLeaderNameCaps: "",
    elementLeaderRankBranch: "SGM, USA",
    elementLeaderTitle: "Element Leader",
  });

  const [isExporting, setIsExporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showAcknowledgePopup, setShowAcknowledgePopup] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Default date to today e.g. "14 August 2026"
      const today = new Date();
      const formattedDate = today.toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      const ncoicName = vacancy?.pocRankName || vacancy?.pocName || "";

      setFormData({
        memoDate: formattedDate,
        shopNcoicRankName: ncoicName,
        positionTitle: vacancy?.positionTitle || "",
        applicantRankName: "",
        qualifications: ["", ""],
        otherRoles: "",
        interestReason: "",
        pertinentInfo: "",
        soldierNameCaps: "",
        soldierRankBranch: "SSG, USA",
        elementLeaderNameCaps: "",
        elementLeaderRankBranch: "SGM, USA",
        elementLeaderTitle: "Element Leader",
      });
      setSuccessMessage(null);
      setErrorMessage(null);
      setShowAcknowledgePopup(false);
    }
  }, [isOpen, vacancy]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSuccessMessage(null);
    setErrorMessage(null);

    if (name === "applicantRankName") {
      const { derivedNameCaps, derivedRankBranch } = extractRankAndName(value);
      setFormData((prev) => ({
        ...prev,
        applicantRankName: value,
        soldierNameCaps: derivedNameCaps,
        soldierRankBranch: derivedRankBranch || prev.soldierRankBranch,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleQualChange = (index: number, value: string) => {
    setFormData((prev) => {
      const newQuals = [...prev.qualifications];
      newQuals[index] = value;
      return { ...prev, qualifications: newQuals };
    });
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const addQualField = () => {
    setFormData((prev) => ({
      ...prev,
      qualifications: [...prev.qualifications, ""],
    }));
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const removeQualField = (index: number) => {
    if (formData.qualifications.length > 2) {
      setFormData((prev) => ({
        ...prev,
        qualifications: prev.qualifications.filter((_, i) => i !== index),
      }));
      setSuccessMessage(null);
      setErrorMessage(null);
    }
  };

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage(null);
    setErrorMessage(null);

    const validQuals = formData.qualifications.filter((q) => q.trim().length > 0);
    if (validQuals.length < 2) {
      setErrorMessage("Please fill out a minimum of 2 qualifications before exporting.");
      return;
    }

    setIsExporting(true);
    try {
      const derivedCaps = extractRankAndName(formData.applicantRankName).derivedNameCaps;
      const exportData: ApplicationMemoData = {
        memoDate: formData.memoDate,
        shopNcoicRankName: formData.shopNcoicRankName,
        positionTitle: formData.positionTitle,
        applicantRankName: formData.applicantRankName,
        qualifications: validQuals,
        otherRoles: formData.otherRoles,
        interestReason: formData.interestReason,
        pertinentInfo: formData.pertinentInfo,
        soldierNameCaps: formData.soldierNameCaps || derivedCaps || "SOLDIER NAME",
        soldierRankBranch: formData.soldierRankBranch,
        elementLeaderNameCaps: formData.elementLeaderNameCaps || "ELEMENT LEADER NAME",
        elementLeaderRankBranch: formData.elementLeaderRankBranch,
        elementLeaderTitle: formData.elementLeaderTitle,
      };

      await downloadApplicationMemo(exportData);
      setSuccessMessage("Application Memo exported successfully! The file has downloaded. You can make further edits or export again as needed.");
      setShowAcknowledgePopup(true);
    } catch (err) {
      console.error("Failed to generate application memo", err);
      setErrorMessage("Error generating document: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Generate Application Memo (.docx)</h2>
              <p className="text-xs text-slate-400">Fill out your details to generate a formatted Word application memorandum.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleExport} className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          
          {/* Notification Banners */}
          {successMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
              <X className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Target Position & Shop NCOIC Section */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <Award className="w-4 h-4" /> Position & Authority Header
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Broadening Position Title <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  name="positionTitle"
                  required
                  value={formData.positionTitle}
                  onChange={handleChange}
                  placeholder="e.g. FLIGHT LINE SUPERVISOR"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Shop NCOIC Rank & Name <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  name="shopNcoicRankName"
                  required
                  value={formData.shopNcoicRankName}
                  onChange={handleChange}
                  placeholder="e.g. SFC JOHN DOE"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Appears after MEMORANDUM FOR ...</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Memo Date <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                name="memoDate"
                required
                value={formData.memoDate}
                onChange={handleChange}
                placeholder="e.g. 14 August 2026"
                className="w-full sm:w-1/2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Applicant Info */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <User className="w-4 h-4" /> Applicant Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Applicant Rank & Name <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  name="applicantRankName"
                  required
                  value={formData.applicantRankName}
                  onChange={handleChange}
                  placeholder="e.g. SSG Jane M. Smith"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Used in intro paragraph & signature block</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Soldier Rank and Branch <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  name="soldierRankBranch"
                  required
                  value={formData.soldierRankBranch}
                  onChange={handleChange}
                  placeholder="e.g. SSG, USA"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-slate-500 mt-0.5 block">Auto-populated from rank, adjustable if needed</span>
              </div>
            </div>
          </div>

          {/* Qualifications / Experience Bullets */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Check className="w-4 h-4" /> Experience & Qualifications (Minimum 2)
              </h3>
              <button
                type="button"
                onClick={addQualField}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Qualification
              </button>
            </div>

            {formData.qualifications.map((qual, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
                    Qualification #{idx + 1} {idx < 2 && <span className="text-emerald-400 font-bold">*</span>}
                  </label>
                  {formData.qualifications.length > 2 ? (
                    <button
                      type="button"
                      onClick={() => removeQualField(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer transition"
                      title="Remove qualification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-500">Min. 2 required</span>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={qual}
                  onChange={(e) => handleQualChange(idx, e.target.value)}
                  placeholder="e.g. Demonstrated technical expertise in daily unit operations, leadership experience managing 15 personnel, or specialized certifications..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder:text-slate-500"
                />
              </div>
            ))}
          </div>

          {/* Statement Sections */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <HelpCircle className="w-4 h-4" /> Background & Interest Statements
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Other Roles Performed at TUSAB <span className="text-slate-500">(Optional)</span>
              </label>
              <textarea
                rows={2}
                name="otherRoles"
                value={formData.otherRoles}
                onChange={handleChange}
                placeholder="Speak about other roles you have performed at TUSAB, both broadening and daily scope..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Reason for Interest <span className="text-emerald-400">*</span>
              </label>
              <textarea
                rows={2}
                name="interestReason"
                required
                value={formData.interestReason}
                onChange={handleChange}
                placeholder="e.g. Tell the panel why you are interested in this position (e.g., Seeking this broadening opportunity to expand professional leadership experience, contribute directly to unit excellence, and take on increased responsibilities)..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder:text-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Other Pertinent Information <span className="text-slate-500">(Optional - if empty, paragraph will be omitted from memo)</span>
              </label>
              <textarea
                rows={2}
                name="pertinentInfo"
                value={formData.pertinentInfo}
                onChange={handleChange}
                placeholder="Include any other pertinent info you would like the panel to consider..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Element Leader (Signer) Details */}
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <User className="w-4 h-4" /> Element Leader Endorsement Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Element Leader Name (ALL CAPS) <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  name="elementLeaderNameCaps"
                  required
                  value={formData.elementLeaderNameCaps}
                  onChange={handleChange}
                  placeholder="e.g. ROBERT E. JOHNSON"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Element Leader Rank & Branch <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  name="elementLeaderRankBranch"
                  required
                  value={formData.elementLeaderRankBranch}
                  onChange={handleChange}
                  placeholder="e.g. SGM, USA"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Submit Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isExporting}
              className="px-5 py-2 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg transition cursor-pointer flex items-center gap-2 shadow-lg shadow-emerald-500/10"
            >
              {isExporting ? (
                <span>Generating .docx...</span>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export Application Memo (.docx)</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>

      {/* Post-Export Acknowledge Popup */}
      {showAcknowledgePopup && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Application Memo Routing Notice</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
              Please convert your memo to PDF format and route it to your Element Leader (EL) for signature first. Once endorsed, apply your signature and forward the completed document to the Point of Contact at <span className="font-semibold text-emerald-400">{vacancy?.pocEmail || "tusabbroadeningpositions@gmail.com"}</span>.
            </p>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowAcknowledgePopup(false)}
                className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition cursor-pointer shadow-lg shadow-emerald-500/20"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
