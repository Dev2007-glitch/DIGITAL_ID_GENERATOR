import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { getAuthenticatedUser, logoutGoogleSession, type AuthSessionUser, formatNameFromEmail } from '../utils/googleAuth';
import { getSecurityMasterPins, AUTHORIZED_SECURITY_EMAIL, COLLEGE_SECURITY_SPECS, getRegisteredInstitutionalUsers } from '../utils/collegeSecurity';
import GoogleOAuthModal from '../components/GoogleOAuthModal';

interface StudentRecord {
  regNo: string;
  name: string;
  college: string;
  program: string;
  branch: string;
  year: string;
  photoUrl?: string;
  role?: 'student' | 'faculty';
  designation?: string;
}

interface GateLog {
  id: string;
  time: string;
  idNum: string;
  name: string;
  role: 'Student' | 'Faculty' | 'Visitor';
  gate: string;
  status: 'GRANTED' | 'DENIED';
}

interface CollegePortalInfo {
  name: string;
  shortName: string;
  portalName: string;
  portalUrl: string;
  facultyPortalUrl: string;
  mainWebsiteUrl: string;
  domain: string;
  contactEmail: string;
  helpline: string;
  accentColor: string;
  logoUrl?: string;
  portalDescription?: string;
}

// Verified Official College Student & Faculty Portals and Main Campus Websites
const COLLEGE_PORTALS: Record<string, CollegePortalInfo> = {
  vit: {
    name: 'Vellore Institute of Technology',
    shortName: 'VIT Chennai',
    portalName: 'VTOP Student Portal',
    portalUrl: 'https://vtop.vit.ac.in/vtop/initialProcess',
    facultyPortalUrl: 'https://vtop.vit.ac.in/vtop/initialProcess',
    mainWebsiteUrl: 'https://chennai.vit.ac.in/',
    domain: 'vtop.vit.ac.in',
    contactEmail: 'chennai.studentwelfare@vit.ac.in',
    helpline: '+91-44-3993 1555',
    accentColor: '#1e3a8a',
    logoUrl: '/logos/media_1790370323960.png',
    portalDescription: 'Course registration, digital attendance, grade history & hostel mess.',
  },
  vvit: {
    name: 'Vasireddy Venkatadri Institute of Technology',
    shortName: 'VVIT Guntur',
    portalName: 'VVIT ECAP & Student Portal',
    portalUrl: 'https://vvitguntur.com/student-login',
    facultyPortalUrl: 'https://vvitguntur.com/',
    mainWebsiteUrl: 'https://www.vvitguntur.com/',
    domain: 'vvitguntur.com',
    contactEmail: 'principal@vvit.net',
    helpline: '+91-863-2293336',
    accentColor: '#dc2626',
    logoUrl: '/logos/media_1790370323960.png',
    portalDescription: 'Attendance ledger, mid marks, fee receipts & exam circulars.',
  },
  du: {
    name: 'University of Delhi',
    shortName: 'Delhi University',
    portalName: 'DU Samarth Student Portal',
    portalUrl: 'https://slc.uod.ac.in/',
    facultyPortalUrl: 'https://du.samarth.ac.in/',
    mainWebsiteUrl: 'https://www.du.ac.in/',
    domain: 'slc.uod.ac.in',
    contactEmail: 'studentportal@du.ac.in',
    helpline: '+91-11-27006900',
    accentColor: '#1e3a8a',
    logoUrl: '/logos/media_1790370363965.png',
    portalDescription: 'Student lifecycle portal (SLC), exam admit cards & academic credits.',
  },
  vignan: {
    name: "Vignan's Foundation for Science, Tech & Research",
    shortName: 'VFSTR (Vignan)',
    portalName: 'VFSTR ERP Student Portal',
    portalUrl: 'https://erp.vignan.ac.in/',
    facultyPortalUrl: 'https://erp.vignan.ac.in/',
    mainWebsiteUrl: 'https://www.vignan.ac.in/',
    domain: 'erp.vignan.ac.in',
    contactEmail: 'info@vignan.ac.in',
    helpline: '+91-863-2344700',
    accentColor: '#2b3a67',
    logoUrl: '/logos/media_1790370292327.png',
    portalDescription: 'SGPA marks, ERP attendance, fee ledger & exam hall ticket.',
  },
  jntua: {
    name: 'Jawaharlal Nehru Technological University Anantapur',
    shortName: 'JNTUA',
    portalName: 'JNTUA Student Exam Portal',
    portalUrl: 'https://jntuastudentportal.ac.in/',
    facultyPortalUrl: 'https://jntuaresults.ac.in/',
    mainWebsiteUrl: 'https://www.jntua.ac.in/',
    domain: 'jntuastudentportal.ac.in',
    contactEmail: 'support@jntua.ac.in',
    helpline: '+91-8554-272433',
    accentColor: '#1d4ed8',
    logoUrl: '/logos/media_1790370340103.png',
    portalDescription: 'Marks memos, hall tickets, exam timetable & challenge valuation.',
  },
  priyadarshini: {
    name: 'Priyadarshini College of Engineering, Nagpur',
    shortName: 'PCE Nagpur',
    portalName: 'PCE Student MIS Portal',
    portalUrl: 'https://m-mis.pcenagpur.edu.in/',
    facultyPortalUrl: 'https://m-mis.pcenagpur.edu.in/',
    mainWebsiteUrl: 'https://www.pcenagpur.edu.in/',
    domain: 'm-mis.pcenagpur.edu.in',
    contactEmail: 'principal.pce@ltjss.net',
    helpline: '+91-7104-244307',
    accentColor: '#1e40af',
    logoUrl: '/logos/media_1790370418629.png',
    portalDescription: 'MIS student login, attendance, re-sit exam forms & fee modules.',
  },
  default: {
    name: 'Universal Collegiate Institute',
    shortName: 'CampusPass',
    portalName: 'CampusPass Student Portal',
    portalUrl: 'https://digitalidgenerator.vercel.app/',
    facultyPortalUrl: 'https://digitalidgenerator.vercel.app/',
    mainWebsiteUrl: 'https://digitalidgenerator.vercel.app/',
    domain: 'digitalidgenerator.vercel.app',
    contactEmail: 'support@campuspass.edu',
    helpline: '1-800-CAMPUS',
    accentColor: '#3b82f6',
    portalDescription: 'Universal digital student verification & credential gateway.',
  },
};

