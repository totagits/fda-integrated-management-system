import { describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import { canTransition, parseMinorUnits, requireCapability } from '../server/domain.js';
import { hashPassword, verifyPassword } from '../server/security.js';

describe('production workflow controls', () => {
  it('uses integer minor units and rejects malformed amounts', () => {
    expect(parseMinorUnits('125.4')).toBe(12540n);
    expect(parseMinorUnits('0.01')).toBe(1n);
    expect(() => parseMinorUnits('-2')).toThrow();
    expect(() => parseMinorUnits('1.009')).toThrow();
    expect(() => parseMinorUnits('1e6')).toThrow();
  });

  it('allows only named requisition state transitions', () => {
    expect(canTransition('requisition', 'DRAFT', 'SUBMITTED')).toBe(true);
    expect(canTransition('requisition', 'SUBMITTED', 'APPROVED')).toBe(true);
    expect(canTransition('requisition', 'DRAFT', 'APPROVED')).toBe(false);
    expect(canTransition('receipt', 'PENDING', 'ACCEPTED')).toBe(true);
    expect(canTransition('invoice', 'PAID', 'AUTHORIZED')).toBe(false);
  });

  it('enforces capabilities from server role policy', () => {
    expect(() => requireCapability('PROCUREMENT_OFFICER', 'purchase_order.create')).not.toThrow();
    expect(() => requireCapability('COUNTY_OFFICER', 'payment.record')).toThrow(/permission/i);
  });

  it('stores a salted password verifier and rejects incorrect passwords', async () => {
    const candidate = randomBytes(32).toString('base64url');
    const incorrectCandidate = `incorrect-${candidate}`;
    const stored = await hashPassword(candidate);
    expect(stored).not.toContain(candidate);
    expect(await verifyPassword(candidate, stored)).toBe(true);
    expect(await verifyPassword(incorrectCandidate, stored)).toBe(false);
  });
});

import {
  INITIAL_EMPLOYEES,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_PAYROLL_RECORDS,
  INITIAL_BUDGET_VOTES,
  INITIAL_PAYMENT_VOUCHERS,
  INITIAL_PROCUREMENT_REQS,
  INITIAL_VENDORS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_FIXED_ASSETS,
} from '../src/data/initialData';

describe('operational data hygiene', () => {
  it('ships no seeded personnel, financial, procurement, or asset records', () => {
    expect([
      INITIAL_EMPLOYEES,
      INITIAL_LEAVE_REQUESTS,
      INITIAL_PAYROLL_RECORDS,
      INITIAL_BUDGET_VOTES,
      INITIAL_PAYMENT_VOUCHERS,
      INITIAL_PROCUREMENT_REQS,
      INITIAL_VENDORS,
      INITIAL_PURCHASE_ORDERS,
      INITIAL_FIXED_ASSETS,
    ].every((records) => records.length === 0)).toBe(true);
  });
});
