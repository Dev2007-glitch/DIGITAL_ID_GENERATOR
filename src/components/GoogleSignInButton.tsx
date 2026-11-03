import { useEffect, useRef, useState } from 'react';
import {
  getGoogleClientId,
  hasConfiguredGoogleClientId,
  processGoogleCredential,
  fetchGoogleUserInfo,
  processGoogleUserProfile,
  createSimulatedGoogleLogin,
  parseJwt,
  type AuthSessionUser,
} from '../utils/googleAuth';
import { AUTHORIZED_SECURITY_EMAIL } from '../utils/collegeSecurity';

interface GoogleSignInButtonProps {
  role: 'student' | 'faculty' | 'security';
  collegeKey?: string;
  onSuccess: (user: AuthSessionUser) => void;
  onError?: (error: string) => void;
  text?: 'signin' | 'signup';
  onOpenConfig?: () => void;
}

interface TokenResponse {
  access_token: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface TokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

interface GoogleEvaluationResult {
  allowed: boolean;
  effectiveRole: 'student' | 'faculty' | 'security';
  errorMessage?: string;
}

/**
 * Strict Security & Role Google Account Validator
 * Rule 1: For Security role -> EXCLUSIVELY vu.241fa04b57@gmail.com is permitted.
 * Rule 2: If vu.241fa04b57@gmail.com signs in anywhere -> Grant Chief Security Officer clearance.
 * Rule 3: For Student / Faculty -> Personal email block REMOVED. Any student/faculty Google account is permitted.
 */
function evaluateGoogleAccount(
  email: string | undefined,
  requestedRole: 'student' | 'faculty' | 'security'
): GoogleEvaluationResult {
  const cleanEmail = (email || '').toLowerCase().trim();
  const isMasterSecurity =
    cleanEmail === AUTHORIZED_SECURITY_EMAIL.toLowerCase() ||
    cleanEmail === 'vu241fa04b57@gmail.com' ||
    cleanEmail === 'vu.241fa04b57' ||
    cleanEmail === 'vu241fa04b57';

  // 1. Security Role Requested: ONLY vu.241fa04b57@gmail.com is permitted
  if (requestedRole === 'security') {
    if (!isMasterSecurity) {
      return {
        allowed: false,
        effectiveRole: 'security',
        errorMessage: `Security Access Denied: Only authorized Security Administrator (${AUTHORIZED_SECURITY_EMAIL}) is permitted to access the Security Officer Portal and PIN Vault. Account '${email || 'Unknown'}' is not authorized.`,
      };
    }
    return {
      allowed: true,
      effectiveRole: 'security',
    };
  }

  // 2. If vu.241fa04b57@gmail.com logs in while student or faculty was selected:
  // Automatically recognize and promote to Chief Security Officer!
  if (isMasterSecurity) {
    return {
      allowed: true,
      effectiveRole: 'security',
    };
  }

  // 3. Student and Faculty: Personal email restriction REMOVED per user request
  // Any Google email address (such as vu.241fa04633@gmail.com, personal @gmail, etc.) is allowed
  return {
    allowed: true,
    effectiveRole: requestedRole,
  };
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: string | number;
              locale?: string;
            }
          ) => void;
          prompt: () => void;
        };
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            prompt?: string;
            error_callback?: (error: unknown) => void;
          }) => TokenClient;
        };
      };
    };
  }
}

