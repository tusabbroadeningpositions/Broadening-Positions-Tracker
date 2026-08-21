import React, { useState, useMemo } from "react";
import { downloadVacancyMemo } from "../utils/docxExporter";
import { ApplicationMemoModal } from "./ApplicationMemoModal";
import { updateVacancyDraftAdminNotes, updateVacancyDraftStatus, deleteVacancyDraft } from "../data/dutiesStore";
import { 
  FileText, 
  Download, 
  User, 
  Mail, 
  Calendar, 
  Layers, 
  Award, 
  Edit3, 
  Check, 
  X, 
  ShieldAlert, 
  Archive, 
  RotateCcw, 
  Search, 
  Filter, 
  ArrowUpDown, 
  CheckCircle,
  Trash2,
  StickyNote,
  MessageSquareText
} from "lucide-react";

interface VacanciesViewProps {
  drafts: any[];
  isAdmin: boolean;
  searchQuery: string;
}

export default function VacanciesView({ drafts, isAdmin, searchQuery }: VacanciesViewProps) {
  const [viewMode, setViewMode] = useState<"active" | "archived">("active");
  const [localSearch, setLocalSearch] = useState("");
  const [shopFilter, setShopFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "name-asc" | "name-desc" | "deadline-asc">("date-desc");

  // Admin Notes Modal state
  const [activeNotesVacancy, setActiveNotesVacancy] = useState<any | null>(null);
  const [modalNotesText, setModalNotesText] = useState<string>("");
  const [isEditingModalNotes, setIsEditingModalNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Custom in-app confirmation modal state (bypasses blocked window.confirm in iframe)
  const [pendingAction, setPendingAction] = useState<{
    id: string;
    type: "filled" | "approved" | "delete";
    title: string;
    message: string;
    positionTitle?: string;
  } | null>(null);

  // Application Memo Modal state
  const [selectedApplyVacancy, setSelectedApplyVacancy] = useState<any | null>(null);
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Split drafts into approved (active) and filled (archived)
  const approvedVacancies = useMemo(() => drafts.filter((d) => d.status === "approved"), [drafts]);
  const filledVacancies = useMemo(() => drafts.filter((d) => d.status === "filled"), [drafts]);

  // Extract unique shop names dynamically across all drafts for the filter dropdown
  const uniqueShops = useMemo(() => {
    const shops = new Set<string>();
    drafts.forEach((d) => {
      if (d.shopName) {
        shops.add(d.shopName);
      }
    });
    return Array.from(shops).sort();
  }, [drafts]);

  // Determine current active subset
  const currentList = viewMode === "active" ? approvedVacancies : filledVacancies;

  // Apply search query, filters, and sorting logic
  const processedVacancies = useMemo(() => {
    let result = [...currentList];

    // Priority 1: Search by position title, shop, POC rank/name, or POC email
    const activeSearch = (localSearch || searchQuery).trim().toLowerCase();
    if (activeSearch) {
      result = result.filter(
        (v) =>
          (v.positionTitle || "").toLowerCase().includes(activeSearch) ||
          (v.shopName || "").toLowerCase().includes(activeSearch) ||
          (v.pocRankName || "").toLowerCase().includes(activeSearch) ||
          (v.pocEmail || "").toLowerCase().includes(activeSearch)
      );
    }

    // Priority 2: Filter by shop name
    if (shopFilter !== "all") {
      result = result.filter((v) => v.shopName === shopFilter);
    }

    // Priority 3: Sort logic
    result.sort((a, b) => {
      if (sortBy === "name-asc") {
        return (a.positionTitle || "").localeCompare(b.positionTitle || "");
      }
      if (sortBy === "name-desc") {
        return (b.positionTitle || "").localeCompare(a.positionTitle || "");
      }
      if (sortBy === "date-desc") {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      }
      if (sortBy === "date-asc") {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      }
      if (sortBy === "deadline-asc") {
        const dateA = a.closeDeadlineDate ? new Date(a.closeDeadlineDate).getTime() : Infinity;
        const dateB = b.closeDeadlineDate ? new Date(b.closeDeadlineDate).getTime() : Infinity;
        return dateA - dateB;
      }
      return 0;
    });

    return result;
  }, [currentList, searchQuery, localSearch, shopFilter, sortBy]);

  const handleOpenNotesModal = (vacancy: any, startEditing = false) => {
    setActiveNotesVacancy(vacancy);
    setModalNotesText(vacancy.adminNotes || "");
    setIsEditingModalNotes(startEditing || !vacancy.adminNotes);
  };

  const handleCloseNotesModal = () => {
    setActiveNotesVacancy(null);
    setModalNotesText("");
    setIsEditingModalNotes(false);
  };

  const handleSaveModalNotes = async () => {
    if (!activeNotesVacancy) return;
    setSavingNotes(true);
    try {
      await updateVacancyDraftAdminNotes(activeNotesVacancy.id, modalNotesText);
      setActiveNotesVacancy({
        ...activeNotesVacancy,
        adminNotes: modalNotesText
      });
      setIsEditingModalNotes(false);
      setToastMessage({ type: "success", text: "Admin notes saved successfully." });
    } catch (err) {
      console.error("Failed to save admin notes", err);
      setToastMessage({ 
        type: "error", 
        text: "Error saving notes: " + (err instanceof Error ? err.message : String(err)) 
      });
    } finally {
      setSavingNotes(false);
    }
  };

  const openMarkAsFilledModal = (vacancy: any) => {
    setPendingAction({
      id: vacancy.id,
      type: "filled",
      title: "Archive Vacancy Announcement",
      message: "Are you sure this position has been filled? Marking it filled will move this announcement into the Archives.",
      positionTitle: vacancy.positionTitle
    });
  };

  const openRestoreToActiveModal = (vacancy: any) => {
    setPendingAction({
      id: vacancy.id,
      type: "approved",
      title: "Reactivate Vacancy Announcement",
      message: "Do you want to restore this announcement back to Active Vacancies?",
      positionTitle: vacancy.positionTitle
    });
  };

  const openDeleteArchiveModal = (vacancy: any) => {
    setPendingAction({
      id: vacancy.id,
      type: "delete",
      title: "Delete Archived Announcement",
      message: "Are you sure you want to permanently delete this archived vacancy announcement? This operation cannot be undone.",
      positionTitle: vacancy.positionTitle
    });
  };

  const executePendingAction = async () => {
    if (!pendingAction) return;
    setSavingId(pendingAction.id);
    try {
      if (pendingAction.type === "delete") {
        await deleteVacancyDraft(pendingAction.id);
        setToastMessage({
          type: "success",
          text: `"${pendingAction.positionTitle || 'Position'}" archived announcement deleted permanently.`
        });
      } else {
        await updateVacancyDraftStatus(pendingAction.id, pendingAction.type);
        setToastMessage({
          type: "success",
          text: pendingAction.type === "filled"
            ? `"${pendingAction.positionTitle || 'Position'}" marked as filled and archived.`
            : `"${pendingAction.positionTitle || 'Position'}" restored to Active Announcements.`
        });
      }
      setPendingAction(null);
    } catch (err) {
      console.error("Failed to execute action", err);
      setToastMessage({
        type: "error",
        text: "Error executing action: " + (err instanceof Error ? err.message : String(err))
      });
    } finally {
      setSavingId(null);
    }
  };

  const shortenDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    return dateStr
      .replace(/January/g, "Jan")
      .replace(/February/g, "Feb")
      .replace(/March/g, "Mar")
      .replace(/April/g, "Apr")
      .replace(/June/g, "Jun")
      .replace(/July/g, "Jul")
      .replace(/August/g, "Aug")
      .replace(/September/g, "Sep")
      .replace(/October/g, "Oct")
      .replace(/November/g, "Nov")
      .replace(/December/g, "Dec");
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900/40 p-4 rounded-lg border border-slate-800">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-500" />
            Vacancy Announcements
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
            Browse active announcements or view the historic directory of filled positions.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-900/40 px-3 py-1 rounded">
          <span>{approvedVacancies.length} Active | {filledVacancies.length} Filled</span>
        </div>
      </div>

      {/* Tab Selectors & Sub-filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("active")}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              viewMode === "active"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>Active Announcements ({approvedVacancies.length})</span>
          </button>
          <button
            onClick={() => setViewMode("archived")}
            className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              viewMode === "archived"
                ? "border-emerald-500 text-emerald-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Archive className="w-4 h-4 shrink-0" />
            <span>Archived / Filled ({filledVacancies.length})</span>
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Local Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by position, shop, POC..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-[11px] rounded-md pl-8 pr-3 py-1.5 w-52 focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-slate-500"
            />
            {localSearch && (
              <button
                onClick={() => setLocalSearch("")}
                className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Shop/Element Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-md px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              value={shopFilter}
              onChange={(e) => setShopFilter(e.target.value)}
              className="bg-transparent border-none text-slate-300 text-[11px] focus:outline-none cursor-pointer font-sans"
            >
              <option value="all" className="bg-slate-900">All Shops</option>
              {uniqueShops.map((shop) => (
                <option key={shop} value={shop} className="bg-slate-900">{shop}</option>
              ))}
            </select>
          </div>

          {/* Sorting Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-md px-2.5 py-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent border-none text-slate-300 text-[11px] focus:outline-none cursor-pointer font-sans"
            >
              <option value="date-desc" className="bg-slate-900">Latest Submission</option>
              <option value="date-asc" className="bg-slate-900">Oldest Submission</option>
              <option value="name-asc" className="bg-slate-900">Position (A-Z)</option>
              <option value="name-desc" className="bg-slate-900">Position (Z-A)</option>
              <option value="deadline-asc" className="bg-slate-900">Deadline (Soonest)</option>
            </select>
          </div>
        </div>
      </div>

      {processedVacancies.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/20 border border-dashed border-slate-800 rounded-lg">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {viewMode === "active" ? "No Active Vacancies Found" : "No Archived Announcements Found"}
          </h3>
          <p className="text-slate-500 text-[11px] mt-1.5 max-w-sm mx-auto leading-relaxed">
            {viewMode === "active" 
              ? "There are currently no active vacancy announcements matching your filter parameters."
              : "No historical or filled vacancy announcements are stored under these matching filter parameters."}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/20 border border-slate-850 rounded-lg overflow-hidden shadow-xl">
          {/* Responsive row table layout */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="vacancies_table">
              <thead>
                <tr className="bg-slate-950 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-850">
                  <th className="px-4 py-3.5">Position Title</th>
                  <th className="px-4 py-3.5">Submission Deadline</th>
                  <th className="px-4 py-3.5">Rank Requirement</th>
                  <th className="px-3 py-3.5 text-center">Tier</th>
                  <th className="px-4 py-3.5">POC</th>
                  <th className="px-3 py-3.5 text-center">Announcement</th>
                  <th className="px-3 py-3.5 text-center">Apply</th>
                  <th className="px-3 py-3.5 text-center">Admin Notes</th>
                  {isAdmin && <th className="px-4 py-3.5 text-center">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850 text-xs">
                {processedVacancies.map((vacancy) => {
                  const rankReq = vacancy.eligibilityRequirements?.[0] || "N/A";
                  const hasNotes = !!(vacancy.adminNotes && vacancy.adminNotes.trim());

                  return (
                    <tr
                      key={vacancy.id}
                      className="hover:bg-slate-950/40 transition-colors duration-150"
                    >
                      {/* Position Title & Category */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-200 text-sm">{vacancy.positionTitle}</span>
                          {vacancy.slots && Number(vacancy.slots) > 1 && (
                            <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded font-mono text-[9px] font-bold whitespace-nowrap">
                              {vacancy.slots} Slots
                            </span>
                          )}
                          {viewMode === "archived" && (
                            <span className="px-1.5 py-0.5 bg-slate-800 text-slate-400 border border-slate-700/50 rounded font-mono text-[9px] uppercase font-bold">
                              FILLED
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono uppercase mt-0.5">{vacancy.shopName}</div>
                      </td>

                      {/* Submission Deadline */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-amber-400 font-mono">
                          <Calendar className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                          <span>{shortenDate(vacancy.closeDeadlineDate)}</span>
                        </div>
                      </td>

                      {/* Rank Requirement */}
                      <td className="px-4 py-4 max-w-[180px]">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Award className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                          <span className="truncate block" title={rankReq}>{rankReq}</span>
                        </div>
                      </td>

                      {/* Tier level */}
                      <td className="px-3 py-4 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-sm font-bold font-mono text-[10px]">
                          Tier {vacancy.tierLevel || "N/A"}
                        </span>
                      </td>

                      {/* POC */}
                      <td className="px-4 py-4">
                        <div className="text-slate-300 font-semibold flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>{vacancy.pocRankName || "N/A"}</span>
                        </div>
                        {vacancy.pocEmail && (
                          <a
                            href={`mailto:${vacancy.pocEmail}`}
                            className="text-[10px] font-mono text-emerald-400 hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <Mail className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                            <span>{vacancy.pocEmail}</span>
                          </a>
                        )}
                      </td>

                      {/* 1. Announcement Column */}
                      <td className="px-3 py-4 text-center whitespace-nowrap">
                        <button
                          id={`download_vacancy_${vacancy.id}`}
                          onClick={() => {
                            downloadVacancyMemo(vacancy);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                          title="Download Word Vacancy Announcement (.docx)"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Word</span>
                        </button>
                      </td>

                      {/* 2. Apply Column */}
                      <td className="px-3 py-4 text-center whitespace-nowrap">
                        <button
                          id={`apply_vacancy_${vacancy.id}`}
                          onClick={() => {
                            setSelectedApplyVacancy(vacancy);
                            setIsApplyModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 hover:border-sky-500/40 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                          title="Apply for this vacancy and generate Application Memo (.docx)"
                        >
                          <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span>Apply</span>
                        </button>
                      </td>

                      {/* 3. Admin Notes (Narrow Column with Clickable Note Icon) */}
                      <td className="px-3 py-4 text-center whitespace-nowrap">
                        {hasNotes ? (
                          <button
                            id={`view_notes_${vacancy.id}`}
                            onClick={() => handleOpenNotesModal(vacancy, false)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:border-amber-500/50 rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                            title="Click to view Admin Notes"
                          >
                            <StickyNote className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>Notes</span>
                          </button>
                        ) : isAdmin ? (
                          <button
                            id={`add_notes_${vacancy.id}`}
                            onClick={() => handleOpenNotesModal(vacancy, true)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded text-[10px] font-medium transition cursor-pointer"
                            title="Add Admin Notes"
                          >
                            <Edit3 className="w-3 h-3 text-slate-500" />
                            <span>+ Note</span>
                          </button>
                        ) : (
                          <span className="text-slate-600 text-xs font-mono select-none">—</span>
                        )}
                      </td>

                      {/* Admin-only State Change Actions Column */}
                      {isAdmin && (
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          {viewMode === "active" ? (
                            <button
                              onClick={() => openMarkAsFilledModal(vacancy)}
                              disabled={savingId === vacancy.id}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 hover:border-amber-500/40 rounded text-[9px] font-bold uppercase tracking-wider transition-all ${
                                savingId === vacancy.id ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                              }`}
                              title="Mark this announcement as Filled / Archived"
                            >
                              <Archive className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span>{savingId === vacancy.id ? "Archiving..." : "Mark Filled"}</span>
                            </button>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => openRestoreToActiveModal(vacancy)}
                                disabled={savingId === vacancy.id}
                                className={`inline-flex items-center gap-1 px-2 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 hover:border-blue-500/40 rounded text-[9px] font-bold uppercase tracking-wider transition-all ${
                                  savingId === vacancy.id ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                                }`}
                                title="Restore archived vacancy to Active Announcements"
                              >
                                <RotateCcw className="w-3 h-3 text-blue-500 shrink-0" />
                                <span>{savingId === vacancy.id ? "Reactivating..." : "Reactivate"}</span>
                              </button>
                              <button
                                onClick={() => openDeleteArchiveModal(vacancy)}
                                disabled={savingId === vacancy.id}
                                className={`inline-flex items-center gap-1 px-2 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 rounded text-[9px] font-bold uppercase tracking-wider transition-all ${
                                  savingId === vacancy.id ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                                }`}
                                title="Permanently delete this archived vacancy announcement"
                              >
                                <Trash2 className="w-3 h-3 text-rose-500 shrink-0" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Notes Viewer / Editor Modal */}
      {activeNotesVacancy && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          id="admin_notes_modal"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
                  <StickyNote className="w-5 h-5 shrink-0" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Admin Notes
                  </h3>
                  <p className="text-[11px] text-emerald-400 font-medium">
                    {activeNotesVacancy.positionTitle}
                    <span className="text-slate-500 text-[10px] font-mono ml-2">({activeNotesVacancy.shopName})</span>
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseNotesModal}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Read or Edit Mode */}
            {isEditingModalNotes ? (
              <div className="space-y-3">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Edit Note Content:
                </label>
                <textarea
                  value={modalNotesText}
                  onChange={(e) => setModalNotesText(e.target.value)}
                  rows={6}
                  placeholder="Enter administrator notes, routing status, or special internal instructions..."
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans resize-y leading-relaxed"
                  autoFocus
                />
                <div className="flex items-center justify-between pt-2">
                  {activeNotesVacancy.adminNotes && (
                    <button
                      type="button"
                      onClick={() => setModalNotesText("")}
                      className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
                    >
                      Clear notes
                    </button>
                  )}
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingModalNotes(false);
                        setModalNotesText(activeNotesVacancy.adminNotes || "");
                      }}
                      disabled={savingNotes}
                      className="px-3.5 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveModalNotes}
                      disabled={savingNotes}
                      className="px-4 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      {savingNotes ? (
                        <span>Saving...</span>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Save Notes</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {activeNotesVacancy.adminNotes && activeNotesVacancy.adminNotes.trim() ? (
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans">
                    {activeNotesVacancy.adminNotes}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-950/50 border border-dashed border-slate-800 rounded-lg">
                    <MessageSquareText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-medium">No admin notes have been added for this announcement.</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  {isAdmin ? (
                    <button
                      onClick={() => setIsEditingModalNotes(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold transition cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{activeNotesVacancy.adminNotes ? "Edit Notes" : "Add Notes"}</span>
                    </button>
                  ) : (
                    <div />
                  )}
                  <button
                    onClick={handleCloseNotesModal}
                    className="px-4 py-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-xl shadow-2xl border flex items-center justify-between gap-3 text-xs font-semibold animate-in fade-in slide-in-from-bottom-5 duration-200 ${
          toastMessage.type === "success" 
            ? "bg-emerald-950 border-emerald-800 text-emerald-200" 
            : "bg-rose-950 border-rose-800 text-rose-200"
        }`}>
          <div className="flex items-center gap-2">
            {toastMessage.type === "success" ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button 
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-1 rounded cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              {pendingAction.type === "filled" ? (
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
                  <Archive className="w-5 h-5 shrink-0" />
                </div>
              ) : pendingAction.type === "delete" ? (
                <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400">
                  <Trash2 className="w-5 h-5 shrink-0" />
                </div>
              ) : (
                <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400">
                  <RotateCcw className="w-5 h-5 shrink-0" />
                </div>
              )}
              <div>
                <h3 className="text-sm font-bold text-white">{pendingAction.title}</h3>
                <p className="text-[10px] text-slate-400">Confirmation Required</p>
              </div>
            </div>

            {pendingAction.positionTitle && (
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] uppercase font-mono text-slate-500 block mb-0.5">Position Title</span>
                <p className="text-xs font-bold text-emerald-400 font-sans">{pendingAction.positionTitle}</p>
              </div>
            )}

            <p className="text-xs text-slate-300 leading-relaxed">
              {pendingAction.message}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
              <button
                onClick={() => setPendingAction(null)}
                disabled={savingId !== null}
                className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executePendingAction}
                disabled={savingId !== null}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  pendingAction.type === "filled"
                    ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
                    : pendingAction.type === "delete"
                    ? "bg-rose-600 hover:bg-rose-500 text-white"
                    : "bg-blue-500 hover:bg-blue-400 text-white"
                }`}
              >
                {savingId ? (
                  <span>Processing...</span>
                ) : (
                  <span>
                    {pendingAction.type === "filled"
                      ? "Yes, Mark Filled"
                      : pendingAction.type === "delete"
                      ? "Yes, Delete Archive"
                      : "Yes, Reactivate"}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Application Memo Modal */}
      <ApplicationMemoModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        vacancy={selectedApplyVacancy}
      />
    </div>
  );
}