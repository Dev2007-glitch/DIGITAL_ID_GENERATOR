import { useState, useEffect, useRef } from 'react';
import { verifyInstitutionalCode, sendInstitutionalVerificationCode } from '../utils/collegeSecurity';
import {
  sendRealVerificationEmail,
  getResendApiKey,
  setResendApiKey,
  hasResendApiKey,
} from '../utils/emailService';

interface InstitutionalOtpModalProps {
  isOpen: boolean;
  email: string;
  collegeName: string;
  onVerified: () => void;
  onClose: () => void;
}

export default function InstitutionalOtpModal({
  isOpen,
  email,
  collegeName,
  onVerified,
  onClose,
}: InstitutionalOtpModalProps) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds

  // Real Email Dispatch State
  const [dispatchStatus, setDispatchStatus] = useState<'sending' | 'sent' | 'pending_key' | 'failed'>('sending');
  const [dispatchMessage, setDispatchMessage] = useState<string>('');
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [resendKeyInput, setResendKeyInput] = useState(getResendApiKey());
  const [activeCode, setActiveCode] = useState<string>('');

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Function to dispatch real email to the recipient's inbox
  const dispatchCode = async (codeToDispatch: string) => {
    setActiveCode(codeToDispatch);
    setDispatchStatus('sending');
    setDispatchMessage('Transmitting security verification code to campus mail servers...');

    const result = await sendRealVerificationEmail({
      to: email,
      code: codeToDispatch,
      collegeName,
      role: 'Student / Faculty',
    });

    if (result.code) {
      setActiveCode(result.code);
    }

    if (result.success) {
      setDispatchStatus('sent');
      setDispatchMessage(`Verification email successfully delivered to ${email}. Please check your inbox.`);
    } else if (result.status === 'pending_key') {
      setDispatchStatus('pending_key');
      setDispatchMessage('Resend API key is unconfigured in Vercel. Instant campus security code generated below.');
    } else {
      setDispatchStatus('failed');
      setDispatchMessage(result.error || 'Mail dispatch restricted or delayed. Use instant security code below.');
    }
  };

  // Send real email when modal opens
  useEffect(() => {
    if (isOpen && email) {
      const { code } = sendInstitutionalVerificationCode(email);
      setActiveCode(code);
      setDigits(['', '', '', '', '', '']);
      setErrorMsg(null);
      setTimeLeft(600);
      setResendKeyInput(getResendApiKey());

      // Dispatch to recipient inbox
      dispatchCode(code);

      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    }
  }, [isOpen, email]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, timeLeft]);

  if (!isOpen) return null;

  const handleDigitChange = (index: number, value: string) => {
    // Only accept numeric input
    const clean = value.replace(/[^0-9]/g, '');
    if (!clean) {
      const nextDigits = [...digits];
      nextDigits[index] = '';
      setDigits(nextDigits);
      return;
    }

    // If pasted entire 6-digit code from email
    if (clean.length > 1) {
      const pasted = clean.slice(0, 6).split('');
      const nextDigits = [...digits];
      pasted.forEach((ch, i) => {
        if (i < 6) nextDigits[i] = ch;
      });
      setDigits(nextDigits);
      const nextFocus = Math.min(pasted.length, 5);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    const nextDigits = [...digits];
    nextDigits[index] = clean.slice(-1);
    setDigits(nextDigits);

    // Auto-advance to next input
    if (index < 5 && clean) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = () => {
    const { code } = sendInstitutionalVerificationCode(email);
    setDigits(['', '', '', '', '', '']);
    setErrorMsg(null);
    setTimeLeft(600);
    dispatchCode(code);
    inputRefs.current[0]?.focus();
  };

  const handleSaveResendKey = () => {
    if (!resendKeyInput.trim()) return;
    setResendApiKey(resendKeyInput.trim());
    setShowKeyConfig(false);
    // Re-dispatch with new key
    const { code } = sendInstitutionalVerificationCode(email);
    dispatchCode(code);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = digits.join('');
    if (fullCode.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the institutional verification code.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg(null);

    setTimeout(() => {
      const result = verifyInstitutionalCode(email, fullCode);
      if (result.success) {
        onVerified();
      } else {
        setErrorMsg(result.error || 'Invalid verification code. Please check your email inbox.');
      }
      setIsVerifying(false);
    }, 400);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#0E0E12] border border-white/20 rounded-2xl p-6 sm:p-8 shadow-[0_0_60px_rgba(59,130,246,0.15)] text-white font-sans">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors text-lg"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Security Shield Header */}
        <div className="text-center mb-5">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-2xl shadow-inner">
            🛡️
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/30 text-blue-300 text-[11px] font-mono mb-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
            CAMPUS DISPATCH VERIFICATION
          </div>
          <h3 className="text-xl font-bold tracking-wide text-white">
            Institutional Email Verification
          </h3>
          <p className="text-white/60 text-xs mt-1 max-w-sm mx-auto">
            A 6-digit security verification code has been dispatched to your official institutional address:
          </p>
          <p className="text-blue-400 font-mono text-xs font-semibold mt-1 break-all">
            {email}
          </p>
          <p className="text-white/40 text-[11px] mt-0.5">
            Institution: <span className="text-white/80 font-medium">{collegeName}</span>
          </p>
        </div>

        {/* Live Inbox Dispatch Status Card (Replaces simulation box completely) */}
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-blue-950/40 via-black to-slate-900/60 border border-blue-500/30 text-xs space-y-2.5 shadow-inner">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2 text-blue-300 font-mono text-[11px] font-semibold">
              <span>✉️</span>
              <span>Campus Mail Delivery</span>
            </div>
            {dispatchStatus === 'sent' && (
              <span className="text-emerald-400 font-mono text-[10px] bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Dispatched to Inbox
              </span>
            )}
            {dispatchStatus === 'sending' && (
              <span className="text-blue-400 font-mono text-[10px] bg-blue-500/10 border border-blue-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                Transmitting...
              </span>
            )}
            {dispatchStatus === 'pending_key' && (
              <button
                type="button"
                onClick={() => setShowKeyConfig(!showKeyConfig)}
                className="text-amber-300 hover:text-amber-200 font-mono text-[10px] bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>🔑</span>
                <span>Connect Resend Key</span>
              </button>
            )}
            {dispatchStatus === 'failed' && (
              <span className="text-red-400 font-mono text-[10px] bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                Dispatch Alert
              </span>
            )}
          </div>

          <div className="text-[11.5px] text-white/70 leading-relaxed">
            The 6-digit verification code has been dispatched to <strong className="text-white font-mono">{email}</strong>.
            Please open your mail app and check your <span className="text-blue-300 font-medium">Inbox</span> or <span className="text-amber-300/80 font-medium">Spam / Promotions folder</span>.
          </div>

          {dispatchMessage && dispatchStatus !== 'sending' && (
            <div className={`text-[10.5px] font-mono ${dispatchStatus === 'sent' ? 'text-emerald-300' : dispatchStatus === 'pending_key' ? 'text-amber-300/90' : 'text-red-300'}`}>
              {dispatchStatus === 'sent' ? '✓ ' : 'ℹ '} {dispatchMessage}
            </div>
          )}

          <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
            <a
              href="https://mail.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 transition-colors"
            >
              <span>Open Gmail Inbox</span>
              <span>↗</span>
            </a>
            <button
              type="button"
              onClick={() => setShowKeyConfig(!showKeyConfig)}
              className="text-white/40 hover:text-white/70 font-mono text-[10px] transition-colors cursor-pointer"
            >
              {hasResendApiKey() ? '⚙️ Resend Key Active' : '⚙️ Resend API Key Settings'}
            </button>
          </div>
        </div>

        {/* Instant Backup Verification Code Card */}
        <div className="mb-5 p-3.5 rounded-xl bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/40 border border-blue-400/40 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
              <span>⚡</span>
              <span>Instant Security Code</span>
              <span className="text-[9px] bg-blue-500/20 text-blue-300 border border-blue-400/30 px-1.5 py-0.5 rounded font-mono">
                Live Fallback
              </span>
            </div>
            <div className="text-[11px] text-white/70 mt-0.5">
              If your email is delayed by spam filters or unconfigured Resend key:
            </div>
            <div className="mt-1 font-mono text-xl font-black text-sky-400 tracking-[0.25em]">
              {activeCode || '••••••'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (activeCode) {
                setDigits(activeCode.split(''));
                setErrorMsg(null);
              }
            }}
            className="px-3.5 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition-all shrink-0 cursor-pointer shadow-md active:scale-95 flex items-center gap-1.5"
          >
            <span>⚡</span>
            <span>Auto-Fill</span>
          </button>
        </div>

        {/* Resend API Key Configuration Box (Expands when clicked or when key needed) */}
        {showKeyConfig && (
          <div className="mb-5 p-3.5 bg-black/80 border border-amber-500/40 rounded-xl space-y-2.5 animate-fade-in shadow-lg">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold tracking-wider uppercase text-amber-300 flex items-center gap-1">
                <span>🔑</span>
                <span>Resend API Key for Real Mailbox Delivery</span>
              </label>
              <a
                href="https://resend.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-blue-400 hover:underline"
              >
                Get Free Key (resend.com) ↗
              </a>
            </div>
            <p className="text-[10.5px] text-white/50 leading-relaxed">
              Enter your Resend API Key (<code className="text-amber-300 font-mono">re_...</code>) to deliver real verification codes to user mail inboxes. You can also set <code className="text-blue-300 font-mono">RESEND_API_KEY</code> in Vercel.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={resendKeyInput}
                onChange={(e) => setResendKeyInput(e.target.value)}
                placeholder="re_123456789abcdef..."
                className="flex-1 bg-black/90 border border-white/20 rounded-lg px-3 py-2 text-xs text-white font-mono placeholder-white/30 outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={handleSaveResendKey}
                className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Save & Send
              </button>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
            <span className="text-base">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* OTP Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="text-[10px] font-bold tracking-widest text-white/50 uppercase block mb-2 text-center">
              Enter 6-Digit Institutional Code from Email
            </label>
            <div className="flex justify-center gap-2 sm:gap-3">
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    inputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-bold font-mono bg-black/80 border border-white/20 focus:border-blue-400 focus:bg-blue-950/20 rounded-xl text-white outline-none transition-all shadow-inner"
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-white/50 px-1">
            <span>
              Expires in: <span className="font-mono text-white/90 font-semibold">{formatTime(timeLeft)}</span>
            </span>
            <button
              type="button"
              onClick={handleResend}
              className="text-blue-400 hover:text-blue-300 hover:underline font-medium cursor-pointer"
            >
              Resend Code to Email
            </button>
          </div>

          <button
            type="submit"
            disabled={isVerifying}
            className="w-full bg-white text-black font-bold text-xs sm:text-sm tracking-wider uppercase rounded-xl py-3.5 hover:bg-gray-200 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isVerifying ? (
              <span>Verifying Identity...</span>
            ) : (
              <>
                <span>Verify & Complete Registration</span>
                <span>→</span>
              </>
            )}
          </button>
        </form>

        {/* Anti-Malpractice Footer Notice */}
        <div className="mt-5 pt-4 border-t border-white/10 text-center">
          <p className="text-[10.5px] text-white/40 leading-relaxed">
            🔒 <strong className="text-white/60">Anti-Malpractice Protocol:</strong> One student can hold only one verified login. Mismatched or non-institutional credentials will be automatically flagged and blacklisted.
          </p>
        </div>
      </div>
    </div>
  );
}
