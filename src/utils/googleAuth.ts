/**
 * Google Cloud OAuth 2.0 Authentication Utility for IDStream
 * Supports Google Identity Services (GSI) Client SDK, JWT Token Decoding,
 * and Role-Based Campus Security Access.
 */

export interface GoogleUserPayload {
  iss?: string;
  nbf?: number;
  aud?: string;
  sub: string;
  email: string;
  email_verified?: boolean;
  azp?: string;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  iat?: number;
  exp?: number;
  jti?: string;
  hd?: string; // Hosted Domain (e.g. "university.edu")
}

export interface AuthSessionUser {
  name: string;
  email: string;
  role: 'student' | 'faculty' | 'security';
  picture?: string;
  sub?: string;
  provider: 'google' | 'local' | 'institutional';
  email_verified?: boolean;
  hd?: string;
  authTime?: string;
  regNo?: string;
  college?: string;
  collegeKey?: string;
  collegeShortName?: string;
  department?: string;
  isVerified?: boolean;
}

// Storage keys
const GOOGLE_CLIENT_ID_KEY = 'idstream_google_client_id';
const USER_KEY = 'idstream_user';
const ROLE_KEY = 'idstream_role';
const GOOGLE_TOKEN_KEY = 'idstream_google_token';

// Default Google Cloud OAuth 2.0 Client ID provided by user
export const DEFAULT_GOOGLE_CLIENT_ID =
  '703403828116-b617sovcls70agkivljl23ev2qbts01q.apps.googleusercontent.com';

/**
 * Get active Google Client ID from Environment, LocalStorage, or Default
 */
export function getGoogleClientId(): string {
  const envId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  if (envId && envId.length > 5) return envId;

  const storedId = localStorage.getItem(GOOGLE_CLIENT_ID_KEY)?.trim();
  if (storedId && storedId.length > 5) return storedId;

  return DEFAULT_GOOGLE_CLIENT_ID;
}

/**
 * Save custom Google Client ID in LocalStorage
 */
export function setGoogleClientId(clientId: string): void {
  const cleaned = clientId.trim();
  if (!cleaned) {
    localStorage.removeItem(GOOGLE_CLIENT_ID_KEY);
  } else {
    localStorage.setItem(GOOGLE_CLIENT_ID_KEY, cleaned);
  }
}

/**
 * Check if a valid Google Cloud Client ID is configured
 */
export function hasConfiguredGoogleClientId(): boolean {
  const id = getGoogleClientId();
  return Boolean(id && id.includes('.apps.googleusercontent.com'));
}

/**
 * Decode standard Google OAuth2 ID Token (JWT) without external dependencies
 */
export function parseJwt(token: string): GoogleUserPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    return JSON.parse(jsonPayload) as GoogleUserPayload;
  } catch (error) {
    console.error('Failed to decode Google JWT token:', error);
    return null;
  }
}

/**
 * Cleanly format a person's display name from an email address (e.g. "rohit.sharma@du.ac.in" -> "Rohit Sharma")
 */
export function formatNameFromEmail(email: string): string {
  if (!email || !email.includes('@')) return '';
  const username = email.split('@')[0];
  const cleaned = username.replace(/[0-9]+/g, ' ').replace(/[._-]+/g, ' ').trim();
  if (!cleaned) return username;
  return cleaned
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Handle successful Google OAuth credential response
 */
export function processGoogleCredential(
  credential: string,
  role: 'student' | 'faculty' | 'security'
): AuthSessionUser | null {
  const payload = parseJwt(credential);
  if (!payload || !payload.email) {
    console.error('Invalid Google OAuth token payload');
    return null;
  }

  // Security check: Verify token expiration
  if (payload.exp && Date.now() / 1000 > payload.exp) {
    console.error('Google OAuth token expired');
    return null;
  }

  // Check if this email is already registered in the institutional user database
  let registeredName = '';
  try {
    const raw = localStorage.getItem('idstream_registered_users');
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        const found = list.find((u: any) => u.email?.toLowerCase() === payload.email.toLowerCase());
        if (found?.name) registeredName = found.name;
      }
    }
  } catch {}

  const finalName = registeredName || payload.name || formatNameFromEmail(payload.email) || 'Student Candidate';

  const sessionUser: AuthSessionUser = {
    name: finalName,
    email: payload.email,
    role,
    picture: payload.picture,
    sub: payload.sub,
    provider: 'google',
    email_verified: payload.email_verified ?? true,
    hd: payload.hd,
    authTime: new Date().toISOString(),
  };

  localStorage.setItem(USER_KEY, JSON.stringify(sessionUser));
  localStorage.setItem(ROLE_KEY, role);
  localStorage.setItem(GOOGLE_TOKEN_KEY, credential);

  return sessionUser;
}

