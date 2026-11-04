import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import GoogleSignInButton from '../components/GoogleSignInButton';
import GoogleOAuthModal from '../components/GoogleOAuthModal';
import InstitutionalOtpModal from '../components/InstitutionalOtpModal';
import {
  COLLEGE_SECURITY_SPECS,
  validateCollegePin,
  validateInstitutionalEmail,
  registerInstitutionalUser,
  getRegisteredInstitutionalUsers,
  AUTHORIZED_SECURITY_EMAIL,
} from '../utils/collegeSecurity';
import { type AuthSessionUser, formatNameFromEmail } from '../utils/googleAuth';

export default function Signup() {
  const [role, setRole] = useState<'student' | 'faculty' | 'security' | 'issuer' | 'admin'>('student');
  const [collegeKey, setCollegeKey] = useState<string>('vit');
  const [collegePin, setCollegePin] = useState<string>('');
  const [showPin, setShowPin] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [regNo, setRegNo] = useState('');
  const [password, setPassword] = useState('');
  const [department] = useState('Computer Science');

  // Security Feedback & Modals
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [authNotification, setAuthNotification] = useState<string | null>(null);
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const currentCollege = COLLEGE_SECURITY_SPECS[collegeKey] || COLLEGE_SECURITY_SPECS.vit;

  // When college changes, keep PIN blank (classified secret)
  const handleCollegeChange = (newCollegeKey: string) => {
    setCollegeKey(newCollegeKey);
    setCollegePin('');
    setSecurityError(null);
  };

  // Pre-validate registration and trigger institutional OTP verification
  const handleInitiateSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);

    // 1. Validate College Restricted PIN
    const pinCheck = validateCollegePin(collegePin, collegeKey);
    if (!pinCheck.valid) {
      setSecurityError(pinCheck.error || 'Invalid College PIN code.');
      return;
    }

    // 2. Validate Institutional Email Domain (Strictly rejects @gmail, @yahoo, etc.)
    const emailCheck = validateInstitutionalEmail(email, collegeKey);
    if (!emailCheck.valid) {
      setSecurityError(emailCheck.error || 'Invalid institutional email.');
      return;
    }

    // 3. Check for Duplicate Roll Number / Email in registry (Anti-Malpractice)
    const existingUsers = getRegisteredInstitutionalUsers();
    const cleanEmail = email.trim().toLowerCase();
    const cleanRegNo = regNo.trim().toUpperCase();

    const emailExists = existingUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    if (emailExists) {
      setSecurityError(
        `Anti-Malpractice Alert: Institutional email '${cleanEmail}' is already registered to ${emailExists.name} (${emailExists.regNo}) at ${emailExists.collegeName}. A student can hold only one login.`
      );
      return;
    }

    const rollExists = existingUsers.find(
      (u) => u.regNo.toUpperCase() === cleanRegNo && u.collegeKey === collegeKey
    );
    if (rollExists) {
      setSecurityError(
        `Duplicate Registration Blocked: Roll Number '${cleanRegNo}' is already registered under ${rollExists.collegeName}. Please Sign In instead.`
      );
      return;
    }

    if (!name.trim()) {
      setSecurityError('Please enter your full name as recorded in college records.');
      return;
    }

    if (!regNo.trim()) {
      setSecurityError('Please enter your institutional Registration / Roll Number.');
      return;
    }

    // All pre-checks passed: Launch Institutional OTP Verification
    setIsOtpOpen(true);
  };

  // Called when 6-digit OTP code is successfully confirmed in modal
  const handleOtpVerified = () => {
    setIsOtpOpen(false);
    setIsSubmitting(true);

    const result = registerInstitutionalUser({
      name,
      email,
      regNo,
      collegeKey,
      collegePin,
      password: password || 'verified_pass',
      role,
      department,
    });

    if (result.success && result.user) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('idstream_selected_college', collegeKey);
        localStorage.setItem('idstream_college_name', currentCollege.name);
        localStorage.setItem('idstream_role', role);

        const sessionUser: AuthSessionUser = {
          name: result.user.name,
          email: result.user.email,
          role: role,
          regNo: result.user.regNo,
          college: currentCollege.name,
          collegeKey: collegeKey,
          department: result.user.department || department || 'Computer Science',
          isVerified: true,
          provider: 'institutional',
        };
        localStorage.setItem('idstream_user', JSON.stringify(sessionUser));
      }
      setAuthNotification(`✓ Institutional Identity Verified: Welcome ${result.user.name}!`);
      setTimeout(() => {
        navigate(`/dashboard?role=${role}`);
      }, 700);
    } else {
      setSecurityError(result.error || 'Failed to complete registration.');
      setIsSubmitting(false);
    }
  };

  const handleGoogleSuccess = (user: AuthSessionUser) => {
    const spec = COLLEGE_SECURITY_SPECS[collegeKey];
    const collegeFullName = spec?.name || currentCollege.name;
    const shortName = spec?.shortName || currentCollege.shortName;

    // Cross-reference registered users to preserve exact registered name
    const registeredList = getRegisteredInstitutionalUsers();
    const existing = registeredList.find(
      (r) => r.email.trim().toLowerCase() === user.email.trim().toLowerCase()
    );

    const finalName = existing?.name?.trim() || user.name?.trim() || (user.email ? formatNameFromEmail(user.email) : 'Student Candidate');
    const finalRoll = existing?.regNo || user.regNo || (user.email ? user.email.split('@')[0].toUpperCase() : 'REG-INST');
    const finalDept = existing?.department || user.department || 'Computer Science';

    if (typeof window !== 'undefined') {
      localStorage.setItem('idstream_selected_college', collegeKey);
      localStorage.setItem('idstream_college_name', collegeFullName);
      localStorage.setItem('idstream_role', user.role);

      const enrichedUser: AuthSessionUser = {
        ...user,
        name: finalName,
        regNo: finalRoll,
        department: finalDept,
        college: collegeFullName,
        collegeKey: collegeKey,
        collegeShortName: shortName,
      };
      localStorage.setItem('idstream_user', JSON.stringify(enrichedUser));
    }

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
        <source src="/SIGNUP.mp4" type="video/mp4" />
      </video>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-xl p-6 sm:p-9 bg-[#0A0A0C]/90 backdrop-blur-2xl rounded-2xl shadow-[0_0_60px_rgba(255,255,255,0.07)] border border-white/20 my-6">
        {/* Clean Step Navigator: 1. Register First | 2. Sign In */}
        <div className="flex rounded-xl bg-white/5 p-1 border border-white/15 mb-6">
          <div className="flex-1 py-2.5 text-center text-xs font-bold uppercase tracking-wider rounded-lg bg-white text-black shadow-lg flex items-center justify-center gap-2">
            <span className="w-5 h-5 rounded-full bg-black/10 text-black flex items-center justify-center text-[10px] font-bold">1</span>
            <span>Register First</span>
          </div>
          <Link
            to="/auth"
            className="flex-1 py-2.5 text-center text-xs font-bold uppercase tracking-wider rounded-lg transition-all text-slate-300 hover:text-white flex items-center justify-center gap-2"
          >
            <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center justify-center text-[10px] font-bold">2</span>
            <span>Sign In</span>
          </Link>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-full border border-white/20 flex items-center justify-center bg-black/80 mb-3 shadow-lg">
            <div className="w-3.5 h-3.5 bg-emerald-400 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.8)]"></div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wider uppercase mb-1">
            Institutional Registration
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed mt-1">
            Register your verified student identity with your campus roll number and security PIN.
          </p>
        </div>

        {/* Campus Role Selector: Student, Faculty, Security, ID Issuer, Admin */}
        <div className="mb-5">
          <label className="text-xs font-bold tracking-wider text-slate-300 uppercase block mb-2 text-center">
            Select Your Campus Role
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 p-1.5 bg-black/70 rounded-xl border border-white/20">
            <button
              type="button"
              onClick={() => setRole('student')}
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
              onClick={() => setRole('faculty')}
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
              onClick={() => setRole('security')}
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
              onClick={() => setRole('issuer')}
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
              onClick={() => setRole('admin')}
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

        {/* Official Google Workspace Registration (with Institutional domain filter) */}
        <div className="mb-5">
          <GoogleSignInButton
            role={role}
            text="signup"
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            onOpenConfig={() => setIsConfigOpen(true)}
          />
        </div>

        {/* Divider */}
        {role !== 'security' && (
          <div className="relative flex py-2 items-center mb-5">
            <div className="flex-grow border-t border-white/20"></div>
            <span className="flex-shrink mx-3 text-xs uppercase tracking-wider text-slate-300 font-bold">
              Or Complete Institutional Enrollment
            </span>
            <div className="flex-grow border-t border-white/20"></div>
          </div>
        )}

        {/* Security Clearance Card or Student Registration Form */}
        {role === 'security' ? (
          <div className="p-6 rounded-2xl bg-amber-950/20 border border-amber-500/40 text-center space-y-3.5 animate-fade-in shadow-xl">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-2xl shadow-inner">
              🛡️
            </div>
            <div>
              <h3 className="text-base font-bold text-amber-300 uppercase tracking-wide">
                Chief Security Officer Pre-Enrolled
              </h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto mt-1 leading-relaxed">
                Campus Security Administrator access is strictly assigned to{' '}
                <strong className="text-amber-300 font-mono">{AUTHORIZED_SECURITY_EMAIL}</strong>. Security officers do not need student enrollment. Please sign in directly.
              </p>
            </div>
            <div className="pt-1 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/auth?role=security"
                className="w-full sm:w-auto px-6 py-3 bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all text-center"
              >
                Go to Security Officer Sign In →
              </Link>
            </div>
          </div>
        ) : (
        /* Registration Form */
        <form className="space-y-4" onSubmit={handleInitiateSignup}>
          {/* 1. College Selection */}
          <div>
            <label className="text-xs font-bold tracking-wider text-slate-200 uppercase block mb-1.5">
              Select Your College / University
            </label>
            <select
              value={collegeKey}
              onChange={(e) => handleCollegeChange(e.target.value)}
              className="w-full bg-black/80 border border-white/20 hover:border-white/35 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-400 transition-colors cursor-pointer"
            >
              {Object.values(COLLEGE_SECURITY_SPECS).map((spec) => (
                <option key={spec.key} value={spec.key} className="bg-[#111] text-white">
                  {spec.name} ({spec.shortName})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Restricted College Security PIN Code - SECRET */}
          <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold tracking-wider text-blue-200 uppercase flex items-center gap-1.5">
                <span>🔐</span>
                <span>Classified College Security PIN Code</span>
              </label>
              <span className="text-xs text-amber-300 font-mono flex items-center gap-1 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                Campus Security PIN Required
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
                className="w-full bg-black/80 border border-blue-400/40 hover:border-blue-400 rounded-xl px-4 py-3 pr-11 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-blue-300 text-sm tracking-widest"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-sm cursor-pointer select-none"
                title={showPin ? 'Hide PIN' : 'Show PIN'}
              >
                {showPin ? '👁️' : '🔒'}
              </button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Security Protocol: PIN codes are classified and known exclusively to Campus Security. If you do not have an official security PIN, contact your campus security desk.
            </p>
          </div>

          {/* 3. Full Name */}
          <div>
            <label className="text-xs font-bold tracking-wider text-slate-200 uppercase block mb-1.5">
              {role === 'student' ? 'Student Full Name' : role === 'faculty' ? 'Faculty / Professor Name' : 'Security Officer Name'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={role === 'student' ? 'e.g. Aarav Sharma' : role === 'faculty' ? 'e.g. Dr. V. Ramanathan' : 'e.g. Officer K. Kumar'}
              required
              className="w-full bg-black/80 border border-white/20 hover:border-white/35 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 text-sm transition-colors"
            />
          </div>

          {/* 4. Institutional Roll / Registration Number */}
          <div>
            <label className="text-xs font-bold tracking-wider text-slate-200 uppercase block mb-1.5">
              {role === 'student' ? 'Unique Roll / Registration Number' : role === 'faculty' ? 'Faculty Employee ID' : 'Guard Badge / Officer ID'}
            </label>
            <input
              type="text"
              value={regNo}
              onChange={(e) => setRegNo(e.target.value.toUpperCase())}
              placeholder={currentCollege.rollPlaceholder}
              required
              className="w-full bg-black/80 border border-white/20 hover:border-white/35 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 text-sm uppercase font-mono tracking-wider transition-colors"
            />
            <span className="text-xs text-slate-300 mt-1.5 block">
              Permanent institutional identifier. One roll number can register only once.
            </span>
          </div>

          {/* 5. Student / Faculty Email Address */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold tracking-wider text-slate-200 uppercase">
                {role === 'student' ? 'Student Email Address' : 'Faculty Email Address'}
              </label>
              <span className="text-xs text-emerald-400 font-mono font-semibold">
                @gmail & campus emails accepted
              </span>
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setSecurityError(null);
              }}
              placeholder={`e.g. yourname@gmail.com or student@${currentCollege.emailDomains[0]}`}
              required
              className="w-full bg-black/80 border border-white/20 hover:border-white/35 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 text-sm transition-colors"
            />
            <div className="mt-1.5 text-xs text-slate-300">
              Enter your Google account or college email to verify institutional identity.
            </div>
          </div>

          {/* 6. Password */}
          <div>
            <label className="text-xs font-bold tracking-wider text-slate-200 uppercase block mb-1.5">
              Create Account Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              className="w-full bg-black/80 border border-white/20 hover:border-white/35 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-400 text-sm transition-colors"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm tracking-wider uppercase rounded-xl py-3.5 mt-2 shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            {isSubmitting ? (
              <span>Finalizing Enrollment...</span>
            ) : (
              <>
                <span>Send Verification Code & Register</span>
                <span>→</span>
              </>
            )}
          </button>

          {/* Redirect to Login */}
          <div className="text-center pt-4 border-t border-white/20">
            <p className="text-slate-300 text-sm">
              Already enrolled with your institution?{' '}
              <Link to="/auth" className="text-blue-400 hover:text-blue-300 hover:underline font-bold ml-1">
                Sign In with Your Credentials →
              </Link>
            </p>
          </div>
        </form>
        )}
      </div>

      {/* 6-Digit Institutional OTP Verification Modal */}
      <InstitutionalOtpModal
        isOpen={isOtpOpen}
        email={email}
        collegeName={currentCollege.name}
        onVerified={handleOtpVerified}
        onClose={() => setIsOtpOpen(false)}
      />

      {/* Google Cloud OAuth 2.0 Config Modal */}
      <GoogleOAuthModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
      />
    </div>
  );
}
