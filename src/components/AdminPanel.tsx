import React, { useState } from "react";
import { Shield, Plus, Download, Upload, Eye, EyeOff, X, FileJson, Tag, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { Duty } from "../types";
import CategoryManagerModal from "./CategoryManagerModal";

interface AdminPanelProps {
  isAdmin: boolean;
  onLogin: (password: string) => Promise<boolean> | boolean;
  onLogout: () => void;
  onAddDuty: () => void;
  onImportJSON: (duties: Duty[]) => void;
  onRenameCategory: (oldName: string, newName: string) => void;
  allDuties: Duty[];
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
}

export default function AdminPanel({
  isAdmin,
  onLogin,
  onLogout,
  onAddDuty,
  onImportJSON,
  allDuties,
  showLoginModal,
  setShowLoginModal,
  onRenameCategory,
}: AdminPanelProps) {
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const success = await onLogin(password);
      if (success) {
        setPassword("");
        setShowLoginModal(false);
      } else {
        setLoginError("Invalid passkey. Please try again.");
      }
    } catch (err) {
      setLoginError("Authentication failed. Please check your connection.");
      console.error(err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data)) {
          // Perform basic validation to check if fields exist
          const isValid = data.every(
            (item) => item && typeof item.jobTitle === "string" && typeof item.lastName === "string"
          );
          if (isValid) {
            onImportJSON(data as Duty[]);
            alert(`Successfully imported ${data.length} collateral duty records!`);
          } else {
            alert("Invalid roster format. Please upload a valid exported JSON file.");
          }
        } else {
          alert("Uploaded JSON is not an array of duties.");
        }
      } catch (err) {
        alert("Failed to parse JSON file. Ensure it is a valid backup file.");
      }
    };
    reader.readAsText(file);
    // Clear input
    e.target.value = "";
  };

  const handleExportJSON = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allDuties, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      
      const timestamp = new Date().toISOString().split("T")[0];
      downloadAnchor.setAttribute("download", `army_collateral_duties_${timestamp}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      alert("Failed to export data.");
    }
  };

  const handleExportExcel = () => {
    try {
      // Sorting Logic:
      // 1. Shop (Category) Alphabetical
      // 2. Tier Level Descending (3, 2, 1, null)
      const sortedDuties = [...allDuties].sort((a, b) => {
        // Primary: Category
        const catA = a.category || "";
        const catB = b.category || "";
        if (catA < catB) return -1;
        if (catA > catB) return 1;

        // Secondary: Tier Level (Descending: 3, 2, 1, null)
        const tierA = a.tierLevel ?? -1;
        const tierB = b.tierLevel ?? -1;
        return tierB - tierA;
      });

      // Map to Excel-friendly format
      const excelData = sortedDuties.map(d => ({
        "Shop (Category)": d.category,
        "Job Title": d.jobTitle,
        "Last Name": d.lastName,
        "Rank": d.rank,
        "Element/Group": d.elementOrGroup,
        "Tier": d.tierLevel ?? "N/A",
        "Duty Type": d.dutyType === 'EL' ? 'Element' : d.dutyType === 'U' ? 'Unit' : 'N/A',
        "Command Appointed": d.isCommandAppointed ? "Yes" : "No",
        "Date Started": d.dateStarted,
        "Term Length": d.termLength,
        "Term End Date": d.termEndDate,
        "Specialized": d.specialized ? "Yes" : "No"
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Duties");

      // Auto-size columns (basic approximation)
      const maxColWidths = excelData.reduce((acc, row) => {
        Object.keys(row).forEach((key, i) => {
          const val = String(row[key as keyof typeof row] || "");
          acc[i] = Math.max(acc[i] || 0, val.length, key.length);
        });
        return acc;
      }, [] as number[]);
      worksheet["!cols"] = maxColWidths.map(w => ({ wch: w + 2 }));

      const timestamp = new Date().toISOString().split("T")[0];
      XLSX.writeFile(workbook, `army_collateral_duties_${timestamp}.xlsx`);
    } catch (err) {
      console.error("Excel Export Error:", err);
      alert("Failed to export Excel file.");
    }
  };

  return (
    <>
      {/* Admin Utility Bar - Visible ONLY when logged in */}
      {isAdmin && (
        <div className="bg-slate-900/60 border-b border-slate-800/80 py-3.5 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2 text-slate-100">
              <Shield className="w-5 h-5 text-emerald-500 fill-emerald-500/10 shrink-0" />
              <div>
                <p className="text-sm font-bold tracking-tight">Administrative Suite Enabled</p>
                <p className="text-[11px] text-slate-400">You have write authorization. Double-click or click action buttons to edit.</p>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Add Duty */}
              <button
                onClick={onAddDuty}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow-sm transition duration-150"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>Assign New Duty</span>
              </button>

              {/* Manage Shops */}
              <button
                onClick={() => setShowCategoryManager(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-900/40 hover:bg-sky-800/60 text-sky-200 border border-sky-800/50 rounded text-xs font-semibold shadow-sm transition duration-150"
              >
                <Tag className="w-3.5 h-3.5 text-sky-400" />
                <span>Manage Shops</span>
              </button>

              {/* Export Excel */}
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-200 border border-emerald-800/50 rounded text-xs font-semibold shadow-sm transition duration-150"
                title="Export all data to Excel spreadsheet"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export Spreadsheet</span>
              </button>

              {/* Export JSON */}
              <button
                onClick={handleExportJSON}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-750 rounded text-xs font-semibold transition duration-150"
                title="Export active roster as JSON backup"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Backup</span>
              </button>

              {/* Import JSON */}
              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-750 rounded text-xs font-semibold cursor-pointer transition duration-150">
                <Upload className="w-3.5 h-3.5" />
                <span>Import Backup</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={showCategoryManager}
        onClose={() => setShowCategoryManager(false)}
        duties={allDuties}
        onRenameCategory={onRenameCategory}
      />

      {/* Login Modal - Triggered from Header */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 rounded-lg shadow-2xl border border-slate-800 max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-emerald-500 fill-emerald-500/10" />
                <h3 className="text-xs font-bold tracking-wider uppercase text-slate-200">Administrative Access</h3>
              </div>
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setLoginError(false);
                  setPassword("");
                }}
                className="text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-850"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleLoginSubmit} className="p-5 space-y-4">
              <div>
                <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                  Enter the administrative passkey to enable adding, modifying, deleting, and importing duties.
                </p>

                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Admin Passkey
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoFocus
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded focus:outline-hidden focus:ring-1 focus:ring-emerald-500 text-sm text-slate-200 pr-10 font-mono"
                    placeholder="Enter passkey"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {loginError && (
                  <p className="text-xs font-semibold text-rose-500 mt-1.5 animate-pulse">
                    ⚠ {loginError}
                  </p>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginModal(false);
                    setLoginError(false);
                    setPassword("");
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition duration-150"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold shadow-xs transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoggingIn ? "Authenticating..." : "Unlock Admin Panel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
