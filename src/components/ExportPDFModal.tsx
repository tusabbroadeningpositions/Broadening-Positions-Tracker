import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Download, 
  X, 
  Check, 
  Layers, 
  FileSpreadsheet, 
  ShieldAlert,
  Info
} from "lucide-react";

interface ExportPDFModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (options: { includeScope: boolean }) => void;
  filteredCount: number;
  totalCount: number;
  activeFilters: string[];
}

export default function ExportPDFModal({
  isOpen,
  onClose,
  onExport,
  filteredCount,
  totalCount,
  activeFilters
}: ExportPDFModalProps) {
  const [includeScope, setIncludeScope] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIncludeScope(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirmExport = () => {
    onExport({
      includeScope
    });
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      id="export_pdf_modal"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
              <FileText className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Export Roster to PDF
              </h3>
              <p className="text-[11px] text-slate-400">
                Configure PDF layout and inclusion options
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dataset Summary Banner */}
        <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Positions to Export:</span>
            <span className="font-bold text-emerald-400 font-mono">
              {filteredCount} of {totalCount} records
            </span>
          </div>

          <div className="text-[11px] text-slate-400 flex items-start gap-1.5 pt-1 border-t border-slate-850">
            <Layers className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="text-slate-500 font-semibold uppercase tracking-wider text-[9px] block">Active Filters:</span>
              <span className="text-slate-300 font-sans">
                {activeFilters.length > 0 ? activeFilters.join(" | ") : "All (Full Roster)"}
              </span>
            </div>
          </div>
        </div>

        {/* Export Options */}
        <div className="space-y-3">
          <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
            Export Options & Content
          </label>

          {/* Scope of Responsibility Toggle */}
          <div 
            onClick={() => setIncludeScope(!includeScope)}
            className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${
              includeScope 
                ? "bg-slate-850/90 border-emerald-500/40 shadow-sm" 
                : "bg-slate-950 border-slate-800 hover:border-slate-700"
            }`}
          >
            <div className="pt-0.5">
              <input
                type="checkbox"
                id="checkbox_include_scope"
                checked={includeScope}
                onChange={(e) => setIncludeScope(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 bg-slate-900 border-slate-700 focus:ring-emerald-500 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200">
                  Include Scope of Responsibility & Senior Rater
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                Appends the Senior Rater Abbreviation and descriptive Scope of Responsibility underneath each position row in small, space-efficient typography.
              </p>
            </div>
          </div>
        </div>

        {/* Informational Tip */}
        <div className="flex items-center gap-2 p-2.5 bg-slate-950/60 rounded-lg border border-slate-850 text-[11px] text-slate-400">
          <Info className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>The PDF will be generated in landscape orientation with page numbering and date timestamps.</span>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            id="confirm_export_pdf_button"
            onClick={handleConfirmExport}
            className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition cursor-pointer flex items-center gap-2 shadow-md shadow-emerald-950"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Generate & Download PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
