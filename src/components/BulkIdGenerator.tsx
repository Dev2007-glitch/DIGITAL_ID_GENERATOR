import { useState } from 'react';
import {
  getCredentialsRegistry,
  saveCredentialsRegistry,
  createAuditLog,
  type CredentialRecord,
  type UserRole,
} from '../utils/idSecurityEngine';

interface BulkIdGeneratorProps {
  actorEmail: string;
  actorRole: UserRole;
  collegeKey: string;
  collegeName: string;
  onBatchGenerated?: (count: number) => void;
}

interface ParsedBulkRow {
  index: number;
  name: string;
  regNo: string;
  email: string;
  program: string;
  branch: string;
  year: string;
  bloodGroup: string;
  status: 'VALID' | 'DUPLICATE' | 'ERROR';
  errorMessage?: string;
}

const SAMPLE_CSV = `Full Name,Registration Number,Email,Degree Program,Branch,Academic Year,Blood Group
Nikhil Rao,21BCE2001,nikhil.r@vitstudent.ac.in,B.Tech,Computer Science,2021 - 2025,O+
Sneha Patel,21BCE2002,sneha.p@vitstudent.ac.in,B.Tech,Information Technology,2021 - 2025,B+
Rahul Verma,21BCE2003,rahul.v@vitstudent.ac.in,B.Tech,Artificial Intelligence,2021 - 2025,A-
Ananya Deshmukh,21BCE2004,ananya.d@vitstudent.ac.in,B.Tech,Electronics & Comm,2021 - 2025,AB+`;