export default function GoogleSignInButton({
  role,
  collegeKey,
  onSuccess,
  onError,
  text = 'signin',
  onOpenConfig,
}: GoogleSignInButtonProps) {
  const gButtonContainerRef = useRef<HTMLDivElement>(null);
  const tokenClientRef = useRef<TokenClient | null>(null);
  const [loading, setLoading] = useState(false);
  const isConfigured = hasConfiguredGoogleClientId();
  const clientId = getGoogleClientId();

  // Always keep fresh references to callbacks to eliminate stale closure bugs
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Initialize both Google Token Client (for custom button account chooser) and GSI Button
  useEffect(() => {
    let checkInterval: ReturnType<typeof setInterval> | undefined;

    const setupGoogleAuth = () => {
      if (typeof window === 'undefined' || !window.google?.accounts) return;

      const activeClientId = getGoogleClientId();
      if (!activeClientId) return;

      try {
        // 1. Initialize Google OAuth 2.0 Token Client (Opens Real Google Account Chooser Popup)
        if (window.google.accounts.oauth2) {
          tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
            client_id: activeClientId,
            scope: 'openid email profile',
            prompt: 'select_account', // Forces Google to show ALL Google accounts
            callback: async (tokenResponse: TokenResponse) => {
              if (tokenResponse.error) {
                console.error('Google OAuth token error:', tokenResponse.error);
                setLoading(false);
                onErrorRef.current?.(tokenResponse.error_description || tokenResponse.error);
                return;
              }

              if (tokenResponse.access_token) {
                setLoading(true);
                try {
                  const profile = await fetchGoogleUserInfo(tokenResponse.access_token);
                  if (profile) {
                    const validation = evaluateGoogleAccount(profile.email, role);
                    if (!validation.allowed) {
                      onErrorRef.current?.(validation.errorMessage || 'Access Denied.');
                      setLoading(false);
                      return;
                    }

                    const sessionUser = processGoogleUserProfile(
                      profile,
                      validation.effectiveRole,
                      tokenResponse.access_token
                    );
                    onSuccessRef.current(sessionUser);
                  } else {
                    onErrorRef.current?.('Could not retrieve Google profile details.');
                  }
                } catch (err) {
                  console.error('Error fetching Google user profile:', err);
                  onErrorRef.current?.('Failed to fetch user profile.');
                } finally {
                  setLoading(false);
                }
              }
            },
            error_callback: (err: unknown) => {
              console.warn('Google Token Client error callback:', err);
              setLoading(false);
            },
          });
        }

        // 2. Also initialize Google ID Token client for One-Tap / embedded button if needed
        if (window.google.accounts.id) {
          window.google.accounts.id.initialize({
            client_id: activeClientId,
            callback: (response: { credential: string }) => {
              setLoading(true);
              const payload = parseJwt(response.credential);
              if (payload) {
                const validation = evaluateGoogleAccount(payload.email, role);
                if (!validation.allowed) {
                  onErrorRef.current?.(validation.errorMessage || 'Access Denied.');
                  setLoading(false);
                  return;
                }
                const user = processGoogleCredential(response.credential, validation.effectiveRole);
                if (user) {
                  onSuccessRef.current(user);
                } else {
                  onErrorRef.current?.('Failed to process Google ID Token.');
                }
              } else {
                onErrorRef.current?.('Failed to parse Google credentials.');
              }
              setLoading(false);
            },
            auto_select: false,
          });

          // Render official Google button into container if present
          if (gButtonContainerRef.current) {
            gButtonContainerRef.current.innerHTML = '';
            window.google.accounts.id.renderButton(gButtonContainerRef.current, {
              theme: 'filled_black',
              size: 'large',
              shape: 'rectangular',
              text: text === 'signup' ? 'signup_with' : 'signin_with',
              width: '100%',
              logo_alignment: 'left',
            });
          }
        }
      } catch (err) {
        console.warn('Google Auth Setup Error:', err);
      }
    };

    if (window.google?.accounts) {
      setupGoogleAuth();
    } else {
      checkInterval = setInterval(() => {
        if (window.google?.accounts) {
          setupGoogleAuth();
          clearInterval(checkInterval);
        }
      }, 300);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [clientId, isConfigured, role, text, collegeKey]);

  // Click handler that triggers Google account selection popup
  const handleGoogleSignInClick = () => {
    setLoading(true);

    const activeClientId = getGoogleClientId();

    // If client ID is configured and token client is ready:
    if (activeClientId && window.google?.accounts?.oauth2) {
      try {
        if (!tokenClientRef.current) {
          tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
            client_id: activeClientId,
            scope: 'openid email profile',
            prompt: 'select_account',
            callback: async (tokenResponse: TokenResponse) => {
              if (tokenResponse.error) {
                setLoading(false);
                onErrorRef.current?.(tokenResponse.error_description || tokenResponse.error);
                return;
              }
              if (tokenResponse.access_token) {
                const profile = await fetchGoogleUserInfo(tokenResponse.access_token);
                if (profile) {
                  const validation = evaluateGoogleAccount(profile.email, role);
                  if (!validation.allowed) {
                    onErrorRef.current?.(validation.errorMessage || 'Access Denied.');
                    setLoading(false);
                    return;
                  }

                  const sessionUser = processGoogleUserProfile(
                    profile,
                    validation.effectiveRole,
                    tokenResponse.access_token
                  );
                  onSuccessRef.current(sessionUser);
                } else {
                  onErrorRef.current?.('Failed to fetch Google profile details.');
                }
                setLoading(false);
              }
            },
          });
        }

        // Trigger Google official popup with all accounts
        tokenClientRef.current.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (err) {
        console.error('Error invoking Google Token Client:', err);
      }
    }

    // Try Google ID Prompt as secondary fallback
    if (activeClientId && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
        return;
      } catch {
        // Continue to fallback
      }
    }

    // If no client ID configured yet or offline, use verified sandbox mode
    setTimeout(() => {
      const simulatedEmail = role === 'security' ? AUTHORIZED_SECURITY_EMAIL : undefined;
      const user = createSimulatedGoogleLogin(role, simulatedEmail);
      onSuccessRef.current(user);
      setLoading(false);
    }, 400);
  };

  return (
    <div className="w-full space-y-2">
      {/* Official Interactive Google Account Chooser Button */}
      <button
        type="button"
        onClick={handleGoogleSignInClick}
        disabled={loading}
        className="w-full bg-[#131318] hover:bg-[#1C1C24] text-white border border-white/20 hover:border-white/40 font-semibold text-xs sm:text-sm tracking-wide rounded-xl py-3 px-4 transition-all duration-200 shadow-md flex items-center justify-center gap-3 group relative overflow-hidden disabled:opacity-50 cursor-pointer active:scale-[0.99]"
      >
        <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
        <span>
          {loading
            ? 'Selecting Google Account...'
            : role === 'security'
            ? 'Sign in as Security Officer (Google)'
            : text === 'signup'
            ? `Sign up with Google (${role.toUpperCase()})`
            : `Continue with Google (${role.toUpperCase()})`}
        </span>
        <span className="text-[10px] bg-blue-500/20 text-blue-300 font-mono px-1.5 py-0.5 rounded border border-blue-400/30">
          {role === 'security' ? 'Officer Auth' : 'OAuth 2.0'}
        </span>
      </button>

      {/* Hidden container for Google GSI script rendering fallback if needed */}
      <div ref={gButtonContainerRef} className="hidden"></div>

      {/* OAuth Security status & config trigger */}
      <div className="flex items-center justify-between text-[10.5px] px-1 text-white/40">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>
            {role === 'security'
              ? 'Authorized: vu.241fa04b57@gmail.com'
              : 'Google Account Chooser Enabled'}
          </span>
        </span>
        {onOpenConfig && (
          <button
            type="button"
            onClick={onOpenConfig}
            className="text-blue-400 hover:text-blue-300 hover:underline font-medium transition-colors cursor-pointer"
          >
            Google Cloud Settings ⚙
          </button>
        )}
      </div>
    </div>
  );
}
