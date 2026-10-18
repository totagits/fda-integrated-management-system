import type { PaymentVoucher, UserRole } from '../types';
export function validateCommitment(amount: number, available: number | undefined) {
  if (available === undefined) return 'Select a recognized budget vote.';
  if (!Number.isFinite(amount) || amount <= 0) return 'Amount must be greater than zero.';
  if (amount > available) return 'Insufficient available budget.';
  return null;
}
export function voucherTransition(v: PaymentVoucher | undefined, role: UserRole, actor: string, next: PaymentVoucher['status']) {
  if (!v) return 'Voucher not found.';
  const rules = {FINANCE_APPROVED:['AUDIT_REVIEW','FINANCE_DIRECTOR'], MD_AUTHORIZED:['FINANCE_APPROVED','MANAGING_DIRECTOR'], PAID:['MD_AUTHORIZED','FINANCE_DIRECTOR']} as const;
  const rule = rules[next as keyof typeof rules];
  if (!rule || v.status !== rule[0]) return 'This workflow step is not available.';
  if (role !== rule[1]) return `Switch to the ${rule[1].replaceAll('_',' ')} demo role for this step.`;
  if (next !== 'PAID' && v.initiator === actor) return 'Maker-checker control: an initiator cannot approve their own voucher.';
  return null;
}
export interface ExchangeRow { externalId: string; amount: number; currency: string }
export function reconcileExchange(rows: ExchangeRow[], expected: number, seen: string[] = []) {
  const ids = new Set(seen); const accepted: ExchangeRow[] = []; const errors: string[] = [];
  rows.forEach((r, i) => {
    if (!r || typeof r.externalId !== 'string' || !r.externalId.trim()) errors.push(`Row ${i+1}: missing externalId`);
    else if (ids.has(r.externalId)) errors.push(`Row ${i+1}: duplicate ${r.externalId}`);
    else if (r.currency !== 'USD' || typeof r.amount !== 'number' || !Number.isFinite(r.amount) || r.amount <= 0) errors.push(`Row ${i+1}: positive USD amount required`);
    else { ids.add(r.externalId); accepted.push(r); }
  });
  const total = Math.round(accepted.reduce((s,r)=>s+r.amount,0)*100)/100;
  if (!Number.isFinite(expected) || expected < 0 || Math.abs(total-expected)>0.005) errors.push('Control total does not reconcile.');
  return {accepted, total, errors, valid: errors.length===0 && rows.length>0};
}
export function downloadJson(name: string, data: unknown) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const a=document.createElement('a'); a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
