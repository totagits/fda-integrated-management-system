import nodemailer from 'nodemailer';

const resendConfigured = () => Boolean(String(process.env.RESEND_API_KEY || '').trim() && String(process.env.RESEND_FROM_EMAIL || process.env.SMTP_FROM || '').trim());
const smtpConfigured = () => Boolean(
  String(process.env.SMTP_HOST || '').trim()
  && String(process.env.SMTP_FROM || '').trim()
  && Number(process.env.SMTP_PORT || 587) > 0
  && (Boolean(process.env.SMTP_USER) === Boolean(process.env.SMTP_PASSWORD)),
);
const configured = () => resendConfigured() || smtpConfigured();
const fromAddress = () => String(resendConfigured() ? (process.env.RESEND_FROM_EMAIL || process.env.SMTP_FROM) : process.env.SMTP_FROM).trim();

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

function transporter() {
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: String(process.env.SMTP_HOST).trim(), port,
    secure: String(process.env.SMTP_SECURE || (port === 465)).toLowerCase() === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    requireTLS: port === 587, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
  });
}

async function deliverEmail({ to, subject, text, html }) {
  if (resendConfigured()) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${String(process.env.RESEND_API_KEY).trim()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromAddress(), to: [to], subject, text, html }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw Object.assign(new Error('The email provider rejected delivery.'), { code: `RESEND_HTTP_${response.status}` });
    return { sent: true };
  }
  await transporter().sendMail({ from: fromAddress(), to, subject, text, html });
  return { sent: true };
}

export async function sendIdentityInvitation({ email, fullName, role, token, expiresAt }) {
  if (!configured()) return { sent: false, reason: 'email_not_configured' };
  const link = `${appBaseUrl()}/secure/activate?token=${encodeURIComponent(token)}`;
  const safeName = escapeHtml(fullName);
  const safeRole = escapeHtml(role);
  const expiry = new Date(expiresAt).toUTCString();
  const text = `Hello ${fullName},\n\nYour FDA staff workspace account has been prepared for ${role}. Set your own password using this one-time link: ${link}\n\nThe link expires ${expiry} and can be used once. If you were not expecting this invitation, contact FDA Human Resources.\n`;
  await deliverEmail({
    to: email,
    subject: 'Set up your FDA staff workspace account',
    text,
    html: `<p>Hello ${safeName},</p><p>Your FDA staff workspace account has been prepared for <strong>${safeRole}</strong>.</p><p><a href="${escapeHtml(link)}">Set your password and activate your account</a></p><p>This one-time link expires ${escapeHtml(expiry)}. If you were not expecting this invitation, contact FDA Human Resources.</p>`,
  });
  return { sent: true };
}

export async function sendPasswordReset({ email, fullName, token, expiresAt }) {
  if (!configured()) return { sent: false, reason: 'email_not_configured' };
  const link = `${appBaseUrl()}/secure/reset-password?token=${encodeURIComponent(token)}`;
  const safeName = escapeHtml(fullName);
  const expiry = escapeHtml(new Date(expiresAt).toUTCString());
  await deliverEmail({
    to: email,
    subject: 'Reset your FDA staff workspace password',
    text: `Hello ${fullName},\n\nA password reset was requested for your FDA staff workspace account. Use this one-time link to choose a new password: ${link}\n\nThe link expires ${new Date(expiresAt).toUTCString()}. If you did not request this, ignore this email; your password has not changed.\n`,
    html: `<p>Hello ${safeName},</p><p>A password reset was requested for your FDA staff workspace account.</p><p><a href="${escapeHtml(link)}">Choose a new password</a></p><p>This one-time link expires ${expiry}. If you did not request this, ignore this email; your password has not changed.</p>`,
  });
  return { sent: true };
}

export async function sendPasswordResetConfirmation({ email, fullName }) {
  if (!configured()) return { sent: false, reason: 'email_not_configured' };
  const safeName = escapeHtml(fullName);
  await deliverEmail({
    to: email,
    subject: 'Your FDA staff workspace password was changed',
    text: `Hello ${fullName},\n\nThe password for your FDA staff workspace account was changed. If you did not make this change, contact the FDA IT Director immediately.\n`,
    html: `<p>Hello ${safeName},</p><p>The password for your FDA staff workspace account was changed.</p><p>If you did not make this change, contact the FDA IT Director immediately.</p>`,
  });
  return { sent: true };
}

export async function sendBidderVerification({ email, companyName, token, expiresAt }) {
  if (!configured()) return { sent: false, reason: 'email_not_configured' };
  const link = `${appBaseUrl()}/bidder/verify?token=${encodeURIComponent(token)}`;
  const safeCompany = escapeHtml(companyName);
  const expiry = new Date(expiresAt).toUTCString();
  await deliverEmail({
    to: email,
    subject: 'Verify your FDA supplier portal email',
    text: `Hello ${companyName},\n\nVerify this email address to access the FDA supplier portal: ${link}\n\nThe link expires ${expiry}. Your supplier profile remains subject to FDA procurement review before you can submit an offer.\n`,
    html: `<p>Hello ${safeCompany},</p><p>Verify this email address to access the FDA supplier portal.</p><p><a href="${escapeHtml(link)}">Verify supplier email</a></p><p>This link expires ${escapeHtml(expiry)}. Your supplier profile remains subject to FDA procurement review before you can submit an offer.</p>`,
  });
  return { sent: true };
}

export async function sendBidderExpiryReminder({ email, companyName, documentType, expiresOn, daysBefore }) {
  if (!configured()) return { sent: false, reason: 'email_not_configured' };
  const safeCompany = escapeHtml(companyName);
  const safeType = escapeHtml(documentType.replaceAll('_', ' ').toLowerCase());
  const safeDate = escapeHtml(new Date(`${expiresOn}T00:00:00Z`).toLocaleDateString('en-GB', { timeZone: 'UTC', dateStyle: 'long' }));
  const subject = `FDA supplier document expires in ${daysBefore} day${daysBefore === 1 ? '' : 's'}`;
  const text = `Hello ${companyName},\n\nYour ${documentType.replaceAll('_', ' ').toLowerCase()} document expires on ${expiresOn} (${daysBefore} day${daysBefore === 1 ? '' : 's'} remaining). Upload a renewed document in the FDA supplier portal before it expires. An expired required document will make your supplier profile ineligible to submit offers until it is renewed and reviewed.\n`;
  await deliverEmail({
    to: email, subject, text,
    html: `<p>Hello ${safeCompany},</p><p>Your <strong>${safeType}</strong> document expires on <strong>${safeDate}</strong> (${daysBefore} day${daysBefore === 1 ? '' : 's'} remaining).</p><p>Upload a renewed document in the FDA supplier portal before it expires. An expired required document makes the supplier profile ineligible to submit offers until renewal and review.</p>`,
  });
  return { sent: true };
}

export function invitationLinkIsConfigured() {
  try { appBaseUrl(); return true; } catch { return false; }
}
