import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import { createHash, randomBytes, randomUUID } from 'node:crypto';

const { Pool } = pg;
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_SIZE || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
});

export async function migrate() {
  const dir = new URL('./migrations/', import.meta.url);
  const files = (await fs.readdir(dir)).filter((name) => name.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = await fs.readFile(new URL(file, dir), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
      const found = await client.query('SELECT version FROM schema_migrations WHERE version = $1', [file]);
      if (found.rowCount) {
        await client.query('ROLLBACK');
        continue;
      }
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(version) VALUES ($1)', [file]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export async function transaction(callback, retries = 3) {
  for (let attempt = 0; ; attempt += 1) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      if (attempt < retries && ['40001', '40P01'].includes(error.code)) {
        await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 30));
        continue;
      }
      throw error;
    } finally {
      client.release();
    }
  }
}

export async function writeAudit(client, actor, action, entityType, entityId, data = {}) {
  const head = await client.query('SELECT event_hash FROM audit_chain_head WHERE singleton = true FOR UPDATE');
  const previousHash = head.rows[0]?.event_hash || '0'.repeat(64);
  const id = randomUUID();
  const occurredAt = new Date().toISOString();
  const safeEvent = {
    id,
    actorId: actor?.userId || null,
    actorRole: actor?.role || null,
    orgUnitId: actor?.orgUnitId || null,
    action,
    entityType,
    entityId: entityId || null,
    data,
    occurredAt,
    previousHash,
  };
  const eventHash = createHash('sha256').update(canonicalJson(safeEvent)).digest('hex');
  await client.query(
    `INSERT INTO audit_events(id, actor_id, actor_role, org_unit_id, action, entity_type, entity_id, request_id, event_data, previous_hash, event_hash, created_at)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [id, actor?.userId || null, actor?.role || null, actor?.orgUnitId || null, action, entityType, entityId || null, actor?.requestId || null, data, previousHash, eventHash, occurredAt],
  );
  await client.query('UPDATE audit_chain_head SET event_hash=$1, updated_at=$2 WHERE singleton=true', [eventHash, occurredAt]);
  await client.query(
    `INSERT INTO integration_outbox(id,event_type,aggregate_type,aggregate_id,payload,idempotency_key)
     VALUES($1,'audit.append','audit_event',$2,$3,$4)`,
    [randomUUID(), id, { ...safeEvent, eventHash }, `audit:${id}`],
  );
  return { id, eventHash };
}

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function makeSessionToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: sha256(token) };
}

export function uuid() {
  return randomUUID();
}

export async function safeUploadsDirectory() {
  const directory = path.resolve(process.env.UPLOADS_DIR || '/data/uploads');
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  return directory;
}
