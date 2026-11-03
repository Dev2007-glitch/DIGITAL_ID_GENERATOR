import { useState, useEffect } from 'react';
import {
  getCredentialsRegistry,
  updateCredentialLifecycle,
  type CredentialRecord,
  type CredentialStatus,
  type UserRole,
} from '../utils/idSecurityEngine';

interface LifecycleManagerProps {
  actorEmail: string;
  actorRole: UserRole;
  collegeKeyFilter?: string;
  onRefresh?: () => void;
}

export default function LifecycleManager({
  actorEmail,
  actorRole,
  collegeKeyFilter,
  onRefresh,
}: LifecycleManagerProps) {
  const [records, setRecords] = useState<CredentialRecord[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<CredentialRecord | null>(null);
  const [actionType, setActionType] = useState<
    'APPROVE' | 'SUSPEND' | 'REVOKE' | 'RENEW' | 'REPLACE' | null
  >(null);
  const [actionReason, setActionReason] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadData = () => {
    let list = getCredentialsRegistry();
    if (collegeKeyFilter && collegeKeyFilter !== 'all') {
      list = list.filter((r) => r.collegeKey === collegeKeyFilter);
    }
    setRecords(list);
  };

  useEffect(() => {
    loadData();
  }, [collegeKeyFilter]);

  const filteredRecords = records.filter((r) => {
    const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.regNo.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const handleExecuteAction = () => {
    if (!selectedRecord || !actionType) return;
    setActionError(null);
    setActionSuccess(null);

    let targetStatus: CredentialStatus = 'VALID';
    if (actionType === 'APPROVE') targetStatus = 'VALID';
    if (actionType === 'SUSPEND') targetStatus = 'SUSPENDED';
    if (actionType === 'REVOKE') targetStatus = 'REVOKED';
    if (actionType === 'RENEW') targetStatus = 'RENEWED';
    if (actionType === 'REPLACE') targetStatus = 'REPLACED';

    const res = updateCredentialLifecycle(selectedRecord.regNo, targetStatus, {
      actorEmail,
      actorRole,
      reason: actionReason.trim() || `Administrative ${actionType.toLowerCase()} action`,
    });

    if (res.success) {
      setActionSuccess(
        `Successfully updated ${selectedRecord.name} (${selectedRecord.regNo}) to ${targetStatus}.`
      );
      loadData();
      onRefresh?.();
      setTimeout(() => {
        setActionType(null);
        setSelectedRecord(null);
        setActionReason('');
        setActionSuccess(null);
      }, 1500);
    } else {
      setActionError(res.error || 'Failed to update credential lifecycle status.');
    }
  };

  const getStatusBadge = (status: CredentialStatus) => {
    switch (status) {
      case 'VALID':
      case 'RENEWED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'PENDING':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse';
      case 'SUSPENDED':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'REVOKED':
        return 'bg-red-500/10 text-red-400 border-red-500/30';
      case 'REPLACED':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'EXPIRED':
        return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
      default:
        return 'bg-white/10 text-white border-white/20';
    }
  };

  return (
    <div className="w-full bg-[#0A0A0C] border border-white/10 rounded-2xl p-6 shadow-2xl text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span>🎛️</span> ID Credential Lifecycle & Approval Management
          </h3>
          <p className="text-xs text-white/50 mt-1">
            Review student identity requests, issue digital credentials, manage renewals, suspensions, and revocations.
          </p>
        </div>

        {/* Quick summary counters */}
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg">
            Total: <strong>{records.length}</strong>
          </span>
          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg">
            Active: <strong>{records.filter((r) => r.status === 'VALID' || r.status === 'RENEWED').length}</strong>
          </span>
          <span className="px-2.5 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-lg">
            Suspended/Revoked: <strong>{records.filter((r) => r.status === 'SUSPENDED' || r.status === 'REVOKED').length}</strong>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 my-5">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by student name, roll number, email, or dept..."
          className="flex-1 bg-[#050505] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-white/30"
        />

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'VALID', 'PENDING', 'RENEWED', 'SUSPENDED', 'REVOKED', 'EXPIRED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                filterStatus === st
                  ? 'bg-white text-black'
                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Records Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/5 border-b border-white/10 text-white/50 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="py-3 px-4">Student / Identity</th>
              <th className="py-3 px-4">Institution</th>
              <th className="py-3 px-4">Program & Dept</th>
              <th className="py-3 px-4">Lifecycle Status</th>
              <th className="py-3 px-4">Expiry Date</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-sans">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-white/40">
                  No credential records found matching query.
                </td>
              </tr>
            ) : (
              filteredRecords.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white">{r.name}</div>
                    <div className="text-[11px] font-mono text-white/50">{r.regNo}</div>
                    <div className="text-[10px] text-white/30">{r.email}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-white/80">{r.collegeName}</div>
                    <span className="text-[10px] text-white/40 uppercase font-mono">{r.collegeKey}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-white/90">{r.program}</div>
                    <div className="text-[10px] text-white/50">{r.department}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${getStatusBadge(r.status)}`}>
                      {r.status}
                    </span>
                    {r.statusReason && (
                      <div className="text-[10px] text-white/40 mt-1 max-w-[150px] truncate" title={r.statusReason}>
                        {r.statusReason}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-white/60">
                    {new Date(r.expiresAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      {r.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRecord(r);
                            setActionType('APPROVE');
                          }}
                          className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 font-semibold rounded text-[11px] cursor-pointer"
                        >
                          Approve & Issue
                        </button>
                      )}

                      {(r.status === 'VALID' || r.status === 'RENEWED') && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecord(r);
                              setActionType('RENEW');
                            }}
                            className="px-2.5 py-1 bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 font-semibold rounded text-[11px] cursor-pointer"
                          >
                            Renew +1Y
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecord(r);
                              setActionType('SUSPEND');
                            }}
                            className="px-2.5 py-1 bg-orange-500/20 hover:bg-orange-500/40 text-orange-300 font-semibold rounded text-[11px] cursor-pointer"
                          >
                            Suspend
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecord(r);
                              setActionType('REVOKE');
                            }}
                            className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/40 text-red-300 font-semibold rounded text-[11px] cursor-pointer"
                          >
                            Revoke
                          </button>
                        </>
                      )}

                      {r.status === 'SUSPENDED' && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRecord(r);
                            setActionType('APPROVE');
                          }}
                          className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 font-semibold rounded text-[11px] cursor-pointer"
                        >
                          Lift Suspension
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRecord(r);
                          setActionType('REPLACE');
                        }}
                        className="px-2.5 py-1 bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 font-semibold rounded text-[11px] cursor-pointer"
                        title="Reissue replacement card for lost or damaged physical card"
                      >
                        Replace
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Action Modal */}
      {actionType && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111116] border border-white/20 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span>⚠️</span> Confirm {actionType} Credential Action
            </h4>
            <p className="text-xs text-white/60 mb-4">
              You are about to change the lifecycle status of student{' '}
              <strong className="text-white">{selectedRecord.name}</strong> ({selectedRecord.regNo}).
            </p>

            {actionError && (
              <div className="mb-3 p-2.5 bg-red-950/40 border border-red-500/30 text-red-300 rounded-lg text-xs">
                {actionError}
              </div>
            )}
            {actionSuccess && (
              <div className="mb-3 p-2.5 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 rounded-lg text-xs">
                {actionSuccess}
              </div>
            )}

            <div className="mb-4">
              <label className="text-[11px] text-white/50 block mb-1 uppercase font-semibold">
                Reason / Administrative Note:
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="e.g. Annual academic renewal, library fee clearance, or disciplinary hold..."
                rows={3}
                className="w-full bg-[#050505] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-white/30"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setActionType(null);
                  setSelectedRecord(null);
                  setActionReason('');
                  setActionError(null);
                }}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAction}
                className={`px-4 py-2 font-bold rounded-xl text-xs cursor-pointer ${
                  actionType === 'REVOKE' || actionType === 'SUSPEND'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-white hover:bg-gray-200 text-black'
                }`}
              >
                Confirm {actionType}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
