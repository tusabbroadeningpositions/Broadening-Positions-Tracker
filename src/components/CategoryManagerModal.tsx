import React, { useState, useEffect } from "react";
import { X, Edit2, Check, Tag, Info, Trash2 } from "lucide-react";
import { Duty } from "../types";
import { getUniqueCategories } from "../data/dutiesStore";

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  duties: Duty[];
  onRenameCategory: (oldName: string, newName: string) => void;
  onDeleteCategory: (categoryName: string) => void;
}

export default function CategoryManagerModal({
  isOpen,
  onClose,
  duties,
  onRenameCategory,
  onDeleteCategory,
}: CategoryManagerModalProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (isOpen) {
      setCategories(getUniqueCategories(duties));
    }
  }, [isOpen, duties]);

  if (!isOpen) return null;

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
    const dutyCount = duties.filter(d => d.category === cat).length;
    const warning = `Are you sure you want to delete the "${cat}" shop?\n\nThis will PERMANENTLY DELETE all ${dutyCount} positions within this shop.\n\nThis action cannot be undone.`;
    
    if (window.confirm(warning)) {
      onDeleteCategory(cat);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-900 rounded-lg shadow-2xl border border-slate-800 max-w-lg w-full overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <Tag className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-bold tracking-wider uppercase text-slate-200">Shop Manager</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-850"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto flex-1 bg-slate-900/50">
          <div className="mb-6 p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-md flex gap-3">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-300/80 leading-relaxed">
              Renaming a shop will update all current assignments associated with that shop name. 
              Changes are reflected immediately in the roster and filters.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between px-2 mb-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Shops</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Action</span>
            </div>
            
            {categories.map((cat) => (
              <div 
                key={cat} 
                className="group flex items-center justify-between p-3 bg-slate-950/40 hover:bg-slate-950/60 border border-slate-850 rounded-lg transition-colors"
              >
                {editingCategory === cat ? (
                  <div className="flex-1 flex items-center gap-2 mr-4">
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
                      className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors shadow-sm"
                      title="Save name"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingCategory(null)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-slate-300 group-hover:text-emerald-400 transition-colors">
                        {cat}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {duties.filter(d => d.category === cat).length} Assignments
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(cat)}
                        className="p-2 text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 rounded transition-all opacity-0 group-hover:opacity-100"
                        title="Rename shop"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(cat)}
                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded transition-all opacity-0 group-hover:opacity-100"
                        title="Delete shop and all positions"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded text-xs font-semibold border border-slate-750 transition-colors"
          >
            Close Manager
          </button>
        </div>
      </div>
    </div>
  );
}
