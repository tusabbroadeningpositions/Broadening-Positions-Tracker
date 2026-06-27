import React from "react";
import { Search, ShieldAlert, ShieldCheck, LogOut, Info } from "lucide-react";

interface HeaderProps {
  activeTab: "duties" | "expirations" | "statistics";
  setActiveTab: (tab: "duties" | "expirations" | "statistics") => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isAdmin: boolean;
  onAdminClick: () => void;
  onLogout: () => void;
  totalDutiesCount: number;
  overloadedCount: number;
  vacanciesCount: number;
  isLoading?: boolean;
}

export default function Header({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  isAdmin,
  onAdminClick,
  onLogout,
  totalDutiesCount,
  overloadedCount,
  vacanciesCount,
  isLoading = false,
}: HeaderProps) {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white shadow-lg">
      {/* Upper Bar: Title & Identity */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3">
            {/* Elegant military star/crest emblem representation */}
            <div className="w-8 h-8 bg-emerald-600 rounded flex items-center justify-center font-bold text-white shadow-[0_0_10px_rgba(5,150,105,0.4)] shrink-0">
              BP
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center">
                <span className="text-white font-bold tracking-wide">
                  Broadening Positions Tracker
                </span>
              </h1>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-950/40 p-2.5 rounded-md border border-slate-800/80 self-start md:self-auto">
            <div className="px-3 border-r border-slate-800">
              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Total Duties</span>
              <span className="text-sm font-semibold text-white">{totalDutiesCount}</span>
            </div>
            <div className="px-3 border-r border-slate-800">
              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Overloaded Staff</span>
              <span className="text-sm font-semibold text-rose-500 flex items-center gap-1">
                {overloadedCount > 0 ? "●" : "○"} {overloadedCount}
              </span>
            </div>
            <div className="px-3">
              <span className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">Vacant Positions</span>
              <span className="text-sm font-semibold text-emerald-500">{vacanciesCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lower Bar: Navigation, Search, and Session */}
      <div className="bg-slate-900 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center md:justify-between py-2 gap-3">
          {/* Navigation Tabs */}
          <nav className="flex space-x-6 items-center" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("duties")}
              className={`pb-1 text-xs font-semibold uppercase tracking-wider transition-all duration-150 ${
                activeTab === "duties"
                  ? "text-emerald-500 border-b-2 border-emerald-500"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Duties Roster
            </button>
            <button
              onClick={() => setActiveTab("expirations")}
              className={`pb-1 text-xs font-semibold uppercase tracking-wider transition-all duration-150 flex items-center gap-1.5 ${
                activeTab === "expirations"
                  ? "text-emerald-500 border-b-2 border-emerald-500"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>Term Expirations</span>
            </button>
            <button
              onClick={() => setActiveTab("statistics")}
              className={`pb-1 text-xs font-semibold uppercase tracking-wider transition-all duration-150 ${
                activeTab === "statistics"
                  ? "text-emerald-500 border-b-2 border-emerald-500"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Statistics
            </button>
          </nav>

          {/* Quick Search */}
          <div className="relative max-w-xs w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-slate-500" />
            </div>
            <input
              type="text"
              className="block w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-md text-xs placeholder-slate-500 text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-150"
              placeholder="Search Soldier or Title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-[10px] text-slate-500 hover:text-white font-mono"
              >
                Clear
              </button>
            )}
          </div>

          {/* Admin Session Actions */}
          <div className="flex items-center space-x-3 shrink-0 self-end md:self-auto">
            {isLoading && (
              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono animate-pulse">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                SYNCING...
              </div>
            )}
            {isAdmin ? (
              <div className="flex items-center space-x-2">
                <span className="flex items-center gap-1.5 text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded-sm uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin Mode
                </span>
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-rose-950 hover:text-rose-200 border border-slate-700 rounded-md transition-all duration-150"
                  title="Logout from Admin Mode"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onAdminClick}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-md border border-slate-700 transition-all duration-150"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-500" />
                <span>ADMIN LOGIN</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
