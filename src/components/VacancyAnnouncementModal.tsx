import React, { useState, useEffect } from "react";
import { Duty } from "../types";
import { X, Upload, Download, Copy, Check, FileText, Calendar, User, Phone, Mail, HelpCircle, Layers, Award, Shield } from "lucide-react";
import { downloadVacancyMemo } from "../utils/docxExporter";

interface VacancyAnnouncementModalProps {
  duty: Duty;
  onClose: () => void;
  initialDraft?: any;
}

const formatDateToMilitary = (d: Date) => {
  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "long" });
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
};

const getThirtyDaysAfter = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      const fallback = new Date();
      fallback.setDate(fallback.getDate() + 30);
      return formatDateToMilitary(fallback);
    }
    d.setDate(d.getDate() + 30);
    return formatDateToMilitary(d);
  } catch {
    const fallback = new Date();
    fallback.setDate(fallback.getDate() + 30);
    return formatDateToMilitary(fallback);
  }
};

type TabType = "basic" | "eligibility" | "duties" | "authority";

export default function VacancyAnnouncementModal({ duty, onClose, initialDraft }: VacancyAnnouncementModalProps) {
  // Tab control
  const [activeTab, setActiveTab] = useState<TabType>("basic");

  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [shareableUrl, setShareableUrl] = useState<string | null>(null);
  const [copiedShareable, setCopiedShareable] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Basic Memo Info states
  const [positionTitle, setPositionTitle] = useState(initialDraft?.positionTitle || duty.jobTitle || "");
  const [shopName, setShopName] = useState(initialDraft?.shopName || duty.category || "");
  const [bpTitle, setBpTitle] = useState(initialDraft?.bpTitle || duty.jobTitle || "");
  const [tierLevel, setTierLevel] = useState(() => initialDraft?.tierLevel || (duty.tierLevel !== null && duty.tierLevel !== undefined ? String(duty.tierLevel) : "1"));
  const [isSpecialty, setIsSpecialty] = useState(initialDraft ? !!initialDraft.isSpecialty : (duty.specialized || false));
  const [termDuration, setTermDuration] = useState(() => {
    if (initialDraft?.termDuration) return initialDraft.termDuration;
    if (duty.specialized) {
      return "This is a specialty position with no term limits";
    }
    if (duty.tierLevel === 1) return "2 to 5 years";
    if (duty.tierLevel === 2) return "2 to 6 years";
    if (duty.tierLevel === 3) return "3 to 7 years";
    if (duty.tierLevel === 4) return "3 to 7 years";
    return "2 to 5 years";
  });
  const [memoDate, setMemoDate] = useState(() => initialDraft?.memoDate || formatDateToMilitary(new Date()));

  // 2. Eligibility Requirements states (Dynamic array starting with 2 empty fields)
  const [eligibilityRequirements, setEligibilityRequirements] = useState<string[]>(() => {
    if (initialDraft?.eligibilityRequirements) return initialDraft.eligibilityRequirements;
    return ["", ""];
  });

  // 3. Duties & Responsibilities states (Dynamic array starting with 2 empty fields)
  const [responsibilities, setResponsibilities] = useState<string[]>(() => {
    if (initialDraft?.responsibilities) return initialDraft.responsibilities;
    return ["", ""];
  });

  // 4. Contact, POC & Authority Block states
  const [pocRankName, setPocRankName] = useState(initialDraft?.pocRankName || "");
  const [pocEmail, setPocEmail] = useState(initialDraft?.pocEmail || "");
  const [closeDeadlineDate, setCloseDeadlineDate] = useState(() => {
    if (initialDraft?.closeDeadlineDate) return initialDraft.closeDeadlineDate;
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return formatDateToMilitary(d);
  });
  const [signerNameCaps, setSignerNameCaps] = useState(initialDraft?.signerNameCaps || "");
  const [signerRank, setSignerRank] = useState(initialDraft?.signerRank || "");
  const [signerTitle, setSignerTitle] = useState(initialDraft?.signerTitle || "");

  const handleSubmitForReview = async () => {
    setIsSubmitting(true);
    setStatusMessage(null);
    setShareableUrl(null);
    try {
      const { collection, addDoc, doc, setDoc } = await import("firebase/firestore");
      const { db } = await import("../lib/firebase");

      const draftData = {
        dutyId: duty.id,
        positionTitle: positionTitle.trim(),
        shopName: shopName.trim(),
        bpTitle: bpTitle.trim(),
        tierLevel: tierLevel.trim(),
        isSpecialty: !!isSpecialty,
        termDuration: termDuration.trim(),
        memoDate: memoDate.trim(),
        eligibilityRequirements: eligibilityRequirements.filter(r => r.trim() !== ""),
        responsibilities: responsibilities.filter(r => r.trim() !== ""),
        pocRankName: pocRankName.trim(),
        pocEmail: pocEmail.trim(),
        closeDeadlineDate: closeDeadlineDate.trim(),
        signerNameCaps: signerNameCaps.trim(),
        signerRank: signerRank.trim(),
        signerTitle: signerTitle.trim(),
        status: "pending",
        createdAt: initialDraft?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      let docId = initialDraft?.id;
      if (docId) {
        await setDoc(doc(db, "vacancy_drafts", docId), {
          ...draftData,
          admin_secret: "DUTY_TRACKER_SECRET_2024"
        }, { merge: true });
      } else {
        const docRef = await addDoc(collection(db, "vacancy_drafts"), draftData);
        docId = docRef.id;
      }

      const generatedUrl = `${window.location.origin}/?draftId=${docId}`;
      setShareableUrl(generatedUrl);
      setStatusMessage({
        type: "success",
        text: initialDraft 
          ? "Draft successfully resubmitted to the Admin suite! Shareable link updated below."
          : "Draft successfully submitted to the Admin suite! Shareable link generated below."
      });
    } catch (err: any) {
      console.error("Error submitting vacancy draft:", err);
      setStatusMessage({
        type: "error",
        text: "Failed to submit vacancy draft. Please verify connection and try again."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTodayMilitaryFormat = () => {
    const d = new Date();
    const day = d.getDate();
    const month = d.toLocaleDateString("en-US", { month: "long" });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const handleExport = () => {
    const activeDraft = {
      positionTitle,
      shopName,
      bpTitle,
      tierLevel,
      termDuration,
      pocRankName,
      pocEmail,
      closeDeadlineDate,
      signerNameCaps,
      signerRank,
      signerTitle,
      memoDate,
      eligibilityRequirements,
      responsibilities
    };
    downloadVacancyMemo(activeDraft);
    setStatusMessage({ type: "success", text: "Exported successfully using the official Army Word template!" });
  };



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Announce Vacancy</h3>
              <p className="text-xs text-slate-400">Position: {duty.jobTitle} ({duty.category})</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className={`px-6 py-3.5 border-b flex flex-col gap-2.5 text-xs ${
            statusMessage.type === "success" 
              ? "bg-emerald-950/30 border-emerald-900/50 text-emerald-300" 
              : statusMessage.type === "error"
              ? "bg-rose-950/30 border-rose-900/50 text-rose-350"
              : "bg-blue-950/30 border-blue-900/50 text-blue-300"
          }`}>
            <div className="flex justify-between items-center w-full">
              <span className="font-semibold">{statusMessage.text}</span>
              <button 
                onClick={() => setStatusMessage(null)}
                className="font-bold underline hover:no-underline ml-2 text-slate-300 hover:text-white"
              >
                Dismiss
              </button>
            </div>
            {shareableUrl && statusMessage.type === "success" && (
              <div className="flex items-center gap-2 p-2 bg-slate-950/60 border border-emerald-900/35 rounded">
                <span className="font-mono text-[11px] break-all select-all flex-1 text-slate-300">{shareableUrl}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(shareableUrl);
                    setCopiedShareable(true);
                    setTimeout(() => setCopiedShareable(false), 2000);
                  }}
                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded text-[11px] font-bold flex items-center gap-1 shrink-0 transition cursor-pointer"
                >
                  {copiedShareable ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="w-full p-6 space-y-5 overflow-y-auto max-h-[calc(85vh-120px)]">
          
          {/* Tailored Army Template Form with Categorized Tabs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                Official Army Memo Form
              </h4>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono">
                Template: Active
              </span>
            </div>
            
            {/* Tabs Navigation */}
            <div className="flex border-b border-slate-800 gap-1 overflow-x-auto pb-px">
              <button
                type="button"
                onClick={() => setActiveTab("basic")}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
                  activeTab === "basic"
                    ? "border-emerald-500 text-white bg-slate-800/40 rounded-t"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Basic Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("eligibility")}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
                  activeTab === "eligibility"
                    ? "border-emerald-500 text-white bg-slate-800/40 rounded-t"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                Eligibility
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("duties")}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
                  activeTab === "duties"
                    ? "border-emerald-500 text-white bg-slate-800/40 rounded-t"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Responsibilities
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("authority")}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
                  activeTab === "authority"
                    ? "border-emerald-500 text-white bg-slate-800/40 rounded-t"
                    : "border-transparent text-slate-400 hover:text-white"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                POC & Signer
              </button>
            </div>

            {/* Tab Content Panels */}
            <div className="pt-2">
                  {activeTab === "basic" && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Position Title [Position Title]</label>
                          <input
                            type="text"
                            value={positionTitle}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPositionTitle(val);
                              setBpTitle(val);
                            }}
                            className="w-full text-sm bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Shop Name [shop name]</label>
                          <input
                            type="text"
                            value={shopName}
                            onChange={(e) => setShopName(e.target.value)}
                            className="w-full text-sm bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Memo Date (Top Right of Memo)</label>
                          <input
                            type="text"
                            value={memoDate}
                            onChange={(e) => {
                              const val = e.target.value;
                              setMemoDate(val);
                              setCloseDeadlineDate(getThirtyDaysAfter(val));
                            }}
                            placeholder={formatDateToMilitary(new Date())}
                            className="w-full text-sm bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Unit Tier Level</label>
                          <select
                            value={tierLevel}
                            onChange={(e) => {
                              const val = e.target.value;
                              setTierLevel(val);
                              if (!isSpecialty) {
                                if (val === "1") setTermDuration("2 to 5 years");
                                else if (val === "2") setTermDuration("2 to 6 years");
                                else if (val === "3") setTermDuration("3 to 7 years");
                                else if (val === "4") setTermDuration("3 to 7 years");
                              }
                            }}
                            className="w-full text-sm bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="1">Tier 1 (2-5 yrs)</option>
                            <option value="2">Tier 2 (2-6 yrs)</option>
                            <option value="3">Tier 3 (3-7 yrs)</option>
                            <option value="4">Tier 4 (3-7 yrs)</option>
                            <option value="N/A">N/A</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Position Type</label>
                          <div className="flex items-center h-10">
                            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isSpecialty}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setIsSpecialty(checked);
                                  if (checked) {
                                    setTermDuration("This is a specialty position with no term limits");
                                  } else {
                                    if (tierLevel === "1") setTermDuration("2 to 5 years");
                                    else if (tierLevel === "2") setTermDuration("2 to 6 years");
                                    else if (tierLevel === "3") setTermDuration("3 to 7 years");
                                    else if (tierLevel === "4") setTermDuration("3 to 7 years");
                                    else setTermDuration("2 to 5 years");
                                  }
                                }}
                                className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
                              />
                              <span className="text-xs">Specialty Position</span>
                            </label>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-400 mb-1">Term Duration [x to x years]</label>
                          <input
                            type="text"
                            value={termDuration}
                            onChange={(e) => setTermDuration(e.target.value)}
                            placeholder="e.g., 2 to 5 years"
                            className="w-full text-sm bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "eligibility" && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400">
                          Eligibility Requirements (Min: 2)
                        </span>
                      </div>

                      <div className="space-y-3">
                        {eligibilityRequirements.map((req, index) => {
                          const eligibilityPlaceholders = [
                            "Rank Requirement (e.g., SSG to SFC)",
                            "Requirement 2 (e.g., Experience with Microsoft Office, training systems, and administrative tasking.)",
                            "Requirement 3 (e.g., Ability to coordinate effectively across multiple shops and elements.)",
                            "Requirement 4 (e.g., Demonstrated proficiency in physical readiness and standard administrative taskings.)"
                          ];
                          return (
                            <div key={index} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                  {index === 0 ? "Requirement a (Rank requirement)" : `Requirement ${String.fromCharCode(97 + index)}`}
                                </label>
                                {eligibilityRequirements.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...eligibilityRequirements];
                                      updated.splice(index, 1);
                                      setEligibilityRequirements(updated);
                                    }}
                                    className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline transition-colors"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                              <textarea
                                value={req}
                                onChange={(e) => {
                                  const updated = [...eligibilityRequirements];
                                  updated[index] = e.target.value;
                                  setEligibilityRequirements(updated);
                                }}
                                placeholder={eligibilityPlaceholders[index] || "Enter custom requirement..."}
                                rows={2}
                                className="w-full text-xs bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setEligibilityRequirements([...eligibilityRequirements, ""])}
                          className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                        >
                          + Add Requirement
                        </button>
                      </div>
                    </div>
                  )}

                   {activeTab === "duties" && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400">
                          Duties & Responsibilities (Min: 2)
                        </span>
                      </div>

                      <div className="space-y-3">
                        {responsibilities.map((resp, index) => {
                          const responsibilitiesPlaceholders = [
                            "Main Responsibility 1 (e.g., Oversees all daily operations, taskings, and scheduling for the shop/element.)",
                            "Responsibility 2 (e.g., Coordinates with external units and elements to ensure seamless mission execution.)",
                            "Responsibility 3 (e.g., Maintains accurate records, databases, and logistical trackers.)",
                            "Responsibility 4 (e.g., Prepares briefs, reports, and Standard Operating Procedures (SOPs) for leadership.)",
                            "Responsibility 5 (e.g., Mentors and guides junior NCOs and Soldiers assigned to the section.)",
                            "Responsibility 6 (e.g., Ensures strict compliance with relevant Army safety regulations and guidelines.)",
                            "Responsibility 7 (e.g., Performs other related duties as directed by the senior NCOIC or Commander.)"
                          ];
                          return (
                            <div key={index} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                  Responsibility {String.fromCharCode(97 + index)}
                                </label>
                                {responsibilities.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...responsibilities];
                                      updated.splice(index, 1);
                                      setResponsibilities(updated);
                                    }}
                                    className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline transition-colors"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                              <textarea
                                value={resp}
                                onChange={(e) => {
                                  const updated = [...responsibilities];
                                  updated[index] = e.target.value;
                                  setResponsibilities(updated);
                                }}
                                placeholder={
                                  index === 0 && duty.scopeOfResponsibilities
                                    ? `e.g., ${duty.scopeOfResponsibilities}`
                                    : responsibilitiesPlaceholders[index] || "Enter responsibility description..."
                                }
                                rows={2}
                                className="w-full text-xs bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setResponsibilities([...responsibilities, ""])}
                          className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                        >
                          + Add Responsibility
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === "authority" && (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="p-4 bg-slate-950/60 rounded-lg border border-slate-800/80 space-y-3">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Submit Questions & Packet To:</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 mb-1">POC Rank & Name [Rank Name]</label>
                            <input
                              type="text"
                              value={pocRankName}
                              onChange={(e) => setPocRankName(e.target.value)}
                              placeholder="e.g., SFC Jane Doe"
                              className="w-full text-xs bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 mb-1">POC Email [email address]</label>
                            <input
                              type="text"
                              value={pocEmail}
                              onChange={(e) => setPocEmail(e.target.value)}
                              placeholder="e.g., jane.doe.mil@army.mil"
                              className="w-full text-xs bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 mb-1">Closing Deadline Date [enter date]</label>
                          <input
                            type="text"
                            value={closeDeadlineDate}
                            onChange={(e) => setCloseDeadlineDate(e.target.value)}
                            placeholder="e.g., 12 September 2026"
                            className="w-full text-xs bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="p-4 bg-slate-950/60 rounded-lg border border-slate-800/80 space-y-3">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">Authorized Signer/NCOIC Block:</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 mb-1">NCOIC Name (ALL CAPS) [SHOP NCOIC's NAME...]</label>
                            <input
                              type="text"
                              value={signerNameCaps}
                              onChange={(e) => setSignerNameCaps(e.target.value)}
                              placeholder="e.g., JANE D. DOE"
                              className="w-full text-xs bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 mb-1">NCOIC Rank [RANK, USA]</label>
                            <input
                              type="text"
                              value={signerRank}
                              onChange={(e) => setSignerRank(e.target.value)}
                              placeholder="e.g., SFC, USA"
                              className="w-full text-xs bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 mb-1">NCOIC Title [Title, i.e., TUSAB Training NCOIC]</label>
                          <input
                            type="text"
                            value={signerTitle}
                            onChange={(e) => setSignerTitle(e.target.value)}
                            placeholder={`e.g., TUSAB ${duty.category || "Training"} NCOIC`}
                            className="w-full text-xs bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-t border-slate-800">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <HelpCircle className="w-4 h-4 text-slate-600" />
            {(() => {
              const emailSubject = `Vacancy Announcement Draft: ${positionTitle}`;
              const emailBody = `BP Team,

Please find attached the vacancy announcement memo draft for ${positionTitle}.

This draft has been exported from the Broadening Positions Tracker. Please review and advise on the next step.

Respectfully,

${pocRankName || "[POC Rank & Name]"}
${pocEmail || "[POC email]"}`;
              const mailtoUrl = `mailto:broadeningpositions@army.mil?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
              return (
                <span>Email vacancy announcement draft to <a href={mailtoUrl} className="text-emerald-500 hover:underline font-medium">broadeningpositions@army.mil</a> for review, approval, and dissemination.</span>
              );
            })()}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="text-xs bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 font-bold py-2 px-4 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              disabled={isSubmitting}
              onClick={handleSubmitForReview}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-850 disabled:text-slate-500 text-white font-bold py-2 px-4 rounded-lg shadow-lg shadow-indigo-600/10 transition-colors flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Submitting...</span>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>{initialDraft ? "Resubmit" : "Submit for Review"}</span>
                </>
              )}
            </button>
            <button
              onClick={handleExport}
              className="text-xs bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 px-4 rounded-lg shadow-lg shadow-emerald-500/10 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Export Word
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
