import { useState, useEffect } from 'react';
import { getAuditLogs, type AuditLogEntry } from '../utils/idSecurityEngine';

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLogs(getAuditLogs());
  }, []);

  const filtered = logs.filter((l) => {
    const matchesAction = filterAction === 'ALL' || l.action === filterAction;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      l.targetRegNo.toLowerCase().includes(q) ||
      l.targetName.toLowerCase().includes(q) ||
      l.actorEmail.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q);
    return matchesAction && matchesSearch;
  });

  const handleExportCsv = () => {
    if (logs.length === 0) {
      alert('No audit logs recorded yet.');
      return;
    }
    const headers = 'ID,Timestamp,Action,Actor Email,Actor Role,Target RegNo,Target Name,College,Details\n';
    const rows = logs
      .map(
        (l) =>
          `"${l.id}","${new Date(l.timestamp).toLocaleString()}","${l.action}","${l.actorEmail}","${l.actorRole}","${l.targetRegNo}","${l.targetName}","${l.collegeKey}","${l.details.replace(/"/g, '""')}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `university_compliance_audit_log_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getActionBadge = (action: AuditLogEntry['action']) => {
    switch (action) {
      case 'ID_ISSUED':
      case 'ID_RENEWED':
      case 'GATE_ACCESS_GRANTED':
      case 'BULK_ISSUANCE':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'GATE_ACCESS_DENIED':
      case 'ID_REVOKED':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'ID_SUSPENDED':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  return (
    <div className="w-full bg-[#0A0A0C] border border-white/10 rounded-2xl p-6 shadow-2xl text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span>📜</span> Institutional Compliance & Security Audit Logs
          </h3>
          <p className="text-xs text-white/50 mt-1">
            Immutable chronological record of credential issuances, status modifications, gate access, and bulk operations.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span>📥</span> Export Audit Log (CSV)
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 my-5">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by actor email, registration number, student name, or details..."
          className="flex-1 bg-[#050505] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-white/30"
        />

        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="bg-[#050505] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30 cursor-pointer"
        >
          <option value="ALL">All Event Types</option>
          <option value="ID_ISSUED">ID_ISSUED</option>
          <option value="ID_RENEWED">ID_RENEWED</option>
          <option value="ID_SUSPENDED">ID_SUSPENDED</option>
          <option value="ID_REVOKED">ID_REVOKED</option>
          <option value="ID_REPLACED">ID_REPLACED</option>
          <option value="GATE_ACCESS_GRANTED">GATE_ACCESS_GRANTED</option>
          <option value="GATE_ACCESS_DENIED">GATE_ACCESS_DENIED</option>
          <option value="BULK_ISSUANCE">BULK_ISSUANCE</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/5 border-b border-white/10 text-[10px] text-white/50 uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-3">Timestamp</th>
              <th className="py-2.5 px-3">Action Type</th>
              <th className="py-2.5 px-3">Actor / Authorizer</th>
              <th className="py-2.5 px-3">Target Identity</th>
              <th className="py-2.5 px-3">Details & Audit Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-sans">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-white/40">
                  No audit log entries found.
                </td>
              </tr>
            ) : (
              filtered.map((entry) => (
                <tr key={entry.id} className="hover:bg-white/[0.02]">
                  <td className="py-2 px-3 font-mono text-[11px] text-white/50 whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getActionBadge(
                        entry.action
                      )}`}
                    >
                      {entry.action}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="font-semibold text-white/90">{entry.actorEmail}</div>
                    <span className="text-[10px] text-white/40 uppercase font-mono">{entry.actorRole}</span>
                  </td>
                  <td className="py-2 px-3">
                    <div className="font-semibold text-white">{entry.targetName}</div>
                    <span className="text-[11px] font-mono text-white/60">{entry.targetRegNo}</span>
                  </td>
                  <td className="py-2 px-3 text-white/70 text-[11px] leading-relaxed max-w-xs">
                    {entry.details}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
