import nodemailer from 'nodemailer';

const configured = () => Boolean(
  String(process.env.SMTP_HOST || '').trim()
  && String(process.env.SMTP_FROM || '').trim()
  && Number(process.env.SMTP_PORT || 587) > 0
  && (Boolean(process.env.SMTP_USER) === Boolean(process.env.SMTP_PASSWORD)),
);

export function identityEmailConfigured() { return configured(); }

function appBaseUrl() {
  const value = String(process.env.PUBLIC_APP_URL || 'https://fda.totag.network').trim();
  const url = new URL(value);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1') {
    throw new Error('PUBLIC_APP_URL must use HTTPS.');
  }
  url.pathname = url.pathname.replace(/\/$/, '');
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

export async function sendIdentityInvitation({ email, fullName, role, token, expiresAt }) {
  if (!configured()) return { sent: false, reason: 'email_not_configured' };
  const port = Number(process.env.SMTP_PORT || 587);
  const transport = nodemailer.createTransport({
    host: String(process.env.SMTP_HOST).trim(),
    port,
    secure: String(process.env.SMTP_SECURE || (port === 465)).toLowerCase() === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    requireTLS: port === 587,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  const link = `${appBaseUrl()}/secure/activate?token=${encodeURIComponent(token)}`;
  const safeName = escapeHtml(fullName);
  const safeRole = escapeHtml(role);
  const expiry = new Date(expiresAt).toUTCString();
  const text = `Hello ${fullName},\n\nYour FDA staff workspace account has been prepared for ${role}. Set your own password using this one-time link: ${link}\n\nThe link expires ${expiry} and can be used once. If you were not expecting this invitation, contact FDA Human Resources.\n`;
  await transport.sendMail({
    from: String(process.env.SMTP_FROM).trim(),
    to: email,
    subject: 'Set up your FDA staff workspace account',
    text,
    html: `<p>Hello ${safeName},</p><p>Your FDA staff workspace account has been prepared for <strong>${safeRole}</strong>.</p><p><a href="${escapeHtml(link)}">Set your password and activate your account</a></p><p>This one-time link expires ${escapeHtml(expiry)}. If you were not expecting this invitation, contact FDA Human Resources.</p>`,
  });
  return { sent: true };
}

export function invitationLinkIsConfigured() {
  try { appBaseUrl(); return true; } catch { return false; }
}
