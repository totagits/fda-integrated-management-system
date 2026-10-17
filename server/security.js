import crypto from 'node:crypto';

export async function hashPassword(password) {
  const salt=crypto.randomBytes(16);
  const derived=await new Promise((resolve,reject)=>crypto.scrypt(password,salt,64,{N:1<<15,r:8,p:1,maxmem:64*1024*1024},(error,key)=>error?reject(error):resolve(key)));
  return `scrypt$32768$8$1$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export async function verifyPassword(password,stored) {
  try {
    const [algorithm,n,r,p,saltHex,keyHex]=stored.split('$');
    if(algorithm!=='scrypt'||Number(n)!==(1<<15)||Number(r)!==8||Number(p)!==1) return false;
    const expected=Buffer.from(keyHex,'hex');
    const actual=await new Promise((resolve,reject)=>crypto.scrypt(password,Buffer.from(saltHex,'hex'),expected.length,{N:Number(n),r:Number(r),p:Number(p),maxmem:64*1024*1024},(error,key)=>error?reject(error):resolve(key)));
    return actual.length===expected.length&&crypto.timingSafeEqual(actual,expected);
  } catch { return false; }
}
