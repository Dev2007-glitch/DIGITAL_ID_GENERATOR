import { useState, useEffect } from 'react';
import {
  exportW3CVerifiableCredential,
  type CredentialRecord,
} from '../utils/idSecurityEngine';

interface NfcVerifiableCredentialModalProps {
  record: CredentialRecord;
  isOpen: boolean;
  onClose: () => void;
}

export default function NfcVerifiableCredentialModal({
  record,
  isOpen,
  onClose,
}: NfcVerifiableCredentialModalProps) {
  const [hasNfcSupport, setHasNfcSupport] = useState<boolean>(false);
  const [nfcStatus, setNfcStatus] = useState<string>('idle');
  const [nfcFeedback, setNfcFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      setHasNfcSupport(true);
    } else {
      setHasNfcSupport(false);
    }
  }, []);

  if (!isOpen) return null;

  const w3cCredential = exportW3CVerifiableCredential(record);

  const handleWriteNfc = async () => {
    if (!hasNfcSupport) {
      setNfcFeedback('Web NFC is not supported on this browser or device. Chrome for Android with NFC hardware is required.');
      return;
    }

    try {
      setNfcStatus('writing');
      setNfcFeedback('Bring your physical NFC student card or tag near your device...');

      // @ts-expect-error - Web NFC standard API
      const ndef = new window.NDEFReader();
      await ndef.write({
        records: [
          {
            recordType: 'text',
            data: JSON.stringify({
              id: record.regNo,
              name: record.name,
              college: record.collegeKey,
              status: record.status,
              w3c: record.w3cCredentialId,
            }),
          },
        ],
      });

      setNfcStatus('success');
      setNfcFeedback(`Successfully written student digital identity (${record.regNo}) to physical NFC card!`);
    } catch (err: unknown) {
      setNfcStatus('error');
      setNfcFeedback(`NFC write failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const handleDownloadW3CJson = () => {
    const jsonStr = JSON.stringify(w3cCredential, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/ld+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `verifiable_credential_${record.regNo.toLowerCase()}.jsonld`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 text-white font-sans">
      <div className="bg-[#0E0E14] border border-white/20 rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-white/50 hover:text-white text-xl cursor-pointer"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-2xl">
            📡
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">
              NFC Hardware & W3C Verifiable Credentials
            </h3>
            <p className="text-xs text-white/50">
              Future-ready interoperable identity standard & contactless campus smart card integration.
            </p>
          </div>
        </div>

        {/* Section 1: NFC Smart Card Integration */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <span>💳</span> Physical NFC Student Card Writer
            </h4>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                hasNfcSupport
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-white/10 text-white/50 border border-white/10'
              }`}
            >
              {hasNfcSupport ? 'Web NFC Hardware Detected' : 'NFC Inactive on Desktop / iOS'}
            </span>
          </div>

          <p className="text-xs text-white/60 mb-4 leading-relaxed">
            Directly flash student registration number, cryptographic credential hash, and university signature onto physical MIFARE / NTAG cards using the Web NFC protocol.
          </p>

          {nfcFeedback && (
            <div
              className={`p-3 rounded-xl mb-4 text-xs ${
                nfcStatus === 'success'
                  ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-300'
                  : nfcStatus === 'error'
                  ? 'bg-red-950/40 border border-red-500/30 text-red-300'
                  : 'bg-blue-950/40 border border-blue-500/30 text-blue-300'
              }`}
            >
              {nfcFeedback}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={handleWriteNfc}
              className={`flex-1 py-2.5 px-4 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                hasNfcSupport
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg'
                  : 'bg-white/10 text-white/50 cursor-pointer'
              }`}
            >
              <span>📶</span> {nfcStatus === 'writing' ? 'Scanning for Card...' : 'Flash to NFC Student Tag'}
            </button>
          </div>

          {!hasNfcSupport && (
            <div className="text-[10px] text-white/40 mt-3 bg-black/40 p-2.5 rounded-lg border border-white/5">
              💡 <strong>System Specification:</strong> Web NFC API standard is supported on Chromium on Android with NFC turned on in device settings. For desktop environments, external USB ACR122U contactless smartcard readers are supported via companion agent.
            </div>
          )}
        </div>

        {/* Section 2: W3C Verifiable Credentials Standard */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <span>🌐</span> W3C Verifiable Credential Schema
            </h4>
            <span className="text-[10px] text-emerald-400 font-mono">W3C VC 1.1 / 2.0</span>
          </div>

          <p className="text-xs text-white/60 mb-3 leading-relaxed">
            Download standard cryptographic JSON-LD verifiable credential compatible with European EUDI Wallet, Apple Wallet, and open digital wallets.
          </p>

          {/* JSON-LD Preview */}
          <pre className="bg-[#050505] border border-white/10 rounded-xl p-3 text-[10px] font-mono text-emerald-300/90 max-h-36 overflow-y-auto mb-4">
            {JSON.stringify(w3cCredential, null, 2)}
          </pre>

          <button
            type="button"
            onClick={handleDownloadW3CJson}
            className="w-full py-2.5 bg-white text-black font-bold rounded-xl text-xs hover:bg-gray-200 transition-colors shadow flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>📥</span> Download Standard W3C Verifiable Credential (.jsonld)
          </button>
        </div>
      </div>
    </div>
  );
}
