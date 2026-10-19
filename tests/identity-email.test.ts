import { afterEach, expect, it, vi } from 'vitest';
import { identityEmailConfigured, sendBidderVerification, sendBidderExpiryReminder, sendPasswordReset, sendPasswordResetConfirmation } from '../server/identity-email.js';

const keys=['RESEND_API_KEY','RESEND_FROM_EMAIL','SMTP_HOST','SMTP_FROM','SMTP_PORT','SMTP_USER','SMTP_PASSWORD','PUBLIC_APP_URL'] as const;
const original=Object.fromEntries(keys.map(key=>[key,process.env[key]]));
afterEach(()=>{for(const key of keys){const value=original[key];if(value===undefined)delete process.env[key];else process.env[key]=value;}vi.restoreAllMocks();});

it('sends supplier verification and expiration notices through configured Resend delivery',async()=>{
 process.env.RESEND_API_KEY='test-only-resend-key';process.env.RESEND_FROM_EMAIL='FDA Procurement <portal@example.test>';process.env.PUBLIC_APP_URL='https://fda.example.test';delete process.env.SMTP_HOST;delete process.env.SMTP_FROM;
 const fetchMock=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({id:'test-message'}),{status:200,headers:{'content-type':'application/json'}}));
 expect(identityEmailConfigured()).toBe(true);
 await sendBidderVerification({email:'supplier@example.test',companyName:'Supplier Ltd',token:'A'.repeat(43),expiresAt:new Date('2026-10-20T00:00:00Z')});
 await sendBidderExpiryReminder({email:'supplier@example.test',companyName:'Supplier Ltd',documentType:'TAX_CLEARANCE',expiresOn:'2026-11-01',daysBefore:14});
 expect(fetchMock).toHaveBeenCalledTimes(2);
 const verification=JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
 expect(verification.to).toEqual(['supplier@example.test']);expect(verification.from).toContain('portal@example.test');expect(verification.html).toContain('https://fda.example.test/bidder/verify?token=');
 const reminder=JSON.parse(String(fetchMock.mock.calls[1][1]?.body));expect(reminder.subject).toContain('14 day');expect(reminder.text).toContain('2026-11-01');
});

it('surfaces provider rejection instead of marking a reminder delivered',async()=>{
 process.env.RESEND_API_KEY='test-only-resend-key';process.env.RESEND_FROM_EMAIL='FDA Procurement <portal@example.test>';delete process.env.SMTP_HOST;delete process.env.SMTP_FROM;
 vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response('rejected',{status:422}));
 await expect(sendBidderExpiryReminder({email:'supplier@example.test',companyName:'Supplier Ltd',documentType:'BUSINESS_REGISTRATION',expiresOn:'2026-11-01',daysBefore:7})).rejects.toMatchObject({code:'RESEND_HTTP_422'});
});

it('sends password recovery links only to the registered address and sends a change notice',async()=>{
 process.env.RESEND_API_KEY='test-only-resend-key';process.env.RESEND_FROM_EMAIL='FDA Staff <staff@example.test>';process.env.PUBLIC_APP_URL='https://fda.example.test';delete process.env.SMTP_HOST;delete process.env.SMTP_FROM;
 const fetchMock=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response(JSON.stringify({id:'test-message'}),{status:200,headers:{'content-type':'application/json'}}));
 const expiresAt=new Date('2026-10-19T18:30:00Z');
 await sendPasswordReset({email:'md@example.test',fullName:'FDA Managing Director',token:'R'.repeat(43),expiresAt});
 await sendPasswordResetConfirmation({email:'md@example.test',fullName:'FDA Managing Director'});
 expect(fetchMock).toHaveBeenCalledTimes(2);
 const message=JSON.parse(String(fetchMock.mock.calls[0][1]?.body));expect(message.to).toEqual(['md@example.test']);expect(message.subject).toContain('Reset');expect(message.text).toContain('https://fda.example.test/secure/reset-password?token=');expect(message.text).toContain(expiresAt.toUTCString());
 const notice=JSON.parse(String(fetchMock.mock.calls[1][1]?.body));expect(notice.to).toEqual(['md@example.test']);expect(notice.subject).toContain('password was changed');
});
