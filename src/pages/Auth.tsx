import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import GoogleSignInButton from '../components/GoogleSignInButton';
import GoogleOAuthModal from '../components/GoogleOAuthModal';
import {
  COLLEGE_SECURITY_SPECS,
  authenticateInstitutionalUser,
  AUTHORIZED_SECURITY_EMAIL,
  getRegisteredInstitutionalUsers,
} from '../utils/collegeSecurity';
import { type AuthSessionUser, formatNameFromEmail } from '../utils/googleAuth';

export default function Auth() {
  const [role, setRole] = useState<'student' | 'faculty' | 'security' | 'issuer' | 'admin'>('student');
  const [collegeKey, setCollegeKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('idstream_selected_college');
      if (stored && COLLEGE_SECURITY_SPECS[stored]) return stored;
    }
    return 'du';
  });
  const [collegePin, setCollegePin] = useState<string>(''); // Secret - strictly empty by default
  const [showPin, setShowPin] = useState(false);
  const [emailOrRegNo, setEmailOrRegNo] = useState('');
  const [password, setPassword] = useState('');

  const [securityError, setSecurityError] = useState<string | null>(null);
  const [authNotification, setAuthNotification] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const handleRoleChange = (newRole: 'student' | 'faculty' | 'security' | 'issuer' | 'admin') => {
    setRole(newRole);
    setSecurityError(null);
    setCollegePin('');
    if (newRole === 'security') {
      setEmailOrRegNo(AUTHORIZED_SECURITY_EMAIL);
      setPassword('security123');
    } else if (newRole === 'admin') {
      setEmailOrRegNo('admin@university.edu');
      setPassword('admin123');
    } else if (newRole === 'issuer') {
      setEmailOrRegNo('issuer@university.edu');
      setPassword('issuer123');
    } else {
      setEmailOrRegNo('');
      setPassword('');
    }
  };

  const handleCollegeChange = (newKey: string) => {
    setCollegeKey(newKey);
    setCollegePin(''); // Keep blank - only security knows the secret PIN
    setSecurityError(null);
    if (typeof window !== 'undefined') {
      localStorage.setItem('idstream_selected_college', newKey);
      const spec = COLLEGE_SECURITY_SPECS[newKey];
      if (spec) {
        localStorage.setItem('idstream_college_name', spec.name);
      }
      try {
        const raw = localStorage.getItem('idstream_user');
        if (raw) {
          const u = JSON.parse(raw);
          u.collegeKey = newKey;
          if (spec) {
            u.college = spec.name;
            u.collegeShortName = spec.shortName;
            if (u.regNo === '21BCE1042' || !u.regNo) {
              u.regNo = spec.rollPlaceholder?.replace('e.g. ', '') || '24DU101';
            }
          }
          localStorage.setItem('idstream_user', JSON.stringify(u));
        }
      } catch {
        // ignore
      }
    }
  };

  // Authenticate against verified institutional registry
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);
    setIsLoading(true);

    // Authenticate against registered institutional database
    const authResult = authenticateInstitutionalUser({
      collegeKey,
      collegePin,
      emailOrRegNo,
      password,
      role,
    });

    if (!authResult.success) {
      setSecurityError(authResult.error || 'Authentication failed.');
      setIsLoading(false);
      return;
    }

    const user = authResult.user!;
    const spec = COLLEGE_SECURITY_SPECS[collegeKey];
    const collegeFullName = spec?.name || user.collegeName || collegeKey;

    // Enforce selected college & role in session
    localStorage.setItem('idstream_selected_college', collegeKey);
    localStorage.setItem('idstream_college_name', collegeFullName);
    localStorage.setItem('idstream_role', role);

    const activeUser = {
      ...user,
      college: collegeFullName,
      collegeKey: collegeKey,
      role: role,
    };
    localStorage.setItem('idstream_user', JSON.stringify(activeUser));

    setAuthNotification(`✓ Institutional Identity Confirmed: Welcome ${user.name}!`);

    setTimeout(() => {
      navigate(`/dashboard?role=${role}`);
    }, 600);
  };

  const handleGoogleSuccess = (user: AuthSessionUser) => {
    const activeKey =
      collegeKey ||
      (typeof window !== 'undefined' ? localStorage.getItem('idstream_selected_college') : null) ||
      'du';
    const spec = COLLEGE_SECURITY_SPECS[activeKey] || COLLEGE_SECURITY_SPECS.du;
    const collegeFullName = spec.name;
    const shortName = spec.shortName;
    const defaultRoll = spec.rollPlaceholder ? spec.rollPlaceholder.replace('e.g. ', '') : (user.role === 'faculty' ? 'FAC-DU-101' : '24DU101');

    // Enforce selected college & role in session
    localStorage.setItem('idstream_selected_college', activeKey);
    localStorage.setItem('idstream_college_name', collegeFullName);
    localStorage.setItem('idstream_role', user.role);

    // Cross-reference against registered institutional database
    const regUsers = getRegisteredInstitutionalUsers();
    const existing = regUsers.find((u) => u.email.toLowerCase() === user.email.toLowerCase());

    const finalName = existing?.name || user.name || formatNameFromEmail(user.email);
    const finalRoll = existing?.regNo || defaultRoll;
    const finalDept = existing?.department || (user.role === 'faculty' ? 'Academic Faculty' : 'Computer Science');

    const enrichedUser = {
      ...user,
      name: finalName,
      college: collegeFullName,
      collegeKey: activeKey,
      collegeShortName: shortName,
      regNo: finalRoll,
      department: finalDept,
    };
    localStorage.setItem('idstream_user', JSON.stringify(enrichedUser));

    setAuthNotification(`Google Cloud Verified: Welcome ${finalName} (${shortName})!`);
    setTimeout(() => {
      navigate(`/dashboard?role=${user.role}`);
    }, 600);
  };

  const handleGoogleError = (errorMsg: string) => {
    setSecurityError(errorMsg);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-x-hidden bg-black font-sans selection:bg-white/20 p-4 py-10">
      <video autoPlay loop muted playsInline className="fixed inset-0 w-full h-full object-cover opacity-50">
        <source src="/login.mp4" type="video/mp4" />
      </video>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-xl p-6 sm:p-9 bg-[#0A0A0C]/90 backdrop-blur-2xl rounded-2xl shadow-[0_0_60px_rgba(255,255,255,0.07)] border border-white/20 my-6">
        {/* Clean Step Navigator: 1. Register First | 2. Sign In */}
        <div className="flex rounded-xl bg-white/5 p-1 border border-white/15 mb-6">
          <Link
            to="/signup"
            className="flex-1 py-2.5 text-center text-xs font-bold uppercase tracking-wider rounded-lg transition-all text-slate-300 hover:text-white flex items-center justify-center gap-2"
          >
            <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center justify-center text-[10px] font-bold">1</span>
            <span>Register First</span>
          </Link>
          <div className="flex-1 py-2.5 text-center text-xs font-bold uppercase tracking-wider rounded-lg bg-white text-black shadow-lg flex items-center justify-center gap-2">
            <span className="w-5 h-5 rounded-full bg-black/10 text-black flex items-center justify-center text-[10px] font-bold">2</span>
            <span>Sign In</span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-full border border-white/20 flex items-center justify-center bg-black/80 mb-3 shadow-lg">
            <div className="w-3.5 h-3.5 bg-blue-400 rounded-full shadow-[0_0_12px_rgba(96,165,250,0.8)]"></div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wider uppercase mb-1">
            {role === 'security' ? 'Security Command Login' : 'Campus Identity Sign In'}
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed mt-1">
            {role === 'security'
              ? 'Exclusive checkpoint authorization for Chief Security Officer'
              : 'Sign in to access your verified university credentials and smart campus access'}
          </p>
        </div>

        {/* Role Selector: Student, Faculty, Security, ID Issuer, Admin */}
        <div className="mb-5">
          <label className="text-xs font-bold tracking-wider text-slate-300 uppercase block mb-2 text-center">
            Select Your Campus Role
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 p-1.5 bg-black/70 rounded-xl border border-white/20">
            <button
              type="button"
              onClick={() => handleRoleChange('student')}
              className={`py-2.5 text-xs font-semibold rounded-lg transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                role === 'student'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="text-base">🎓</span>
              <span>Student</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('faculty')}
              className={`py-2.5 text-xs font-semibold rounded-lg transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                role === 'faculty'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/40 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="text-base">👨‍🏫</span>
              <span>Faculty</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('security')}
              className={`py-2.5 text-xs font-semibold rounded-lg transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                role === 'security'
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/40 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="text-base">🛡️</span>
              <span>Security</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('issuer')}
              className={`py-2.5 text-xs font-semibold rounded-lg transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                role === 'issuer'
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/40 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="text-base">🎛️</span>
              <span>ID Issuer</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('admin')}
              className={`py-2.5 text-xs font-semibold rounded-lg transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                role === 'admin'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
            >
              <span className="text-base">⚡</span>
              <span>Admin</span>
            </button>
          </div>
        </div>

        {/* Enrolled College / Institution Dropdown (Top Priority Selection) */}
        {role !== 'security' && (
          <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-black border border-blue-500/40 shadow-md">
            <label className="text-xs font-bold tracking-wider text-blue-200 uppercase block mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>🏛️</span>
                <span>Select Your University / Institution</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                Locked ID Card Generation
              </span>
            </label>
            <select
              value={collegeKey}
              onChange={(e) => handleCollegeChange(e.target.value)}
              className="w-full bg-[#0a0a0e] border border-blue-400/50 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-400 transition-colors font-medium shadow-inner"
            >
              {Object.values(COLLEGE_SECURITY_SPECS).map((spec) => (
                <option key={spec.key} value={spec.key} className="bg-[#111] text-white">
                  {spec.name} ({spec.shortName})
                </option>
              ))}
            </select>
            <div className="mt-2.5 flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5 text-emerald-400 font-mono font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Official {COLLEGE_SECURITY_SPECS[collegeKey]?.shortName || 'College'} Template Active
              </span>
              <span className="font-mono text-slate-400 text-[11px]">Only this card will be generated</span>
            </div>
          </div>
        )}

        {/* Security Notification Banner */}
        {securityError && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-950/80 border border-red-500/60 text-red-100 text-xs flex items-start gap-2.5 animate-fade-in shadow-lg">
            <span className="text-base shrink-0 mt-0.5">⚠️</span>
            <div className="flex-1 leading-relaxed font-medium">{securityError}</div>
          </div>
        )}

        {authNotification && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-100 text-xs flex items-center gap-2.5 animate-fade-in shadow-lg">
            <span className="text-base shrink-0">🛡️</span>
            <div className="flex-1 font-semibold">{authNotification}</div>
          </div>
        )}

        {/* Google Workspace Button (Available for All Roles) */}
        <div className="mb-5">
          <GoogleSignInButton
            role={role}
            collegeKey={collegeKey}
            text="signin"
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            onOpenConfig={() => setIsConfigOpen(true)}
          />
        </div>

        {/* Divider */}
        <div className="relative flex py-2 items-center mb-5">
          <div className="flex-grow border-t border-white/20"></div>
          <span className="flex-shrink mx-3 text-xs uppercase tracking-wider text-slate-300 font-bold">
            {role === 'security'
              ? 'Or Sign In with Master Officer Passcode'
              : 'Or Sign In With Registered Institutional Credentials'}
          </span>
          <div className="flex-grow border-t border-white/20"></div>
        </div>

        {/* Sign In Form */}
        <form className="space-y-4" onSubmit={handleLogin}>
          {role !== 'security' ? (
            <>
              {/* Secret College Security PIN Code */}
              <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold tracking-wider text-blue-200 uppercase flex items-center gap-1.5">
                    <span>🔐</span>
                    <span>Classified College Security PIN Code</span>
                  </label>
                  <span className="text-xs text-amber-300 font-mono font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    Issued by Security Desk Only
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={collegePin}
                    onChange={(e) => {
                      setCollegePin(e.target.value);
                      setSecurityError(null);
                    }}
                    placeholder="Enter secret campus security PIN"
                    required
                    className="w-full bg-[#0c0d12] border border-blue-400/40 hover:border-blue-400/70 focus:border-blue-300 rounded-xl px-4 py-2.5 pr-11 text-white font-mono placeholder-slate-500 focus:outline-none text-sm tracking-widest transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs cursor-pointer select-none"
                    title={showPin ? 'Hide PIN' : 'Show PIN'}
                  >
                    {showPin ? '👁️' : '🔒'}
                  </button>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Students & faculty must enter their official authorization PIN received from Campus Security.
                </p>
              </div>

              {/* Registered Email or Roll Number */}
              <div>
                <label className="text-xs font-bold tracking-wide text-slate-200 uppercase block mb-1.5">
                  Registered Email or Roll Number
                </label>
                <input
                  type="text"
                  value={emailOrRegNo}
                  onChange={(e) => {
                    setEmailOrRegNo(e.target.value);
                    setSecurityError(null);
                  }}
                  placeholder="e.g. yourname@gmail.com or Roll Number"
                  required
                  className="w-full bg-[#0c0d12] border border-white/20 hover:border-white/35 focus:border-blue-400 focus:ring-1 focus:ring-blue-400/40 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none text-sm transition-all font-medium"
                />
              </div>

              {/* Password */}
              <div>
                <label className="text-xs font-bold tracking-wide text-slate-200 uppercase block mb-1.5">
                  Account Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-[#0c0d12] border border-white/20 hover:border-white/35 focus:border-blue-400 focus:ring-1 focus:ring-blue-400/40 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none text-sm transition-all"
                />
              </div>
            </>
          ) : (
            <>
              {/* Security Officer Exclusive Login Form */}
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/40 space-y-2.5">
                <div className="flex items-center justify-between text-amber-300 font-bold text-xs uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🛡️</span>
                    <span>Chief Security Officer Clearance</span>
                  </div>
                  <span className="text-[10px] bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded font-mono border border-amber-400/40">
                    Restricted
                  </span>
                </div>
                <p className="text-xs text-white/70 leading-relaxed">
                  Only authorized administrator (<strong className="text-amber-300 font-mono">vu.241fa04b57@gmail.com</strong>) is permitted to access the Security Officer Portal and unlock the <strong className="text-amber-300">Campus Master PIN Vault</strong>. No other accounts are permitted.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold tracking-wider text-amber-200 uppercase block mb-1.5">
                  Authorized Security Administrator Email
                </label>
                <input
                  type="email"
                  value={emailOrRegNo}
                  onChange={(e) => {
                    setEmailOrRegNo(e.target.value);
                    setSecurityError(null);
                  }}
                  placeholder="vu.241fa04b57@gmail.com"
                  required
                  className="w-full bg-[#0c0d12] border border-amber-500/40 focus:border-amber-400 rounded-xl px-4 py-3 text-white text-sm focus:outline-none font-mono transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-bold tracking-wider text-slate-200 uppercase block mb-1.5">
                  Security Master Passcode
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-[#0c0d12] border border-white/20 hover:border-white/35 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>
            </>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full font-bold text-sm tracking-wider uppercase rounded-xl py-3.5 mt-2 transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] ${
              role === 'security'
                ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-amber-500/25'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
            }`}
          >
            {isLoading ? (
              <span>Authenticating Identity...</span>
            ) : role === 'security' ? (
              <>
                <span>Unlock Security Portal & PIN Vault</span>
                <span>🔑</span>
              </>
            ) : (
              <>
                <span>Access {role.toUpperCase()} Portal</span>
                <span>→</span>
              </>
            )}
          </button>

          {/* Redirect to Register First */}
          {role !== 'security' && (
            <div className="text-center pt-4 border-t border-white/20">
              <p className="text-slate-300 text-sm">
                Don't have an enrolled institutional identity?{' '}
                <Link to="/signup" className="text-blue-400 hover:text-blue-300 hover:underline font-bold ml-1">
                  Register First with College PIN →
                </Link>
              </p>
            </div>
          )}
        </form>
      </div>

      {/* Google Cloud OAuth 2.0 Config Modal */}
      <GoogleOAuthModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
      />
    </div>
  );
}