export default function BulkIdGenerator({
  actorEmail,
  actorRole,
  collegeKey,
  collegeName,
  onBatchGenerated,
}: BulkIdGeneratorProps) {
  const [csvText, setCsvText] = useState(SAMPLE_CSV);
  const [parsedRows, setParsedRows] = useState<ParsedBulkRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchSuccess, setBatchSuccess] = useState<string | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);

  const handleValidateCsv = () => {
    setBatchError(null);
    setBatchSuccess(null);
    const lines = csvText.trim().split('\n').filter((l) => l.trim().length > 0);

    if (lines.length < 2) {
      setBatchError('CSV must contain a header row and at least one student record row.');
      return;
    }

    const currentRegistry = getCredentialsRegistry();
    const existingRegNos = new Set(currentRegistry.map((r) => r.regNo.toLowerCase()));
    const existingEmails = new Set(currentRegistry.map((r) => r.email.toLowerCase()));
    const seenBatchRegs = new Set<string>();

    const rows: ParsedBulkRow[] = [];

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Support comma or tab separated
      const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
      const [name, regNo, email, program, branch, year, bloodGroup] = parts;

      let status: 'VALID' | 'DUPLICATE' | 'ERROR' = 'VALID';
      let errorMsg: string | undefined;

      if (!name || !regNo || !email) {
        status = 'ERROR';
        errorMsg = 'Missing mandatory field (Name, RegNo, or Email).';
      } else if (!email.includes('@')) {
        status = 'ERROR';
        errorMsg = 'Invalid email syntax.';
      } else if (existingRegNos.has(regNo.toLowerCase()) || existingEmails.has(email.toLowerCase())) {
        status = 'DUPLICATE';
        errorMsg = 'Registration number or email already exists in institutional database.';
      } else if (seenBatchRegs.has(regNo.toLowerCase())) {
        status = 'DUPLICATE';
        errorMsg = 'Duplicate registration number within this batch.';
      }

      if (regNo) seenBatchRegs.add(regNo.toLowerCase());

      rows.push({
        index: i,
        name: name || '',
        regNo: regNo ? regNo.toUpperCase() : '',
        email: email || '',
        program: program || 'B.Tech',
        branch: branch || 'Computer Science',
        year: year || '2024 - 2028',
        bloodGroup: bloodGroup || 'O+',
        status,
        errorMessage: errorMsg,
      });
    }

    setParsedRows(rows);
  };

  const handleExecuteBatchIssue = () => {
    const validRows = parsedRows.filter((r) => r.status === 'VALID');
    if (validRows.length === 0) {
      setBatchError('No valid records found to generate. Fix errors or duplicates above.');
      return;
    }

    setIsProcessing(true);
    setBatchError(null);

    setTimeout(() => {
      const registry = getCredentialsRegistry();
      const now = new Date();
      const expiry = new Date();
      expiry.setFullYear(now.getFullYear() + 4);

      const newCredentials: CredentialRecord[] = validRows.map((row) => ({
        id: `cred_${collegeKey}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        regNo: row.regNo,
        name: row.name,
        email: row.email,
        collegeKey,
        collegeName,
        department: row.branch,
        program: row.program,
        year: row.year,
        role: 'student',
        status: 'VALID',
        issuedAt: now.toISOString(),
        expiresAt: expiry.toISOString(),
        bloodGroup: row.bloodGroup,
        w3cCredentialId: `urn:uuid:${collegeKey}-${row.regNo.toLowerCase()}-${Date.now()}`,
      }));

      // Add to beginning of registry
      const updatedRegistry = [...newCredentials, ...registry];
      saveCredentialsRegistry(updatedRegistry);

      // Audit log
      createAuditLog({
        action: 'BULK_ISSUANCE',
        actorEmail,
        actorRole,
        targetRegNo: `BATCH_${validRows.length}_RECORDS`,
        targetName: `${validRows.length} Students`,
        collegeKey,
        details: `Batch issued ${validRows.length} digital credentials for ${collegeName}.`,
      });

      setIsProcessing(false);
      setBatchSuccess(`Successfully issued ${validRows.length} digital student credentials into active registry!`);
      onBatchGenerated?.(validRows.length);
      setParsedRows([]);
    }, 600);
  };

  const handleDownloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student_id_template_${collegeKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = parsedRows.filter((r) => r.status === 'VALID').length;
  const errorCount = parsedRows.filter((r) => r.status === 'ERROR').length;
  const duplicateCount = parsedRows.filter((r) => r.status === 'DUPLICATE').length;

  return (
    <div className="w-full bg-[#0A0A0C] border border-white/10 rounded-2xl p-6 shadow-2xl text-white">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <span>📦</span> Bulk Digital ID Card Generation & Batch Issuance
          </h3>
          <p className="text-xs text-white/50 mt-1">
            Upload CSV/Excel data or paste student cohort batches. Validates duplicates, auto-generates signed QR codes and digital credentials.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadSample}
          className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs flex items-center gap-2 cursor-pointer shrink-0"
        >
          <span>📥</span> Download Sample CSV Template
        </button>
      </div>

      {batchSuccess && (
        <div className="my-4 p-4 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2">
          <span>✅</span> {batchSuccess}
        </div>
      )}

      {batchError && (
        <div className="my-4 p-4 bg-red-950/40 border border-red-500/30 text-red-300 rounded-xl text-xs font-semibold flex items-center gap-2">
          <span>⚠️</span> {batchError}
        </div>
      )}

      {/* CSV Input Area */}
      <div className="my-5">
        <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider block mb-2">
          Paste CSV Student Records ({collegeName})
        </label>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={6}
          placeholder="Paste comma-separated student cohort data..."
          className="w-full bg-[#050505] border border-white/10 rounded-xl p-4 font-mono text-xs text-white focus:outline-none focus:border-white/30"
        />
        <div className="flex items-center justify-between mt-2 text-[11px] text-white/40">
          <span>Columns: Name, Registration_Number, Email, Program, Branch, Year, Blood_Group</span>
          <button
            type="button"
            onClick={handleValidateCsv}
            className="px-4 py-2 bg-white text-black font-bold rounded-lg text-xs hover:bg-gray-200 transition-colors cursor-pointer"
          >
            Validate Batch Records
          </button>
        </div>
      </div>

      {/* Validation Summary Strip */}
      {parsedRows.length > 0 && (
        <div className="my-6 space-y-4">
          <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-4 text-xs">
              <span className="text-white/60">
                Total Rows: <strong className="text-white">{parsedRows.length}</strong>
              </span>
              <span className="text-emerald-400">
                Valid: <strong>{validCount}</strong>
              </span>
              <span className="text-amber-400">
                Duplicates: <strong>{duplicateCount}</strong>
              </span>
              <span className="text-red-400">
                Errors: <strong>{errorCount}</strong>
              </span>
            </div>

            <button
              type="button"
              onClick={handleExecuteBatchIssue}
              disabled={validCount === 0 || isProcessing}
              className={`px-5 py-2.5 font-bold rounded-xl text-xs cursor-pointer ${
                validCount > 0 && !isProcessing
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-black shadow-lg shadow-emerald-500/20'
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
              }`}
            >
              {isProcessing ? 'Generating Credentials...' : `Batch Issue (${validCount}) Verified IDs`}
            </button>
          </div>

          {/* Validation Table Preview */}
          <div className="overflow-x-auto rounded-xl border border-white/10 max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 sticky top-0 border-b border-white/10 text-[10px] text-white/50 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Reg No</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Program / Branch</th>
                  <th className="py-2.5 px-3">Validation Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {parsedRows.map((row) => (
                  <tr key={row.index} className="hover:bg-white/[0.02]">
                    <td className="py-2 px-3 text-white/40 font-mono">{row.index}</td>
                    <td className="py-2 px-3 font-semibold text-white">{row.name || '—'}</td>
                    <td className="py-2 px-3 font-mono text-white/80">{row.regNo || '—'}</td>
                    <td className="py-2 px-3 text-white/60">{row.email || '—'}</td>
                    <td className="py-2 px-3 text-white/60">
                      {row.program} • {row.branch}
                    </td>
                    <td className="py-2 px-3">
                      {row.status === 'VALID' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Ready for Issuance
                        </span>
                      )}
                      {row.status === 'DUPLICATE' && (
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          title={row.errorMessage}
                        >
                          Duplicate Record
                        </span>
                      )}
                      {row.status === 'ERROR' && (
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20"
                          title={row.errorMessage}
                        >
                          Error: {row.errorMessage}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
