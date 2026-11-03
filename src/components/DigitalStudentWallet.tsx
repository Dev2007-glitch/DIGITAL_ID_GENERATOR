import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  generateSignedQrPayload,
  type CredentialRecord,
} from '../utils/idSecurityEngine';

interface DigitalStudentWalletProps {
  record: CredentialRecord;
  collegeLogoUrl?: string;
  accentColor?: string;
  onDownloadSingle?: () => void;
  onRequestRenewal?: () => void;
  onRequestReplacement?: () => void;
}

export default function DigitalStudentWallet({
  record,
  collegeLogoUrl,
  accentColor = '#1e3a8a',
  onDownloadSingle,
  onRequestRenewal,
  onRequestReplacement,
}: DigitalStudentWalletProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [qrToken, setQrToken] = useState<string>('');
  const [refreshCountdown, setRefreshCountdown] = useState<number>(60);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Dynamic rotating QR token generation to prevent static screenshot sharing
  const refreshQr = () => {
    const payload = generateSignedQrPayload(record);
    setQrToken(payload);
    setRefreshCountdown(60);
  };

  useEffect(() => {
    refreshQr();
    const interval = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          refreshQr();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [record]);

  const isExpired = new Date(record.expiresAt).getTime() < Date.now();
  const isValid = record.status === 'VALID' || record.status === 'RENEWED';

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center text-white">
      {/* Network Status / PWA Disclaimer Banner */}
      <div className="w-full mb-3 flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#0D0D12] border border-white/10 text-[11px]">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span className="text-white/70">
            {isOnline ? 'Live Secured Connection' : 'Offline Cached View'}
          </span>
        </div>
        <span className="text-white/40 text-[10px]">PWA Ready</span>
      </div>

      {!isOnline && (
        <div className="w-full mb-3 p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-200 leading-snug">
          ⚠️ <strong>Offline Mode:</strong> Offline cached display is for visual identity reference only. Physical security clearance requires real-time gate scanner verification.
        </div>
      )}

      {/* 3D Flip Card Container */}
      <div
        className="relative w-full aspect-[1/1.55] cursor-pointer group [perspective:1000px]"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div
          className={`relative w-full h-full duration-500 [transform-style:preserve-3d] transition-transform ${
            isFlipped ? '[transform:rotateY(180deg)]' : ''
          }`}
        >
          {/* FRONT OF WALLET CARD */}
          <div
            className="absolute inset-0 w-full h-full rounded-3xl p-6 flex flex-col justify-between overflow-hidden shadow-2xl border border-white/20 [backface-visibility:hidden]"
            style={{
              background: `linear-gradient(135deg, ${accentColor}dd, #0A0A0E 75%)`,
            }}
          >
            {/* Holographic Watermark effect */}
            <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            {/* Top Bar */}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                {collegeLogoUrl ? (
                  <img src={collegeLogoUrl} alt="Logo" className="w-10 h-10 object-contain drop-shadow" />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold text-white text-xs">
                    UNI
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">
                    {record.collegeName}
                  </h4>
                  <span className="text-[10px] text-white/60 tracking-widest uppercase">
                    Official Student Smart ID
                  </span>
                </div>
              </div>

              {/* Status Pill */}
              <div
                className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border ${
                  isValid && !isExpired
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                    : 'bg-red-500/20 text-red-300 border-red-400/40'
                }`}
              >
                {isValid && !isExpired ? 'VERIFIED' : record.status}
              </div>
            </div>

            {/* Middle Section: Photo & Core Data */}
            <div className="my-auto flex flex-col items-center text-center relative z-10">
              <div className="relative mb-3">
                <div className="w-28 h-36 rounded-2xl overflow-hidden border-2 border-white/40 shadow-xl bg-black/40 flex items-center justify-center">
                  {record.photoUrl ? (
                    <img src={record.photoUrl} alt={record.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">🎓</span>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 px-2 py-0.5 rounded-full bg-blue-600 text-[9px] font-mono font-bold uppercase shadow">
                  {record.bloodGroup || 'O+'}
                </div>
              </div>

              <h3 className="text-lg font-black text-white tracking-wide">{record.name}</h3>
              <div className="font-mono text-xs text-blue-200 font-bold tracking-widest mt-0.5">
                {record.regNo}
              </div>
              <p className="text-xs text-white/70 mt-1 max-w-[220px] truncate">
                {record.program} • {record.department}
              </p>
            </div>

            {/* Bottom Bar */}
            <div className="relative z-10 pt-3 border-t border-white/10 flex items-center justify-between text-[11px]">
              <div>
                <span className="text-white/40 block text-[9px] uppercase tracking-wider">Academic Year</span>
                <span className="font-semibold text-white/90">{record.year}</span>
              </div>
              <div className="text-right">
                <span className="text-white/40 block text-[9px] uppercase tracking-wider">Valid Thru</span>
                <span className="font-mono font-semibold text-emerald-300">
                  {new Date(record.expiresAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Flip hint */}
            <div className="text-center text-[10px] text-white/40 mt-1">Tap card to view secure QR code ↻</div>
          </div>

          {/* BACK OF WALLET CARD */}
          <div
            className="absolute inset-0 w-full h-full rounded-3xl p-6 flex flex-col justify-between overflow-hidden shadow-2xl border border-white/20 bg-[#0E0E12] [transform:rotateY(180deg)] [backface-visibility:hidden]"
            style={{
              background: 'radial-gradient(circle at 50% 30%, #1A1A24 0%, #0A0A0C 100%)',
            }}
          >
            {/* Top Bar Back */}
            <div className="flex items-center justify-between text-xs pb-3 border-b border-white/10">
              <span className="font-bold text-white tracking-wider uppercase text-[11px]">
                Cryptographic Gate Access Pass
              </span>
              <span className="text-[10px] font-mono text-emerald-400">HMAC-SHA256 Signed</span>
            </div>

            {/* Center: Dynamic QR code with live countdown */}
            <div className="my-auto flex flex-col items-center justify-center">
              <div className="p-3 bg-white rounded-2xl shadow-2xl border-4 border-emerald-500/30">
                <QRCodeSVG
                  value={qrToken || record.regNo}
                  size={150}
                  level="H"
                  includeMargin={false}
                />
              </div>

              {/* Anti-screenshot timer */}
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-white/70 text-[11px]">
                  Rotating in <strong className="text-emerald-400 font-mono">{refreshCountdown}s</strong>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    refreshQr();
                  }}
                  className="text-[10px] text-blue-400 hover:underline cursor-pointer"
                >
                  ↻ Refresh Now
                </button>
              </div>
              <p className="text-[10px] text-white/40 text-center mt-1">
                Dynamic signed token prevents screenshot misuse.
              </p>
            </div>

            {/* Back Details */}
            <div className="pt-3 border-t border-white/10 space-y-1 text-[11px] text-white/60">
              <div className="flex justify-between">
                <span>Emergency Contact:</span>
                <strong className="text-white font-mono">{record.emergencyContact || 'Campus Security'}</strong>
              </div>
              <div className="flex justify-between">
                <span>W3C Subject ID:</span>
                <span className="font-mono text-[9px] text-white/40 truncate max-w-[170px]">
                  {record.w3cCredentialId || record.id}
                </span>
              </div>
            </div>

            <div className="text-center text-[10px] text-white/40 mt-1">Tap to flip back ↻</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full mt-5 space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onDownloadSingle}
            className="w-full py-3 bg-white text-black font-bold rounded-xl text-xs hover:bg-gray-200 transition-colors shadow flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>📥</span> Download Single Card
          </button>
          <button
            type="button"
            onClick={() => {
              if ('share' in navigator) {
                navigator.share({
                  title: `${record.name} - University Digital ID`,
                  text: `Verified student credential for ${record.name} (${record.regNo}) at ${record.collegeName}`,
                  url: window.location.href,
                }).catch(() => {});
              } else if (typeof navigator !== 'undefined' && 'clipboard' in navigator) {
                (navigator as any).clipboard.writeText(window.location.href);
                alert('Wallet link copied to clipboard!');
              }
            }}
            className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>📤</span> Share Wallet Pass
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <button
            type="button"
            onClick={onRequestRenewal}
            className="py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 rounded-xl transition-colors cursor-pointer"
          >
            Request Annual Renewal
          </button>
          <button
            type="button"
            onClick={onRequestReplacement}
            className="py-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 rounded-xl transition-colors cursor-pointer"
          >
            Report Lost / Replace ID
          </button>
        </div>
      </div>
    </div>
  );
}
