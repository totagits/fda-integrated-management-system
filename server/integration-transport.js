import { createHmac } from 'node:crypto';
export function validateWebhookConfiguration(target,secret){
 let url;try{url=new URL(target);}catch{throw new Error('Webhook requires a valid HTTPS URL.');}
 if(url.protocol!=='https:'||url.username||url.password||url.hash||String(secret).length<32)throw new Error('Webhook requires HTTPS without embedded credentials and a secret of at least 32 characters.');
 return url.href;
}
export async function sendSignedWebhook(item,target,secret,fetcher=fetch){
 const url=validateWebhookConfiguration(target,secret);
 const body=JSON.stringify({id:item.id,eventType:item.event_type,aggregateType:item.aggregate_type,aggregateId:item.aggregate_id,payload:item.payload,occurredAt:new Date(item.created_at).toISOString()});
 const signature=createHmac('sha256',secret).update(body).digest('hex');
 const response=await fetcher(url,{method:'POST',redirect:'error',headers:{'content-type':'application/json','x-fda-signature':`sha256=${signature}`,'idempotency-key':item.idempotency_key},body,signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw new Error(`HTTP_${response.status}`);
 // An HTTP acknowledgement proves transport acceptance, not business processing or durable archival.
 return {status:response.status};
}
