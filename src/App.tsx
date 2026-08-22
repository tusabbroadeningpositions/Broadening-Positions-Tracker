import React, { useState, useEffect, useMemo, useRef } from "react";
import Header from "./components/Header";
import AdminPanel from "./components/AdminPanel";
import DutiesList from "./components/DutiesList";
import TermExpirationsView from "./components/TermExpirationsView";
import VacanciesView from "./components/VacanciesView";
import StatisticsView from "./components/StatisticsView";
import DutyFormModal from "./components/DutyFormModal";

import { Duty, UpdateRequest, ShopRelationship } from "./types";
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
  batchSyncDutiesToFirestore,
  syncDeleteCategoryToFirestore,
  saveShopRelationship,
  deleteShopRelationship
} from "./data/dutiesStore";
import { db } from "./lib/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { useCollection, useCollectionData } from "react-firebase-hooks/firestore";
import { Shield, Sparkles, BookOpen, Clock, Users, Building2, LogIn } from "lucide-react";
import VacancyAnnouncementModal from "./components/VacancyAnnouncementModal";
import { extractDraftIdFromUrl } from "./utils/shareUtils";

export default function App() {
  const [duties, setDuties] = useState<Duty[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"duties" | "expirations" | "vacancies" | "statistics">("duties");
  
  // Firebase Data
  const dutiesRef = collection(db, "duties");
  const q = query(dutiesRef, orderBy("lastName", "asc"));
  const [firestoreDuties, loading, error] = useCollectionData(q);

  // Load update requests from Firestore
  const requestsRef = collection(db, "update_requests");
  const requestsQ = query(requestsRef, orderBy("createdAt", "desc"));
  const [firestoreRequestsSnap] = useCollection(requestsQ);
  const updateRequests = useMemo(() => {
    return (firestoreRequestsSnap?.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) || []) as UpdateRequest[];
  }, [firestoreRequestsSnap]);

  // Load vacancy drafts from Firestore in real-time
  const draftsRef = collection(db, "vacancy_drafts");
  const draftsQ = query(draftsRef, orderBy("createdAt", "desc"));
  const [firestoreDraftsSnap] = useCollection(draftsQ);
  const vacancyDrafts = useMemo(() => {
    return (firestoreDraftsSnap?.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) || []) as any[];
  }, [firestoreDraftsSnap]);

  // Load shop relationships from Firestore in real-time
  const shopRelationshipsRef = collection(db, "shop_relationships");
  const [firestoreRelationshipsSnap] = useCollection(shopRelationshipsRef);
  const shopRelationships = useMemo(() => {
    return (firestoreRelationshipsSnap?.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) || []) as ShopRelationship[];
  }, [firestoreRelationshipsSnap]);

  // Load custom empty shops from Firestore in real-time
  const customShopsRef = collection(db, "custom_shops");
  const [firestoreCustomShops] = useCollectionData(customShopsRef);
  const customShopsList = useMemo(() => {
    if (!firestoreCustomShops) return [];
    return firestoreCustomShops.map((d: any) => d.name as string).filter(Boolean);
  }, [firestoreCustomShops]);
  
  const hasSeededRef = useRef(false);

  // Admin authorization states
  const [isAdmin, setIsAdmin] = useState(false);
  const [isHR, setIsHR] = useState(false);
  const [allowedCategory, setAllowedCategory] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Modal editor states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDuty, setEditingDuty] = useState<Duty | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [myShopTrigger, setMyShopTrigger] = useState(0);

  // Vacancy Draft link/modal states
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [loadedDraft, setLoadedDraft] = useState<any | null>(null);
  const [loadedDraftDuty, setLoadedDraftDuty] = useState<Duty | null>(null);

  // On mount, restore admin session if active
  useEffect(() => {
    // Immediate local load to prevent empty screen
    const local = loadDuties();
    if (local.length > 0) {
      setDuties(local);
    }

    const sessionAdmin = localStorage.getItem("army_duty_admin");
    const sessionHR = localStorage.getItem("army_duty_is_hr");
    const sessionPassword = localStorage.getItem("army_duty_admin_password");
    const sessionCategory = localStorage.getItem("army_duty_admin_category");
    
    if (sessionAdmin === "true" && sessionPassword) {
      setIsAdmin(true);
    }
    if (sessionHR === "true" && sessionPassword) {
      setIsHR(true);
    }
    if (sessionCategory) {
      setAllowedCategory(sessionCategory.trim());
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
        setLastUpdated(getLastUpdatedTime(data));
      }
    }
    
    if (error) {
      console.error("Firestore error:", error);
    }
  }, [firestoreDuties, loading, error, isAdmin]);

  // Track if deep-linked draft ID was already fetched to prevent infinite loops
  const fetchedDraftIdRef = useRef<string | null>(null);

  // Deep-linking to specific vacancy drafts via ?draftId=xxxx or hash or SPA 404 redirect
  useEffect(() => {
    const dId = extractDraftIdFromUrl();
    if (!dId) return;

    // If we already fetched this exact draft ID, just update matching duty if duties changed
    if (fetchedDraftIdRef.current === dId) {
      if (loadedDraft && duties.length > 0) {
        const matchingDuty = duties.find(d => d.id === loadedDraft.dutyId);
        if (matchingDuty) {
          setLoadedDraftDuty(matchingDuty);
        }
      }
      return;
    }

    fetchedDraftIdRef.current = dId;

    const fetchDraft = async () => {
      try {
        const { doc, getDoc } = await import("firebase/firestore");
        const draftDoc = await getDoc(doc(db, "vacancy_drafts", dId));
        if (draftDoc.exists()) {
          const draftData = draftDoc.data();
          const fullDraft = { id: draftDoc.id, ...draftData };
          setLoadedDraft(fullDraft);
          
          // Find corresponding duty
          const matchingDuty = duties.find(d => d.id === draftData.dutyId) || {
            id: draftData.dutyId || "custom",
            category: draftData.shopName || "N/A",
            jobTitle: draftData.positionTitle || "N/A",
            lastName: "VACANT",
            rank: "",
            elementOrGroup: "",
            dutyType: "U"
          } as Duty;
          
          setLoadedDraftDuty(matchingDuty);
          setIsDraftModalOpen(true);
        } else {
          console.warn("Draft document does not exist:", dId);
          alert(`The requested vacancy announcement draft (ID: ${dId}) was not found in the system. It may have been removed or archived.`);
        }
      } catch (err) {
        console.error("Error loading vacancy draft from URL parameter:", err);
      }
    };
    fetchDraft();
  }, [duties, loadedDraft]);

  // Compute calculated values reactively when duties state updates
  const soldierSummaries = useMemo(() => {
    return calculateSoldierSummaries(duties);
  }, [duties]);

  const metrics = useMemo(() => {
    // Metrics remain global so users see the total roster state
    const total = duties.length;
    let vacancies = 0;
    
    duties.forEach(d => {
      if (d.lastName.trim().toUpperCase() === "VACANT" || !d.lastName) {
        vacancies++;
      }
    });

    return {
      total,
      vacancies,
    };
  }, [duties]);

  // Admin Login Verification
  const handleLogin = async (password: string): Promise<boolean> => {
    // Master passwords (Full Access)
    const masterPasswords = ["dutytracker", "army123"];
    
    // Shop-specific passwords (Category-only Access)
    const SHOP_PASSWORDS: Record<string, string> = {
      "CM123": "Ceremonial Band",
      "CT123": "Concert Band",
      "DR123": "Downrange",
      "BL123": "Blues",
      "ST123": "Strings",
      "TSG123": "Technical Support Group",
      "CH123": "Chorus"
    };

    if (masterPasswords.includes(password)) {
      setIsAdmin(true);
      setIsHR(false);
      setAllowedCategory(null);
      localStorage.setItem("army_duty_admin", "true");
      localStorage.setItem("army_duty_is_hr", "false");
      localStorage.setItem("army_duty_admin_password", password);
      localStorage.removeItem("army_duty_admin_category");
      return true;
    }

    if (password === "HR123") {
      setIsAdmin(false);
      setIsHR(true);
      setAllowedCategory(null);
      localStorage.setItem("army_duty_admin", "false");
      localStorage.setItem("army_duty_is_hr", "true");
      localStorage.setItem("army_duty_admin_password", password);
      localStorage.removeItem("army_duty_admin_category");
      return true;
    }

    if (SHOP_PASSWORDS[password]) {
      const category = SHOP_PASSWORDS[password].trim();
      setIsAdmin(false); // Not a full admin
      setIsHR(false);
      setAllowedCategory(category);
      localStorage.setItem("army_duty_admin", "false");
      localStorage.setItem("army_duty_is_hr", "false");
      localStorage.setItem("army_duty_admin_password", password);
      localStorage.setItem("army_duty_admin_category", category);
      return true;
    }

    return false;
  };

  // Admin Logout
  const handleLogout = () => {
    setIsAdmin(false);
    setIsHR(false);
    setAllowedCategory(null);
    localStorage.removeItem("army_duty_admin");
    localStorage.removeItem("army_duty_is_hr");
    localStorage.removeItem("army_duty_admin_password");
    localStorage.removeItem("army_duty_admin_category");
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
  
  // Add a brand new category/shop globally
  const handleAddCategory = async (categoryName: string) => {
    const trimmed = categoryName.trim();
    if (!trimmed) return;
    try {
      const { doc, setDoc } = await import("firebase/firestore");
      await setDoc(doc(db, "custom_shops", trimmed), {
        name: trimmed,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to add custom shop:", err);
    }
  };
  
  // Rename a category globally
  const handleRenameCategory = async (oldName: string, newName: string) => {
    const trimmedOld = oldName.trim();
    const trimmedNew = newName.trim();
    if (!trimmedNew || trimmedNew === trimmedOld) return;

    await syncRenameCategoryToFirestore(trimmedOld, trimmedNew);

    try {
      const { doc, setDoc, deleteDoc } = await import("firebase/firestore");
      await deleteDoc(doc(db, "custom_shops", trimmedOld));
      await setDoc(doc(db, "custom_shops", trimmedNew), {
        name: trimmedNew,
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to rename custom shop:", err);
    }
  };

  // Delete a category and all its duties
  const handleDeleteCategory = async (categoryName: string) => {
    const trimmed = categoryName.trim();
    await syncDeleteCategoryToFirestore(trimmed);

    try {
      const { doc, deleteDoc } = await import("firebase/firestore");
      await deleteDoc(doc(db, "custom_shops", trimmed));
    } catch (err) {
      console.error("Failed to delete custom shop:", err);
    }
  };

  // Import custom backup file
  const handleImportJSON = async (importedDuties: Duty[]) => {
    try {
      await batchSyncDutiesToFirestore(importedDuties);
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

  const handleOpenDraftForReview = (duty: Duty, draft: any) => {
    setLoadedDraft(draft);
    setLoadedDraftDuty(duty);
    setIsDraftModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-200">
      
      {/* Header and Filter Bars */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isAdmin={isAdmin || !!allowedCategory}
        isHR={isHR}
        onAdminClick={() => setShowLoginModal(true)}
        onLogout={handleLogout}
        totalDutiesCount={metrics.total}
        vacanciesCount={metrics.vacancies}
        isLoading={loading}
      />

      {/* Admin Quick Action Panel */}
      <AdminPanel
        isAdmin={isAdmin}
        isHR={isHR}
        allowedCategory={allowedCategory}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onAddDuty={handleTriggerAdd}
        onImportJSON={handleImportJSON}
        onRenameCategory={handleRenameCategory}
        onDeleteCategory={handleDeleteCategory}
        allDuties={duties}
        showLoginModal={showLoginModal}
        setShowLoginModal={setShowLoginModal}
        onShowMyShop={() => setMyShopTrigger(prev => prev + 1)}
        updateRequests={updateRequests}
        onEditDuty={handleTriggerEdit}
        vacancyDrafts={vacancyDrafts}
        onOpenDraft={handleOpenDraftForReview}
        shopRelationships={shopRelationships}
        customShops={customShopsList}
        onAddCategory={handleAddCategory}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Render Active View Tab */}
        {activeTab === "duties" && (
          <DutiesList
            duties={duties}
            soldierSummaries={soldierSummaries}
            isAdmin={isAdmin}
            isHR={isHR}
            allowedCategory={allowedCategory}
            onEditDuty={handleTriggerEdit}
            onDeleteDuty={handleDeleteDuty}
            searchQuery={searchQuery}
            onClearSearch={() => setSearchQuery("")}
            myShopTrigger={myShopTrigger}
            shopRelationships={shopRelationships}
            customShops={customShopsList}
          />
        )}

        {activeTab === "expirations" && (
          <TermExpirationsView
            duties={duties}
            searchQuery={searchQuery}
          />
        )}

        {activeTab === "vacancies" && (
          <VacanciesView
            drafts={vacancyDrafts}
            isAdmin={isAdmin}
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
        allowedCategory={allowedCategory}
        isHR={isHR}
        isAdmin={isAdmin}
        customShops={customShopsList}
        onAddCategory={handleAddCategory}
      />

      {/* Deep-linking Vacancy Announcement / Admin Review Modal */}
      {isDraftModalOpen && loadedDraftDuty && (
        <VacancyAnnouncementModal
          duty={loadedDraftDuty}
          initialDraft={loadedDraft}
          onClose={() => {
            setIsDraftModalOpen(false);
            setLoadedDraft(null);
            setLoadedDraftDuty(null);
            fetchedDraftIdRef.current = null;
            // Clear URL search params beautifully
            const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.pushState({ path: newUrl }, "", newUrl);
          }}
        />
      )}

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
