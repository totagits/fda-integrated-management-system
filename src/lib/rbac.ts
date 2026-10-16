import type { UserRole } from '../types';
export const ROLE_MODULES = {
 MANAGING_DIRECTOR:['DASHBOARD','MY_ACCOUNT','HRMIS','FINANCE','PROCUREMENT','ASSETS','OPERATIONS','REVENUE','COMPLIANCE','COMMUNITY','BIODIVERSITY','GRANTS','RTM','AUDIT','SECURITY','INTEGRATION'],
 FINANCE_DIRECTOR:['DASHBOARD','MY_ACCOUNT','FINANCE','REVENUE','GRANTS','INTEGRATION'],
 HR_DIRECTOR:['DASHBOARD','MY_ACCOUNT','HRMIS'],
 PROCUREMENT_OFFICER:['DASHBOARD','MY_ACCOUNT','PROCUREMENT'],
 ASSET_OFFICER:['DASHBOARD','MY_ACCOUNT','ASSETS'],
 COUNTY_OFFICER:['DASHBOARD','MY_ACCOUNT','ASSETS','OPERATIONS','COMPLIANCE','COMMUNITY','BIODIVERSITY'],
 INTERNAL_AUDITOR:['DASHBOARD','MY_ACCOUNT','HRMIS','FINANCE','PROCUREMENT','ASSETS','OPERATIONS','REVENUE','COMPLIANCE','COMMUNITY','BIODIVERSITY','GRANTS','RTM','AUDIT']
} as const;
export function canRead(role:UserRole,module:string){return (ROLE_MODULES[role] as readonly string[]).includes(module);}
const actions:Record<string,readonly UserRole[]>={
 hr:['HR_DIRECTOR'],payroll:['HR_DIRECTOR'],finance:['FINANCE_DIRECTOR'],procurement:['PROCUREMENT_OFFICER'],assets:['ASSET_OFFICER'],field:['COUNTY_OFFICER'],executive:['MANAGING_DIRECTOR'],receipt:['COUNTY_OFFICER','ASSET_OFFICER'],security:['MANAGING_DIRECTOR'],grant:['FINANCE_DIRECTOR'],legal:['MANAGING_DIRECTOR'],community:['COUNTY_OFFICER','MANAGING_DIRECTOR']
};
export function canAct(role:UserRole,action:string){return actions[action]?.includes(role)??false;}
export function inCounty(value:string,county:string){return value.toLowerCase().includes(county.toLowerCase());}
