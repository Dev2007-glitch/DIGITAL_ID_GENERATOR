import { useState, useMemo } from 'react';
import { getCredentialsRegistry, getCampusAccessLogs } from '../utils/idSecurityEngine';

interface RealTimeAnalyticsProps {
  collegeKeyFilter?: string;
}

export default function RealTimeAnalytics({ collegeKeyFilter }: RealTimeAnalyticsProps) {
  const [selectedCollege, setSelectedCollege] = useState<string>(collegeKeyFilter || 'all');
  const [timeframe, setTimeframe] = useState<'all' | 'today' | 'week'>('all');

  const registry = useMemo(() => getCredentialsRegistry(), []);
  const accessLogs = useMemo(() => getCampusAccessLogs(), []);

  // Filtered registry
  const filteredRegistry = useMemo(() => {
    if (selectedCollege === 'all') return registry;
    return registry.filter((r) => r.collegeKey === selectedCollege);
  }, [registry, selectedCollege]);

  // Filtered access logs
  const filteredLogs = useMemo(() => {
    let list = accessLogs;
    if (selectedCollege !== 'all') {
      list = list.filter((l) => l.collegeKey === selectedCollege);
    }
    if (timeframe === 'today') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      list = list.filter((l) => new Date(l.timestamp).getTime() >= startOfDay.getTime());
    }
    return list;
  }, [accessLogs, selectedCollege, timeframe]);

  // Statistics calculation
  const totalIssued = filteredRegistry.length;
  const activeValid = filteredRegistry.filter(
    (r) => r.status === 'VALID' || r.status === 'RENEWED'
  ).length;
  const pendingRequests = filteredRegistry.filter((r) => r.status === 'PENDING').length;
  const suspendedCount = filteredRegistry.filter((r) => r.status === 'SUSPENDED').length;
  const revokedCount = filteredRegistry.filter((r) => r.status === 'REVOKED').length;
  const expiredCount = filteredRegistry.filter(
    (r) => new Date(r.expiresAt).getTime() < Date.now()
  ).length;

  const totalScans = filteredLogs.length;
  const grantedScans = filteredLogs.filter((l) => l.status === 'GRANTED').length;
  const deniedScans = filteredLogs.filter((l) => l.status === 'DENIED').length;
  const clearanceRate = totalScans > 0 ? Math.round((grantedScans / totalScans) * 100) : 100;

  // College distribution
  const collegeDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    registry.forEach((r) => {
      map[r.collegeKey] = (map[r.collegeKey] || 0) + 1;
    });
    return map;
  }, [registry]);

  // Department distribution
  const departmentDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRegistry.forEach((r) => {
      const dept = r.department || 'General';
      map[dept] = (map[dept] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [filteredRegistry]);

  return (
    <div className="w-full bg-[#0A0A0C] border border-white/10 rounded-2xl p-6 shadow-2xl text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span>📊</span> University Identity & Access Analytics Ledger
          </h3>
          <p className="text-xs text-white/50 mt-1">
            Real-time database statistics on credential issuance, lifecycle status, and gate clearance rates.
          </p>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <select
            value={selectedCollege}
            onChange={(e) => setSelectedCollege(e.target.value)}
            className="bg-[#050505] border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/40 cursor-pointer"
          >
            <option value="all">All Campuses</option>
            <option value="vit">VIT Chennai</option>
            <option value="vvit">VVIT Guntur</option>
            <option value="du">University of Delhi</option>
            <option value="vignan">Vignan VFSTR</option>
            <option value="jntua">JNTUA</option>
            <option value="priyadarshini">PCE Nagpur</option>
          </select>

          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as 'all' | 'today' | 'week')}
            className="bg-[#050505] border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/40 cursor-pointer"
          >
            <option value="all">All-Time Data</option>
            <option value="today">Today's Traffic</option>
          </select>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">
            Total Enrolled IDs
          </div>
          <div className="text-3xl font-black text-white">{totalIssued}</div>
          <div className="text-[11px] text-white/50 mt-1">Institutional records</div>
        </div>

        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5">
          <div className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-widest mb-1">
            Active / Valid Cards
          </div>
          <div className="text-3xl font-black text-emerald-400">{activeValid}</div>
          <div className="text-[11px] text-emerald-400/60 mt-1">
            {totalIssued > 0 ? `${Math.round((activeValid / totalIssued) * 100)}% valid credential rate` : '0%'}
          </div>
        </div>

        <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-5">
          <div className="text-[10px] font-bold text-orange-400/60 uppercase tracking-widest mb-1">
            Suspended / Revoked
          </div>
          <div className="text-3xl font-black text-orange-400">{suspendedCount + revokedCount}</div>
          <div className="text-[11px] text-orange-400/60 mt-1">
            {suspendedCount} Suspended • {revokedCount} Revoked
          </div>
        </div>

        <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5">
          <div className="text-[10px] font-bold text-blue-400/60 uppercase tracking-widest mb-1">
            Gate Clearance Rate
          </div>
          <div className="text-3xl font-black text-blue-400">{clearanceRate}%</div>
          <div className="text-[11px] text-blue-400/60 mt-1">
            {grantedScans} granted • {deniedScans} denied ({totalScans} total)
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
        {/* Campus Distribution Bar Graph */}
        <div className="bg-[#050505] border border-white/10 rounded-2xl p-5">
          <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>🏛️ Credential Volume by University</span>
            <span className="text-[10px] text-white/40">Database Live Count</span>
          </h4>

          <div className="space-y-3">
            {Object.entries(collegeDistribution).map(([colKey, count]) => {
              const max = Math.max(...Object.values(collegeDistribution), 1);
              const pct = Math.round((count / max) * 100);
              return (
                <div key={colKey}>
                  <div className="flex justify-between text-xs mb-1 font-mono">
                    <span className="text-white/70 uppercase">{colKey}</span>
                    <span className="text-white font-bold">{count} IDs</span>
                  </div>
                  <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Department Breakdown */}
        <div className="bg-[#050505] border border-white/10 rounded-2xl p-5">
          <h4 className="text-xs font-bold text-white/80 uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>📚 Top Academic Departments</span>
            <span className="text-[10px] text-white/40">Student Enrollments</span>
          </h4>

          <div className="space-y-3">
            {departmentDistribution.length === 0 ? (
              <div className="text-xs text-white/40 py-6 text-center">No department records found.</div>
            ) : (
              departmentDistribution.map(([dept, count]) => {
                const max = Math.max(...departmentDistribution.map((d) => d[1]), 1);
                const pct = Math.round((count / max) * 100);
                return (
                  <div key={dept}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/80 truncate max-w-[200px]">{dept}</span>
                      <span className="font-mono text-emerald-400 font-bold">{count} Students</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Lifecycle Breakdown Summary Bar */}
      <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-base">ℹ️</span>
          <span className="text-white/70">
            Pending Approval Queue: <strong className="text-amber-400">{pendingRequests}</strong> requests • Expired IDs: <strong className="text-red-400">{expiredCount}</strong>
          </span>
        </div>
        <div className="text-[11px] text-white/40">
          Last Ledger Sync: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
