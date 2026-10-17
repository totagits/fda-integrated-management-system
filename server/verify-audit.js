import crypto from 'node:crypto';
import { pool, canonicalJson } from './db.js';

try {
  const result = await pool.query(`SELECT id,actor_id,actor_role,org_unit_id,action,entity_type,entity_id,event_data,previous_hash,event_hash,created_at FROM audit_events ORDER BY sequence ASC`);
  let previousHash = '0'.repeat(64);
  for (const row of result.rows) {
    if (row.previous_hash !== previousHash) throw new Error(`Broken previous-hash link at event ${row.id}`);
    const event = {
      id: row.id,
      actorId: row.actor_id,
      actorRole: row.actor_role,
      orgUnitId: row.org_unit_id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      data: row.event_data,
      occurredAt: new Date(row.created_at).toISOString(),
      previousHash: row.previous_hash,
    };
    const computed = crypto.createHash('sha256').update(canonicalJson(event)).digest('hex');
    if (computed !== row.event_hash) throw new Error(`Event hash mismatch at event ${row.id}`);
    previousHash = row.event_hash;
  }
  const head = await pool.query('SELECT event_hash FROM audit_chain_head WHERE singleton=true');
  if ((head.rows[0]?.event_hash || '0'.repeat(64)) !== previousHash) throw new Error('Audit chain head does not match the last event.');
  process.stdout.write(`Verified ${result.rowCount} append-only audit events; chain head ${previousHash}.\n`);
} catch (error) {
  process.stderr.write(`Audit verification failed: ${error.message}\n`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
