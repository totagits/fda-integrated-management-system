import {describe,it,expect} from 'vitest';
import {calculateStatutory,parseBands} from '../server/statutory-payroll.js';
const policy={bands:parseBands('70000,0\n200000,500\n800000,1500\nABOVE,2500'),employee_bps:400,employer_bps:400,injury_bps:200,non_cash_exemption_lrd_minor:'10000000'};
describe('versioned statutory payroll arithmetic',()=>{
 it('calculates progressive annualized PAYE and separate employee and employer contributions with exact cents',()=>{
  const r=calculateStatutory(policy,{gross:'25000.00',taxable:'25000.00',pensionable:'25000.00',nonCashBenefits:'0.00',other:'0.00',currency:'LRD',fx:'1'});
  expect(r.paye).toBe('179167');expect(r.employee).toBe('100000');expect(r.employerPension).toBe('100000');expect(r.injury).toBe('50000');expect(r.net).toBe('2220833');
 });
 it('converts taxable non-cash benefits to LRD, caps the annual exemption at benefit value, and uses exact FX',()=>{
  const r=calculateStatutory(policy,{gross:'1000.00',taxable:'1000.00',pensionable:'1000.00',nonCashBenefits:'100.00',other:'0.00',currency:'USD',fx:'180'});
  expect(r.annualBenefitsLrd).toBe('21600000');expect(r.benefitExemptionAppliedLrd).toBe('10000000');expect(BigInt(r.paye)).toBeGreaterThan(0n);
 });
 it('rejects incomplete, malformed, non-progressive, or incorrect last bands and impossible deductions',()=>{
  expect(()=>parseBands('70000,0')).toThrow();expect(()=>parseBands('70000,0\nABOVE,500\n200000,1000')).toThrow();
  expect(()=>calculateStatutory(policy,{gross:'1.00',taxable:'1.00',pensionable:'1.00',other:'1.00',currency:'LRD',fx:'1'})).toThrow();
 });
});
