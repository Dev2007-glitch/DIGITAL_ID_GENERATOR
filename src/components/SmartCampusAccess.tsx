import { useState } from 'react';
import {
  verifyCredentialToken,
  recordCampusAccess,
  getCampusAccessLogs,
  type CampusAccessLog,
  type VerificationResult,
} from '../utils/idSecurityEngine';

interface SmartCampusAccessProps {
  securityOfficerEmail: string;
}

const CAMPUS_ZONES = [
  'Main Gate Alpha (Post #01)',
  'North Gate Beta (Post #02)',
  'Central University Library',
  'Advanced Computing & AI Lab',
  'Examination Hall - Block 4',
  'Sports Complex & Gym Entry',
];

export default function SmartCampusAccess({
  securityOfficerEmail,
}: SmartCampusAccessProps) {
  const [selectedZone, setSelectedZone] = useState<string>(CAMPUS_ZONES[0]);
  const [scanInput, setScanInput] = useState('');
  const [lastResult, setLastResult] = useState<{
    verification: VerificationResult;
    log: CampusAccessLog;
  } | null>(null);
  const [recentLogs, setRecentLogs] = useState<CampusAccessLog[]>(() =>
    getCampusAccessLogs().slice(0, 20)
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcessScan = (codeToProcess?: string) => {
    const rawCode = (codeToProcess || scanInput).trim();
    if (!rawCode) return;

    setIsProcessing(true);
    const verification = verifyCredentialToken(rawCode);

    let status: 'GRANTED' | 'DENIED' = 'DENIED';
    let reason = verification.message;

    if (verification.isValid && verification.status === 'VALID') {
      status = 'GRANTED';
      reason = 'Verified active institutional credential.';
    } else {
      status = 'DENIED';
    }

    const regNo =
      verification.record?.regNo ||
      verification.payload?.id ||
      rawCode.toUpperCase();
    const name =
      verification.record?.name || verification.payload?.name || 'Unknown Subject';
    const role =
      verification.record?.role || verification.payload?.role || 'Visitor';
    const collegeKey =
      verification.record?.collegeKey ||
      verification.payload?.collegeKey ||
      'unknown';

    const log = recordCampusAccess({
      regNo,
      name,
      role,
      collegeKey,
      gateLocation: selectedZone,
      status,
      reason,
      verifiedBy: securityOfficerEmail,
    });

    setLastResult({ verification, log });
    setRecentLogs(getCampusAccessLogs().slice(0, 20));
    setScanInput('');
    setIsProcessing(false);
  };

  const handleExportLogsCsv = () => {
    const logs = getCampusAccessLogs();
    if (logs.length === 0) {
      alert('No campus access logs to export.');
      return;
    }

    const headers = 'Timestamp,Gate Location,Registration Number,Name,Role,Status,Reason,Verified By\n';
    const rows = logs
      .map(
        (l) =>
          `"${new Date(l.timestamp).toLocaleString()}","${l.gateLocation}","${l.regNo}","${l.name}","${l.role}","${l.status}","${l.reason || ''}","${l.verifiedBy}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campus_gate_access_logs_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full bg-[#0A0A0C] border border-white/10 rounded-2xl p-6 shadow-2xl text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span>🛡️</span> Smart Campus Gate Access & Zone Clearance System
          </h3>
          <p className="text-xs text-white/50 mt-1">
            Real-time credential verification at gates, libraries, labs, and exam halls with instant tamper detection.
          </p>
        </div>

        {/* Zone Selector */}
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
            Active Gate:
          </label>
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="bg-[#050505] border border-white/20 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-white/40 cursor-pointer"
          >
            {CAMPUS_ZONES.map((zone) => (
              <option key={zone} value={zone} className="bg-black text-white">
                {zone}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Scan Input Row */}
      <div className="my-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleProcessScan()}
              placeholder="Scan barcode / QR code or enter RegNo (e.g. 21BCE0001, 21BQ1A4237, 24DU101)..."
              className="w-full bg-[#050505] border border-white/10 rounded-xl pl-4 pr-10 py-3.5 text-xs text-white uppercase focus:outline-none focus:border-white/40 font-mono tracking-wider"
            />
            <span className="absolute right-3.5 top-3.5 text-base text-white/40">📷</span>
          </div>
          <button
            type="button"
            onClick={() => handleProcessScan()}
            disabled={isProcessing || !scanInput.trim()}
            className={`px-6 py-3.5 font-bold rounded-xl text-xs transition-colors shrink-0 cursor-pointer ${
              scanInput.trim()
                ? 'bg-white hover:bg-gray-200 text-black shadow-lg shadow-white/10'
                : 'bg-white/10 text-white/40 cursor-not-allowed'
            }`}
          >
            {isProcessing ? 'Verifying...' : 'Clear Access'}
          </button>
        </div>

        {/* Quick Test Demo Barcodes */}
        <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] text-white/50">
          <span>Quick Simulators:</span>
          {[
            { label: 'Valid VIT (21BCE0001)', code: '21BCE0001' },
            { label: 'Valid VVIT (21BQ1A4237)', code: '21BQ1A4237' },
            { label: 'Valid DU (24DU101)', code: '24DU101' },
            { label: 'Suspended ID (21BCE9999)', code: '21BCE9999' },
            { label: 'Revoked ID (21BQ1A9999)', code: '21BQ1A9999' },
            { label: 'Fake Forged QR', code: 'IDSTREAM://VERIFY?token=eyJnYXJmZWQiOiJmYWtlIn0=' },
          ].map((demo) => (
            <button
              key={demo.label}
              type="button"
              onClick={() => {
                setScanInput(demo.code);
                handleProcessScan(demo.code);
              }}
              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/70 hover:text-white transition-colors cursor-pointer text-[10px]"
            >
              {demo.label}
            </button>
          ))}
        </div>
      </div>

      {/* Real-Time Scan Clearance Banner */}
      {lastResult && (
        <div
          className={`my-6 p-6 rounded-2xl border transition-all ${
            lastResult.log.status === 'GRANTED'
              ? 'bg-emerald-950/40 border-emerald-500/40 shadow-2xl shadow-emerald-500/10'
              : 'bg-red-950/40 border-red-500/40 shadow-2xl shadow-red-500/10'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl font-black ${
                  lastResult.log.status === 'GRANTED'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/40'
                    : 'bg-red-500/20 text-red-400 border border-red-400/40'
                }`}
              >
                {lastResult.log.status === 'GRANTED' ? '✓' : '✕'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4
                    className={`text-xl font-black tracking-wider uppercase ${
                      lastResult.log.status === 'GRANTED' ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    ACCESS {lastResult.log.status}
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-white/80">
                    {lastResult.log.gateLocation}
                  </span>
                </div>
                <div className="text-sm text-white font-semibold mt-1">
                  {lastResult.log.name} • <span className="font-mono text-white/80">{lastResult.log.regNo}</span>
                </div>
                <div className="text-xs text-white/60 mt-0.5">
                  Reason: {lastResult.log.reason}
                </div>
              </div>
            </div>

            {/* Cryptographic Verification Badge */}
            <div className="sm:text-right text-xs">
              <div className="text-[10px] uppercase font-bold text-white/40 tracking-wider">
                Cryptographic Check
              </div>
              <div
                className={`font-mono text-xs font-bold mt-0.5 ${
                  lastResult.verification.status === 'TAMPERED'
                    ? 'text-red-400 animate-pulse'
                    : 'text-emerald-300'
                }`}
              >
                {lastResult.verification.status === 'TAMPERED'
                  ? 'CRITICAL: HMAC Signature Corrupted'
                  : 'HMAC-SHA256 Authenticated'}
              </div>
              <div className="text-[10px] text-white/40 font-mono mt-0.5">
                Timestamp: {new Date(lastResult.log.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Access History Log Table */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>📋</span> Recent Clearance Logs ({selectedZone})
          </h4>
          <button
            type="button"
            onClick={handleExportLogsCsv}
            className="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>📥</span> Export Gate Logs (CSV)
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 border-b border-white/10 text-[10px] text-white/50 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Gate Location</th>
                <th className="py-2.5 px-3">Identity / RegNo</th>
                <th className="py-2.5 px-3">Name</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Reason / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {recentLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-white/40">
                    No gate entries logged yet. Scan credentials above.
                  </td>
                </tr>
              ) : (
                recentLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-white/[0.02]">
                    <td className="py-2 px-3 text-white/50 font-mono text-[11px]">
                      {new Date(l.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2 px-3 text-white/80">{l.gateLocation}</td>
                    <td className="py-2 px-3 font-mono text-white/90">{l.regNo}</td>
                    <td className="py-2 px-3 font-semibold text-white">{l.name}</td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          l.status === 'GRANTED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-white/50 text-[11px] truncate max-w-[200px]" title={l.reason}>
                      {l.reason || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
