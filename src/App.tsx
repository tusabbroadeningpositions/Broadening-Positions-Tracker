import React, { useState, useEffect, useMemo, useRef } from "react";
import Header from "./components/Header";
import AdminPanel from "./components/AdminPanel";
import DutiesList from "./components/DutiesList";
import TermExpirationsView from "./components/TermExpirationsView";
import StatisticsView from "./components/StatisticsView";
import DutyFormModal from "./components/DutyFormModal";

import { Duty } from "./types";
import { 
  loadDuties, 
  saveDuties, 
  calculateSoldierSummaries,
  renameCategory,
  getLastUpdatedTime,
  syncDutyToFirestore,
  deleteDutyFromFirestore,
  syncSoldierRankToFirestore,
  syncRenameCategoryToFirestore,
  batchSyncDutiesToFirestore
} from "./data/dutiesStore";
import { db } from "./lib/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { useCollectionData } from "react-firebase-hooks/firestore";
import { Shield, Sparkles, BookOpen, Clock, Users, Building2, LogIn } from "lucide-react";

export default function App() {
  const [duties, setDuties] = useState<Duty[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"duties" | "expirations" | "statistics">("duties");
  
  // Firebase Data
  const dutiesRef = collection(db, "duties");
  const q = query(dutiesRef, orderBy("lastName", "asc"));
  const [firestoreDuties, loading, error] = useCollectionData(q);
  
  const hasSeededRef = useRef(false);

  // Admin authorization states
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Modal editor states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDuty, setEditingDuty] = useState<Duty | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // On mount, restore admin session if active
  useEffect(() => {
    // Immediate local load to prevent empty screen
    const local = loadDuties();
    if (local.length > 0) {
      setDuties(local);
    }

    const sessionAdmin = localStorage.getItem("army_duty_admin");
    const sessionPassword = localStorage.getItem("army_duty_admin_password");
    if (sessionAdmin === "true" && sessionPassword) {
      setIsAdmin(true);
    }
  }, []);

  // Update duties state when Firestore data changes
  useEffect(() => {
    if (!loading && firestoreDuties) {
      // Cast firestore data to Duty type
      const data = firestoreDuties as Duty[];
      
      // Seed if empty (first time usage) - ONLY if admin is logged in to have permissions
      if (data.length === 0 && isAdmin && !hasSeededRef.current) {
        hasSeededRef.current = true;
        const initial = loadDuties(); // load from local/raw
        if (initial.length > 0) {
          console.log("Seeding Firestore with initial duties...");
          batchSyncDutiesToFirestore(initial).catch(err => {
            console.error("Seeding failed", err);
            hasSeededRef.current = false; // Reset if it failed
          });
        }
      } else if (data.length > 0) {
        setDuties(data);
        // Also save to local storage as a backup/cache
        saveDuties(data);
        setLastUpdated(getLastUpdatedTime());
      }
    }
    
    if (error) {
      console.error("Firestore error:", error);
    }
  }, [firestoreDuties, loading, error, isAdmin]);

  // Compute calculated values reactively when duties state updates
  const soldierSummaries = useMemo(() => {
    return calculateSoldierSummaries(duties);
  }, [duties]);

  const metrics = useMemo(() => {
    let total = duties.length;
    let vacancies = 0;
    
    duties.forEach(d => {
      if (d.lastName.trim().toUpperCase() === "VACANT" || !d.lastName) {
        vacancies++;
      }
    });

    const overloadedCount = soldierSummaries.filter(s => s.isOverloaded).length;

    return {
      total,
      vacancies,
      overloadedCount,
    };
  }, [duties, soldierSummaries]);

  // Admin Login Verification
  const handleLogin = async (password: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setIsAdmin(true);
        localStorage.setItem("army_duty_admin", "true");
        localStorage.setItem("army_duty_admin_password", password);
        return true;
      }
    } catch (err) {
      console.error("Auth failed", err);
    }
    return false;
  };

  // Admin Logout
  const handleLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem("army_duty_admin");
    localStorage.removeItem("army_duty_admin_password");
  };

  // Create or Update Duty handler
  const handleSaveDuty = async (dutyData: Omit<Duty, "id"> & { id?: string }) => {
    const targetLastName = dutyData.lastName.trim();
    const targetRank = dutyData.rank;
    const dutyId = dutyData.id || `duty_${Date.now()}`;
    
    const newDuty: Duty = {
      ...dutyData,
      id: dutyId,
    } as Duty;

    // Sync to Firestore
    await syncDutyToFirestore(newDuty);

    // If rank changed, sync all other entries for this soldier
    if (targetLastName && targetLastName.toUpperCase() !== "VACANT") {
      await syncSoldierRankToFirestore(targetLastName, targetRank);
    }

    setIsFormOpen(false);
    setEditingDuty(null);
  };

  // Delete Duty assignment
  const handleDeleteDuty = async (id: string) => {
    await deleteDutyFromFirestore(id);
  };
  
  // Rename a category globally
  const handleRenameCategory = async (oldName: string, newName: string) => {
    await syncRenameCategoryToFirestore(oldName, newName);
  };

  // Import custom backup file
  const handleImportJSON = async (importedDuties: Duty[]) => {
    try {
      await batchSyncDutiesToFirestore(importedDuties);
      setLastUpdated(getLastUpdatedTime());
    } catch (err) {
      console.error("Import failed", err);
    }
  };

  // Trigger modal for editing an existing duty
  const handleTriggerEdit = (duty: Duty) => {
    setEditingDuty(duty);
    setIsFormOpen(true);
  };

  // Trigger modal for adding a new duty
  const handleTriggerAdd = () => {
    setEditingDuty(null);
    setIsFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-200">
      
      {/* Header and Filter Bars */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isAdmin={isAdmin}
        onAdminClick={() => setShowLoginModal(true)}
        onLogout={handleLogout}
        totalDutiesCount={metrics.total}
        overloadedCount={metrics.overloadedCount}
        vacanciesCount={metrics.vacancies}
        isLoading={loading}
      />

      {/* Admin Quick Action Panel */}
      <AdminPanel
        isAdmin={isAdmin}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onAddDuty={handleTriggerAdd}
        onImportJSON={handleImportJSON}
        onRenameCategory={handleRenameCategory}
        allDuties={duties}
        showLoginModal={showLoginModal}
        setShowLoginModal={setShowLoginModal}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Render Active View Tab */}
        {activeTab === "duties" && (
          <DutiesList
            duties={duties}
            soldierSummaries={soldierSummaries}
            isAdmin={isAdmin}
            onEditDuty={handleTriggerEdit}
            onDeleteDuty={handleDeleteDuty}
            searchQuery={searchQuery}
          />
        )}

        {activeTab === "expirations" && (
          <TermExpirationsView
            duties={duties}
            searchQuery={searchQuery}
          />
        )}

        {activeTab === "statistics" && (
          <StatisticsView
            duties={duties}
          />
        )}

      </main>

      {/* Dialog Form for Adding/Editing Duties */}
      <DutyFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingDuty(null);
        }}
        onSave={handleSaveDuty}
        editingDuty={editingDuty}
        allDuties={duties}
      />

      {/* Visual Instruction / Footnote Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6 text-center text-[10px] text-slate-500 font-mono tracking-widest uppercase">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-2">
          <Clock className="w-3 h-3 text-emerald-500/50" />
          <span>
            Last Roster Update: {lastUpdated ? new Date(lastUpdated).toLocaleString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            }) : 'No recent updates'}
          </span>
        </div>
      </footer>

    </div>
  );
}
