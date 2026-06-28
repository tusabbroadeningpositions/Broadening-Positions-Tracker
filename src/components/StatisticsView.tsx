import React, { useMemo } from "react";
import { Duty } from "../types";
import { BarChart3, Users, Shield, Award, Calendar, Zap, ClipboardList, Target } from "lucide-react";

interface StatisticsViewProps {
  duties: Duty[];
}

interface StatCardProps {
  title: string;
  value: number;
  total: number;
  icon: React.ReactNode;
  colorClass: string;
  bgColorClass: string;
  barColorClass: string;
}

const StatCard = ({ title, value, total, icon, colorClass, bgColorClass, barColorClass }: StatCardProps) => {
  const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
  
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col gap-4 shadow-lg hover:border-slate-700 transition-all group">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-lg ${bgColorClass} ${colorClass} group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <div className="text-right">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Percentage</span>
          <span className={`text-lg font-black ${colorClass}`}>{percentage}%</span>
        </div>
      </div>
      
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-white leading-none">{value}</span>
          <span className="text-xs text-slate-500 font-mono">/ {total}</span>
        </div>
      </div>

      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
        <div 
          className={`h-full ${barColorClass} transition-all duration-1000 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default function StatisticsView({ duties }: StatisticsViewProps) {
  const stats = useMemo(() => {
    const total = duties.length;
    
    return {
      total,
      el: duties.filter(d => d.dutyType === "EL").length,
      u: duties.filter(d => d.dutyType === "U").length,
      tier1: duties.filter(d => d.tierLevel === 1).length,
      tier2: duties.filter(d => d.tierLevel === 2).length,
      tier3: duties.filter(d => d.tierLevel === 3).length,
      command: duties.filter(d => d.isCommandAppointed).length,
      specTitle: duties.filter(d => d.specialized).length,
    };
  }, [duties]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-500" />
            Roster Statistics
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Visual breakdown of duties by classification, tier level, and special designation.
          </p>
        </div>
        
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-6 py-4 flex flex-col items-center justify-center min-w-[180px]">
          <span className="text-[10px] font-bold text-emerald-500/70 uppercase tracking-[0.2em] mb-1">Total Positions</span>
          <span className="text-4xl font-black text-white leading-none">{stats.total}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Classification Stats */}
        <StatCard 
          title="EL Positions (Element)"
          value={stats.el}
          total={stats.total}
          icon={<Zap className="w-5 h-5" />}
          colorClass="text-sky-400"
          bgColorClass="bg-sky-500/20"
          barColorClass="bg-sky-500"
        />
        <StatCard 
          title="U Positions (Unit)"
          value={stats.u}
          total={stats.total}
          icon={<Users className="w-5 h-5" />}
          colorClass="text-indigo-400"
          bgColorClass="bg-indigo-500/20"
          barColorClass="bg-indigo-500"
        />
        
        {/* Tier Stats */}
        <StatCard 
          title="Tier 1 Positions"
          value={stats.tier1}
          total={stats.total}
          icon={<Target className="w-5 h-5" />}
          colorClass="text-emerald-400"
          bgColorClass="bg-emerald-500/20"
          barColorClass="bg-emerald-500"
        />
        <StatCard 
          title="Tier 2 Positions"
          value={stats.tier2}
          total={stats.total}
          icon={<Shield className="w-5 h-5" />}
          colorClass="text-amber-400"
          bgColorClass="bg-amber-500/20"
          barColorClass="bg-amber-500"
        />
        <StatCard 
          title="Tier 3 Positions"
          value={stats.tier3}
          total={stats.total}
          icon={<Award className="w-5 h-5" />}
          colorClass="text-orange-400"
          bgColorClass="bg-orange-500/20"
          barColorClass="bg-orange-500"
        />

        {/* Special Designations */}
        <StatCard 
          title="Command Appointed"
          value={stats.command}
          total={stats.total}
          icon={<ClipboardList className="w-5 h-5" />}
          colorClass="text-rose-400"
          bgColorClass="bg-rose-500/20"
          barColorClass="bg-rose-500"
        />
        <StatCard 
          title="Spec/Title Positions"
          value={stats.specTitle}
          total={stats.total}
          icon={<Award className="w-5 h-5" />}
          colorClass="text-violet-400"
          bgColorClass="bg-violet-500/20"
          barColorClass="bg-violet-500"
        />
      </div>

      {/* Insight Footer */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 flex items-start gap-4">
        <div className="p-2 bg-slate-800 rounded-full shrink-0">
          <Calendar className="w-5 h-5 text-slate-400" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-200 mb-1 uppercase tracking-wider">Statistical Insight</h4>
          <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
            This dashboard provides a high-level overview of the roster's structural health. Tier aggregates help in identifying 
            leadership density, while EL vs. U ratios assist in balancing workload across organizational elements.
          </p>
        </div>
      </div>
    </div>
  );
}
