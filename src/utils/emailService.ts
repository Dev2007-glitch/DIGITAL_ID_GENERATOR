/**
 * Institutional Email Dispatch Service powered by Resend API
 * Delivers real 6-digit verification codes to student & faculty inboxes.
 */

const RESEND_STORAGE_KEY = 'idstream_resend_api_key';

export interface EmailDispatchParams {
  to: string;
  code: string;
  collegeName: string;
  role?: string;
  name?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  messageId?: string;
  error?: string;
  status: 'sent' | 'pending_key' | 'failed';
}

/**
 * Retrieve the active Resend API Key from localStorage or environment
 */
export function getResendApiKey(): string {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(RESEND_STORAGE_KEY);
    if (stored && stored.trim()) return stored.trim();
  }
  const envKey = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_RESEND_API_KEY;
  return (envKey || '').trim();
}

/**
 * Save user-provided Resend API key
 */
export function setResendApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    if (key.trim()) {
      localStorage.setItem(RESEND_STORAGE_KEY, key.trim());
    } else {
      localStorage.removeItem(RESEND_STORAGE_KEY);
    }
  }
}

/**
 * Check if a Resend API key is configured
 */
export function hasResendApiKey(): boolean {
  return Boolean(getResendApiKey());
}

/**
 * Build professional HTML email for institutional dispatch
 */
export function generateVerificationEmailHtml(params: EmailDispatchParams): string {
  const { code, collegeName, role = 'Student', name = 'Institutional Member' } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Campus Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0c0d12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0c0d12; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="540" cellpadding="0" cellspacing="0" style="max-width: 540px; background-color: #14151c; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.12); overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.4);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); padding: 32px 24px; text-align: center; border-bottom: 2px solid #3b82f6;">
              <div style="display: inline-block; width: 44px; height: 44px; line-height: 44px; border-radius: 50%; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); font-size: 22px; margin-bottom: 12px;">🛡️</div>
              <h1 style="margin: 0; font-size: 19px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: #ffffff;">${collegeName}</h1>
              <p style="margin: 6px 0 0; font-size: 12px; color: #93c5fd; font-family: monospace; letter-spacing: 0.1em; text-transform: uppercase;">Campus Security & Identity Authority</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 32px; text-align: center;">
              <p style="margin: 0 0 16px; font-size: 15px; color: #e2e8f0; line-height: 1.6;">
                Hello <strong style="color: #ffffff;">${name}</strong>,
              </p>
              <p style="margin: 0 0 28px; font-size: 13.5px; color: #94a3b8; line-height: 1.6;">
                A single-use security verification code has been requested for your official <strong style="color: #60a5fa;">${role}</strong> registration. Use the code below to complete your institutional verification:
              </p>

              <!-- OTP Code Display -->
              <div style="background-color: #0b0c10; border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 12px; padding: 22px; margin: 0 auto 28px; max-width: 360px;">
                <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #64748b; margin-bottom: 8px; font-weight: 700;">6-Digit Security Code</div>
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 12px; color: #38bdf8; text-shadow: 0 0 15px rgba(56, 189, 248, 0.3);">${code}</div>
                <div style="font-size: 11px; color: #10b981; margin-top: 8px; font-weight: 600;">⏱ Valid for 10 minutes</div>
              </div>

              <!-- Security Notice -->
              <div style="background-color: rgba(239, 68, 68, 0.08); border-left: 3px solid #ef4444; border-radius: 6px; padding: 12px 16px; text-align: left; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 12px; color: #fca5a5; line-height: 1.5;">
                  <strong>Anti-Malpractice Notice:</strong> Do not share this OTP with anyone. Campus Security officers will never ask for your verification code. One student can hold only one verified registration.
                </p>
              </div>

              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                If you did not initiate this registration request, please immediately contact your campus IT & Security Department.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0a0b0e; padding: 20px; text-align: center; border-top: 1px solid rgba(255,255,255,0.06);">
              <p style="margin: 0; font-size: 11px; color: #475569;">
                &copy; ${new Date().getFullYear()} ${collegeName} &bull; Digital Identity & Anti-Malpractice Portal
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Dispatch real institutional verification email
 * Attempts:
 * 1. Backend Serverless API: /api/send-otp
 * 2. Direct Resend HTTP API call via client key if available
 */
export async function sendRealVerificationEmail(params: EmailDispatchParams): Promise<EmailDispatchResult> {
  const { to, code, collegeName } = params;
  const clientKey = getResendApiKey();

  // 1. Try Backend Vercel Serverless Function first
  try {
    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...params,
        apiKey: clientKey || undefined,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return {
          success: true,
          messageId: data.messageId || data.id,
          status: 'sent',
        };
      }
    }
  } catch {
    // If backend function is not running locally (Vite dev server) or network issue, fallback to direct Resend call
  }

  // 2. Direct Resend HTTP API Call if client key is configured
  if (clientKey) {
    try {
      const html = generateVerificationEmailHtml(params);
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${clientKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Campus Security <onboarding@resend.dev>',
          to: [to],
          subject: `[${collegeName}] Campus Verification Code: ${code}`,
          html,
        }),
      });

      const data = await res.json();
      if (res.ok && data.id) {
        return {
          success: true,
          messageId: data.id,
          status: 'sent',
        };
      } else {
        const errorText = data.message || data.error || 'Resend API rejected the email request.';
        return {
          success: false,
          error: errorText,
          status: 'failed',
        };
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error communicating with Resend.',
        status: 'failed',
      };
    }
  }

  // 3. No key configured yet: Return pending_key status
  return {
    success: false,
    status: 'pending_key',
    error: 'Resend API Key is required to deliver real emails to inboxes. Please enter your Resend API Key.',
  };
}
