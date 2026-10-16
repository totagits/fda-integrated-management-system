import {describe,it,expect} from 'vitest';
import {canRead,canAct,ROLE_MODULES,inCounty} from '../src/lib/rbac';
import type {UserRole} from '../src/types';
describe('Role-based access regression',()=>{
 it('keeps county officers out of payroll, finance and technical administration',()=>{for(const m of ['HRMIS','FINANCE','SECURITY','RTM','INTEGRATION','GRANTS','REVENUE','AUDIT'])expect(canRead('COUNTY_OFFICER',m)).toBe(false);});
 it('provides self-service without HR administration to departmental users',()=>{for(const r of ['FINANCE_DIRECTOR','PROCUREMENT_OFFICER','ASSET_OFFICER','COUNTY_OFFICER'] as UserRole[]){expect(canRead(r,'MY_ACCOUNT')).toBe(true);expect(canRead(r,'HRMIS')).toBe(false);}});
 it('separates operational roles',()=>{expect(canAct('HR_DIRECTOR','finance')).toBe(false);expect(canAct('FINANCE_DIRECTOR','hr')).toBe(false);expect(canAct('PROCUREMENT_OFFICER','assets')).toBe(false);expect(canAct('ASSET_OFFICER','procurement')).toBe(false);});
 it('denies every institutional mutation to auditors',()=>{for(const a of ['hr','payroll','finance','procurement','assets','field','executive','receipt','security','grant','legal','community'])expect(canAct('INTERNAL_AUDITOR',a)).toBe(false);});
 it('retains audit read coverage without architecture or connector administration',()=>{expect(canRead('INTERNAL_AUDITOR','AUDIT')).toBe(true);expect(canRead('INTERNAL_AUDITOR','ASSETS')).toBe(true);expect(canRead('INTERNAL_AUDITOR','SECURITY')).toBe(false);expect(canRead('INTERNAL_AUDITOR','INTEGRATION')).toBe(false);});
 it('defaults unknown resources and actions to deny',()=>{for(const r of Object.keys(ROLE_MODULES) as UserRole[]){expect(canRead(r,'UNKNOWN')).toBe(false);expect(canAct(r,'UNKNOWN')).toBe(false);}});
 it('limits county asset locations',()=>{expect(inCounty('Nimba Field Office','Nimba')).toBe(true);expect(inCounty('Whein Town HQ','Nimba')).toBe(false);});
});
