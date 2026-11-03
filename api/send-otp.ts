declare const process: any;

export default async function handler(req: any, res: any) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { to, code, collegeName, role = 'Student', name = 'Student', apiKey } = req.body || {};
  const activeKey =
    apiKey ||
    process.env.RESEND_API_KEY ||
    process.env.VITE_RESEND_API_KEY ||
    '';

  if (!to || !code) {
    return res.status(400).json({ error: 'Missing required fields: to, code.' });
  }

  if (!activeKey) {
    return res.status(400).json({
      error: 'RESEND_API_KEY is not configured. Please configure your Resend API Key in Vercel Environment Variables or in the settings modal.',
      status: 'pending_key',
    });
  }

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Campus Security Verification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0c0d12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0c0d12; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 520px; background-color: #14151c; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.12); overflow: hidden;">
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); padding: 30px 20px; text-align: center; border-bottom: 2px solid #3b82f6;">
              <div style="font-size: 28px; margin-bottom: 8px;">🛡️</div>
              <h1 style="margin: 0; font-size: 18px; font-weight: 800; text-transform: uppercase; color: #ffffff;">${collegeName || 'Campus Identity Authority'}</h1>
              <p style="margin: 4px 0 0; font-size: 11px; color: #93c5fd; letter-spacing: 0.1em; text-transform: uppercase;">Institutional Security Gateway</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 28px; text-align: center;">
              <p style="margin: 0 0 12px; font-size: 15px; color: #e2e8f0;">Hello <strong>${name}</strong>,</p>
              <p style="margin: 0 0 24px; font-size: 13px; color: #94a3b8; line-height: 1.6;">
                A single-use 6-digit security code was requested for your official <strong>${role}</strong> institutional registration:
              </p>
              <div style="background-color: #0b0c10; border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 12px; padding: 20px; margin: 0 auto 24px; max-width: 320px;">
                <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; color: #64748b; margin-bottom: 6px; font-weight: 700;">Your Verification Code</div>
                <div style="font-family: monospace; font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #38bdf8;">${code}</div>
                <div style="font-size: 11px; color: #10b981; margin-top: 6px; font-weight: 600;">⏱ Expires in 10 minutes</div>
              </div>
              <div style="background-color: rgba(239, 68, 68, 0.08); border-left: 3px solid #ef4444; border-radius: 6px; padding: 10px 14px; text-align: left; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 11.5px; color: #fca5a5; line-height: 1.4;">
                  <strong>Anti-Malpractice Notice:</strong> Do not share this OTP with anyone. Only verified university accounts may register.
                </p>
              </div>
              <p style="margin: 0; font-size: 11px; color: #64748b;">
                If you did not request this verification, please ignore this email.
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

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${activeKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Campus Security <onboarding@resend.dev>',
        to: [to],
        subject: `[${collegeName || 'Campus'}] Verification Code: ${code}`,
        html: emailHtml,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || 'Resend API returned an error dispatching email.',
        details: data,
      });
    }

    return res.status(200).json({
      success: true,
      messageId: data.id,
      recipient: to,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message || 'Failed to dispatch email via Resend API.',
    });
  }
}
