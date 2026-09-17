import React, { useState, useEffect, useRef } from "react";
import { X, Edit2, Check, Tag, Info, Trash2, Layers, ArrowLeft, ArrowRight, Plus, User, Mail, Save, ChevronDown, ChevronUp, Send } from "lucide-react";
import { Duty, ShopRelationship, CustomShop } from "../types";
import { getUniqueCategories, saveShopRelationship, deleteShopRelationship, getTermExpirationStatus } from "../data/dutiesStore";
import { getEmailTemplatesFromFirestore, EmailTemplate } from "../data/emailTemplates";

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  duties: Duty[];
  onRenameCategory: (oldName: string, newName: string) => void;
  onDeleteCategory: (categoryName: string) => void;
  shopRelationships?: ShopRelationship[];
  customShops?: string[];
  customShopsDetailed?: CustomShop[];
  onAddCategory?: (categoryName: string) => void;
  onUpdateShopManager?: (shopName: string, manager: string, email: string, managerRank?: string) => void;
}

export default function CategoryManagerModal({
  isOpen,
  onClose,
  duties,
  onRenameCategory,
  onDeleteCategory,
  shopRelationships = [],
  customShops = [],
  customShopsDetailed = [],
  onAddCategory,
  onUpdateShopManager,
}: CategoryManagerModalProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [selectedParentForSubShops, setSelectedParentForSubShops] = useState<string | null>(null);
  const [newShopInput, setNewShopInput] = useState("");
  const [createError, setCreateError] = useState("");

  // Shop Manager & Email editing state
  const [expandedShopManager, setExpandedShopManager] = useState<string | null>(null);
  const [managerInput, setManagerInput] = useState("");
  const [rankInput, setRankInput] = useState("SSG");
  const [emailInput, setEmailInput] = useState("");
  const [saveSuccessShop, setSaveSuccessShop] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Email All Managers Dropdown State
  const [showEmailDropdown, setShowEmailDropdown] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Roster lists for autofill suggestions
  const rosterNames = React.useMemo(() => {
    return Array.from(
      new Set(
        duties
          .map(d => d.lastName?.trim())
          .filter(name => name && name.toUpperCase() !== "VACANT")
      )
    ).sort();
  }, [duties]);

  const uniqueRanks = React.useMemo(() => {
    const list = ["SSG", "SFC", "MSG", "SGM", "CIV", "N/A"];
    const fromDuties = duties.map(d => d.rank?.trim()).filter(Boolean);
    return Array.from(new Set([...list, ...fromDuties])).sort();
  }, [duties]);

  // Click outside listener for the email dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowEmailDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      const activeFromDuties = getUniqueCategories(duties);
      const combined = Array.from(new Set([...activeFromDuties, ...customShops])).sort();
      setCategories(combined);

      // Load email templates
      getEmailTemplatesFromFirestore()
        .then(fetched => setEmailTemplates(fetched))
        .catch(err => console.error("Error loading templates in Shop Manager:", err));
    }
  }, [isOpen, duties, customShops]);

  if (!isOpen) return null;

  const handleClose = () => {
    setSelectedParentForSubShops(null);
    setNewShopInput("");
    setCreateError("");
    onClose();
  };

  const handleCreateShop = () => {
    setCreateError("");
    const trimmed = newShopInput.trim();
    if (!trimmed) {
      setCreateError("Shop name cannot be empty.");
      return;
    }
    if (categories.some(cat => cat.toLowerCase() === trimmed.toLowerCase())) {
      setCreateError("A shop with this name already exists.");
      return;
    }
    if (onAddCategory) {
      onAddCategory(trimmed);
      setNewShopInput("");
    }
  };

  const handleStartEdit = (cat: string) => {
    setEditingCategory(cat);
    setNewName(cat);
  };

  const handleSaveEdit = (oldName: string) => {
    const trimmed = newName.trim();
    if (trimmed && trimmed !== oldName) {
      onRenameCategory(oldName, trimmed);
    }
    setEditingCategory(null);
  };

  const handleDeleteClick = (cat: string) => {
    setDeletingCategory(cat);
  };

  const handleConfirmDeleteCategory = () => {
    if (deletingCategory) {
      onDeleteCategory(deletingCategory);
      setDeletingCategory(null);
    }
  };

  const handleToggleManagerEdit = (shopName: string) => {
    if (expandedShopManager === shopName) {
      setExpandedShopManager(null);
    } else {
      setExpandedShopManager(shopName);
      const detail = customShopsDetailed.find(s => s.name === shopName);
      setManagerInput(detail?.manager || "");
      setRankInput(detail?.managerRank || "SSG");
      setEmailInput(detail?.managerEmail || "");
      setShowSuggestions(false);
    }
  };

  const handleSaveManagerDetails = async (shopName: string) => {
    if (onUpdateShopManager) {
      await onUpdateShopManager(shopName, managerInput, emailInput, rankInput);
      setSaveSuccessShop(shopName);
      setTimeout(() => {
        setSaveSuccessShop(null);
      }, 3000);
    }
  };

  const handleSelectRosterName = (name: string) => {
    setManagerInput(name);
    setShowSuggestions(false);
    // Find the soldier's rank from the roster
    const soldierDuty = duties.find(d => d.lastName?.trim().toLowerCase() === name.trim().toLowerCase());
    if (soldierDuty?.rank) {
      setRankInput(soldierDuty.rank);
    }
  };

  const generateExpiredTermsChart = (dutiesList: Duty[]): string => {
    // Filter for past terms with valid soldier assigned
    const expired = dutiesList.filter(d => {
      if (!d.lastName || d.lastName.toUpperCase() === "VACANT") return false;
      if (!d.termEndDate) return false;
      return getTermExpirationStatus(d.termEndDate, d.lastName) === "past";
    });

    if (expired.length === 0) {
      return "[No expired terms detected. Roster is fully up-to-date!]";
    }

    let report = "EXPIRED ROSTER ITEMS:\n";
    expired.forEach((d, idx) => {
      const rankName = d.rank ? `${d.rank} ${d.lastName}` : d.lastName;
      report += `${idx + 1}. Shop: ${d.category} | Position: ${d.jobTitle} | Soldier: ${rankName} | Expired Date: ${d.termEndDate} 🔴 (PAST DUE)\n`;
    });

    return report;
  };

  const handleEmailAllManagers = (type: "blank" | "maintenance") => {
    setShowEmailDropdown(false);
    const emails = (customShopsDetailed || [])
      .map(s => s.managerEmail?.trim())
      .filter((email): email is string => !!email && email.includes("@"));

    const uniqueEmails = Array.from(new Set(emails));

    if (uniqueEmails.length === 0) {
      alert("No valid shop manager email addresses found to draft an email.");
      return;
    }

    const toLine = uniqueEmails.join(";");
    const ccLine = "broadeningpositions@army.mil";

    let subject = "";
    let body = "";

    if (type === "maintenance") {
      const template = emailTemplates.find(t => t.id === "shop_maintenance");
      
      const managersList = (customShopsDetailed || [])
        .map(s => `${s.managerRank ? s.managerRank + ' ' : ''}${s.manager || "Manager"}`)
        .filter(m => m.trim().length > 0);
      const managersStr = managersList.length > 0 ? managersList.join(", ") : "Shop Managers";

      const chartStr = generateExpiredTermsChart(duties);

      if (template) {
        subject = template.subject;
        body = template.body
          .replace(/{shopManagers}/g, managersStr)
          .replace(/{expiredTermsChart}/g, chartStr);
      } else {
        subject = "Action Required: Collateral Duty Roster Maintenance";
        body = `Dear Shop Managers,\n\nPlease review and update your respective collateral duty positions and assigned soldiers on the Broadening Positions tracking sheet to ensure all records are current and accurate.\n\nHere is the list of expired terms requiring immediate attention:\n\n${chartStr}\n\nRespectfully,\n\nBroadening Positions Team`;
      }
    }
    if (type === "blank") {
      subject = "Collateral Duty Roster Maintenance Notice";
      body = "Dear Shop Managers,\n\n";
    }

    const mailtoUrl = `mailto:${toLine}?cc=${encodeURIComponent(ccLine)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    const a = document.createElement("a");
    a.href = mailtoUrl;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const currentRel = shopRelationships.find(r => r.parentShop === selectedParentForSubShops);
  const assignedSubShops = currentRel ? currentRel.subShops : [];

  const availableSubShopOptions = categories.filter(
    cat => cat !== selectedParentForSubShops && !assignedSubShops.includes(cat)
  );

  const handleAddSubShop = async (subShop: string) => {
    if (!selectedParentForSubShops || !subShop) return;
    const currentRel = shopRelationships.find(r => r.parentShop === selectedParentForSubShops);
    const updatedSubShops = currentRel 
      ? [...currentRel.subShops.filter(s => s !== subShop), subShop]
      : [subShop];
    
    await saveShopRelationship({
      id: selectedParentForSubShops,
      parentShop: selectedParentForSubShops,
      subShops: updatedSubShops
    });
  };

  const handleRemoveSubShop = async (subShop: string) => {
    if (!selectedParentForSubShops) return;
    const currentRel = shopRelationships.find(r => r.parentShop === selectedParentForSubShops);
    if (!currentRel) return;
    const updatedSubShops = currentRel.subShops.filter(s => s !== subShop);
    
    if (updatedSubShops.length === 0) {
      await deleteShopRelationship(selectedParentForSubShops);
    } else {
      await saveShopRelationship({
        id: selectedParentForSubShops,
        parentShop: selectedParentForSubShops,
        subShops: updatedSubShops
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-900 rounded-lg shadow-2xl border border-slate-800 max-w-3xl w-full overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Tag className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-bold tracking-wider uppercase text-slate-200">Shop Manager</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-850"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 bg-slate-900/50">
          {selectedParentForSubShops ? (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <button
                  onClick={() => setSelectedParentForSubShops(null)}
                  className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white hover:underline transition-all cursor-pointer font-semibold"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Shops</span>
                </button>
                <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded uppercase font-bold tracking-widest">
                  Sub-Shop Editor
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-200">
                  Manage Sub-Shops for <span className="text-amber-400">{selectedParentForSubShops}</span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Assign other active shops to fall under <strong className="text-slate-300">{selectedParentForSubShops}</strong>. 
                  When filtering by the parent shop, positions from these sub-shops will automatically display in grouped groups.
                </p>
              </div>

              {/* Current Sub-Shops List */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                  Assigned Sub-Shops ({assignedSubShops.length})
                </span>
                
                {assignedSubShops.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {assignedSubShops.map((sub) => (
                      <div 
                        key={sub} 
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-md text-xs font-semibold"
                      >
                        <span>{sub}</span>
                        <button
                          onClick={() => handleRemoveSubShop(sub)}
                          className="hover:text-rose-400 hover:bg-rose-500/15 rounded-full p-0.5 transition-all cursor-pointer"
                          title="Remove association"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-950/20 border border-dashed border-slate-800 rounded-lg text-center">
                    <p className="text-xs text-slate-500">No sub-shops assigned to {selectedParentForSubShops} yet.</p>
                  </div>
                )}
              </div>

              {/* Add New Association Form */}
              {availableSubShopOptions.length > 0 ? (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Assign New Sub-Shop
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      id="new-subshop-select"
                      className="w-full max-w-sm sm:max-w-md text-xs border border-slate-750 rounded p-2 bg-slate-950 text-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer font-medium"
                      defaultValue=""
                      onChange={async (e) => {
                        const val = e.target.value;
                        if (val) {
                          await handleAddSubShop(val);
                          e.target.value = ""; // Reset select
                        }
                      }}
                    >
                      <option value="" disabled>Choose a shop to assign...</option>
                      {availableSubShopOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-950/30 border border-slate-800 rounded-md text-center text-xs text-slate-500">
                  No other active shops available to assign as sub-shops.
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="mb-6 p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-md flex gap-3">
                <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-300/80 leading-relaxed">
                  Renaming a shop will update all current assignments associated with that shop name. 
                  Changes are reflected immediately in the roster and filters. Use the <strong className="text-amber-400">Layers</strong> icon to assign hierarchy.
                </p>
              </div>

              {/* Email All Shop Managers Section */}
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-slate-950/40 border border-slate-800 rounded-xl gap-3">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Manager Communications</h4>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Quickly compose an email broadcast targeting all configured shop managers.
                  </p>
                </div>
                <div className="relative shrink-0" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowEmailDropdown(!showEmailDropdown)}
                    className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Email All Shop Managers</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {showEmailDropdown && (
                    <div className="absolute right-0 mt-1.5 w-56 bg-slate-950 border border-slate-800 rounded-lg shadow-2xl z-50 divide-y divide-slate-900 animate-in slide-in-from-top-1 duration-150">
                      <div className="p-1">
                        <button
                          type="button"
                          onClick={() => handleEmailAllManagers("blank")}
                          className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-850 rounded-md font-medium transition cursor-pointer flex items-center gap-2"
                        >
                          <Send className="w-3.5 h-3.5 text-slate-400" />
                          <span>Draft blank email</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEmailAllManagers("maintenance")}
                          className="w-full text-left px-3.5 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-850 rounded-md font-medium transition cursor-pointer flex items-center gap-2"
                        >
                          <Mail className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Draft maintenance email</span>
                        </button>
                      </div>
                      <div className="px-3.5 py-2 text-[10px] text-slate-500">
                        {(() => {
                          const emailsCount = Array.from(new Set(
                            (customShopsDetailed || [])
                              .map(s => s.managerEmail?.trim())
                              .filter(email => !!email && email.includes("@"))
                          )).length;
                          return `Recipient count: ${emailsCount} manager${emailsCount === 1 ? "" : "s"}`;
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Create New Shop Form */}
              <div className="mb-6 p-4 bg-slate-950/40 border border-slate-800 rounded-xl space-y-2.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Create New Shop
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter new shop name (e.g. Operations)"
                    className="flex-1 bg-slate-900 border border-slate-750 hover:border-slate-700 focus:border-emerald-500 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium placeholder:text-slate-600 transition"
                    value={newShopInput}
                    onChange={(e) => {
                      setNewShopInput(e.target.value);
                      if (createError) setCreateError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateShop();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleCreateShop}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Shop</span>
                  </button>
                </div>
                {createError && (
                  <p className="text-[10px] text-rose-400 font-semibold leading-none">{createError}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between px-2 mb-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Shops</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Action</span>
                </div>
                
                {categories.map((cat) => (
                  <div 
                    key={cat} 
                    className="flex flex-col p-3 bg-slate-950/40 hover:bg-slate-950/50 border border-slate-850 rounded-lg transition-colors gap-2.5"
                  >
                    {editingCategory === cat ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          autoFocus
                          type="text"
                          className="flex-1 bg-slate-900 border border-emerald-500/50 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEdit(cat);
                            if (e.key === "Escape") setEditingCategory(null);
                          }}
                        />
                        <button
                          onClick={() => handleSaveEdit(cat)}
                          className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors shadow-sm cursor-pointer"
                          title="Save name"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingCategory(null)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors cursor-pointer"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 flex flex-col">
                            <span className="text-sm font-semibold text-slate-300">
                              {cat}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                              <span>{duties.filter(d => d.category === cat).length} Assignments</span>
                              {shopRelationships.find(r => r.parentShop === cat)?.subShops.length ? (
                                <span className="bg-amber-500/10 text-amber-400 px-1.5 py-0.2 rounded border border-amber-500/20 text-[9px] font-bold">
                                  {shopRelationships.find(r => r.parentShop === cat)?.subShops.length} sub-shops
                                </span>
                              ) : null}
                            </span>
                            {/* Current Manager & Email Info */}
                            {(() => {
                              const detail = customShopsDetailed?.find(s => s.name === cat);
                              if (detail?.manager || detail?.managerEmail) {
                                return (
                                  <div className="mt-1.5 flex flex-col gap-0.5 text-[10px] text-slate-400 bg-slate-900/40 p-1.5 rounded border border-slate-800/40 max-w-full overflow-hidden">
                                    {detail.manager && (
                                      <div className="flex items-center gap-1">
                                        <User className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                        <span className="font-medium text-slate-300 truncate">
                                          Manager: {detail.managerRank ? `${detail.managerRank} ` : ""}{detail.manager}
                                        </span>
                                      </div>
                                    )}
                                    {detail.managerEmail && (
                                      <div className="flex items-center gap-1">
                                        <Mail className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                        <span className="font-mono text-slate-400 truncate select-all">{detail.managerEmail}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleToggleManagerEdit(cat)}
                              className={`p-1.5 rounded transition-all flex items-center gap-1 text-[10px] font-bold cursor-pointer border ${
                                expandedShopManager === cat 
                                  ? "bg-emerald-950/80 text-emerald-400 border-emerald-800/50" 
                                  : "text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/30 border-transparent"
                              }`}
                              title="Manage Shop Manager & Email"
                            >
                              <User className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline uppercase tracking-wider">Manager</span>
                              {expandedShopManager === cat ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                            <button
                              onClick={() => setSelectedParentForSubShops(cat)}
                              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 rounded transition-all cursor-pointer"
                              title="Assign sub-shops"
                            >
                              <Layers className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleStartEdit(cat)}
                              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded transition-all cursor-pointer"
                              title="Rename shop"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(cat)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded transition-all cursor-pointer"
                              title="Delete shop and all positions"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Expandable Manager/Email editor panel */}
                        {expandedShopManager === cat && (
                          <div className="mt-1 p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-3.5 animate-in slide-in-from-top-2 duration-200">
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                              {/* Rank Select */}
                              <div className="sm:col-span-3 space-y-1">
                                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                  Rank
                                </label>
                                <select
                                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium cursor-pointer"
                                  value={rankInput}
                                  onChange={(e) => setRankInput(e.target.value)}
                                >
                                  {uniqueRanks.map((r) => (
                                    <option key={r} value={r}>
                                      {r}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Manager Name Input with Suggestions */}
                              <div className="sm:col-span-5 space-y-1 relative">
                                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                  Shop Manager Name
                                </label>
                                <div className="relative">
                                  <span className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-slate-500">
                                    <User className="w-3 h-3" />
                                  </span>
                                  <input
                                    type="text"
                                    placeholder="Last Name, First Name"
                                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded pl-7 pr-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                                    value={managerInput}
                                    onChange={(e) => {
                                      setManagerInput(e.target.value);
                                      setShowSuggestions(true);
                                    }}
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                  />
                                </div>
                                {showSuggestions && managerInput.trim().length > 0 && (
                                  <div className="absolute z-50 w-full bg-slate-950 mt-1 max-h-36 overflow-y-auto border border-slate-800 rounded shadow-2xl divide-y divide-slate-900/60">
                                    {rosterNames
                                      .filter(name => name.toLowerCase().includes(managerInput.toLowerCase()))
                                      .slice(0, 5)
                                      .map((name) => (
                                        <button
                                          key={name}
                                          type="button"
                                          className="w-full text-left px-3 py-2 text-xs hover:bg-slate-800 hover:text-white text-slate-300 font-medium transition cursor-pointer"
                                          onClick={() => handleSelectRosterName(name)}
                                        >
                                          {name}
                                        </button>
                                      ))}
                                  </div>
                                )}
                              </div>

                              {/* Email Address */}
                              <div className="sm:col-span-4 space-y-1">
                                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                  Manager Email Address
                                </label>
                                <div className="relative">
                                  <span className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-slate-500">
                                    <Mail className="w-3 h-3" />
                                  </span>
                                  <input
                                    type="email"
                                    placeholder="e.g. john.smith@mail.mil"
                                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded pl-7 pr-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                                    value={emailInput}
                                    onChange={(e) => setEmailInput(e.target.value)}
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-1">
                              {saveSuccessShop === cat ? (
                                <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  <span>Details saved to Firestore!</span>
                                </p>
                              ) : (
                                <span className="text-[9px] text-slate-500">
                                  Format: last name, first name. Autofills rank when a roster soldier is chosen.
                                </span>
                              )}
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setExpandedShopManager(null)}
                                  className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 rounded transition font-medium cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveManagerDetails(cat)}
                                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold transition flex items-center gap-1 shadow cursor-pointer"
                                >
                                  <Save className="w-3 h-3" />
                                  <span>Save Details</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded text-xs font-semibold border border-slate-750 transition-colors"
          >
            Close Manager
          </button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deletingCategory && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-[60]">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Trash2 className="w-4 h-4 text-rose-500" />
                <h4 className="text-sm font-bold text-slate-100">Delete Shop</h4>
              </div>
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to delete the <strong className="text-white">"{deletingCategory}"</strong> shop?
              </p>
              <p className="text-xs font-bold text-rose-400">
                This will PERMANENTLY DELETE all {duties.filter(d => d.category === deletingCategory).length} positions within this shop.
              </p>
              <p className="text-[11px] text-slate-500">
                This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingCategory(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white rounded hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded transition cursor-pointer flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Shop & Positions</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