const DEFAULT_RECORDS: StudentRecord[] = [
  {
    regNo: '21BQ1A4237',
    name: 'K. Sai Teja',
    college: 'VVIT',
    program: 'B.Tech',
    branch: 'Computer Science & AI',
    year: '2021 - 2025',
    role: 'student',
  },
  {
    regNo: '21BCE0001',
    name: 'Aarav Sharma',
    college: 'VIT',
    program: 'B.Tech',
    branch: 'Computer Science',
    year: '2021 - 2025',
    role: 'student',
  },
  {
    regNo: 'FAC-VIT-108',
    name: 'Dr. V. Ramanathan',
    college: 'VIT',
    program: 'Professor & Dean',
    branch: 'School of Computer Science',
    year: '2020 - 2030',
    role: 'faculty',
    designation: 'Professor & Dean',
  },
  {
    regNo: 'FAC-VVIT-204',
    name: 'Dr. M. Radhika',
    college: 'VVIT',
    program: 'HOD & Professor',
    branch: 'Artificial Intelligence & DS',
    year: '2019 - 2029',
    role: 'faculty',
    designation: 'HOD & Professor',
  },
  {
    regNo: '24DU101',
    name: 'Priya Mehra',
    college: 'University of Delhi',
    program: 'B.Sc (Hons)',
    branch: 'Computer Science',
    year: '2024 - 2028',
    role: 'student',
  },
  {
    regNo: '22VFSTR01',
    name: 'Rohan Varma',
    college: 'Vignan (VFSTR)',
    program: 'B.Tech',
    branch: 'Information Technology',
    year: '2022 - 2026',
    role: 'student',
  },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlRole = searchParams.get('role') as 'student' | 'faculty' | 'security' | null;

  const [authUser, setAuthUser] = useState<AuthSessionUser | null>(() => getAuthenticatedUser());

  // Security officer authorization strictly restricted to vu.241fa04b57@gmail.com
  const isSecurityOfficer = Boolean(
    authUser?.email?.toLowerCase().trim() === AUTHORIZED_SECURITY_EMAIL.toLowerCase() ||
    authUser?.email?.toLowerCase().trim() === 'vu241fa04b57@gmail.com' ||
    (authUser?.role === 'security' &&
      (authUser?.email?.toLowerCase().includes('vu.241fa04b57') ||
        authUser?.email?.toLowerCase().includes('vu241fa04b57')))
  );

  const [roleAccessError, setRoleAccessError] = useState<string | null>(null);

  // Authenticated Session Role (Strict source of truth)
  const sessionRole: 'student' | 'faculty' | 'security' = (() => {
    const stored = typeof window !== 'undefined' ? (localStorage.getItem('idstream_role') as 'student' | 'faculty' | 'security' | null) : null;
    return authUser?.role || (stored === 'student' || stored === 'faculty' || stored === 'security' ? stored : 'student');
  })();

  // Active Role state: Strictly locked to user session role (Students cannot see Faculty, Faculty cannot see Student)
  const [activeRole, setActiveRole] = useState<'student' | 'faculty' | 'security'>(() => {
    if (sessionRole === 'student') return 'student';
    if (sessionRole === 'faculty') return 'faculty';
    if (sessionRole === 'security') {
      return isSecurityOfficer ? 'security' : 'student';
    }
    return 'student';
  });



  useEffect(() => {
    // Strictly isolate student and faculty from cross-navigating via URL
    if (sessionRole === 'student') {
      if (urlRole && urlRole !== 'student') {
        setRoleAccessError(
          urlRole === 'faculty'
            ? 'Access Denied: Students are strictly prohibited from viewing the Faculty Dashboard.'
            : 'Access Denied: Students are strictly prohibited from accessing the Security Gate.'
        );
        setActiveRole('student');
        setSearchParams({ role: 'student' }, { replace: true });
      } else {
        setActiveRole('student');
      }
    } else if (sessionRole === 'faculty') {
      if (urlRole && urlRole !== 'faculty') {
        setRoleAccessError(
          urlRole === 'student'
            ? 'Access Denied: Faculty members are strictly prohibited from viewing the Student Dashboard.'
            : 'Access Denied: Faculty members are strictly prohibited from accessing the Security Gate.'
        );
        setActiveRole('faculty');
        setSearchParams({ role: 'faculty' }, { replace: true });
      } else {
        setActiveRole('faculty');
      }
    } else if (sessionRole === 'security') {
      if (!isSecurityOfficer) {
        navigate('/auth?role=security');
        return;
      }
      if (urlRole === 'security') {
        setActiveRole('security');
        setView('gate_scanner');
      } else if (urlRole) {
        setActiveRole(urlRole);
      }
    }
  }, [urlRole, sessionRole, isSecurityOfficer, navigate, setSearchParams]);

  // Views: create (card generator), verify (ID verification), gate_scanner (security entry monitor), pin_vault (exclusive master PIN vault)
  const [view, setView] = useState<'create' | 'verify' | 'gate_scanner' | 'pin_vault'>(() => {
    return urlRole === 'security' && isSecurityOfficer ? 'gate_scanner' : 'create';
  });
  const [currentStep, setCurrentStep] = useState(1);
  const [isFlipped, setIsFlipped] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Security Master PIN Vault State (Strictly for Security Officers)
  const [copiedPin, setCopiedPin] = useState<string | null>(null);
  const [unmaskedPins, setUnmaskedPins] = useState<Record<string, boolean>>({});
  const [issueCollege, setIssueCollege] = useState('vit');
  const [issueRoll, setIssueRoll] = useState('');
  const [issueName, setIssueName] = useState('');
  const [issuedPass, setIssuedPass] = useState<{
    collegeName: string;
    pin: string;
    name: string;
    roll: string;
    issuedAt: string;
  } | null>(null);

  const securityMasterPins = getSecurityMasterPins();

  const handleCopyPin = (pin: string, key: string) => {
    navigator.clipboard?.writeText(pin);
    setCopiedPin(key);
    setTimeout(() => setCopiedPin(null), 2500);
  };

  const togglePinMask = (key: string) => {
    setUnmaskedPins((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleIssuePinPass = (e: React.FormEvent) => {
    e.preventDefault();
    const spec = securityMasterPins.find((s) => s.collegeKey === issueCollege);
    if (!spec) return;
    setIssuedPass({
      collegeName: spec.name,
      pin: spec.campusPin,
      name: issueName.trim() || 'Student Candidate',
      roll: issueRoll.trim().toUpperCase() || 'PENDING_REG',
      issuedAt: new Date().toLocaleTimeString(),
    });
  };

  // Helper to resolve the user's enrolled institution
  const resolveEnrolledInstitution = () => {
    if (typeof window === 'undefined') {
      return { key: 'du', name: 'University of Delhi' };
    }
    const storedKey = localStorage.getItem('idstream_selected_college');
    const storedName = localStorage.getItem('idstream_college_name');

    let userKey = '';
    let userName = '';
    try {
      const raw = localStorage.getItem('idstream_user');
      if (raw) {
        const parsed = JSON.parse(raw);
        userKey = parsed.collegeKey || '';
        userName = parsed.college || '';
      }
    } catch {
      // ignore
    }

    let key = storedKey || userKey;
    if ((!key || !COLLEGE_SECURITY_SPECS[key]) && (storedName || userName)) {
      const s = (storedName || userName).toLowerCase().trim();
      if (s.includes('delhi') || s === 'du' || s.includes('university of delhi') || s.includes('uod')) key = 'du';
      else if (s.includes('vvit') || s.includes('vasireddy')) key = 'vvit';
      else if (s.includes('vignan') || s.includes('vfstr')) key = 'vignan';
      else if (s.includes('jntua') || s.includes('anantapur') || s.includes('jawaharlal')) key = 'jntua';
      else if (s.includes('priyadarshini') || s.includes('pce') || s.includes('nagpur')) key = 'priyadarshini';
      else if (s.includes('vit') || s.includes('vellore') || s.includes('chennai')) key = 'vit';
    }

    if (!key || !COLLEGE_SECURITY_SPECS[key]) {
      key = 'du';
    }

    const spec = COLLEGE_SECURITY_SPECS[key];
    const name = storedName || userName || (spec ? spec.name : 'University of Delhi');
    return { key, name };
  };

  // Helper to resolve the user's authentic registered profile
  const resolveRegisteredUserProfile = (roleHint?: 'student' | 'faculty' | 'security') => {
    if (typeof window === 'undefined') {
      return {
        name: 'Student Candidate',
        regNo: '24DU101',
        department: 'Computer Science',
        collegeKey: 'du',
        collegeName: 'University of Delhi',
        role: (roleHint || 'student') as 'student' | 'faculty' | 'security',
        photoUrl: '',
        email: '',
      };
    }

    // 1. Session user object
    let sessionUser: any = null;
    try {
      const raw = localStorage.getItem('idstream_user');
      if (raw) sessionUser = JSON.parse(raw);
    } catch {
      // ignore
    }

    const sessionEmail = (sessionUser?.email || '').trim().toLowerCase();
    const sessionRegNo = (sessionUser?.regNo || '').trim().toUpperCase();

    // 2. Cross-reference registered users
    const registeredUsers = getRegisteredInstitutionalUsers();
    const matchingRegUser = registeredUsers.find((r) => {
      if (sessionEmail && r.email?.trim().toLowerCase() === sessionEmail) return true;
      if (sessionRegNo && r.regNo?.trim().toUpperCase() === sessionRegNo) return true;
      return false;
    });

    const enrolled = resolveEnrolledInstitution();
    const collegeKey = sessionUser?.collegeKey || matchingRegUser?.collegeKey || enrolled.key;
    const spec = COLLEGE_SECURITY_SPECS[collegeKey] || COLLEGE_SECURITY_SPECS.du;
    const collegeName = sessionUser?.college || matchingRegUser?.collegeName || enrolled.name || spec.name;

    const role = (
      roleHint ||
      sessionUser?.role ||
      matchingRegUser?.role ||
      (localStorage.getItem('idstream_role') as any) ||
      'student'
    ) as 'student' | 'faculty' | 'security';

    // Discard dummy placeholder names
    const isDummyName = (n?: string) => {
      if (!n) return true;
      const lower = n.trim().toLowerCase();
      return (
        lower === 'john doe' ||
        lower === 'dr. sarah jenkins' ||
        lower === 'student name' ||
        lower === 'faculty member' ||
        lower === 'alex rivera (google verified)' ||
        lower === 'dr. sarah jenkins (google verified)'
      );
    };

    let resolvedName = '';
    if (matchingRegUser?.name && !isDummyName(matchingRegUser.name)) {
      resolvedName = matchingRegUser.name.trim();
    } else if (sessionUser?.name && !isDummyName(sessionUser.name)) {
      resolvedName = sessionUser.name.trim();
    } else if (sessionEmail) {
      resolvedName = formatNameFromEmail(sessionEmail);
    }

    if (!resolvedName) {
      resolvedName = role === 'faculty' ? 'Faculty Member' : 'Student Candidate';
    }

    let resolvedRegNo = '';
    if (matchingRegUser?.regNo && matchingRegUser.regNo.trim()) {
      resolvedRegNo = matchingRegUser.regNo.trim();
    } else if (sessionUser?.regNo && sessionUser.regNo.trim()) {
      resolvedRegNo = sessionUser.regNo.trim();
    } else if (spec?.rollPlaceholder) {
      resolvedRegNo = spec.rollPlaceholder.replace('e.g. ', '');
    } else {
      resolvedRegNo = role === 'faculty' ? 'FAC-DU-101' : '24DU101';
    }

    const resolvedDept =
      matchingRegUser?.department ||
      sessionUser?.department ||
      'Computer Science';

    const photo = sessionUser?.picture || sessionUser?.photoUrl || '';

    return {
      name: resolvedName,
      regNo: resolvedRegNo,
      department: resolvedDept,
      collegeKey,
      collegeName,
      role,
      photoUrl: photo,
      email: sessionEmail,
    };
  };

  // Form Fields - Initialized synchronously from authentic registered user profile
  const initialProfile = resolveRegisteredUserProfile();
  const [selectedCollegeKey, setSelectedCollegeKey] = useState<string>(initialProfile.collegeKey);
  const [college, setCollege] = useState(initialProfile.collegeName);
  const [name, setName] = useState(initialProfile.name);
  const [regNo, setRegNo] = useState(initialProfile.regNo);
  const [program, setProgram] = useState(() => (initialProfile.role === 'faculty' ? 'Professor & HOD' : 'B.Tech'));
  const [branch, setBranch] = useState(initialProfile.department);
  const [year, setYear] = useState('2024 - 2028');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [photoUrl, setPhotoUrl] = useState(initialProfile.photoUrl || '');
  const [isGoogleConfigOpen, setIsGoogleConfigOpen] = useState(false);
  const [qrDestination, setQrDestination] = useState<'portal' | 'website'>('portal');

  // Sync authentic user profile on mount
  useEffect(() => {
    const profile = resolveRegisteredUserProfile(activeRole);
    if (profile.name) {
      setName(profile.name);
    }
    if (profile.regNo) {
      setRegNo(profile.regNo);
    }
    if (profile.department) {
      setBranch(profile.department);
    }
    if (profile.photoUrl && !photoUrl) {
      setPhotoUrl(profile.photoUrl);
    }
    setSelectedCollegeKey(profile.collegeKey);
    setCollege(profile.collegeName);

    const user = getAuthenticatedUser();
    if (user) {
      setAuthUser(user);
    }
  }, []);

  // Update role-specific title when switching between student & faculty without overriding user's real name
  useEffect(() => {
    if (activeRole === 'faculty') {
      if (program === 'B.Tech') setProgram('Professor & HOD');
      if (regNo.startsWith('24DU') || regNo === '21BCE1042') {
        const spec = COLLEGE_SECURITY_SPECS[selectedCollegeKey];
        setRegNo(spec?.shortName ? `FAC-${spec.shortName.toUpperCase().replace(/[^A-Z]/g, '')}-101` : 'FAC-101');
      }
    } else if (activeRole === 'student') {
      if (program === 'Professor & HOD') setProgram('B.Tech');
      if (regNo.startsWith('FAC-')) {
        const spec = COLLEGE_SECURITY_SPECS[selectedCollegeKey];
        setRegNo(spec?.rollPlaceholder ? spec.rollPlaceholder.replace('e.g. ', '') : '24DU101');
      }
    }
  }, [activeRole]);

  // Verification State
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifiedRecord, setVerifiedRecord] = useState<StudentRecord | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Security Gatekeeper Logs State
  const [gateLogs, setGateLogs] = useState<GateLog[]>([
    {
      id: 'log-1',
      time: '10:48 AM',
      idNum: '21BCE0001',
      name: 'Aarav Sharma',
      role: 'Student',
      gate: 'Main Gate 01',
      status: 'GRANTED',
    },
    {
      id: 'log-2',
      time: '10:55 AM',
      idNum: 'FAC-VIT-108',
      name: 'Dr. V. Ramanathan',
      role: 'Faculty',
      gate: 'Main Gate 01',
      status: 'GRANTED',
    },
    {
      id: 'log-3',
      time: '11:02 AM',
      idNum: 'UNKNOWN-99',
      name: 'Unregistered Visitor',
      role: 'Visitor',
      gate: 'Gate 02 (North)',
      status: 'DENIED',
    },
  ]);
  const [gateCheckInput, setGateCheckInput] = useState('');
  const [gateCheckResult, setGateCheckResult] = useState<{
    status: 'GRANTED' | 'DENIED' | null;
    record?: StudentRecord;
    message?: string;
  }>({ status: null });

  const cardRef = useRef<HTMLDivElement>(null);
  const cardFrontRef = useRef<HTMLDivElement>(null);
  const cardBackRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detect Template with high-priority key routing
  const detectTemplate = (col: string, hintKey?: string) => {
    // 1. Direct key match: If hintKey or selectedCollegeKey exists and is valid, trust it directly!
    const key = hintKey || selectedCollegeKey;
    if (key && COLLEGE_SECURITY_SPECS[key]) {
      return key;
    }

    // 2. Check localStorage key
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('idstream_selected_college');
      if (stored && COLLEGE_SECURITY_SPECS[stored]) {
        return stored;
      }
    }

    // 3. Robust string match on college name
    const s = (col || '').toLowerCase().trim();
    if (s.includes('delhi') || s === 'du' || s.includes('university of delhi') || s.includes('uod')) return 'du';
    if (s.includes('vvit') || s.includes('vasireddy')) return 'vvit';
    if (s.includes('vignan') || s.includes('vfstr')) return 'vignan';
    if (s.includes('jntua') || s.includes('anantapur') || s.includes('jawaharlal')) return 'jntua';
    if (s.includes('priyadarshini') || s.includes('pce') || s.includes('nagpur')) return 'priyadarshini';
    if (s.includes('vit') || s.includes('vellore') || s.includes('chennai')) return 'vit';

    return selectedCollegeKey || 'du';
  };

  const templateKey = detectTemplate(college, selectedCollegeKey);
  const portalInfo: CollegePortalInfo = COLLEGE_PORTALS[templateKey] || COLLEGE_PORTALS[selectedCollegeKey] || COLLEGE_PORTALS.du;
  const targetPortalUrl = activeRole === 'faculty' ? portalInfo.facultyPortalUrl : portalInfo.portalUrl;
  const activeQrUrl = qrDestination === 'website' ? portalInfo.mainWebsiteUrl : targetPortalUrl;

  const templateNames: Record<string, string> = {
    vit: 'VIT - Vellore Institute of Technology',
    vvit: 'VVIT - Vasireddy Venkatadri Institute of Technology',
    vignan: "Vignan's Foundation (VFSTR)",
    jntua: 'JNTUA - Jawaharlal Nehru Technological University',
    priyadarshini: 'Priyadarshini College of Engineering, Nagpur',
    du: 'University of Delhi (DU)',
    default: 'Universal Campus Template',
  };

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhotoUrl(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveCurrentRecord = () => {
    if (!regNo.trim()) return;
    const newRecord: StudentRecord = {
      regNo: regNo.trim(),
      name: name || (activeRole === 'faculty' ? 'Faculty Member' : 'Student Name'),
      college: college || 'University',
      program: program || (activeRole === 'faculty' ? 'Faculty' : 'B.Tech'),
      branch: branch || 'Department',
      year: year || '2024 - 2028',
      photoUrl,
      role: activeRole === 'faculty' ? 'faculty' : 'student',
    };

    try {
      const saved = localStorage.getItem('idstream_records');
      const records: StudentRecord[] = saved ? JSON.parse(saved) : [];
      const updated = [newRecord, ...records.filter((r) => r.regNo.toLowerCase() !== newRecord.regNo.toLowerCase())];
      localStorage.setItem('idstream_records', JSON.stringify(updated));
    } catch {
      // Fallback
    }
  };

  // 1. Download Single-Sided PNG (Front or Back with QR)
  const handleDownloadPNG = async (side: 'active' | 'front' | 'back' = 'active') => {
    const targetElement =
      side === 'front'
        ? cardFrontRef.current
        : side === 'back'
        ? cardBackRef.current
        : isFlipped
        ? cardBackRef.current
        : cardFrontRef.current;

    if (!targetElement) return;
    setDownloading(true);
    saveCurrentRecord();

    try {
      const canvas = await html2canvas(targetElement, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const sideLabel = side === 'active' ? (isFlipped ? 'back_portal_qr' : 'front') : side;
      const link = document.createElement('a');
      link.download = `${activeRole}_${(name || 'id').replace(/\s+/g, '_')}_${sideLabel}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('PNG download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  // 2. Download Double-Sided Side-by-Side PNG (Front & Back together in one high-res image)
  const handleDownloadDoubleSidedPNG = async () => {
    if (!cardFrontRef.current || !cardBackRef.current) return;
    setDownloading(true);
    saveCurrentRecord();

    try {
      const canvasFront = await html2canvas(cardFrontRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const canvasBack = await html2canvas(cardBackRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      // Side-by-Side Layout with clean framing
      const gap = 36;
      const padding = 36;
      const combinedWidth = canvasFront.width + canvasBack.width + gap + padding * 2;
      const combinedHeight = Math.max(canvasFront.height, canvasBack.height) + padding * 2;

      const combinedCanvas = document.createElement('canvas');
      combinedCanvas.width = combinedWidth;
      combinedCanvas.height = combinedHeight;
      const ctx = combinedCanvas.getContext('2d');

      if (ctx) {
        // Dark premium canvas background
        ctx.fillStyle = '#0a0b10';
        ctx.fillRect(0, 0, combinedWidth, combinedHeight);

        // Center Front card vertically
        const frontY = padding + (combinedHeight - padding * 2 - canvasFront.height) / 2;
        ctx.drawImage(canvasFront, padding, frontY);

        // Center Back card vertically
        const backX = padding + canvasFront.width + gap;
        const backY = padding + (combinedHeight - padding * 2 - canvasBack.height) / 2;
        ctx.drawImage(canvasBack, backX, backY);

        const link = document.createElement('a');
        link.download = `${activeRole}_${(name || 'id').replace(/\s+/g, '_')}_double_sided_front_and_back.png`;
        link.href = combinedCanvas.toDataURL('image/png');
        link.click();
      }
    } catch (err) {
      console.error('Double-sided PNG download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  // 3. Download Double-Sided 2-Page PDF (Page 1 Front, Page 2 Back with QR)
  const handleDownloadPDF = async () => {
    if (!cardFrontRef.current || !cardBackRef.current) return;
    setDownloading(true);
    saveCurrentRecord();

    try {
      const canvasFront = await html2canvas(cardFrontRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgFront = canvasFront.toDataURL('image/png');

      const canvasBack = await html2canvas(cardBackRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgBack = canvasBack.toDataURL('image/png');

      const width = cardFrontRef.current.offsetWidth || 420;
      const height = cardFrontRef.current.offsetHeight || 265;
      const isLandscape = width > height;

      const pdf = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'px',
        format: [width, height],
      });

      // Page 1: Front
      pdf.addImage(imgFront, 'PNG', 0, 0, width, height);

      // Page 2: Back with Official Student Portal QR Code
      pdf.addPage([width, height], isLandscape ? 'landscape' : 'portrait');
      pdf.addImage(imgBack, 'PNG', 0, 0, width, height);

      pdf.save(`${activeRole}_${(name || 'id').replace(/\s+/g, '_')}_two_sided_pass.pdf`);
    } catch (err) {
      console.error('PDF download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  // 4. Download All Needed: 1-Click Multi-Format Export (Single Front + Single Back + Double Side-by-Side + 2-Sided PDF)
  const handleDownloadAllNeeded = async () => {
    setDownloading(true);
    saveCurrentRecord();

    try {
      // 1. Single Front PNG
      await handleDownloadPNG('front');
      await new Promise((r) => setTimeout(r, 400));

      // 2. Single Back QR PNG
      await handleDownloadPNG('back');
      await new Promise((r) => setTimeout(r, 400));

      // 3. Double-Sided Side-by-Side PNG
      await handleDownloadDoubleSidedPNG();
      await new Promise((r) => setTimeout(r, 400));

      // 4. Double-Sided 2-Page PDF
      await handleDownloadPDF();
    } catch (err) {
      console.error('Download all error:', err);
    } finally {
      setDownloading(false);
    }
  };

  // Look up record helper
  const lookupRecord = (idToSearch: string): StudentRecord | null => {
    const query = idToSearch.trim().toLowerCase();
    if (!query) return null;

    if (regNo && regNo.trim().toLowerCase() === query) {
      return {
        regNo: regNo.trim(),
        name: name || (activeRole === 'faculty' ? 'Faculty Member' : 'Student Name'),
        college: templateNames[templateKey] || college,
        program: program || 'Program',
        branch: branch || 'Branch',
        year: year || '2024 - 2028',
        photoUrl,
        role: activeRole === 'faculty' ? 'faculty' : 'student',
      };
    }

    try {
      const saved = localStorage.getItem('idstream_records');
      if (saved) {
        const records: StudentRecord[] = JSON.parse(saved);
        const found = records.find((r) => r.regNo.toLowerCase() === query);
        if (found) return found;
      }
    } catch {
      // Continue
    }

    const demoMatch = DEFAULT_RECORDS.find((r) => r.regNo.toLowerCase() === query);
    return demoMatch || null;
  };

  // Verify ID Logic
  const handleVerify = () => {
    const query = verifyInput.trim();
    if (!query) {
      setVerifyError('Please enter a Registration / Roll / Faculty Number to verify.');
      setVerifiedRecord(null);
      return;
    }

    setVerifyLoading(true);
    setVerifyError(null);
    setVerifiedRecord(null);

    setTimeout(() => {
      const record = lookupRecord(query);
      if (record) {
        setVerifiedRecord(record);
      } else {
        setVerifyError(`No active record found in registry for ID "${query.toUpperCase()}".`);
      }
      setVerifyLoading(false);
    }, 500);
  };

  // Security Gate Entry Check & Log Action
  const handleSecurityGateCheck = () => {
    const query = gateCheckInput.trim();
    if (!query) return;

    const record = lookupRecord(query);
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (record) {
      setGateCheckResult({
        status: 'GRANTED',
        record,
        message: 'Credentials valid. Student/Faculty cleared for campus gate entry.',
      });

      const newLog: GateLog = {
        id: `log-${Date.now()}`,
        time: timeStr,
        idNum: record.regNo.toUpperCase(),
        name: record.name,
        role: record.role === 'faculty' ? 'Faculty' : 'Student',
        gate: 'Main Gate 01',
        status: 'GRANTED',
      };
      setGateLogs((prev) => [newLog, ...prev]);
    } else {
      setGateCheckResult({
        status: 'DENIED',
        message: `ID "${query.toUpperCase()}" not recognized in active security registry. Access Denied.`,
      });

      const newLog: GateLog = {
        id: `log-${Date.now()}`,
        time: timeStr,
        idNum: query.toUpperCase(),
        name: 'Unknown Visitor',
        role: 'Visitor',
        gate: 'Main Gate 01',
        status: 'DENIED',
      };
      setGateLogs((prev) => [newLog, ...prev]);
    }
  };

  // Common Photo Component
  const renderPhoto = () => {
    if (photoUrl) {
      return <img src={photoUrl} className="w-full h-full object-cover" alt="Identity Photo" />;
    }
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
    );
  };

  // Render Front Card Templates (Used for both Student and Faculty per University)
  const renderCardFront = () => {
    switch (templateKey) {
      case 'vit':
        return (
          <div className="w-full h-full bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
            <div className="pt-4 px-4 pb-2 text-center border-b-[3px] border-blue-900 bg-white flex flex-col items-center">
              <div className="flex items-center justify-center mb-1">
                <img src="/logos/media_1790370323960.png" className="h-12 object-contain" alt="VIT Logo" />
                <div className="ml-2 text-left">
                  <div className="text-blue-900 font-black text-[14px] uppercase tracking-tight leading-none">Vellore Institute</div>
                  <div className="text-blue-900 font-black text-[12px] uppercase tracking-tight leading-none">Of Technology</div>
                </div>
              </div>
              <div className="text-[6px] text-black font-semibold tracking-tighter">
                (Deemed to be University under section 3 of the UGC Act, 1956)
              </div>
              <div className="text-[13px] font-black text-blue-900 mt-1.5 tracking-[0.15em] uppercase">CHENNAI CAMPUS</div>
            </div>
            <div className="flex-1 flex flex-col items-center pt-4 px-4 bg-white relative">
              <div className="w-[100px] h-[130px] bg-gray-100 border border-gray-300 rounded mb-3 overflow-hidden flex flex-col items-center justify-center shadow-sm">
                {renderPhoto()}
              </div>
              <div className="text-blue-900 font-black text-xl text-center leading-tight w-full truncate">
                {name || (activeRole === 'faculty' ? 'Faculty Member' : 'Student Candidate')}
              </div>
              <div className="text-black font-extrabold text-base mt-1">
                {activeRole === 'faculty' ? `EMP ID: ${regNo || 'FAC-VIT-108'}` : (regNo || '21BCE0001')}
              </div>
              {activeRole === 'faculty' && (
                <div className="text-gray-700 font-bold text-xs mt-1 text-center truncate w-full">
                  {program || 'Professor & Dean'} &bull; {branch || 'CSE'}
                </div>
              )}
            </div>
            <div className="h-11 bg-[#2b3a67] flex items-center justify-center relative">
              <div className="text-white font-extrabold tracking-widest text-sm uppercase z-10">
                {activeRole === 'faculty' ? 'ACADEMIC STAFF' : 'HOSTELLER'}
              </div>
            </div>
          </div>
        );

      case 'vvit':
        return (
          <div className="w-full h-full bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-red-200 relative">
            <div className="absolute inset-0 bg-gradient-to-b from-red-100/80 via-white to-red-100/80 opacity-60"></div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="pt-4 flex justify-center">
                <div className="w-24 h-[105px] bg-gray-100 border border-gray-300 rounded overflow-hidden flex flex-col items-center justify-center shadow-sm">
                  {renderPhoto()}
                </div>
              </div>
              <div className="mt-2.5 bg-[#e04545] py-2 px-2 text-center text-white">
                <div className="font-bold text-xs truncate uppercase">
                  {name || (activeRole === 'faculty' ? 'FACULTY MEMBER' : 'STUDENT CANDIDATE')}
                </div>
                <div className="font-bold text-[9px] truncate uppercase">
                  {program || (activeRole === 'faculty' ? 'PROFESSOR' : 'PROGRAM')} - {branch || (activeRole === 'faculty' ? 'CSE & AI' : 'BRANCH')}
                </div>
                <div className="font-bold text-[9px] mt-0.5">{year || (activeRole === 'faculty' ? '2024 - 2029' : '2024 - 2028')}</div>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center px-4 bg-white/60 backdrop-blur-sm">
                <div className="font-extrabold text-black text-sm mb-1">
                  {activeRole === 'faculty' ? `EMP ID: ${regNo || 'FAC-VVIT-204'}` : (regNo || 'REG NUMBER')}
                </div>
                <div className="font-bold text-[#1e3a8a] text-[9px] text-center mb-2.5 tracking-wide uppercase">
                  {activeRole === 'faculty' ? 'FACULTY & STAFF - GUNTUR' : 'DAY SCHOLAR GUNTUR'}
                </div>
                <div className="bg-[#e04545] text-white font-black text-xl px-4 py-0.5 rounded shadow-md border border-red-600 mb-1">VVIT</div>
                <div className="text-[6px] text-center font-bold text-black uppercase tracking-wider leading-tight">
                  Vasireddy Venkatadri
                  <br />
                  Institute of Technology
                </div>
              </div>
              <div className="h-8 bg-[#cc3333] flex flex-col items-center justify-center text-white text-[5px] tracking-wider leading-tight w-full">
                <div>NAMBUR, GUNTUR, A.P. INDIA - 522508</div>
                <div>www.vvit.net</div>
              </div>
            </div>
          </div>
        );

      case 'du':
        return (
          <div className="w-full h-full bg-[#f8f9fa] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
            <div className="bg-white text-center py-2 px-2 border-b-4 border-[#1e3a8a] flex items-center justify-center">
              <div className="flex items-center justify-center">
                <img src="/logos/media_1790370363965.png" className="h-14 object-contain mr-2" alt="DU Logo" />
                <div className="text-left leading-none">
                  <div className="text-[12px] font-black text-[#1e3a8a] uppercase leading-tight">University of Delhi</div>
                  <div className="text-[8px] font-bold text-gray-600">Established 1922</div>
                </div>
              </div>
            </div>
            <div className="flex-1 flex flex-col p-4 relative bg-white">
              <div className="absolute right-3 top-3 text-center bg-white rounded-full p-1 shadow-sm border border-gray-100 z-20">
                <div className="text-red-600 font-black text-sm flex items-center justify-center w-7 h-7 rounded-full border-2 border-red-100">
                  {bloodGroup || 'O+'}
                </div>
              </div>
              <div className="w-24 h-[110px] bg-gray-100 border-[3px] border-gray-800 rounded mx-auto mb-4 overflow-hidden flex flex-col items-center justify-center mt-2 relative z-10 shadow-sm">
                {renderPhoto()}
              </div>
              <div className="flex-1 border-t-2 border-dashed border-gray-200 pt-3 mt-1">
                <div className="grid grid-cols-[38%_62%] gap-y-2 text-[10px] text-[#1e3a8a] font-black items-center">
                  <div>NAME</div>
                  <div className="text-black font-bold truncate uppercase">: {name || (activeRole === 'faculty' ? 'FACULTY MEMBER' : 'STUDENT CANDIDATE')}</div>
                  <div>{activeRole === 'faculty' ? 'FACULTY ID' : 'ROLL NO'}</div>
                  <div className="text-black font-bold uppercase">: {regNo || (activeRole === 'faculty' ? 'FAC-DU-101' : 'REG NUMBER')}</div>
                  <div>{activeRole === 'faculty' ? 'DESIGNATION' : 'COURSE'}</div>
                  <div className="text-black font-bold truncate uppercase">: {program || (activeRole === 'faculty' ? 'PROFESSOR & DEAN' : 'PROGRAM')}</div>
                  <div>{activeRole === 'faculty' ? 'DEPARTMENT' : 'BRANCH'}</div>
                  <div className="text-black font-bold truncate uppercase">: {branch || (activeRole === 'faculty' ? 'COMPUTER SCIENCE' : 'BRANCH')}</div>
                </div>
              </div>
            </div>
            <div className="border-t-[3px] border-orange-500 p-2 text-center text-[7px] font-bold text-gray-800 bg-gray-100 uppercase tracking-wide leading-tight">
              Address: University Enclave, Delhi, 110007
              <br />
              Phone: +91-11-27006900
            </div>
          </div>
        );

      case 'vignan':
        return (
          <div className="w-full h-full bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
            <div className="h-[60px] flex flex-col pt-2 bg-white items-center justify-center border-b">
              <div className="flex items-center justify-center">
                <img src="/logos/media_1790370292327.png" className="h-12 object-contain mr-2" alt="Vignan Logo" />
                <div className="text-left leading-none">
                  <div className="text-[#2b3a67] font-black text-[11px] uppercase tracking-wide">Vignan's Foundation</div>
                  <div className="text-[#2b3a67] font-black text-[9px] uppercase tracking-wide">For Science, Technology & Research</div>
                </div>
              </div>
            </div>
            <div className="flex-1 flex p-3 gap-4 relative bg-gradient-to-r from-gray-50 to-white">
              <div className="w-[90px] h-[120px] bg-gray-100 border border-gray-400 rounded overflow-hidden shadow-sm flex flex-col items-center justify-center relative z-10 bg-white ml-2 mt-2 shrink-0">
                {renderPhoto()}
              </div>
              <div className="flex items-center -ml-1">
                <div className="transform -rotate-90 text-[#3b5998] font-bold text-[20px] tracking-[0.25em] w-8 h-32 flex items-center justify-center origin-center">
                  {activeRole === 'faculty' ? 'FACULTY' : 'STUDENT'}
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-center relative z-10 pl-2">
                <div className="text-[#2b3a67] font-black text-[18px] leading-tight uppercase tracking-wide truncate mb-1.5">
                  {name || (activeRole === 'faculty' ? 'FACULTY MEMBER' : 'STUDENT CANDIDATE')}
                </div>
                <div className="text-gray-900 font-black text-[15px] mb-2">
                  {activeRole === 'faculty' ? `EMP ID: ${regNo || 'FAC-VFSTR-01'}` : (regNo || 'REG NUMBER')}
                </div>
                <div className="text-[#2b3a67] font-extrabold text-[13px] uppercase truncate">
                  {program || (activeRole === 'faculty' ? 'PROFESSOR & HOD' : 'PROGRAM')} {branch || (activeRole === 'faculty' ? 'CSE' : 'BRANCH')}
                </div>
                <div className="text-gray-700 font-bold text-[12px] mt-1">{year || (activeRole === 'faculty' ? '2024 - 2029' : '2024 - 2028')}</div>
              </div>
              <div className="absolute bottom-3 right-4 flex flex-col items-center opacity-70">
                <svg className="w-16 h-8 text-black" viewBox="0 0 100 40">
                  <path d="M10 20 Q 30 10 50 20 T 90 20" fill="none" stroke="currentColor" strokeWidth="2.5" />
                </svg>
                <div className="text-[9px] font-bold text-gray-800 mt-1 uppercase tracking-wider">Registrar</div>
              </div>
            </div>
          </div>
        );

      case 'jntua':
        return (
          <div className="w-full h-full bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
            <div className="pt-4 px-2 pb-2 text-center bg-white flex flex-col items-center border-b border-gray-200">
              <img src="/logos/media_1790370340103.png" className="h-16 object-contain mb-1" alt="JNTUA Logo" />
              <div className="text-[9px] font-bold text-black uppercase tracking-wide">Jawaharlal Nehru Technological University</div>
              <div className="text-[8px] font-semibold text-black tracking-widest">
                ANANTAPUR {activeRole === 'faculty' ? '&bull; FACULTY SERVICES' : ''}
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center pt-4 px-4 bg-white relative">
              <div className="w-[100px] h-[130px] bg-gray-100 border border-gray-300 rounded mb-3 overflow-hidden flex flex-col items-center justify-center shadow-sm">
                {renderPhoto()}
              </div>
              <div className="text-blue-900 font-black text-xl text-center leading-tight w-full truncate">
                {name || (activeRole === 'faculty' ? 'Faculty Member' : 'Student Candidate')}
              </div>
              <div className="text-black font-extrabold text-base mt-1">
                {activeRole === 'faculty' ? `EMP ID: ${regNo || 'FAC-JNTUA-102'}` : (regNo || 'REG NUMBER')}
              </div>
            </div>
            <div className="h-9 bg-blue-900 flex items-center justify-center text-white text-[10px] tracking-widest font-semibold uppercase px-2 text-center">
              {activeRole === 'faculty' ? `FACULTY &bull; ${program || 'PROFESSOR'} (${branch || 'CSE'})` : `${program || 'PROGRAM'} - ${branch || 'BRANCH'}`}
            </div>
          </div>
        );

      case 'priyadarshini':
        return (
          <div className="w-full h-full bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
            <div className="h-[70px] flex items-center justify-between bg-white border-b-4 border-blue-800 px-4">
              <div className="flex items-center">
                <img src="/logos/media_1790370418629.png" className="h-14 object-contain mr-3 shrink-0" alt="Priyadarshini Logo" />
                <div className="text-left">
                  <div className="text-blue-800 font-black text-[13px] uppercase leading-tight">Priyadarshini College</div>
                  <div className="text-blue-800 font-bold text-[9px] uppercase leading-tight">Of Engineering, Nagpur</div>
                  <div className="text-gray-500 text-[7px] font-semibold">Lokmanya Tilak Jankalyan Shikshan Sanstha</div>
                </div>
              </div>
              {activeRole === 'faculty' && (
                <span className="bg-blue-800 text-white font-extrabold text-[8px] uppercase px-2 py-0.5 rounded shadow-sm">
                  FACULTY PASS
                </span>
              )}
            </div>
            <div className="flex-1 flex p-4 gap-4 relative bg-gray-50">
              <div className="w-[90px] h-[120px] bg-white border-2 border-blue-800 rounded overflow-hidden shadow flex flex-col items-center justify-center relative z-10 shrink-0">
                {renderPhoto()}
              </div>
              <div className="flex-1 flex flex-col justify-center relative z-10 pl-2">
                <div className="text-black font-black text-[20px] leading-tight uppercase truncate mb-1">
                  {name || (activeRole === 'faculty' ? 'FACULTY MEMBER' : 'STUDENT CANDIDATE')}
                </div>
                <div className="text-blue-800 font-bold text-[16px] mb-2">
                  {activeRole === 'faculty' ? `EMP ID: ${regNo || 'FAC-PCE-402'}` : (regNo || '21BCE1042')}
                </div>
                <div className="text-gray-700 font-semibold text-[13px] uppercase truncate">
                  {program || (activeRole === 'faculty' ? 'PROFESSOR & HOD' : 'B.TECH')} - {branch || (activeRole === 'faculty' ? 'COMPUTER SCIENCE' : 'BRANCH')}
                </div>
                <div className="text-gray-600 font-medium text-[11px] mt-1">{year || (activeRole === 'faculty' ? '2024 - 2029' : '2024 - 2028')}</div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="w-full h-full bg-gradient-to-br from-[#1a1a24] to-[#0a0a0f] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-white/20 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 blur-3xl rounded-full"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full"></div>
            <div className="flex-1 flex p-6 relative z-10">
              <div className="w-28 h-36 bg-black/50 border border-white/10 rounded-xl overflow-hidden flex flex-col items-center justify-center shadow-2xl shrink-0">
                {renderPhoto()}
              </div>
              <div className="flex-1 flex flex-col pl-6 justify-center">
                <div className="text-white/40 text-[9px] font-bold tracking-widest uppercase mb-1 truncate">
                  {college || (activeRole === 'faculty' ? 'CAMPUS FACULTY PASS' : 'UNIVERSAL ID TEMPLATE')}
                </div>
                <div className="text-white font-bold text-2xl leading-tight truncate">
                  {name || (activeRole === 'faculty' ? 'Faculty Member' : 'Student Candidate')}
                </div>
                <div className="text-blue-400 font-mono text-sm mt-1">
                  {activeRole === 'faculty' ? `EMP: ${regNo || 'FAC-402'}` : (regNo || 'ID-NUMBER-XXX')}
                </div>
                <div className="grid grid-cols-2 gap-4 mt-5 text-xs">
                  <div>
                    <div className="text-white/40 text-[9px] uppercase tracking-wider mb-1">
                      {activeRole === 'faculty' ? 'Designation' : 'Program'}
                    </div>
                    <div className="text-white/90 font-medium truncate">{program || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-white/40 text-[9px] uppercase tracking-wider mb-1">
                      {activeRole === 'faculty' ? 'Department' : 'Branch'}
                    </div>
                    <div className="text-white/90 font-medium truncate">{branch || 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  // Render Card Back with Verified College Specific QR Code & Portal Accessibility
  const renderCardBack = () => {
    // Both Student and Faculty use the authentic University Templates
    switch (templateKey) {
      case 'priyadarshini':
        return (
          <div className="w-full h-full bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border-2 border-blue-800 text-black p-3.5 select-text relative">
            {/* Top Banner with Official PCE Logo */}
            <div className="flex items-center justify-between border-b-2 border-blue-800 pb-2 mb-2">
              <div className="flex items-center">
                <img src="/logos/media_1790370418629.png" className="h-10 object-contain mr-2.5 shrink-0" alt="Priyadarshini Logo" />
                <div className="text-left">
                  <div className="text-blue-800 font-black text-[11px] uppercase leading-tight">
                    Priyadarshini College of Engineering
                  </div>
                  <div className="text-blue-800 font-bold text-[8.5px] uppercase leading-tight">
                    Nagpur &bull; Autonomous Institution
                  </div>
                  <div className="text-gray-500 text-[6.5px] font-semibold">
                    Lokmanya Tilak Jankalyan Shikshan Sanstha
                  </div>
                </div>
              </div>
              <div className="text-right">
                <span className="bg-blue-800 text-white font-extrabold text-[8px] uppercase px-2 py-0.5 rounded shadow-sm">
                  {activeRole === 'faculty' ? 'Faculty / Staff' : 'Student Identity'}
                </span>
                <div className="text-[7.5px] font-mono text-gray-600 font-semibold mt-0.5">
                  {regNo || (activeRole === 'faculty' ? 'FAC-PCE-402' : '21BCE1042')}
                </div>
              </div>
            </div>

            {/* Main 2-Column Section */}
            <div className="flex-1 flex items-center justify-between gap-3">
              {/* Left Column: Details & Coordinates */}
              <div className="flex-1 text-[10px] space-y-1 text-gray-800 leading-snug">
                <div>
                  <span className="font-bold text-gray-500 text-[9px] uppercase">Name:</span>{' '}
                  <span className="font-black text-black uppercase">{name || (activeRole === 'faculty' ? 'FACULTY MEMBER' : 'STUDENT CANDIDATE')}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-500 text-[9px] uppercase">{activeRole === 'faculty' ? 'Employee ID:' : 'Roll / Reg No:'}</span>{' '}
                  <span className="font-mono font-bold text-blue-800">{regNo || (activeRole === 'faculty' ? 'FAC-PCE-402' : '21BCE1042')}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-500 text-[9px] uppercase">{activeRole === 'faculty' ? 'Designation:' : 'Course:'}</span>{' '}
                  <span className="font-bold text-black uppercase">
                    {program || (activeRole === 'faculty' ? 'Professor & HOD' : 'B.Tech')} - {branch || (activeRole === 'faculty' ? 'Computer Science' : 'Computer Science')}
                  </span>
                </div>
                <div className="flex gap-4">
                  <div>
                    <span className="font-bold text-gray-500 text-[9px] uppercase">Blood Group:</span>{' '}
                    <span className="font-bold text-red-600">{bloodGroup || 'O+'}</span>
                  </div>
                  <div>
                    <span className="font-bold text-gray-500 text-[9px] uppercase">{activeRole === 'faculty' ? 'Tenure:' : 'Session:'}</span>{' '}
                    <span className="font-semibold text-gray-700">{year || (activeRole === 'faculty' ? '2024 - 2029' : '2024 - 2028')}</span>
                  </div>
                </div>
                <div className="text-[7.5px] text-gray-600 pt-1 border-t border-gray-100 leading-tight">
                  <strong>Campus:</strong> Near CRPF Campus, Hingna Road, Digdoh Hills, Nagpur - 440019
                  <br />
                  <strong>Helpline:</strong> +91-7104-244307 &bull; <strong>Email:</strong> principal.pce@ltjss.net
                </div>
              </div>

              {/* Right Column: Verified PCE Portal QR Code */}
              <div className="w-[145px] flex flex-col items-center justify-center p-2 bg-blue-50/70 rounded-xl border border-blue-200 text-center shrink-0">
                <div className="bg-white p-1.5 rounded-lg border border-blue-300 shadow-sm">
                  <QRCodeSVG
                    value={activeQrUrl}
                    size={72}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <div className="text-[8px] font-black uppercase text-blue-900 mt-1 leading-tight">
                  {qrDestination === 'website'
                    ? 'PCE MAIN WEBSITE'
                    : activeRole === 'faculty' ? 'PCE MIS FACULTY' : 'PCE STUDENT MIS'}
                </div>
                <div className="text-[6.5px] font-mono text-gray-600 truncate max-w-full">
                  {qrDestination === 'website' ? 'pcenagpur.edu.in' : 'm-mis.pcenagpur.edu.in'}
                </div>
                <div className="text-[6px] text-gray-500 mt-0.5">
                  {qrDestination === 'website' ? 'Scan for Campus Information' : 'Scan for Student Attendance & ERP'}
                </div>
                <div className="mt-1 flex items-center justify-center gap-1 w-full">
                  <a
                    href={targetPortalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[7.5px] font-bold text-white bg-blue-800 hover:bg-blue-900 px-1.5 py-0.5 rounded shadow-sm flex items-center gap-0.5 transition-colors"
                    title="Open official PCE Student Login Portal"
                  >
                    <span>MIS Login</span>
                    <span>↗</span>
                  </a>
                  <a
                    href={portalInfo.mainWebsiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[7.5px] font-bold text-blue-900 bg-white border border-blue-300 hover:bg-blue-50 px-1.5 py-0.5 rounded shadow-sm flex items-center gap-0.5 transition-colors"
                    title="Open official PCE Nagpur Main Website"
                  >
                    <span>Website</span>
                    <span>↗</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Bottom Barcode */}
            <div className="mt-1 pt-1 border-t border-gray-200 flex justify-between items-center text-[7px] text-gray-500">
              <span>If found, please return to PCE Nagpur Administrative Office.</span>
              <span className="font-mono text-[7.5px] tracking-widest text-black font-semibold">|||| | | ||||| || | |||| ||</span>
            </div>
          </div>
        );

      case 'vit':
        return (
          <div className="w-full h-full bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border-2 border-blue-900 text-black p-3.5 select-text">
            {/* Top Header */}
            <div className="text-center border-b-2 border-blue-900 pb-2 mb-2 flex flex-col items-center">
              <div className="flex items-center justify-center mb-0.5">
                <img src="/logos/media_1790370323960.png" className="h-9 object-contain mr-2" alt="VIT Logo" />
                <div className="text-left">
                  <div className="text-blue-900 font-black text-[12px] uppercase tracking-tight leading-none">Vellore Institute</div>
                  <div className="text-blue-900 font-black text-[10px] uppercase tracking-tight leading-none">Of Technology</div>
                </div>
              </div>
              <div className="text-[7.5px] font-extrabold text-blue-900 tracking-wider uppercase">
                CHENNAI CAMPUS &bull; {activeRole === 'faculty' ? 'VTOP FACULTY CREDENTIAL' : 'VTOP STUDENT CREDENTIAL'}
              </div>
            </div>

            {/* Center VTOP QR Code */}
            <div className="flex flex-col items-center justify-center p-2 bg-blue-50/60 rounded-xl border border-blue-200 my-1 text-center">
              <div className="bg-white p-1.5 rounded-lg border border-blue-300 shadow-sm mb-1">
                <QRCodeSVG
                  value={activeQrUrl}
                  size={72}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div className="text-[8.5px] font-black uppercase text-blue-900 leading-tight">
                {qrDestination === 'website'
                  ? 'VIT CHENNAI WEBSITE'
                  : activeRole === 'faculty' ? 'VTOP FACULTY PORTAL' : 'VTOP STUDENT PORTAL'}
              </div>
              <div className="text-[7px] font-mono text-gray-600 mb-0.5">
                {qrDestination === 'website' ? 'chennai.vit.ac.in' : 'vtop.vit.ac.in'}
              </div>
              <div className="text-[6px] text-gray-500 mb-1">
                {qrDestination === 'website' ? 'Scan for Campus Information' : 'Scan for Student Course Registration & Attendance'}
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                <a
                  href={targetPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[7.5px] font-bold text-white bg-blue-900 hover:bg-blue-950 px-2 py-0.5 rounded shadow-sm flex items-center gap-0.5 transition-colors"
                  title="Open official VIT VTOP Student Portal"
                >
                  <span>VTOP Login</span>
                  <span>↗</span>
                </a>
                <a
                  href={portalInfo.mainWebsiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[7.5px] font-bold text-blue-900 bg-white border border-blue-300 hover:bg-blue-50 px-2 py-0.5 rounded shadow-sm flex items-center gap-0.5 transition-colors"
                  title="Open official VIT Chennai Website"
                >
                  <span>VIT Website</span>
                  <span>↗</span>
                </a>
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 text-[9.5px] space-y-1 text-gray-800 pt-1.5 border-t border-gray-100">
              <div>
                <span className="font-bold text-gray-500">Name:</span>{' '}
                <span className="font-extrabold text-black uppercase">{name || (activeRole === 'faculty' ? 'Faculty Member' : 'Student Candidate')}</span>
              </div>
              <div>
                <span className="font-bold text-gray-500">{activeRole === 'faculty' ? 'Emp ID:' : 'Reg. No:'}</span>{' '}
                <span className="font-mono font-bold text-blue-900">{regNo || (activeRole === 'faculty' ? 'FAC-VIT-108' : '21BCE0001')}</span>
              </div>
              <div>
                <span className="font-bold text-gray-500">{activeRole === 'faculty' ? 'Designation:' : 'Program:'}</span>{' '}
                {program || (activeRole === 'faculty' ? 'Professor & Dean' : 'B.Tech')} - {branch || (activeRole === 'faculty' ? 'CSE' : 'Computer Science')}
              </div>
              <div>
                <span className="font-bold text-gray-500">{activeRole === 'faculty' ? 'Tenure:' : 'Validity:'}</span> {year || (activeRole === 'faculty' ? '2024 - 2029' : '2024 - 2028')}
              </div>
            </div>

            <div className="mt-auto pt-1.5 border-t border-gray-200 text-center">
              <div className="text-[6.5px] text-gray-500">{activeRole === 'faculty' ? 'Dean Office: +91-44-3993 1555 • faculty@vit.ac.in' : 'Student Welfare: +91-44-3993 1555 • chennai.studentwelfare@vit.ac.in'}</div>
              <div className="font-mono text-[7px] tracking-widest text-black font-semibold mt-0.5">|||| | | ||||| || | |||| ||</div>
            </div>
          </div>
        );

      case 'vvit':
        return (
          <div className="w-full h-full bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border-2 border-red-500 text-black p-3.5 select-text">
            {/* Top Red Header */}
            <div className="bg-[#e04545] text-white -mx-3.5 -mt-3.5 p-2 text-center mb-2">
              <div className="font-black text-[11px] uppercase tracking-wider">Vasireddy Venkatadri Institute of Technology</div>
              <div className="text-[7.5px] font-bold text-red-100">
                AUTONOMOUS &bull; NAMBUR, GUNTUR &bull; {activeRole === 'faculty' ? 'FACULTY & STAFF' : 'STUDENT PASS'}
              </div>
            </div>

            {/* Center VVIT ECAP QR Code */}
            <div className="flex flex-col items-center justify-center p-2 bg-red-50/60 rounded-xl border border-red-200 my-1 text-center">
              <div className="bg-white p-1.5 rounded-lg border border-red-300 shadow-sm mb-1">
                <QRCodeSVG
                  value={activeQrUrl}
                  size={72}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div className="text-[8.5px] font-black uppercase text-red-700 leading-tight">
                {qrDestination === 'website'
                  ? 'VVIT MAIN CAMPUS'
                  : activeRole === 'faculty' ? 'VVIT OFFICIAL PORTAL' : 'VVIT ECAP STUDENT PORTAL'}
              </div>
              <div className="text-[7px] font-mono text-gray-600 mb-0.5">
                {qrDestination === 'website' ? 'www.vvitguntur.com' : 'vvitguntur.com/student-login'}
              </div>
              <div className="text-[6px] text-gray-500 mb-1">
                {qrDestination === 'website' ? 'Scan for Campus Information' : 'Scan for Student ECAP Login & Attendance'}
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                <a
                  href={targetPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[7.5px] font-bold text-white bg-red-600 hover:bg-red-700 px-2 py-0.5 rounded shadow-sm flex items-center gap-0.5 transition-colors"
                  title="Open official VVIT Student Login"
                >
                  <span>ECAP Login</span>
                  <span>↗</span>
                </a>
                <a
                  href={portalInfo.mainWebsiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[7.5px] font-bold text-red-700 bg-white border border-red-300 hover:bg-red-50 px-2 py-0.5 rounded shadow-sm flex items-center gap-0.5 transition-colors"
                  title="Open official VVIT Main Website"
                >
                  <span>Main Website</span>
                  <span>↗</span>
                </a>
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 text-[9.5px] space-y-1 text-gray-800 pt-1.5 border-t border-gray-100">
              <div>
                <span className="font-bold text-gray-500">Name:</span>{' '}
                <span className="font-extrabold text-black uppercase">{name || (activeRole === 'faculty' ? 'FACULTY MEMBER' : 'STUDENT CANDIDATE')}</span>
              </div>
              <div>
                <span className="font-bold text-gray-500">{activeRole === 'faculty' ? 'Emp ID:' : 'Roll No:'}</span>{' '}
                <span className="font-mono font-bold text-red-700">{regNo || (activeRole === 'faculty' ? 'FAC-VVIT-204' : '21BQ1A4237')}</span>
              </div>
              <div>
                <span className="font-bold text-gray-500">{activeRole === 'faculty' ? 'Designation:' : 'Course:'}</span>{' '}
                {program || (activeRole === 'faculty' ? 'Professor & HOD' : 'B.Tech')} - {branch || (activeRole === 'faculty' ? 'CSE & AI' : 'CSE')}
              </div>
              <div>
                <span className="font-bold text-gray-500">{activeRole === 'faculty' ? 'Tenure:' : 'Validity:'}</span> {year || (activeRole === 'faculty' ? '2024 - 2029' : '2021 - 2025')}
              </div>
            </div>

            <div className="mt-auto pt-1.5 border-t border-gray-200 text-center">
              <div className="text-[6.5px] text-gray-500">Campus: Nambur, Guntur, AP - 522508 &bull; Ph: +91-863-2293336</div>
              <div className="font-mono text-[7px] tracking-widest text-black font-semibold mt-0.5">|||| | | ||||| || | |||| ||</div>
            </div>
          </div>
        );

      case 'du':
        return (
          <div className="w-full h-full bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border-2 border-[#1e3a8a] text-black p-3.5 select-text">
            {/* Top DU Header */}
            <div className="flex items-center justify-between border-b-2 border-[#1e3a8a] pb-2 mb-2">
              <div className="flex items-center">
                <img src="/logos/media_1790370363965.png" className="h-10 object-contain mr-2" alt="DU Logo" />
                <div className="text-left leading-none">
                  <div className="text-[11px] font-black text-[#1e3a8a] uppercase">University of Delhi</div>
                  <div className="text-[7.5px] font-bold text-gray-600">
                    SAMARTH {activeRole === 'faculty' ? 'FACULTY & STAFF LIFECYCLE' : 'STUDENT LIFECYCLE (SLC)'}
                  </div>
                </div>
              </div>
              <span className="bg-[#1e3a8a] text-white text-[7.5px] font-black px-1.5 py-0.5 rounded">
                ESTD 1922
              </span>
            </div>

            {/* Center Samarth QR Code */}
            <div className="flex flex-col items-center justify-center p-2 bg-blue-50/60 rounded-xl border border-blue-200 my-1 text-center">
              <div className="bg-white p-1.5 rounded-lg border border-blue-300 shadow-sm mb-1">
                <QRCodeSVG
                  value={activeQrUrl}
                  size={72}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div className="text-[8.5px] font-black uppercase text-[#1e3a8a] leading-tight">
                {qrDestination === 'website'
                  ? 'DU OFFICIAL PORTAL'
                  : activeRole === 'faculty' ? 'DU SAMARTH FACULTY PORTAL' : 'DU SAMARTH STUDENT PORTAL'}
              </div>
              <div className="text-[7px] font-mono text-gray-600 mb-0.5">
                {qrDestination === 'website' ? 'www.du.ac.in' : (activeRole === 'faculty' ? 'du.samarth.ac.in' : 'slc.uod.ac.in')}
              </div>
              <div className="text-[6px] text-gray-500 mb-1">
                {qrDestination === 'website' ? 'Scan for Delhi University Home' : 'Scan for Student Samarth Login & Results'}
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                <a
                  href={targetPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[7.5px] font-bold text-white bg-[#1e3a8a] hover:bg-blue-900 px-2 py-0.5 rounded shadow-sm flex items-center gap-0.5 transition-colors"
                  title="Open official DU Samarth Portal"
                >
                  <span>Samarth Login</span>
                  <span>↗</span>
                </a>
                <a
                  href={portalInfo.mainWebsiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[7.5px] font-bold text-[#1e3a8a] bg-white border border-blue-300 hover:bg-blue-50 px-2 py-0.5 rounded shadow-sm flex items-center gap-0.5 transition-colors"
                  title="Open official DU Website"
                >
                  <span>DU Website</span>
                  <span>↗</span>
                </a>
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 text-[9.5px] space-y-1 text-gray-800 pt-1.5 border-t border-gray-100">
              <div>
                <span className="font-bold text-gray-500">Name:</span>{' '}
                <span className="font-extrabold text-black uppercase">{name || (activeRole === 'faculty' ? 'FACULTY MEMBER' : 'STUDENT CANDIDATE')}</span>
              </div>
              <div>
                <span className="font-bold text-gray-500">{activeRole === 'faculty' ? 'Faculty ID:' : 'Roll No:'}</span>{' '}
                <span className="font-mono font-bold text-[#1e3a8a]">{regNo || (activeRole === 'faculty' ? 'FAC-DU-101' : '24DU101')}</span>
              </div>
              <div>
                <span className="font-bold text-gray-500">{activeRole === 'faculty' ? 'Designation:' : 'Course:'}</span>{' '}
                {program || (activeRole === 'faculty' ? 'Professor & Dean' : 'B.Sc (Hons)')} - {branch || (activeRole === 'faculty' ? 'Computer Science' : 'CS')}
              </div>
              <div>
                <span className="font-bold text-gray-500">{activeRole === 'faculty' ? 'Tenure:' : 'Tenure:'}</span> {year || (activeRole === 'faculty' ? '2024 - 2029' : '2024 - 2028')}
              </div>
            </div>

            <div className="mt-auto pt-1.5 border-t border-gray-200 text-center">
              <div className="text-[6.5px] text-gray-500">University Enclave, Delhi - 110007 &bull; Ph: +91-11-27006900</div>
              <div className="font-mono text-[7px] tracking-widest text-black font-semibold mt-0.5">|||| | | ||||| || | |||| ||</div>
            </div>
          </div>
        );

      case 'vignan':
        return (
          <div className="w-full h-full bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border-2 border-[#2b3a67] text-black p-3.5 select-text">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-[#2b3a67] pb-2 mb-2">
              <div className="flex items-center">
                <img src="/logos/media_1790370292327.png" className="h-10 object-contain mr-2" alt="Vignan Logo" />
                <div className="text-left leading-none">
                  <div className="text-[#2b3a67] font-black text-[11px] uppercase">Vignan's Foundation</div>
                  <div className="text-[#2b3a67] font-bold text-[8.5px] uppercase">For Science, Tech & Research</div>
                </div>
              </div>
              <span className="bg-[#2b3a67] text-white text-[7.5px] font-black px-2 py-0.5 rounded">
                {activeRole === 'faculty' ? 'FACULTY & STAFF' : 'DEEMED UNIV'}
              </span>
            </div>

            {/* 2-Column */}
            <div className="flex-1 flex items-center justify-between gap-3">
              <div className="flex-1 text-[10px] space-y-1 text-gray-800">
                <div>
                  <span className="font-bold text-gray-500 text-[9px] uppercase">Name:</span>{' '}
                  <span className="font-black text-black uppercase">{name || (activeRole === 'faculty' ? 'FACULTY MEMBER' : 'STUDENT CANDIDATE')}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-500 text-[9px] uppercase">{activeRole === 'faculty' ? 'Emp ID:' : 'Reg No:'}</span>{' '}
                  <span className="font-mono font-bold text-[#2b3a67]">{regNo || (activeRole === 'faculty' ? 'FAC-VFSTR-01' : '22VFSTR01')}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-500 text-[9px] uppercase">{activeRole === 'faculty' ? 'Designation:' : 'Course:'}</span>{' '}
                  <span className="font-semibold">{program || (activeRole === 'faculty' ? 'Professor & HOD' : 'B.Tech')} - {branch || (activeRole === 'faculty' ? 'CSE' : 'IT')}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-500 text-[9px] uppercase">{activeRole === 'faculty' ? 'Tenure:' : 'Tenure:'}</span>{' '}
                  <span className="font-medium text-gray-700">{year || (activeRole === 'faculty' ? '2024 - 2029' : '2022 - 2026')}</span>
                </div>
                <div className="text-[7.5px] text-gray-600 pt-1 border-t border-gray-100">
                  Campus: Vadlamudi, Guntur - 522213 &bull; info@vignan.ac.in
                </div>
              </div>

              {/* VFSTR ERP QR Code */}
              <div className="w-[145px] flex flex-col items-center justify-center p-2 bg-indigo-50/60 rounded-xl border border-indigo-200 text-center shrink-0">
                <div className="bg-white p-1.5 rounded-lg border border-indigo-300 shadow-sm">
                  <QRCodeSVG
                    value={activeQrUrl}
                    size={72}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <div className="text-[8px] font-black uppercase text-[#2b3a67] mt-1 leading-tight">
                  {qrDestination === 'website'
                    ? 'VFSTR MAIN WEBSITE'
                    : activeRole === 'faculty' ? 'VFSTR FACULTY ERP' : 'VFSTR STUDENT ERP'}
                </div>
                <div className="text-[6.5px] font-mono text-gray-600 truncate max-w-full">
                  {qrDestination === 'website' ? 'vignan.ac.in' : 'erp.vignan.ac.in'}
                </div>
                <div className="text-[6px] text-gray-500 mt-0.5">
                  {qrDestination === 'website' ? 'Scan for Campus Information' : 'Scan for Student ERP Login'}
                </div>
                <div className="mt-1 flex items-center justify-center gap-1 w-full">
                  <a
                    href={targetPortalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[7.5px] font-bold text-white bg-[#2b3a67] hover:bg-indigo-900 px-1.5 py-0.5 rounded shadow-sm flex items-center gap-0.5 transition-colors"
                    title="Open official VFSTR ERP Student Portal"
                  >
                    <span>ERP Login</span>
                    <span>↗</span>
                  </a>
                  <a
                    href={portalInfo.mainWebsiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[7.5px] font-bold text-[#2b3a67] bg-white border border-indigo-300 hover:bg-indigo-50 px-1.5 py-0.5 rounded shadow-sm flex items-center gap-0.5 transition-colors"
                    title="Open official Vignan Main Website"
                  >
                    <span>Website</span>
                    <span>↗</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-1 pt-1 border-t border-gray-200 flex justify-between items-center text-[7px] text-gray-500">
              <span>Property of VFSTR. Return to Dean Office if lost.</span>
              <span className="font-mono text-[7.5px] tracking-widest text-black font-semibold">|||| | | ||||| || | |||| ||</span>
            </div>
          </div>
        );

      case 'jntua':
        return (
          <div className="w-full h-full bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border-2 border-blue-900 text-black p-3.5 select-text">
            {/* Header */}
            <div className="text-center border-b-2 border-blue-900 pb-2 mb-2 flex flex-col items-center">
              <img src="/logos/media_1790370340103.png" className="h-10 object-contain mb-0.5" alt="JNTUA Logo" />
              <div className="text-[9px] font-black text-black uppercase tracking-wide">Jawaharlal Nehru Technological University</div>
              <div className="text-[7.5px] font-extrabold text-blue-900 tracking-widest">
                ANANTAPUR &bull; {activeRole === 'faculty' ? 'FACULTY & VALUATION SERVICES' : 'EXAM SERVICES'}
              </div>
            </div>

            {/* JNTUA Portal QR Code */}
            <div className="flex flex-col items-center justify-center p-2 bg-blue-50/60 rounded-xl border border-blue-200 my-1 text-center">
              <div className="bg-white p-1.5 rounded-lg border border-blue-300 shadow-sm mb-1">
                <QRCodeSVG
                  value={activeQrUrl}
                  size={72}
                  level="M"
                  includeMargin={false}
                />
              </div>
              <div className="text-[8.5px] font-black uppercase text-blue-900 leading-tight">
                {qrDestination === 'website'
                  ? 'JNTUA MAIN WEBSITE'
                  : activeRole === 'faculty' ? 'JNTUA FACULTY RESULTS' : 'JNTUA STUDENT EXAM PORTAL'}
              </div>
              <div className="text-[7px] font-mono text-gray-600 mb-0.5">
                {qrDestination === 'website' ? 'jntua.ac.in' : (activeRole === 'faculty' ? 'jntuaresults.ac.in' : 'jntuastudentportal.ac.in')}
              </div>
              <div className="text-[6px] text-gray-500 mb-1">
                {qrDestination === 'website' ? 'Scan for Main University Home' : 'Scan for Student Hall Tickets, Marks Memos & Timetables'}
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                <a
                  href={targetPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[7.5px] font-bold text-white bg-blue-900 hover:bg-blue-950 px-2 py-0.5 rounded shadow-sm flex items-center gap-0.5 transition-colors"
                  title="Open official JNTUA Student Exam Portal"
                >
                  <span>Student Portal</span>
                  <span>↗</span>
                </a>
                <a
                  href={portalInfo.mainWebsiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[7.5px] font-bold text-blue-900 bg-white border border-blue-300 hover:bg-blue-50 px-2 py-0.5 rounded shadow-sm flex items-center gap-0.5 transition-colors"
                  title="Open official JNTUA Main Website"
                >
                  <span>Main Website</span>
                  <span>↗</span>
                </a>
              </div>
            </div>

            {/* Details */}
            <div className="flex-1 text-[9.5px] space-y-1 text-gray-800 pt-1.5 border-t border-gray-100">
              <div>
                <span className="font-bold text-gray-500">Name:</span>{' '}
                <span className="font-extrabold text-black uppercase">{name || (activeRole === 'faculty' ? 'Faculty Member' : 'Student Candidate')}</span>
              </div>
              <div>
                <span className="font-bold text-gray-500">{activeRole === 'faculty' ? 'Emp ID:' : 'Hall Ticket No:'}</span>{' '}
                <span className="font-mono font-bold text-blue-900">{regNo || (activeRole === 'faculty' ? 'FAC-JNTUA-102' : 'REG NUMBER')}</span>
              </div>
              <div>
                <span className="font-bold text-gray-500">{activeRole === 'faculty' ? 'Designation:' : 'Program:'}</span>{' '}
                {program || (activeRole === 'faculty' ? 'Professor & HOD' : 'B.Tech')} - {branch || (activeRole === 'faculty' ? 'CSE' : 'Branch')}
              </div>
              <div>
                <span className="font-bold text-gray-500">{activeRole === 'faculty' ? 'Tenure:' : 'Validity:'}</span> {year || (activeRole === 'faculty' ? '2024 - 2029' : '2024 - 2028')}
              </div>
            </div>

            <div className="mt-auto pt-1.5 border-t border-gray-200 text-center">
              <div className="text-[6.5px] text-gray-500">Support: +91-8554-272433 &bull; support@jntua.ac.in</div>
              <div className="font-mono text-[7px] tracking-widest text-black font-semibold mt-0.5">|||| | | ||||| || | |||| ||</div>
            </div>
          </div>
        );

      default:
        return (
          <div className="w-full h-full bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-gray-300 text-black p-4 select-text">
            <div className="flex justify-between items-center border-b border-gray-200 pb-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-900">
                  {college || (activeRole === 'faculty' ? 'CAMPUS FACULTY PASS' : 'UNIVERSAL CAMPUS PASS')}
                </span>
              </div>
              <span className="text-[9px] font-mono text-gray-500 font-semibold">{regNo || (activeRole === 'faculty' ? 'FAC-402' : 'ID-XXXX')}</span>
            </div>

            <div className="flex-1 flex items-center justify-between gap-4">
              <div className="flex-1 text-[11px] space-y-1 text-gray-800">
                <div>
                  <span className="font-bold text-gray-500 text-[10px] uppercase">Name:</span>{' '}
                  <span className="font-extrabold text-black uppercase">{name || (activeRole === 'faculty' ? 'Faculty Member' : 'Student Candidate')}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-500 text-[10px] uppercase">{activeRole === 'faculty' ? 'Employee ID:' : 'ID / Roll No:'}</span>{' '}
                  <span className="font-mono font-bold text-blue-800">{regNo || (activeRole === 'faculty' ? 'FAC-402' : 'REG NUMBER')}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-500 text-[10px] uppercase">{activeRole === 'faculty' ? 'Designation:' : 'Program:'}</span>{' '}
                  <span>{program || (activeRole === 'faculty' ? 'Professor' : 'Program')}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-500 text-[10px] uppercase">{activeRole === 'faculty' ? 'Department:' : 'Branch:'}</span>{' '}
                  <span>{branch || (activeRole === 'faculty' ? 'Department' : 'Branch')}</span>
                </div>
                <div>
                  <span className="font-bold text-gray-500 text-[10px] uppercase">{activeRole === 'faculty' ? 'Tenure:' : 'Session:'}</span>{' '}
                  <span>{year || (activeRole === 'faculty' ? '2024 - 2029' : '2024 - 2028')}</span>
                </div>
                <div className="text-[8px] text-gray-500 pt-1 leading-tight border-t border-gray-100">
                  Helpline: {portalInfo.helpline} &bull; Email: {portalInfo.contactEmail}
                </div>
              </div>

              {/* QR Code */}
              <div className="w-[145px] flex flex-col items-center justify-center p-2.5 bg-gray-50 rounded-xl border border-gray-200 shrink-0 text-center">
                <div className="bg-white p-1.5 rounded-lg border border-gray-300 shadow-sm">
                  <QRCodeSVG
                    value={activeQrUrl}
                    size={72}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <div className="text-[8.5px] font-black uppercase text-blue-900 mt-1.5 truncate max-w-full">
                  {qrDestination === 'website' ? `${portalInfo.shortName} Website` : portalInfo.portalName}
                </div>
                <div className="text-[7px] font-mono text-gray-500 truncate max-w-full">
                  {portalInfo.domain}
                </div>
                <div className="flex items-center justify-center gap-1 mt-1.5">
                  <a
                    href={targetPortalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[7.5px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-1.5 py-0.5 rounded shadow-sm flex items-center gap-0.5 transition-colors"
                    title={`Open official ${portalInfo.portalName}`}
                  >
                    <span>Portal</span>
                    <span>↗</span>
                  </a>
                  <a
                    href={portalInfo.mainWebsiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[7.5px] font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 px-1.5 py-0.5 rounded shadow-sm flex items-center gap-0.5 transition-colors"
                    title={`Open official ${portalInfo.name} Website`}
                  >
                    <span>Website</span>
                    <span>↗</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-2 pt-1.5 border-t border-gray-200 flex justify-between items-center text-[7px] text-gray-500">
              <span>Property of {portalInfo.name}. Return if lost.</span>
              <span className="font-mono text-[8px] tracking-widest text-black font-semibold">|||| | | ||||| || | |||| ||</span>
            </div>
          </div>
        );
    }
  };

  const isCardHorizontal = templateKey === 'vignan' || templateKey === 'priyadarshini' || templateKey === 'default';

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans selection:bg-white/20">
      {/* Header with 3 Dashboard Logins Switcher */}
      <header className="border-b border-white/10 bg-[#0A0A0C]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-3 cursor-pointer group">
              <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center bg-black group-hover:border-white transition-colors duration-300">
                <div className="w-3 h-3 bg-white rounded-full transition-transform duration-300 group-hover:scale-110"></div>
              </div>
              <span className="text-sm font-semibold tracking-[0.2em] uppercase">IDStream</span>
            </Link>

            {/* Isolated Role Portal Badges (Student and Faculty Cannot Cross-Navigate) */}
            {sessionRole === 'student' && (
              <div className="hidden md:flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-blue-950/60 to-black rounded-xl border border-blue-500/30 text-xs shadow-inner">
                <span className="text-base">🎓</span>
                <span className="font-bold text-white tracking-wide">Student Portal</span>
                <span className="text-white/30">•</span>
                <span className="text-blue-300 font-semibold">{portalInfo.shortName}</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-200 px-2 py-0.5 rounded-full border border-blue-400/30 font-mono">
                  Verified Student
                </span>
              </div>
            )}
            {sessionRole === 'faculty' && (
              <div className="hidden md:flex items-center gap-2.5 px-4 py-2 bg-gradient-to-r from-purple-950/60 to-black rounded-xl border border-purple-500/30 text-xs shadow-inner">
                <span className="text-base">👨‍🏫</span>
                <span className="font-bold text-white tracking-wide">Faculty Portal</span>
                <span className="text-white/30">•</span>
                <span className="text-purple-300 font-semibold">{portalInfo.shortName}</span>
                <span className="text-[10px] bg-purple-500/20 text-purple-200 px-2 py-0.5 rounded-full border border-purple-400/30 font-mono">
                  Verified Faculty
                </span>
              </div>
            )}
            {sessionRole === 'security' && (
              <div className="hidden md:flex items-center gap-2.5 px-4 py-2 bg-amber-950/40 rounded-xl border border-amber-500/40 text-xs shadow-inner">
                <span className="text-base">🛡️</span>
                <span className="font-bold text-amber-300 tracking-wide">Campus Security Post</span>
                <span className="text-white/30">•</span>
                <span className="text-[10px] bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded-full border border-amber-400/40 font-mono">
                  Chief Security Officer
                </span>
              </div>
            )}
          </div>

          {/* Profile / Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsGoogleConfigOpen(true)}
              title="Google Cloud OAuth 2.0 Security Settings"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white transition-colors flex items-center gap-1.5 text-xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
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
              <span className="hidden md:inline font-mono text-[10px] text-white/50">OAuth 2.0</span>
            </button>

            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-white capitalize flex items-center justify-end gap-1">
                {authUser?.name ? authUser.name.split(' ')[0] : `${activeRole} Session`}
                {authUser?.provider === 'google' && (
                  <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1 py-0.2 rounded border border-blue-400/30">Google</span>
                )}
                {authUser?.provider === 'institutional' && (
                  <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-400/30 font-mono">Institutional ID</span>
                )}
              </div>
              <div className="text-[10px] text-emerald-400 font-mono flex items-center justify-end gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                {authUser?.provider === 'google'
                  ? 'Google Cloud OAuth Verified'
                  : authUser?.provider === 'institutional'
                  ? 'PIN & Domain Verified'
                  : 'Authenticated'}
              </div>
            </div>

            <Link
              to="/"
              onClick={() => logoutGoogleSession()}
              className="text-xs font-semibold tracking-widest text-white/50 hover:text-white uppercase transition-colors"
            >
              Sign Out
            </Link>

            <div className="w-10 h-10 rounded-full border border-white/20 overflow-hidden bg-white/5 shrink-0">
              <img
                src={
                  authUser?.picture ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeRole}&backgroundColor=transparent`
                }
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 max-w-[1600px] mx-auto w-full h-[calc(100vh-80px)] overflow-hidden relative">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r border-white/10 bg-[#050505] flex flex-col py-8 px-4 h-full shrink-0">
          <div className="text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase mb-4 px-4">
            {activeRole.toUpperCase()} MENU
          </div>
          <nav className="space-y-2 flex-1">
            {activeRole !== 'security' && (
              <button
                onClick={() => setView('create')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                  view === 'create' ? 'bg-white/10 text-white shadow-sm' : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                </svg>
                {activeRole === 'faculty' ? 'Generate Faculty ID' : 'Generate Student ID'}
              </button>
            )}

            {activeRole === 'security' && (
              <>
                <button
                  onClick={() => setView('gate_scanner')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium cursor-pointer ${
                    view === 'gate_scanner' ? 'bg-white/10 text-white shadow-sm' : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                  </svg>
                  Gate Entry Scanner
                </button>

                <button
                  onClick={() => setView('pin_vault')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium cursor-pointer ${
                    view === 'pin_vault' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm' : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="text-base">🔑</span>
                  <span>Campus PIN Vault (Master)</span>
                </button>
              </>
            )}

            <button
              onClick={() => setView('verify')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                view === 'verify' ? 'bg-white/10 text-white shadow-sm' : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              Verify Credentials
            </button>
          </nav>

          {/* Active Clearance Sidebar Badge (No cross-role switching for Student / Faculty) */}
          <div className="mb-4 pt-4 border-t border-white/10">
            <div className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-2 px-1">Active Clearance</div>
            {sessionRole === 'student' ? (
              <div className="p-3 bg-blue-950/20 border border-blue-500/20 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-blue-300">
                  <span>🎓</span>
                  <span>Student Portal</span>
                </div>
                <div className="text-[11px] text-white/70 truncate">{portalInfo.shortName}</div>
                <div className="text-[9.5px] text-emerald-400 font-mono flex items-center gap-1 pt-1 border-t border-white/5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Faculty & Security Isolated
                </div>
              </div>
            ) : sessionRole === 'faculty' ? (
              <div className="p-3 bg-purple-950/20 border border-purple-500/20 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-purple-300">
                  <span>👨‍🏫</span>
                  <span>Faculty Portal</span>
                </div>
                <div className="text-[11px] text-white/70 truncate">{portalInfo.shortName}</div>
                <div className="text-[9.5px] text-emerald-400 font-mono flex items-center gap-1 pt-1 border-t border-white/5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Student & Security Isolated
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-300">
                  <span>🛡️</span>
                  <span>Security Command</span>
                </div>
                <div className="text-[11px] text-white/70 truncate">Master PIN & Gate Control</div>
              </div>
            )}
          </div>

          <div className="px-4 py-4 bg-white/5 rounded-xl border border-white/10">
            <div className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1">Status</div>
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
              {activeRole === 'security' ? 'Guard Post Active' : 'System Operational'}
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {/* Security Alert Banner when cross-role access is attempted */}
          {roleAccessError && (
            <div className="mx-6 mt-3 p-3.5 rounded-xl bg-red-950/90 border border-red-500/70 text-red-200 text-xs flex items-center justify-between shadow-2xl animate-fade-in z-30 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-base shrink-0">⛔</span>
                <span className="font-semibold">{roleAccessError}</span>
              </div>
              <button
                type="button"
                onClick={() => setRoleAccessError(null)}
                className="px-2.5 py-1 bg-red-900/60 hover:bg-red-800 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* VIEW: CREATE (Student or Faculty ID Generator) */}
          {view === 'create' && (
            <div className="w-full h-full flex flex-1 overflow-hidden">
              {/* Wizard Form Column */}
              <div className="w-[500px] border-r border-white/10 bg-[#0A0A0C] flex flex-col h-full shrink-0 overflow-y-auto">
                <div className="p-8 flex flex-col flex-1">
                  {/* Wizard Step Indicator */}
                  <div className="mb-8">
                    <div className="flex justify-between text-[10px] font-bold tracking-widest text-white/40 uppercase mb-3">
                      <span>Step 0{currentStep} / 04</span>
                      <span>{currentStep * 25}% Completed</span>
                    </div>
                    <div className="relative w-full h-0.5 bg-white/10 rounded-full mb-6">
                      <div
                        className="absolute left-0 top-0 h-full bg-white transition-all duration-300 shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                        style={{ width: `${currentStep * 25}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[9px] font-bold tracking-[0.15em] text-white/30 uppercase">
                      {[
                        { step: 1, label: 'Institution' },
                        { step: 2, label: 'Details' },
                        { step: 3, label: activeRole === 'faculty' ? 'Faculty Info' : 'Academic' },
                        { step: 4, label: 'Generate' },
                      ].map((item) => (
                        <div
                          key={item.step}
                          className={`flex flex-col items-center gap-1.5 cursor-pointer ${
                            item.step <= currentStep ? 'text-white' : 'text-white/30'
                          }`}
                          onClick={() => setCurrentStep(item.step)}
                        >
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] transition-colors ${
                              item.step <= currentStep ? 'border-white bg-white text-black font-bold' : 'border-white/20'
                            }`}
                          >
                            {item.step}
                          </div>
                          <span>{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Step Contents */}
                  <div className="flex-1">
                    {/* Step 1: Locked Institution Template */}
                    {currentStep === 1 && (
                      <div className="bg-white/5 border border-white/10 p-6 rounded-xl space-y-5">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                              <span>🏛️</span>
                              <span>Enrolled Institution</span>
                            </h2>
                            <span className="text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-full flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                              Template Locked
                            </span>
                          </div>
                          <p className="text-xs text-white/50 leading-relaxed">
                            Under institutional credential policy, ID card generation is strictly locked to your verified university. You can switch between certified partner institutions below.
                          </p>
                        </div>

                        {/* Interactive University Template Selector */}
                        <div className="space-y-1.5 p-3.5 bg-black/60 rounded-xl border border-blue-500/30">
                          <label className="text-[10px] font-bold tracking-widest text-blue-300 uppercase block flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <span>🏛️</span>
                              <span>Select / Switch University Card Template</span>
                            </span>
                            <span className="text-emerald-400 font-mono text-[9.5px]">
                              Instant Card Render
                            </span>
                          </label>
                          <select
                            value={selectedCollegeKey}
                            onChange={(e) => {
                              const newKey = e.target.value;
                              const newSpec = COLLEGE_SECURITY_SPECS[newKey];
                              if (newSpec) {
                                setSelectedCollegeKey(newKey);
                                setCollege(newSpec.name);
                                localStorage.setItem('idstream_selected_college', newKey);
                                localStorage.setItem('idstream_college_name', newSpec.name);
                                if (newSpec.rollPlaceholder) {
                                  setRegNo(newSpec.rollPlaceholder.replace('e.g. ', ''));
                                }
                                try {
                                  const raw = localStorage.getItem('idstream_user');
                                  if (raw) {
                                    const u = JSON.parse(raw);
                                    u.collegeKey = newKey;
                                    u.college = newSpec.name;
                                    u.collegeShortName = newSpec.shortName;
                                    localStorage.setItem('idstream_user', JSON.stringify(u));
                                  }
                                } catch {
                                  // ignore
                                }
                              }
                            }}
                            className="w-full bg-[#0a0a10] border border-blue-400/40 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-blue-400 transition-colors font-medium shadow-inner"
                          >
                            {Object.values(COLLEGE_SECURITY_SPECS).map((spec) => (
                              <option key={spec.key} value={spec.key} className="bg-[#111] text-white">
                                {spec.name} ({spec.shortName})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Locked Institution Showcase Card */}
                        <div className="p-4 rounded-xl bg-gradient-to-br from-blue-950/40 via-black to-[#0a101f] border border-blue-500/30 space-y-3.5">
                          <div className="flex items-start gap-3.5">
                            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0 overflow-hidden p-1.5 shadow-inner">
                              {portalInfo.logoUrl ? (
                                <img src={portalInfo.logoUrl} alt={portalInfo.shortName} className="w-full h-full object-contain" />
                              ) : (
                                <span className="text-xl">🎓</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold">
                                Authenticated Institution
                              </div>
                              <div className="text-sm font-bold text-white leading-tight">
                                {portalInfo.name}
                              </div>
                              <div className="text-xs text-white/60 font-medium mt-0.5">
                                {portalInfo.shortName} • {activeRole === 'faculty' ? 'Faculty Portal' : 'Student Portal'}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-[11px]">
                            <div className="bg-black/60 p-2.5 rounded-lg border border-white/5">
                              <div className="text-[9px] text-white/40 uppercase font-bold">Official Portal</div>
                              <div className="font-semibold text-blue-300 truncate">{portalInfo.portalName}</div>
                            </div>
                            <div className="bg-black/60 p-2.5 rounded-lg border border-white/5">
                              <div className="text-[9px] text-white/40 uppercase font-bold">Campus Domain</div>
                              <div className="font-mono text-white/70 truncate">{portalInfo.domain}</div>
                            </div>
                          </div>

                          <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center justify-between">
                            <span className="flex items-center gap-1.5 font-medium">
                              <span>🔒</span>
                              <span>Official {portalInfo.shortName} ID Card Template Active</span>
                            </span>
                            <span className="text-[9.5px] font-mono text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded">
                              Anti-Malpractice Active
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setCurrentStep(2)}
                          className="w-full py-3.5 bg-white hover:bg-gray-200 text-black font-bold text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-[0.99]"
                        >
                          <span>Proceed to Personal Details</span>
                          <span>→</span>
                        </button>
                      </div>
                    )}

                    {/* Step 2: Personal Details */}
                    {currentStep === 2 && (
                      <div className="bg-white/5 border border-white/10 p-6 rounded-xl space-y-4">
                        <div>
                          <h2 className="text-xl font-bold mb-1">
                            {activeRole === 'faculty' ? 'Faculty Details' : 'Student Details'}
                          </h2>
                          <p className="text-xs text-white/40">Enter identity information and photo.</p>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-1.5 block">
                            {activeRole === 'faculty' ? 'Faculty Member Name' : 'Full Name'}
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={activeRole === 'faculty' ? 'e.g. Faculty Member Name' : 'Candidate Full Name'}
                            className="w-full bg-[#050505] border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/30 transition-colors"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-1.5 block">
                            {activeRole === 'faculty' ? 'Employee / Faculty ID' : 'Registration / Roll No.'}
                          </label>
                          <input
                            type="text"
                            value={regNo}
                            onChange={(e) => setRegNo(e.target.value)}
                            placeholder={activeRole === 'faculty' ? 'e.g. FAC-PCE-402' : 'e.g. 21BCE1042'}
                            className="w-full bg-[#050505] border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/30 transition-colors uppercase"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-1.5 block">
                            Photo Upload
                          </label>
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded border border-white/20 bg-[#050505] flex items-center justify-center overflow-hidden shrink-0">
                              {photoUrl ? (
                                <img src={photoUrl} className="w-full h-full object-cover" alt="Identity Thumbnail" />
                              ) : (
                                <svg className="w-6 h-6 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                  />
                                </svg>
                              )}
                            </div>
                            <input
                              type="file"
                              ref={fileInputRef}
                              accept="image/*"
                              onChange={handlePhotoUpload}
                              className="hidden"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-white/10 hover:bg-white/20 border border-white/10 text-xs px-4 py-2.5 rounded transition-colors font-medium"
                              >
                                {photoUrl ? 'Change Photo' : 'Upload Image'}
                              </button>
                              {photoUrl && (
                                <button
                                  type="button"
                                  onClick={() => setPhotoUrl('')}
                                  className="text-white/40 hover:text-red-400 text-xs px-2 py-2.5 transition-colors"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 3: Academic / Faculty Profile */}
                    {currentStep === 3 && (
                      <div className="bg-white/5 border border-white/10 p-6 rounded-xl space-y-4">
                        <div>
                          <h2 className="text-xl font-bold mb-1">
                            {activeRole === 'faculty' ? 'Faculty Credentials' : 'Academic Profile'}
                          </h2>
                          <p className="text-xs text-white/40">
                            {activeRole === 'faculty' ? 'Designation and department.' : 'Course, branch, and validity period.'}
                          </p>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-1.5 block">
                            {activeRole === 'faculty' ? 'Academic Designation' : 'Program / Degree'}
                          </label>
                          <input
                            type="text"
                            value={program}
                            onChange={(e) => setProgram(e.target.value)}
                            placeholder={activeRole === 'faculty' ? 'e.g. Professor & HOD' : 'e.g. B.Tech, B.Sc'}
                            className="w-full bg-[#050505] border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/30 transition-colors"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-1.5 block">
                            {activeRole === 'faculty' ? 'Academic Department' : 'Branch / Major'}
                          </label>
                          <input
                            type="text"
                            value={branch}
                            onChange={(e) => setBranch(e.target.value)}
                            placeholder={activeRole === 'faculty' ? 'e.g. Computer Science & Engg' : 'e.g. Computer Science'}
                            className="w-full bg-[#050505] border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/30 transition-colors"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-1.5 block">
                              Validity / Tenure
                            </label>
                            <input
                              type="text"
                              value={year}
                              onChange={(e) => setYear(e.target.value)}
                              placeholder={activeRole === 'faculty' ? 'e.g. 2024 - 2029' : 'e.g. 2024 - 2028'}
                              className="w-full bg-[#050505] border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/30 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-1.5 block">
                              Blood Group
                            </label>
                            <input
                              type="text"
                              value={bloodGroup}
                              onChange={(e) => setBloodGroup(e.target.value)}
                              placeholder="e.g. O+, B+"
                              className="w-full bg-[#050505] border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/30 transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Step 4: Generate & Export */}
                    {currentStep === 4 && (
                      <div className="bg-white/5 border border-white/10 p-6 rounded-xl flex flex-col items-center justify-center text-center">
                        <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-3 text-emerald-400">
                          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h2 className="text-xl font-bold mb-1">Ready to Generate</h2>
                        <p className="text-xs text-white/40 mb-6 max-w-[280px]">
                          Your {activeRole} ID card details are complete with verified portal QR code.
                        </p>

                        <div className="flex flex-col gap-2.5 w-full max-w-[320px]">
                          {/* 1-Click Master Download All Needed */}
                          <button
                            type="button"
                            onClick={handleDownloadAllNeeded}
                            disabled={downloading}
                            className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-black py-3 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all disabled:opacity-50 text-xs flex items-center justify-center gap-2"
                            title="Download Single Front + Single Back + Double Side-by-Side + 2-Sided PDF in 1 click"
                          >
                            <span>⚡</span> {downloading ? 'Exporting All Formats...' : 'Download All Needed (Single + Double + PDF)'}
                          </button>

                          {/* Single Sided Section */}
                          <div className="pt-2 border-t border-white/10">
                            <div className="text-[9.5px] font-bold text-white/40 uppercase tracking-widest text-left mb-1.5">
                              Single Card Exports
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => handleDownloadPNG('front')}
                                disabled={downloading}
                                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold py-2 rounded-lg transition-colors disabled:opacity-50 text-[11px] flex items-center justify-center gap-1.5"
                                title="Download front identity card only"
                              >
                                <span>📥</span> Single Front
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadPNG('back')}
                                disabled={downloading}
                                className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold py-2 rounded-lg transition-colors disabled:opacity-50 text-[11px] flex items-center justify-center gap-1.5"
                                title="Download back side with portal QR code only"
                              >
                                <span>📱</span> Single Back QR
                              </button>
                            </div>
                          </div>

                          {/* Double Sided Section */}
                          <div className="pt-2 border-t border-white/10">
                            <div className="text-[9.5px] font-bold text-white/40 uppercase tracking-widest text-left mb-1.5">
                              Double-Sided Exports
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={handleDownloadDoubleSidedPNG}
                                disabled={downloading}
                                className="bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-200 font-bold py-2 rounded-lg transition-colors disabled:opacity-50 text-[11px] flex items-center justify-center gap-1.5"
                                title="Download front and back side-by-side in one image"
                              >
                                <span>🖼️</span> Side-by-Side PNG
                              </button>
                              <button
                                type="button"
                                onClick={handleDownloadPDF}
                                disabled={downloading}
                                className="bg-white text-black font-black py-2 rounded-lg hover:bg-gray-200 transition-colors shadow-sm disabled:opacity-50 text-[11px] flex items-center justify-center gap-1.5"
                                title="Download 2-page printable pass PDF (Page 1 Front, Page 2 Back)"
                              >
                                <span>📄</span> 2-Sided PDF
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Navigation Controls */}
                  <div className="mt-6 pt-4 border-t border-white/10 flex justify-between">
                    {currentStep > 1 ? (
                      <button
                        type="button"
                        onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                        className="px-5 py-2 rounded-lg border border-white/10 text-xs font-medium hover:bg-white/5 transition-colors"
                      >
                        Back
                      </button>
                    ) : (
                      <div></div>
                    )}
                    {currentStep < 4 && (
                      <button
                        type="button"
                        onClick={() => setCurrentStep((prev) => Math.min(4, prev + 1))}
                        className="px-6 py-2 rounded-lg bg-white text-black text-xs font-bold hover:bg-gray-200 transition-colors shadow-sm ml-auto"
                      >
                        Next Step
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Live Preview Column with Bulletproof Non-Mirrored 3D Card Flip */}
              <div className="flex-1 bg-[#050505] p-8 flex flex-col overflow-y-auto relative">
                <div className="flex justify-between items-center mb-6 shrink-0">
                  <div>
                    <div className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-1">
                      {isFlipped ? 'Back Face (Portal QR & Details)' : activeRole === 'faculty' ? 'Faculty ID Front Preview' : 'Student Card Front Preview'}
                    </div>
                    <h3 className="text-lg font-bold text-white truncate max-w-[320px]">
                      {activeRole === 'faculty' ? `${portalInfo.shortName} Faculty Pass` : templateNames[templateKey] || 'Universal Collegiate Template'}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsFlipped(!isFlipped)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all text-xs font-bold shadow-sm ${
                        isFlipped
                          ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                          : 'bg-white/10 hover:bg-white/20 border-white/20 text-white'
                      }`}
                    >
                      <svg className={`w-3.5 h-3.5 transition-transform duration-300 ${isFlipped ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {isFlipped ? 'Flip to Front' : 'Flip to Back (QR Code)'}
                    </button>
                  </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center min-h-[480px]">
                  {/* Fixed 3D Card Container with Zero Mirroring Bug */}
                  <div
                    ref={cardRef}
                    id="capture-card"
                    className={`relative cursor-pointer transition-all duration-300 ${
                      isCardHorizontal ? 'w-full max-w-[440px] aspect-[1.586/1]' : 'w-full max-w-[310px] aspect-[1/1.586]'
                    }`}
                    style={{ perspective: 1200 }}
                    onClick={() => setIsFlipped(!isFlipped)}
                    title="Click card to flip"
                  >
                    <div
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '100%',
                        transformStyle: 'preserve-3d',
                        WebkitTransformStyle: 'preserve-3d',
                        transition: 'transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)',
                        transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                      }}
                    >
                      {/* Front Face: Exactly 0deg, completely hidden when card is flipped */}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                          transform: 'rotateY(0deg)',
                          WebkitTransform: 'rotateY(0deg)',
                          opacity: isFlipped ? 0 : 1,
                          visibility: isFlipped ? 'hidden' : 'visible',
                          pointerEvents: isFlipped ? 'none' : 'auto',
                          transition: 'opacity 0.15s ease',
                        }}
                      >
                        <div ref={cardFrontRef} className="w-full h-full">
                          {renderCardFront()}
                        </div>
                      </div>

                      {/* Back Face: Rotated 180deg, facing forward when card flips */}
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg)',
                          WebkitTransform: 'rotateY(180deg)',
                          opacity: isFlipped ? 1 : 0,
                          visibility: isFlipped ? 'visible' : 'hidden',
                          pointerEvents: isFlipped ? 'auto' : 'none',
                          transition: 'opacity 0.15s ease',
                        }}
                      >
                        <div ref={cardBackRef} className="w-full h-full">
                          {renderCardBack()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Export & Actions Strip right below the card */}
                  <div className="mt-5 flex flex-col items-center justify-center gap-2.5 max-w-[620px] w-full">
                    {/* QR Code Target Selector */}
                    <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-xl">
                      <span className="text-[10px] text-white/50 font-bold uppercase tracking-wider px-2">
                        QR Encodes:
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQrDestination('portal');
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          qrDestination === 'portal'
                            ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                        title={`Make QR code scan to official ${portalInfo.portalName}`}
                      >
                        <span>🎓</span>
                        <span>{activeRole === 'faculty' ? 'Faculty Portal' : 'Student Login Portal'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQrDestination('website');
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          qrDestination === 'website'
                            ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                        title={`Make QR code scan to official ${portalInfo.name} Website`}
                      >
                        <span>🏛️</span>
                        <span>Main Campus Website</span>
                      </button>
                    </div>

                    {/* Download Controls Strip */}
                    <div className="flex flex-wrap items-center justify-center gap-2 w-full">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadAllNeeded();
                        }}
                        disabled={downloading}
                        className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black rounded-lg text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50"
                        title="Download Single Front + Single Back + Double Side-by-Side + 2-Sided PDF in 1 click"
                      >
                        <span>⚡</span> Download All Needed
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPNG('front');
                        }}
                        disabled={downloading}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        title="Download front identity card image"
                      >
                        <span>📥</span> Single Front
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPNG('back');
                        }}
                        disabled={downloading}
                        className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        title="Download back side with verified portal QR code"
                      >
                        <span>📱</span> Single Back QR
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadDoubleSidedPNG();
                        }}
                        disabled={downloading}
                        className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 rounded-lg text-xs font-semibold text-purple-300 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        title="Download front and back side-by-side in one image"
                      >
                        <span>🖼️</span> Double Side-by-Side
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPDF();
                        }}
                        disabled={downloading}
                        className="px-3.5 py-1.5 bg-white text-black font-bold rounded-lg text-xs flex items-center gap-1.5 hover:bg-gray-200 transition-colors shadow-sm disabled:opacity-50"
                        title="Download complete two-sided ID card PDF"
                      >
                        <span>📄</span> Double 2-Sided PDF
                      </button>
                    </div>

                    {/* Official Portals Quick Access Strip */}
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <a
                        href={targetPortalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 rounded-lg text-xs font-semibold text-blue-400 flex items-center gap-1.5 transition-colors"
                        title={`Open official ${portalInfo.portalName}`}
                      >
                        <span>🎓</span> {activeRole === 'faculty' ? 'Faculty Portal' : 'Student Login Portal'} ↗
                      </a>
                      <a
                        href={portalInfo.mainWebsiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 rounded-lg text-xs font-semibold text-emerald-400 flex items-center gap-1.5 transition-colors"
                        title={`Open official ${portalInfo.name} Main Website`}
                      >
                        <span>🏛️</span> Main Campus Website ↗
                      </a>
                    </div>

                    {/* Help tip below card */}
                    <div className="mt-1 text-[11px] text-white/40 flex items-center gap-2">
                      <span>💡 Click card to flip</span>
                      <span>&bull;</span>
                      <span>
                        QR Code actively encodes{' '}
                        <strong className="text-white/70">
                          {qrDestination === 'website' ? portalInfo.mainWebsiteUrl : targetPortalUrl}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: SECURITY GATE SCANNER */}
          {view === 'gate_scanner' && (
            <div className="w-full h-full flex flex-col p-8 overflow-y-auto bg-[#050505]">
              <div className="max-w-6xl mx-auto w-full space-y-6">
                {/* Header Stats Strip */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-5">
                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Gate Status</div>
                    <div className="text-xl font-bold text-emerald-400 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      ACTIVE MONITORING
                    </div>
                    <div className="text-xs text-white/40 mt-1">Main Gate Post #01</div>
                  </div>
                  <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-5">
                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Entries Cleared</div>
                    <div className="text-2xl font-black text-white">{gateLogs.filter((l) => l.status === 'GRANTED').length + 42}</div>
                    <div className="text-xs text-emerald-400/80 mt-1">Verified on campus</div>
                  </div>
                  <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-5">
                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Denied / Flagged</div>
                    <div className="text-2xl font-black text-red-400">{gateLogs.filter((l) => l.status === 'DENIED').length}</div>
                    <div className="text-xs text-red-400/80 mt-1">Unregistered attempts</div>
                  </div>
                  <div className="bg-[#0A0A0C] border border-white/10 rounded-xl p-5">
                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Security Officers</div>
                    <div className="text-2xl font-black text-white">4 On Duty</div>
                    <div className="text-xs text-white/40 mt-1">Gate Alpha & Beta</div>
                  </div>
                </div>

                {/* Gate Entry Check Console */}
                <div className="bg-[#0A0A0C] border border-white/10 rounded-2xl p-6 shadow-xl">
                  <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
                    <span>🛡️</span> Security Clearance Scanner
                  </h3>
                  <p className="text-xs text-white/40 mb-4">
                    Scan card barcode, QR code, or enter Roll / Employee ID to grant campus gate access.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={gateCheckInput}
                      onChange={(e) => setGateCheckInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSecurityGateCheck()}
                      placeholder="Enter Student Reg No. or Faculty ID (e.g. 21BCE0001, FAC-VIT-108)"
                      className="flex-1 bg-[#050505] border border-white/10 rounded-xl px-5 py-3.5 text-sm uppercase focus:outline-none focus:border-white/40 text-white transition-colors"
                    />
                    <button
                      type="button"
                      onClick={handleSecurityGateCheck}
                      className="bg-white text-black font-bold px-8 py-3.5 rounded-xl hover:bg-gray-200 transition-colors shadow text-sm shrink-0 flex items-center justify-center gap-2"
                    >
                      Check & Grant Entry
                    </button>
                  </div>

                  {/* Quick Test Demo Chips */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-white/40">
                    <span>Quick Scan Samples:</span>
                    {['21BCE0001', 'FAC-VIT-108', '21BQ1A4237', 'FAC-VVIT-204', '24DU101', 'INVALID-TEST'].map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setGateCheckInput(id);
                        }}
                        className="bg-white/5 border border-white/10 px-2.5 py-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                      >
                        {id}
                      </button>
                    ))}
                  </div>

                  {/* Verification Banner */}
                  {gateCheckResult.status === 'GRANTED' && gateCheckResult.record && (
                    <div className="mt-5 p-5 bg-emerald-950/30 border border-emerald-500/40 rounded-xl flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 text-2xl">
                        ✓
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-emerald-400 font-black text-sm flex items-center gap-2">
                          CAMPUS GATE ACCESS GRANTED
                          <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-2 py-0.5 rounded border border-emerald-500/30 font-bold uppercase">
                            {gateCheckResult.record.role?.toUpperCase() || 'STUDENT'}
                          </span>
                        </div>
                        <div className="text-white font-bold text-base mt-0.5">{gateCheckResult.record.name}</div>
                        <div className="text-xs text-white/60">
                          {gateCheckResult.record.college} &bull; ID: {gateCheckResult.record.regNo.toUpperCase()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-white/40 uppercase">Gate 01</div>
                        <div className="text-xs font-mono text-emerald-400">ENTRY LOGGED</div>
                      </div>
                    </div>
                  )}

                  {gateCheckResult.status === 'DENIED' && (
                    <div className="mt-5 p-5 bg-red-950/30 border border-red-500/40 rounded-xl flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0 text-2xl font-bold">
                        ✕
                      </div>
                      <div>
                        <div className="text-red-400 font-black text-sm">ACCESS RESTRICTED / UNREGISTERED</div>
                        <div className="text-xs text-white/70 mt-0.5">{gateCheckResult.message}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Gate Log Stream */}
                <div className="bg-[#0A0A0C] border border-white/10 rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold tracking-wider uppercase text-white/80">Real-time Gate Access Log</h3>
                    <span className="text-[10px] text-white/40 uppercase font-mono">Live Event Stream</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="text-[10px] uppercase tracking-wider text-white/40 border-b border-white/10">
                        <tr>
                          <th className="py-2.5 px-3">Timestamp</th>
                          <th className="py-2.5 px-3">Credential ID</th>
                          <th className="py-2.5 px-3">Identity Name</th>
                          <th className="py-2.5 px-3">Category</th>
                          <th className="py-2.5 px-3">Gate Station</th>
                          <th className="py-2.5 px-3 text-right">Clearance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {gateLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 px-3 font-mono text-white/50">{log.time}</td>
                            <td className="py-3 px-3 font-bold text-white">{log.idNum}</td>
                            <td className="py-3 px-3 text-white/80">{log.name}</td>
                            <td className="py-3 px-3 text-white/60">{log.role}</td>
                            <td className="py-3 px-3 text-white/40">{log.gate}</td>
                            <td className="py-3 px-3 text-right">
                              <span
                                className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                                  log.status === 'GRANTED'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-red-500/10 text-red-400 border border-red-500/30'
                                }`}
                              >
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: VERIFY CREDENTIALS */}
          {view === 'verify' && (
            <div className="w-full h-full flex items-center justify-center p-8 bg-[#050505]">
              <div className="w-full max-w-lg bg-[#0A0A0C] border border-white/10 rounded-2xl p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute -top-32 -right-32 w-64 h-64 bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none"></div>

                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>

                  <h2 className="text-2xl font-bold mb-2">Verify Credential</h2>
                  <p className="text-sm text-white/40 mb-6">
                    Enter the student registration number or faculty employee ID to check verification status.
                  </p>

                  <div className="flex gap-3 mb-6">
                    <input
                      type="text"
                      value={verifyInput}
                      onChange={(e) => setVerifyInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                      placeholder="e.g. 21BCE1042 or FAC-VIT-108"
                      className="flex-1 bg-[#050505] border border-white/10 rounded-xl px-5 py-3.5 text-sm focus:outline-none focus:border-white/30 transition-colors uppercase"
                    />
                    <button
                      type="button"
                      onClick={handleVerify}
                      disabled={verifyLoading}
                      className="bg-white text-black font-bold px-6 rounded-xl hover:bg-gray-200 transition-colors shadow-sm shrink-0 text-sm"
                    >
                      {verifyLoading ? 'Checking...' : 'Verify'}
                    </button>
                  </div>

                  {/* Quick test badges */}
                  <div className="mb-6 flex flex-wrap items-center gap-1.5 text-[10px] text-white/40">
                    <span>Demo IDs:</span>
                    {['21BCE1042', 'FAC-VIT-108', '21BQ1A4237', 'FAC-VVIT-204', '24DU101'].map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setVerifyInput(id);
                        }}
                        className="underline hover:text-white transition-colors"
                      >
                        {id}
                      </button>
                    ))}
                  </div>

                  {/* Verification Results */}
                  <div className="min-h-[100px] flex flex-col justify-center">
                    {verifyLoading && (
                      <div className="flex justify-center py-4">
                        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      </div>
                    )}

                    {!verifyLoading && verifiedRecord && (
                      <div className="p-5 bg-emerald-900/20 border border-emerald-500/30 rounded-xl flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 border border-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.2)]">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-emerald-400 text-sm flex items-center gap-2">
                            VERIFIED ACTIVE {verifiedRecord.role === 'faculty' ? 'FACULTY' : 'STUDENT'}
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-[9px] border border-emerald-500/30">
                              VALID
                            </span>
                          </div>
                          <div className="text-white font-medium truncate mt-1 text-base">{verifiedRecord.name}</div>
                          <div className="text-xs text-white/60 truncate mt-0.5">
                            {verifiedRecord.college} &bull; ID: {verifiedRecord.regNo.toUpperCase()}
                          </div>
                          <div className="text-[11px] text-white/40 mt-1">
                            {verifiedRecord.program} - {verifiedRecord.branch} ({verifiedRecord.year})
                          </div>
                        </div>
                      </div>
                    )}

                    {!verifyLoading && verifyError && (
                      <div className="p-5 bg-red-900/20 border border-red-500/30 rounded-xl flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 shrink-0 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                        <div>
                          <div className="font-bold text-red-400 text-sm">NOT VERIFIED / NO RECORD</div>
                          <div className="text-xs text-red-400/80 mt-1">{verifyError}</div>
                        </div>
                      </div>
                    )}

                    {!verifyLoading && !verifiedRecord && !verifyError && (
                      <div className="text-center text-xs text-white/30 tracking-wider uppercase font-medium py-4">
                        Ready for input
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: CAMPUS SECURITY MASTER PIN VAULT (EXCLUSIVELY FOR SECURITY OFFICERS) */}
          {view === 'pin_vault' && (
            !isSecurityOfficer ? (
              <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-[#050505] flex items-center justify-center">
                <div className="max-w-lg w-full p-8 bg-[#0C0C10] border border-amber-500/40 rounded-2xl text-center space-y-4 shadow-2xl">
                  <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl">
                    🔒
                  </div>
                  <h2 className="text-xl font-bold text-white uppercase tracking-wider">
                    Classified Security Vault Access
                  </h2>
                  <p className="text-xs text-white/70 leading-relaxed">
                    Access to the Campus Master PIN Vault is restricted to authorized Security Administrator (<strong className="text-amber-300 font-mono">{AUTHORIZED_SECURITY_EMAIL}</strong>). Students and faculty cannot view institutional PIN codes.
                  </p>
                  <div className="pt-2">
                    <Link
                      to="/auth?role=security"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all"
                    >
                      <span>Log In as Security Officer</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
            <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-[#050505]">
              <div className="max-w-6xl mx-auto space-y-8">
                {/* Security Clearance Alert Banner */}
                <div className="p-6 rounded-2xl bg-amber-950/30 border border-amber-500/40 relative overflow-hidden shadow-2xl">
                  <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none text-9xl">
                    🔑
                  </div>
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-mono uppercase tracking-wider mb-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                        CHIEF SECURITY OFFICER • {AUTHORIZED_SECURITY_EMAIL}
                      </div>
                      <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-wide">
                        Campus Security Authorization PIN Vault
                      </h2>
                      <p className="text-white/60 text-xs md:text-sm mt-1 max-w-2xl leading-relaxed">
                        These restricted authorization PIN codes are confidential and only accessible to verified Campus Security personnel. Students and faculty cannot view these codes publicly. Issue PINs directly to verified campus members after physical credentials check.
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-3">
                      <div className="p-3 bg-black/60 rounded-xl border border-white/10 text-center">
                        <span className="text-[10px] text-white/40 uppercase block font-mono">Guarded Campuses</span>
                        <span className="text-xl font-bold font-mono text-emerald-400">6 Active</span>
                      </div>
                      <div className="p-3 bg-black/60 rounded-xl border border-white/10 text-center">
                        <span className="text-[10px] text-white/40 uppercase block font-mono">Vault Protocol</span>
                        <span className="text-xl font-bold font-mono text-amber-300">Enforced</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6 College Master PIN Cards */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold tracking-wider uppercase text-white/80 flex items-center gap-2">
                      <span>🏛️</span>
                      <span>Authorized University Campus PIN Registry</span>
                    </h3>
                    <span className="text-xs text-white/40 font-mono">Confidential • For Security Use Only</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {securityMasterPins.map((spec) => {
                      const isUnmasked = unmaskedPins[spec.collegeKey];
                      const isCopied = copiedPin === spec.collegeKey;

                      return (
                        <div
                          key={spec.collegeKey}
                          className="bg-[#0A0A0C] border border-white/10 hover:border-amber-500/40 rounded-2xl p-5 transition-all shadow-xl flex flex-col justify-between group"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div>
                                <span className="text-[10px] font-mono text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded font-bold uppercase">
                                  {spec.shortName}
                                </span>
                                <h4 className="text-white font-bold text-base mt-1.5 leading-snug">
                                  {spec.name}
                                </h4>
                              </div>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[10px]">
                                ACTIVE
                              </span>
                            </div>

                            {/* PIN Code Box */}
                            <div className="p-3.5 rounded-xl bg-black/80 border border-white/15 my-3">
                              <div className="flex items-center justify-between text-[10px] text-white/40 uppercase font-mono mb-1.5">
                                <span>Restricted Security PIN</span>
                                <button
                                  type="button"
                                  onClick={() => togglePinMask(spec.collegeKey)}
                                  className="text-white/60 hover:text-white transition-colors cursor-pointer"
                                  title={isUnmasked ? 'Mask PIN' : 'Reveal PIN'}
                                >
                                  {isUnmasked ? 'Hide 🔒' : 'Show 👁️'}
                                </button>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-lg font-extrabold text-amber-300 tracking-widest">
                                  {isUnmasked ? spec.campusPin : '••••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyPin(spec.campusPin, spec.collegeKey)}
                                  className="px-3 py-1 bg-white/10 hover:bg-white text-white hover:text-black rounded-lg text-xs font-semibold font-mono transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                                >
                                  {isCopied ? '✓ Copied' : 'Copy PIN'}
                                </button>
                              </div>
                            </div>

                            {/* Domain info */}
                            <div className="space-y-1 text-xs text-white/50 pt-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] text-white/40">Allowed Email:</span>
                                <span className="font-mono text-blue-300 text-[11px]">
                                  {spec.emailDomains[0]}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] text-white/40">Campus Location:</span>
                                <span className="text-[11px] text-white/70 truncate max-w-[170px]" title={spec.location}>
                                  {spec.location}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-white/40">
                            <span>Security Gate: Station 01</span>
                            <button
                              type="button"
                              onClick={() => {
                                setIssueCollege(spec.collegeKey);
                                const issueCard = document.getElementById('issue-station');
                                issueCard?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className="text-amber-400 hover:text-amber-300 hover:underline font-semibold cursor-pointer"
                            >
                              Issue Pass →
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Officer PIN Issuance Tool */}
                <div id="issue-station" className="p-7 rounded-2xl bg-[#0A0A0C] border border-white/15 shadow-2xl">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                    <div>
                      <h3 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span>🛡️</span>
                        <span>Officer PIN Issuance & Pass Terminal</span>
                      </h3>
                      <p className="text-xs text-white/50 mt-0.5">
                        Issue a restricted campus authorization PIN to an enrolled student or faculty candidate after verifying their physical university credentials.
                      </p>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                      Guard Station 01
                    </span>
                  </div>

                  <form onSubmit={handleIssuePinPass} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-[10px] font-bold tracking-widest text-white/50 uppercase block mb-1">
                        Select Campus
                      </label>
                      <select
                        value={issueCollege}
                        onChange={(e) => setIssueCollege(e.target.value)}
                        className="w-full bg-black/80 border border-white/20 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-amber-400"
                      >
                        {securityMasterPins.map((s) => (
                          <option key={s.collegeKey} value={s.collegeKey} className="bg-[#111]">
                            {s.shortName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold tracking-widest text-white/50 uppercase block mb-1">
                        Candidate Full Name
                      </label>
                      <input
                        type="text"
                        value={issueName}
                        onChange={(e) => setIssueName(e.target.value)}
                        placeholder="e.g. John Candidate"
                        required
                        className="w-full bg-black/80 border border-white/20 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold tracking-widest text-white/50 uppercase block mb-1">
                        Registration / Roll No
                      </label>
                      <input
                        type="text"
                        value={issueRoll}
                        onChange={(e) => setIssueRoll(e.target.value.toUpperCase())}
                        placeholder="e.g. 21BCE1042"
                        required
                        className="w-full bg-black/80 border border-white/20 rounded-xl px-4 py-2.5 text-white text-xs uppercase font-mono focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="w-full bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs tracking-wider uppercase rounded-xl py-3 transition-colors shadow-lg cursor-pointer"
                      >
                        Generate Pass 🎫
                      </button>
                    </div>
                  </form>

                  {/* Issued Security Pass Slip */}
                  {issuedPass && (
                    <div className="mt-6 p-5 rounded-xl bg-gradient-to-r from-amber-950/40 via-black/80 to-blue-950/30 border border-amber-500/40 animate-fade-in flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                          <span className="text-xs font-bold text-amber-300 uppercase tracking-widest font-mono">
                            OFFICIAL CAMPUS PIN AUTHORIZATION RECEIPT
                          </span>
                        </div>
                        <div className="text-white font-bold text-base">{issuedPass.name} ({issuedPass.roll})</div>
                        <div className="text-xs text-white/60">
                          Institution: <strong className="text-white">{issuedPass.collegeName}</strong> &bull; Issued at: {issuedPass.issuedAt}
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-white/40 uppercase block font-mono">Restricted PIN</span>
                          <span className="text-xl font-extrabold font-mono text-emerald-300 tracking-widest">
                            {issuedPass.pin}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyPin(issuedPass.pin, 'issued')}
                          className="px-3.5 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-gray-200 transition-colors cursor-pointer"
                        >
                          {copiedPin === 'issued' ? '✓ Copied' : 'Copy PIN'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            )
          )}
        </main>
      </div>

      {/* Google Cloud OAuth 2.0 Config Modal */}
      <GoogleOAuthModal
        isOpen={isGoogleConfigOpen}
        onClose={() => setIsGoogleConfigOpen(false)}
      />
    </div>
  );
}
