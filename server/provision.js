import crypto from 'node:crypto';
import { pool, migrate, transaction, writeAudit, uuid } from './db.js';
import { hashPassword } from './security.js';

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const email=String(process.env.INITIAL_ADMIN_EMAIL||'').trim().toLowerCase();
  const fullName=String(process.env.INITIAL_ADMIN_NAME||'').trim();
  const password=String(process.env.INITIAL_ADMIN_PASSWORD||'');
  if(!email||!fullName||password.length<16) throw new Error('Set INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_NAME, and a one-time INITIAL_ADMIN_PASSWORD of at least 16 characters.');
  await migrate();
  await transaction(async(client)=>{
    const existing=await client.query('SELECT id FROM users WHERE email=$1',[email]);
    if(existing.rowCount) throw new Error('That administrator already exists; provisioning is one-time and never resets an existing account.');
    const unitId=uuid();
    await client.query(`INSERT INTO org_units(id,code,name,level) VALUES($1,'FDA-HQ','FDA Headquarters','HEADQUARTERS') ON CONFLICT(code) DO NOTHING`,[unitId]);
    const unit=await client.query(`SELECT id FROM org_units WHERE code='FDA-HQ'`);
    const userId=uuid();
    await client.query(`INSERT INTO users(id,email,full_name,password_hash,must_change_password) VALUES($1,$2,$3,$4,true)`,[userId,email,fullName,await hashPassword(password)]);
    await client.query(`INSERT INTO user_roles(id,user_id,role,org_unit_id) VALUES($1,$2,'MANAGING_DIRECTOR',$3)`,[uuid(),userId,unit.rows[0].id]);
    await writeAudit(client,{userId,role:'MANAGING_DIRECTOR',orgUnitId:unit.rows[0].id,requestId:crypto.randomUUID()},'identity.initial_admin_provisioned','user',userId,{role:'MANAGING_DIRECTOR'});
  });
  console.log('Initial administrator created. The account must change its password at first sign-in. Remove the one-time provisioning variables from the deployment environment.');
}

main().catch((error)=>{console.error(error.message);process.exitCode=1;}).finally(()=>pool.end());
