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
  const [role, setRole] = useState<'student' | 'faculty' | 'security'>('student');
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

  const handleRoleChange = (newRole: 'student' | 'faculty' | 'security') => {
    setRole(newRole);
    setSecurityError(null);
    setCollegePin('');
    if (newRole === 'security') {
      setEmailOrRegNo(AUTHORIZED_SECURITY_EMAIL);
      setPassword('security123');
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
        {/* Top "Register First" Reminder Banner */}
        <div className="mb-5 p-3 rounded-xl bg-blue-950/50 border border-blue-500/30 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">📢</span>
            <span className="text-blue-200">
              First time here? <strong className="text-white">Register First</strong> to enroll with your college PIN.
            </span>
          </div>
          <Link
            to="/signup"
            className="px-3 py-1 bg-white text-black font-bold rounded-lg text-[11px] uppercase tracking-wider hover:bg-gray-200 transition-colors whitespace-nowrap"
          >
            Register First
          </Link>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-full border border-white/20 flex items-center justify-center bg-black mb-3 shadow-lg">
            <div className="w-4 h-4 bg-white rounded-full"></div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-[0.2em] uppercase mb-1">
            {role === 'security' ? 'Security Post Sign In' : 'Institutional Sign In'}
          </h2>
          <div className="flex items-center justify-center gap-2 text-white/50 text-xs tracking-wider uppercase">
            <span>Anti-Malpractice Active</span>
            <span className="w-1 h-1 rounded-full bg-white/40"></span>
            <span className="text-blue-400 font-semibold font-mono">
              {role === 'security' ? 'Master Officer Gateway' : 'Classified Security PIN Protected'}
            </span>
          </div>
        </div>

        {/* 3 Dashboard Logins Selector */}
        <div className="mb-5">
          <label className="text-[10px] font-bold tracking-widest text-white/50 uppercase block mb-2 text-center">
            Login As
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/60 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => handleRoleChange('student')}
              className={`py-2.5 text-xs font-semibold rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                role === 'student'
                  ? 'bg-white text-black shadow-md'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>🎓</span>
              <span>Student</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('faculty')}
              className={`py-2.5 text-xs font-semibold rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                role === 'faculty'
                  ? 'bg-white text-black shadow-md'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>👨‍🏫</span>
              <span>Faculty</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('security')}
              className={`py-2.5 text-xs font-semibold rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 cursor-pointer ${
                role === 'security'
                  ? 'bg-white text-black shadow-md'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>🛡️</span>
              <span>Security</span>
            </button>
          </div>
        </div>

        {/* Enrolled College / Institution Dropdown (Top Priority Selection) */}
        {role !== 'security' && (
          <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-blue-950/40 to-black border border-blue-500/30">
            <label className="text-[10px] font-bold tracking-widest text-blue-300 uppercase block mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>🏛️</span>
                <span>Select Your University / Institution</span>
              </span>
              <span className="text-[9.5px] text-emerald-400 font-mono">
                Locked ID Card Generation
              </span>
            </label>
            <select
              value={collegeKey}
              onChange={(e) => handleCollegeChange(e.target.value)}
              className="w-full bg-black/90 border border-blue-400/40 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-400 transition-colors font-medium shadow-inner"
            >
              {Object.values(COLLEGE_SECURITY_SPECS).map((spec) => (
                <option key={spec.key} value={spec.key} className="bg-[#111] text-white">
                  {spec.name} ({spec.shortName})
                </option>
              ))}
            </select>
            <div className="mt-2 flex items-center justify-between text-[10.5px] text-white/50">
              <span className="flex items-center gap-1 text-emerald-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Official {COLLEGE_SECURITY_SPECS[collegeKey]?.shortName || 'College'} Template Active
              </span>
              <span className="font-mono text-white/40">Only this card will be generated</span>
            </div>
          </div>
        )}

        {/* Security Notification Banner */}
        {securityError && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-start gap-2.5 animate-fade-in shadow-lg">
            <span className="text-base shrink-0 mt-0.5">⚠️</span>
            <div className="flex-1 leading-relaxed">{securityError}</div>
          </div>
        )}

        {authNotification && (
          <div className="mb-4 p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2.5 animate-fade-in">
            <span className="text-base shrink-0">🛡️</span>
            <div className="flex-1 font-medium">{authNotification}</div>
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
          <div className="flex-grow border-t border-white/10"></div>
          <span className="flex-shrink mx-3 text-[10px] uppercase tracking-wider text-white/40 font-bold">
            {role === 'security'
              ? 'Or Sign In with Master Officer Passcode'
              : 'Or Sign In With Registered Institutional Credentials'}
          </span>
          <div className="flex-grow border-t border-white/10"></div>
        </div>

        {/* Sign In Form */}
        <form className="space-y-4" onSubmit={handleLogin}>
          {role !== 'security' ? (
            <>

              {/* Secret College Security PIN Code - MASKED (No PIN revealed) */}
              <div className="p-3.5 rounded-xl bg-blue-950/20 border border-blue-500/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10.5px] font-bold tracking-widest text-blue-200 uppercase flex items-center gap-1.5">
                    <span>🔐</span>
                    <span>Classified College Security PIN Code</span>
                  </label>
                  <span className="text-[10px] text-amber-300/80 font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    Only Security Holds PINs
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
                    className="w-full bg-black/80 border border-blue-400/30 rounded-xl px-4 py-2.5 pr-11 text-white font-mono placeholder-white/30 focus:outline-none focus:border-blue-300 text-sm tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs cursor-pointer select-none"
                    title={showPin ? 'Hide PIN' : 'Show PIN'}
                  >
                    {showPin ? '👁️' : '🔒'}
                  </button>
                </div>
                <p className="text-[10.5px] text-white/50 leading-relaxed">
                  Students & faculty must obtain their authorization PIN from Campus Security. PIN codes are confidential and not disclosed here.
                </p>
              </div>

              {/* Registered Email or Roll Number */}
              <div>
                <label className="text-[10px] font-bold tracking-widest text-white/50 uppercase block mb-1">
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
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/40 text-sm transition-colors"
                />
              </div>

              {/* Password */}
              <div>
                <label className="text-[10px] font-bold tracking-widest text-white/50 uppercase block mb-1">
                  Account Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/40 text-sm transition-colors"
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
                <label className="text-[10px] font-bold tracking-widest text-amber-300/80 uppercase block mb-1">
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
                  className="w-full bg-black/80 border border-amber-500/40 focus:border-amber-400 rounded-xl px-4 py-3 text-white text-sm focus:outline-none font-mono transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold tracking-widest text-white/60 uppercase block mb-1">
                  Security Master Passcode
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-black/80 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-400 transition-colors"
                />
              </div>
            </>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full font-bold text-xs sm:text-sm tracking-widest uppercase rounded-xl py-3.5 mt-2 transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] ${
              role === 'security'
                ? 'bg-amber-400 hover:bg-amber-300 text-black'
                : 'bg-white hover:bg-gray-200 text-black'
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
            <div className="text-center pt-3 border-t border-white/10">
              <p className="text-white/60 text-xs">
                Don't have an enrolled institutional identity?{' '}
                <Link to="/signup" className="text-white hover:underline font-bold ml-1">
                  Register First with College PIN
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
