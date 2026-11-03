import { useState, useEffect } from 'react';
import {
  getGoogleClientId,
  setGoogleClientId,
  hasConfiguredGoogleClientId,
} from '../utils/googleAuth';

interface GoogleOAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClientIdUpdated?: (newId: string) => void;
}

export default function GoogleOAuthModal({
  isOpen,
  onClose,
  onClientIdUpdated,
}: GoogleOAuthModalProps) {
  const [clientId, setClientIdInput] = useState('');
  const [copiedOrigin, setCopiedOrigin] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setClientIdInput(getGoogleClientId());
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:2000';
  const isConfigured = hasConfiguredGoogleClientId();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setGoogleClientId(clientId);
    setSavedSuccess(true);
    onClientIdUpdated?.(clientId.trim());
    setTimeout(() => {
      setSavedSuccess(false);
    }, 2500);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedOrigin(true);
    setTimeout(() => setCopiedOrigin(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#0c0d12] border border-white/20 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-white/10 bg-gradient-to-r from-blue-950/40 via-purple-950/20 to-black flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg shrink-0">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.9c2.28-2.1 3.6-5.2 3.6-9.15z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.9-3.05c-1.08.72-2.45 1.16-4.03 1.16-3.1 0-5.74-2.1-6.68-4.93H1.26v3.13C3.25 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.32 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.6H1.26C.46 8.21 0 10.05 0 12s.46 3.79 1.26 5.4l4.06-3.13z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0 7.33 0 3.25 2.64 1.26 6.6l4.06 3.13c.94-2.83 3.58-4.96 6.68-4.96z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                Google Cloud OAuth 2.0 Security Configuration
              </h3>
              <p className="text-xs text-white/50">
                Setup and manage Google Identity Services authentication for IDStream
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-white/10 hover:border-white/30 text-white/60 hover:text-white flex items-center justify-center transition-colors text-lg"
          >
            &times;
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto text-sm text-gray-300">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
              isConfigured
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">{isConfigured ? '🛡️' : '⚠️'}</span>
              <div>
                <div className="font-bold text-xs uppercase tracking-wider">
                  {isConfigured ? 'Active Google OAuth Client ID' : 'Demo Mode Active'}
                </div>
                <div className="text-xs opacity-80">
                  {isConfigured
                    ? 'Google Cloud OAuth 2.0 is connected and ready for live authentication.'
                    : 'No live Client ID detected. Instant mock sign-in is enabled for testing.'}
                </div>
              </div>
            </div>
            <span
              className={`text-[10px] font-mono px-2 py-1 rounded font-bold uppercase ${
                isConfigured ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {isConfigured ? 'Connected' : 'Demo / Sandbox'}
            </span>
          </div>

          {/* Client ID Configuration Form */}
          <form onSubmit={handleSave} className="space-y-3 bg-black/40 p-4 rounded-xl border border-white/10">
            <label className="block text-xs font-bold uppercase tracking-wider text-white">
              Google Cloud OAuth 2.0 Client ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientIdInput(e.target.value)}
                placeholder="e.g. 1234567890-abcdefg.apps.googleusercontent.com"
                className="flex-1 bg-[#050508] border border-white/20 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 font-mono focus:outline-none focus:border-blue-400"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shrink-0 flex items-center gap-1.5"
              >
                <span>Save ID</span>
              </button>
            </div>
            {savedSuccess && (
              <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 animate-pulse">
                <span>✓</span> Google Client ID saved successfully!
              </div>
            )}
            <p className="text-[11px] text-white/40">
              Saved in your browser localStorage and synchronized with Vite environment variable <code>VITE_GOOGLE_CLIENT_ID</code>.
            </p>
          </form>

          {/* Quick Setup Instructions */}
          <div className="space-y-3">
            <div className="font-bold text-xs uppercase tracking-wider text-white flex items-center gap-2">
              <span>📋</span> Step-by-Step Google Cloud Console Setup
            </div>
            <ol className="list-decimal list-inside space-y-2 text-xs text-white/70 bg-white/5 p-4 rounded-xl border border-white/10">
              <li>
                Visit the{' '}
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline font-semibold"
                >
                  Google Cloud Console &rarr; Credentials ↗
                </a>
              </li>
              <li>
                Click <strong className="text-white">+ Create Credentials</strong> and select{' '}
                <strong className="text-white">OAuth client ID</strong>.
              </li>
              <li>
                Select Application type: <strong className="text-white">Web application</strong>.
              </li>
              <li>
                In <strong className="text-white">Authorized JavaScript origins</strong>, add this exact URL:
                <div className="mt-1 flex items-center gap-2 bg-black/60 p-2 rounded-lg border border-white/10 font-mono text-[11px] text-blue-300">
                  <span className="flex-1 truncate">{currentOrigin}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(currentOrigin)}
                    className="bg-white/10 hover:bg-white/20 text-white px-2 py-0.5 rounded text-[10px] font-sans font-bold"
                  >
                    {copiedOrigin ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </li>
              <li>
                In <strong className="text-white">Authorized redirect URIs</strong>, add:
                <div className="mt-1 bg-black/60 p-2 rounded-lg border border-white/10 font-mono text-[11px] text-purple-300">
                  {currentOrigin}/auth
                </div>
              </li>
              <li>
                Click <strong className="text-white">Create</strong>, then copy your Client ID and paste it into the field above or in your <code className="text-blue-300">.env</code> file.
              </li>
            </ol>
          </div>

          {/* Security Features Accordion */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <div className="font-bold text-white mb-1 flex items-center gap-1.5">
                <span>🔒</span> Cryptographic Verification
              </div>
              <p className="text-white/50 text-[11px]">
                Validates signed Google RS256 JWT tokens, timestamps, audience, and email verification flags.
              </p>
            </div>
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <div className="font-bold text-white mb-1 flex items-center gap-1.5">
                <span>🎓</span> Institutional Domain (HD)
              </div>
              <p className="text-white/50 text-[11px]">
                Supports Google Hosted Domain filtering (e.g. restrict sign-in to official university accounts).
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/60 flex items-center justify-between">
          <div className="text-[11px] text-white/40">
            Powered by Google Identity Services API (GSI)
          </div>
          <button
            onClick={onClose}
            className="bg-white text-black font-bold text-xs uppercase px-5 py-2.5 rounded-xl hover:bg-gray-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
