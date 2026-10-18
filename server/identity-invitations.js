import crypto from 'node:crypto';
import { hashPassword } from './security.js';
import { sendIdentityInvitation } from './identity-email.js';

const invitationLifetimeMs = 72 * 60 * 60 * 1000;

export async function issueIdentityInvitation(db, { user, requestedBy, orgUnitId, invitationType }) {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + invitationLifetimeMs);
  await db.query(
    `UPDATE identity_invitations SET revoked_at=now()
     WHERE user_id=$1 AND accepted_at IS NULL AND revoked_at IS NULL`,
    [user.id],
  );
  const id = crypto.randomUUID();
  await db.query(
    `INSERT INTO identity_invitations(id,user_id,email,token_hash,invitation_type,requested_by,org_unit_id,expires_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, user.id, user.email, tokenHash, invitationType, requestedBy, orgUnitId, expiresAt],
  );
  await db.query('UPDATE users SET must_change_password=true WHERE id=$1', [user.id]);
  return { id, token, expiresAt, user };
}

export async function deliverIdentityInvitation(db, { invitation, role }) {
  try {
    const result = await sendIdentityInvitation({
      email: invitation.user.email,
      fullName: invitation.user.full_name || invitation.user.fullName,
      role,
      token: invitation.token,
      expiresAt: invitation.expiresAt,
    });
    if (result.sent) await db.query('UPDATE identity_invitations SET sent_at=now() WHERE id=$1', [invitation.id]);
    return { emailSent: result.sent, emailStatus: result.sent ? 'SENT' : 'NOT_CONFIGURED' };
  } catch (error) {
    console.error(JSON.stringify({ level: 'error', event: 'identity_invitation_delivery_failed', invitationId: invitation.id, error: String(error?.code || error?.name || 'DELIVERY_FAILED').slice(0, 80) }));
    return { emailSent: false, emailStatus: 'DELIVERY_FAILED' };
  }
}

export async function makeUnusablePasswordHash() {
  return hashPassword(crypto.randomBytes(48).toString('base64url'));
}
