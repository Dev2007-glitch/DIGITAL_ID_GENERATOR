import { useState, useEffect } from 'react';
import { analyzePhotoAndEnrollmentData, type QualityValidationReport } from '../utils/idSecurityEngine';

interface AiQualityInspectorProps {
  photoUrl?: string;
  name: string;
  regNo: string;
  email: string;
  program: string;
  department?: string;
  onAuditComplete?: (report: QualityValidationReport) => void;
}

export default function AiQualityInspector({
  photoUrl,
  name,
  regNo,
  email,
  program,
  department,
  onAuditComplete,
}: AiQualityInspectorProps) {
  const [report, setReport] = useState<QualityValidationReport | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  useEffect(() => {
    setIsAuditing(true);
    const timer = setTimeout(() => {
      let imgEl: HTMLImageElement | null = null;
      if (photoUrl) {
        imgEl = new Image();
        imgEl.crossOrigin = 'anonymous';
        imgEl.src = photoUrl;
      }

      const res = analyzePhotoAndEnrollmentData(imgEl, {
        name,
        regNo,
        email,
        program,
        department,
      });

      setReport(res);
      setIsAuditing(false);
      onAuditComplete?.(res);
    }, 300);

    return () => clearTimeout(timer);
  }, [photoUrl, name, regNo, email, program, department]);

  if (!report) return null;

  const scoreColor =
    report.score >= 80
      ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
      : report.score >= 60
      ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
      : 'text-red-400 border-red-500/30 bg-red-500/10';

  return (
    <div className="bg-[#0D0D11] border border-white/10 rounded-2xl p-5 shadow-xl text-white">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-sm">
            🤖
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              AI Enrollment & Photo Quality Inspector
              {isAuditing && (
                <span className="text-[10px] text-blue-400 font-normal animate-pulse">
                  Analyzing...
                </span>
              )}
            </h4>
            <p className="text-[11px] text-white/50">
              Heuristic verification of photo resolution, portrait aspect ratio & duplicate checks.
            </p>
          </div>
        </div>

        {/* Score Badge */}
        <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold font-mono ${scoreColor}`}>
          {report.score}/100 Quality
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Aspect Ratio</div>
          <div className="text-sm font-semibold text-white mt-0.5">{report.metrics.aspectRatio}</div>
          <div className="text-[10px] text-white/40">Target 3:4 portrait</div>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Lighting / Brightness</div>
          <div className="text-sm font-semibold text-white mt-0.5">{report.metrics.estimatedBrightness}</div>
          <div className="text-[10px] text-white/40">Luminance balance</div>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Duplicate Check</div>
          <div
            className={`text-sm font-semibold mt-0.5 ${
              report.metrics.duplicateCheck === 'PASSED' ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {report.metrics.duplicateCheck}
          </div>
          <div className="text-[10px] text-white/40">Registry uniqueness</div>
        </div>
        <div className="bg-white/5 rounded-xl p-3 border border-white/5">
          <div className="text-[10px] text-white/40 uppercase tracking-wider">Data Completeness</div>
          <div className="text-sm font-semibold text-white mt-0.5">
            {report.metrics.dataCompleteness}%
          </div>
          <div className="text-[10px] text-white/40">Required card fields</div>
        </div>
      </div>

      {/* Warnings & Suggestions */}
      {report.warnings.length > 0 && (
        <div className="space-y-1.5 mb-3 bg-red-950/20 border border-red-500/20 rounded-xl p-3">
          <div className="text-[11px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
            <span>⚠️</span> Verification Advisories ({report.warnings.length})
          </div>
          <ul className="text-xs text-red-200/80 space-y-1 pl-4 list-disc">
            {report.warnings.map((w, idx) => (
              <li key={idx}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {report.recommendations.length > 0 && (
        <div className="space-y-1.5 bg-blue-950/20 border border-blue-500/20 rounded-xl p-3">
          <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
            <span>💡</span> AI Recommendations
          </div>
          <ul className="text-xs text-blue-200/80 space-y-1 pl-4 list-disc">
            {report.recommendations.map((r, idx) => (
              <li key={idx}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {report.warnings.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
          <span>✅</span>
          <span>
            <strong>Optimal Credential Quality:</strong> Photo resolution, aspect ratio, and data fields pass all campus issuance checks.
          </span>
        </div>
      )}
    </div>
  );
}
