import { expect, it, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { sendSignedWebhook, validateWebhookConfiguration } from '../server/integration-transport.js';
const secret='test-only-signing-key-with-at-least-32-characters';
const event={id:'isolated-test',event_type:'audit.append',aggregate_type:'audit_event',aggregate_id:'test-record',payload:{action:'test'},created_at:'2026-10-18T00:00:00Z',idempotency_key:'test:1'};
it('signs a stable payload and preserves its idempotency key across retry attempts',async()=>{
 const fetcher=vi.fn().mockResolvedValue({ok:true,status:202});
 await sendSignedWebhook(event,'https://integration.example.test/events',secret,fetcher);await sendSignedWebhook(event,'https://integration.example.test/events',secret,fetcher);
 const first=fetcher.mock.calls[0][1],retry=fetcher.mock.calls[1][1];expect(first.body).toBe(retry.body);expect(first.headers['idempotency-key']).toBe('test:1');
 expect(first.headers['x-fda-signature']).toBe(`sha256=${createHmac('sha256',secret).update(first.body).digest('hex')}`);expect(first.redirect).toBe('error');
 expect(JSON.parse(first.body).occurredAt).toBe('2026-10-18T00:00:00.000Z');
});
it('rejects insecure targets and does not call the remote transport',async()=>{
 for(const url of ['http://integration.example.test','https://user:password@integration.example.test','not-a-url'])expect(()=>validateWebhookConfiguration(url,secret)).toThrow();
 const fetcher=vi.fn();await expect(sendSignedWebhook(event,'https://integration.example.test','short',fetcher)).rejects.toThrow();expect(fetcher).not.toHaveBeenCalled();
});
it('treats rejection responses as failures eligible for outbox retry',async()=>{
 await expect(sendSignedWebhook(event,'https://integration.example.test',secret,vi.fn().mockResolvedValue({ok:false,status:503}))).rejects.toThrow('HTTP_503');
});
