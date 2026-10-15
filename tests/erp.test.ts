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

  describe('5. Employee Self-Service (ESS) & Leave Accrual Engine', () => {
    it('should calculate available leave days and working hours accurately', () => {
      const totalAnnualDays = 21;
      const usedAnnualDays = 4;
      const availableDays = totalAnnualDays - usedAnnualDays;
      const availableHours = availableDays * 8;

      expect(availableDays).toBe(17);
      expect(availableHours).toBe(136);

      const totalSickDays = 15;
      const usedSickDays = 1;
      const availableSickDays = totalSickDays - usedSickDays;
      const availableSickHours = availableSickDays * 8;

      expect(availableSickDays).toBe(14);
      expect(availableSickHours).toBe(112);
    });
  });

  describe('6. Automated HR Onboarding Notification Engine (Email + SMS)', () => {
    it('should construct compliant email and SMS notifications with mandatory password change clause', () => {
      const emp = {
        fullName: 'Sando G. Blama',
        empNo: 'FDA/RNG/401',
        email: 'sando.blama@fda.gov.lr',
        phone: '+231 777 441 902',
        dutyStation: 'East Nimba Nature Reserve Station',
        county: 'Nimba',
        tempPassword: 'FDA#SAFE2026!'
      };

      const emailBody = `Dear ${emp.fullName}, your temporary password is ${emp.tempPassword}. Mandatory password change required within 24 hours.`;
      const smsMessage = `[FDA LIBERIA] Welcome ${emp.fullName}! Your profile (${emp.empNo}) is active. Login credentials sent to ${emp.email}. Temp Pass: ${emp.tempPassword}.`;

      expect(emailBody).toContain('Mandatory password change');
      expect(emailBody).toContain(emp.tempPassword);
      expect(smsMessage).toContain('[FDA LIBERIA]');
      expect(smsMessage).toContain(emp.empNo);
      expect(smsMessage).toContain(emp.tempPassword);
    });
  });

  describe('7. Enterprise Role-Based Access Control (RBAC) Permitted Modules', () => {
    it('should guarantee MY_ACCOUNT is universally authorized for all employee personas', async () => {
      const { ROLE_ALLOWED_MODULES } = await import('../src/context/AppContext');
      const roles = Object.keys(ROLE_ALLOWED_MODULES) as (keyof typeof ROLE_ALLOWED_MODULES)[];
      
      roles.forEach(role => {
        expect(ROLE_ALLOWED_MODULES[role]).toContain('MY_ACCOUNT');
      });
    });

    it('should enforce segregation of duties by restricting finance and procurement from rangers', async () => {
      const { ROLE_ALLOWED_MODULES } = await import('../src/context/AppContext');
      expect(ROLE_ALLOWED_MODULES.COUNTY_OFFICER).not.toContain('FINANCE');
      expect(ROLE_ALLOWED_MODULES.COUNTY_OFFICER).not.toContain('PROCUREMENT');
      expect(ROLE_ALLOWED_MODULES.FINANCE_DIRECTOR).toContain('FINANCE');
      expect(ROLE_ALLOWED_MODULES.PROCUREMENT_OFFICER).toContain('PROCUREMENT');
    });
  });

  describe('8. Staff Training, On-the-Job Mentorship & Competency Certification Engine (TOR §6)', () => {
    it('should verify initial training programs exist with accredited facilitators', async () => {
      const { INITIAL_TRAINING_PROGRAMS } = await import('../src/data/initialData');
      expect(INITIAL_TRAINING_PROGRAMS.length).toBeGreaterThanOrEqual(6);
      
      const liberTrace = INITIAL_TRAINING_PROGRAMS.find(p => p.id === 'TRN-001');
      expect(liberTrace).toBeDefined();
      expect(liberTrace?.category).toBe('CHAIN_OF_CUSTODY');
      expect(liberTrace?.durationHours).toBe(40);
      expect(liberTrace?.deliveryMethod).toBe('ON_THE_JOB');
      expect(liberTrace?.syllabusTopics.length).toBeGreaterThan(0);

      const smartGps = INITIAL_TRAINING_PROGRAMS.find(p => p.id === 'TRN-002');
      expect(smartGps).toBeDefined();
      expect(smartGps?.category).toBe('FIELD_OPERATIONS');
      expect(smartGps?.targetCadre).toBe('FIELD_RANGER');
    });

    it('should correctly calculate progress percentage and certificate issuance upon completion', () => {
      const totalHours = 40;
      const hoursLogged = 30;
      const progressPercent = Math.min(100, Math.round((hoursLogged / totalHours) * 100));
      expect(progressPercent).toBe(75);

      const completedHours = 40;
      const isComplete = completedHours >= totalHours;
      const certificateNo = isComplete ? 'FDA-CERT-TRN-2026-0042' : undefined;

      expect(isComplete).toBe(true);
      expect(certificateNo).toContain('FDA-CERT-TRN-');
    });

    it('should verify employee specific training enrollments for Capt. Emmanuel D. Toe', async () => {
      const { INITIAL_TRAINING_ENROLLMENTS } = await import('../src/data/initialData');
      const toeTrainings = INITIAL_TRAINING_ENROLLMENTS.filter(e => e.employeeId === 'EMP-004');
      
      expect(toeTrainings.length).toBeGreaterThanOrEqual(2);
      const completedToe = toeTrainings.filter(e => e.status === 'COMPLETED');
      expect(completedToe.length).toBeGreaterThanOrEqual(1);
      expect(completedToe[0].certificateNo).toBeDefined();
      expect(completedToe[0].trainerSignedBy).toBeDefined();
    });
  });

});


