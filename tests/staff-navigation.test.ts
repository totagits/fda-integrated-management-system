import { describe, expect, it } from 'vitest';
import { staffSections } from '../src/components/secure/StaffShell';
describe('authenticated staff navigation',()=>{
 it('keeps procurement publication and administration out of county navigation',()=>{
  const ids=staffSections(['COUNTY_OFFICER']).map(s=>s.id);
  expect(ids).toContain('workflow'); expect(ids).toContain('assets');
  expect(ids).not.toContain('setup'); expect(ids).not.toContain('publication'); expect(ids).not.toContain('audit');
 });
 it('does not send HR staff into procurement workspaces',()=>expect(staffSections(['HR_DIRECTOR']).map(s=>s.id)).toEqual(['overview','account']));
 it('combines assigned roles without an impersonation selector',()=>{
  const ids=staffSections(['FINANCE_DIRECTOR','PROCUREMENT_OFFICER']).map(s=>s.id);
  expect(ids).toContain('finance');expect(ids).toContain('publication');expect(ids).not.toContain('setup');
 });
});
