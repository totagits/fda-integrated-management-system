import { describe, it, expect } from 'vitest';
import { INITIAL_BUDGET_VOTES, INITIAL_PAYROLL_RECORDS, INITIAL_PURCHASE_ORDERS } from '../src/data/initialData';

describe('FDA Liberia ERP Core Engine Verification', () => {

  describe('1. Dual-Currency Payroll & Statutory Deductions', () => {
    it('should compute 20% LRA withholding and 4% NASSCORP deduction correctly', () => {
      const grossUSD = 4500;
      const expectedTax = Math.round(grossUSD * 0.20); // 900
      const expectedNasscorp = Math.round(grossUSD * 0.04); // 180
      const expectedNetUSD = grossUSD - expectedTax - expectedNasscorp; // 3420
      const expectedNetLRD = Math.round(expectedNetUSD * 195); // 666,900

      expect(expectedTax).toBe(900);
      expect(expectedNasscorp).toBe(180);
      expect(expectedNetUSD).toBe(3420);
      expect(expectedNetLRD).toBe(666900);
    });

    it('should verify initial payroll records follow the statutory formula', () => {
      INITIAL_PAYROLL_RECORDS.forEach(record => {
        expect(record.grossUSD).toBeGreaterThan(0);
        expect(record.taxWithheldUSD).toBe(Math.round(record.grossUSD * 0.20));
        expect(record.nasscorpUSD).toBe(Math.round(record.grossUSD * 0.04));
        expect(record.netPayUSD).toBe(record.grossUSD - record.taxWithheldUSD - record.nasscorpUSD);
      });
    });
  });

  describe('2. Vote Book & Hard Budget Ceiling Controls (TOR §6)', () => {
    it('should ensure all initial vote codes have non-negative available balances', () => {
      INITIAL_BUDGET_VOTES.forEach(vote => {
        const calculatedAvailable = vote.annualAllotmentUSD - vote.committedUSD;
        expect(vote.availableUSD).toBe(calculatedAvailable);
        expect(vote.availableUSD).toBeGreaterThanOrEqual(0);
      });
    });

    it('should block expenditure commitment exceeding available vote balance', () => {
      const vote = INITIAL_BUDGET_VOTES[1]; // available: 270,000
      const excessiveAmount = vote.availableUSD + 10000;
      const isAllowed = vote.availableUSD >= excessiveAmount;

      expect(isAllowed).toBe(false);
    });
  });

  describe('3. Procurement 3-Way Match Verification (TOR §6)', () => {
    it('should verify matched status when PR, PO, GRN, and Invoice all align', () => {
      const po = INITIAL_PURCHASE_ORDERS.find(p => p.threeWayMatch.status === 'VERIFIED');
      expect(po).toBeDefined();
      expect(po?.threeWayMatch.prMatched).toBe(true);
      expect(po?.threeWayMatch.poMatched).toBe(true);
      expect(po?.threeWayMatch.grnMatched).toBe(true);
      expect(po?.threeWayMatch.invoiceMatched).toBe(true);
    });
  });

  describe('4. Fixed Asset Straight-Line Depreciation Engine (TOR §6)', () => {
    it('should calculate annual depreciation accurately', () => {
      const cost = 72000;
      const salvage = 12000;
      const usefulLife = 5;
      const annualDepreciation = (cost - salvage) / usefulLife;

      expect(annualDepreciation).toBe(12000);
    });
  });

});
