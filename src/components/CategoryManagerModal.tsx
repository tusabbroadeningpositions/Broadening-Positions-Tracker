import React, { useState, useEffect } from "react";
import { X, Edit2, Check, Tag, Info, Trash2, Layers, ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { Duty, ShopRelationship } from "../types";
import { getUniqueCategories, saveShopRelationship, deleteShopRelationship } from "../data/dutiesStore";

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  duties: Duty[];
  onRenameCategory: (oldName: string, newName: string) => void;
  onDeleteCategory: (categoryName: string) => void;
  shopRelationships?: ShopRelationship[];
}

export default function CategoryManagerModal({
  isOpen,
  onClose,
  duties,
  onRenameCategory,
  onDeleteCategory,
  shopRelationships = [],
}: CategoryManagerModalProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [selectedParentForSubShops, setSelectedParentForSubShops] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCategories(getUniqueCategories(duties));
    }
  }, [isOpen, duties]);

  if (!isOpen) return null;

  const handleClose = () => {
    setSelectedParentForSubShops(null);
    onClose();
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
      <div className="bg-slate-900 rounded-lg shadow-2xl border border-slate-800 max-w-lg w-full overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95 duration-200">
        
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
                      className="flex-1 text-xs border border-slate-750 rounded p-2 bg-slate-950 text-slate-300 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer font-medium"
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
                          <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
                            <span>{duties.filter(d => d.category === cat).length} Assignments</span>
                            {shopRelationships.find(r => r.parentShop === cat)?.subShops.length ? (
                              <span className="bg-amber-500/10 text-amber-400 px-1.5 py-0.2 rounded border border-amber-500/20 text-[9px] font-bold">
                                {shopRelationships.find(r => r.parentShop === cat)?.subShops.length} sub-shops
                              </span>
                            ) : null}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setSelectedParentForSubShops(cat)}
                            className="p-2 text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 rounded transition-all opacity-0 group-hover:opacity-100 flex items-center gap-1.5"
                            title="Assign sub-shops"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>
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
