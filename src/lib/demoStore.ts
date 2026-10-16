import { useEffect, useState } from 'react';
export const PREFIX='totag-fda-demo-v2:';
export function useDemoState<T>(key: string, seed: T) {
  const [state,setState]=useState<T>(()=>{try {const v=localStorage.getItem(PREFIX+key);return v?JSON.parse(v):seed;}catch{return seed;}});
  useEffect(()=>{try{localStorage.setItem(PREFIX+key,JSON.stringify(state));}catch{window.dispatchEvent(new Event('fda-storage-error'));}},[key,state]);
  return [state,setState] as const;
}
export function resetDemo(){Object.keys(localStorage).filter(k=>k.startsWith(PREFIX)).forEach(k=>localStorage.removeItem(k));location.reload();}
