import {describe,it,expect} from 'vitest';
import {validateCommitment,voucherTransition,reconcileExchange} from '../src/lib/controls';
import type {PaymentVoucher} from '../src/types';
const voucher={status:'AUDIT_REVIEW',initiator:'Maker'} as PaymentVoucher;
describe('Voucher controls',()=>{
 it('rejects absent votes and invalid amounts',()=>{for(const n of [-1,0,NaN,Infinity])expect(validateCommitment(n,100)).not.toBeNull();expect(validateCommitment(5,undefined)).not.toBeNull();});
 it('enforces the available ceiling',()=>{expect(validateCommitment(101,100)).not.toBeNull();expect(validateCommitment(100,100)).toBeNull();});
 it('blocks self approval and incorrect roles',()=>{expect(voucherTransition(voucher,'FINANCE_DIRECTOR','Maker','FINANCE_APPROVED')).not.toBeNull();expect(voucherTransition(voucher,'HR_DIRECTOR','Checker','FINANCE_APPROVED')).not.toBeNull();});
 it('enforces sequence and prevents repeated payment',()=>{expect(voucherTransition(voucher,'MANAGING_DIRECTOR','Director','MD_AUTHORIZED')).not.toBeNull();expect(voucherTransition({...voucher,status:'PAID'},'FINANCE_DIRECTOR','Checker','PAID')).not.toBeNull();});
 it('allows the ordered approval chain',()=>{expect(voucherTransition(voucher,'FINANCE_DIRECTOR','Checker','FINANCE_APPROVED')).toBeNull();expect(voucherTransition({...voucher,status:'FINANCE_APPROVED'},'MANAGING_DIRECTOR','Director','MD_AUTHORIZED')).toBeNull();expect(voucherTransition({...voucher,status:'MD_AUTHORIZED'},'FINANCE_DIRECTOR','Checker','PAID')).toBeNull();});
});
describe('Exchange reconciliation',()=>{
 const row={externalId:'DEMO-1',amount:1250,currency:'USD'};
 it('reconciles valid records',()=>expect(reconcileExchange([row],1250).valid).toBe(true));
 it('blocks duplicate and replayed identifiers',()=>{expect(reconcileExchange([row,row],2500).valid).toBe(false);expect(reconcileExchange([row],1250,['DEMO-1']).valid).toBe(false);});
 it('blocks invalid currencies, values and missing IDs',()=>{for(const r of [{...row,currency:'LRD'},{...row,amount:-5},{...row,externalId:''},{...row,amount:NaN}])expect(reconcileExchange([r],1250).valid).toBe(false);});
 it('holds mismatched totals and empty batches',()=>{expect(reconcileExchange([row],1251).valid).toBe(false);expect(reconcileExchange([],0).valid).toBe(false);});
});