/**
 * Fetch Google User Info directly from Google API using OAuth 2.0 Access Token
 */
export async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserPayload | null> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`Google API returned HTTP ${res.status}`);
    }
    const data = await res.json();
    return {
      sub: data.sub,
      name: data.name,
      given_name: data.given_name,
      family_name: data.family_name,
      picture: data.picture,
      email: data.email,
      email_verified: data.email_verified,
      hd: data.hd,
    };
  } catch (error) {
    console.error('Failed to fetch Google user profile from access token:', error);
    return null;
  }
}

/**
 * Process and save Google user profile obtained from OAuth 2.0 UserInfo endpoint
 */
export function processGoogleUserProfile(
  profile: GoogleUserPayload,
  role: 'student' | 'faculty' | 'security',
  accessToken?: string
): AuthSessionUser {
  // Cross-reference against registered institutional user database
  let registeredName = '';
  try {
    const raw = localStorage.getItem('idstream_registered_users');
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        const found = list.find((u: any) => u.email?.toLowerCase() === profile.email.toLowerCase());
        if (found?.name) registeredName = found.name;
      }
    }
  } catch {}

  const finalName = registeredName || profile.name || (profile.email ? formatNameFromEmail(profile.email) : 'Student Candidate');

  const sessionUser: AuthSessionUser = {
    name: finalName,
    email: profile.email,
    role,
    picture: profile.picture,
    sub: profile.sub,
    provider: 'google',
    email_verified: profile.email_verified ?? true,
    hd: profile.hd,
    authTime: new Date().toISOString(),
  };

  localStorage.setItem(USER_KEY, JSON.stringify(sessionUser));
  localStorage.setItem(ROLE_KEY, role);
  if (accessToken) {
    localStorage.setItem(GOOGLE_TOKEN_KEY, accessToken);
  }

  return sessionUser;
}

/**
 * Create a verified test/mock Google login session for immediate testing
 */
export function createSimulatedGoogleLogin(
  role: 'student' | 'faculty' | 'security',
  customEmail?: string
): AuthSessionUser {
  const email =
    customEmail ||
    (role === 'student'
      ? 'student.alex@university.edu'
      : role === 'faculty'
      ? 'dr.sarah.jenkins@university.edu'
      : 'security.officer@campus.edu');

  // Check if email matches an existing registered institutional identity
  let matchedName = '';
  if (email) {
    try {
      const raw = localStorage.getItem('idstream_registered_users');
      if (raw) {
        const users = JSON.parse(raw);
        if (Array.isArray(users)) {
          const match = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
          if (match?.name) {
            matchedName = match.name;
          }
        }
      }
    } catch {}
  }

  const name =
    matchedName ||
    (email ? formatNameFromEmail(email) : '') ||
    (role === 'student'
      ? 'Student Candidate'
      : role === 'faculty'
      ? 'Faculty Member'
      : 'Chief Security Officer');

  const sessionUser: AuthSessionUser = {
    name,
    email,
    role,
    picture: `https://api.dicebear.com/7.x/avataaars/svg?seed=${role}_google&backgroundColor=b6e3f4`,
    sub: 'google_sim_' + Date.now(),
    provider: 'google',
    email_verified: true,
    hd: 'university.edu',
    authTime: new Date().toISOString(),
  };

  localStorage.setItem(USER_KEY, JSON.stringify(sessionUser));
  localStorage.setItem(ROLE_KEY, role);
  localStorage.setItem(GOOGLE_TOKEN_KEY, 'simulated_google_token_' + Date.now());

  return sessionUser;
}

/**
 * Get current authenticated user from session
 */
export function getAuthenticatedUser(): AuthSessionUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSessionUser;
  } catch {
    return null;
  }
}

/**
 * Terminate session and disable Google auto-select
 */
export function logoutGoogleSession(): void {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(GOOGLE_TOKEN_KEY);

  // If Google SDK is loaded, revoke auto selection
  if (typeof window !== 'undefined' && (window as unknown as { google?: { accounts?: { id?: { disableAutoSelect?: () => void } } } }).google?.accounts?.id?.disableAutoSelect) {
    try {
      (window as unknown as { google: { accounts: { id: { disableAutoSelect: () => void } } } }).google.accounts.id.disableAutoSelect();
    } catch {
      // Ignore
    }
  }
}
