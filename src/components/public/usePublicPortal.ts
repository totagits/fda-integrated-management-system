import { useCallback, useEffect, useState } from 'react';
import type { PublicTenderNotice } from '../../types';

export type PublishedTender = Omit<PublicTenderNotice, 'estimatedBudgetUSD' | 'status'> & {
  estimatedBudgetUSD: number | null;
  status: 'OPEN_FOR_EXPRESSIONS' | 'CLOSED';
  publicationStatus: 'DRAFT' | 'PUBLISHED' | 'WITHDRAWN';
};
type PublishedClarification = {
  id: string; tenderRef: string; question: string; officialResponse: string;
  responseDate: string; status: 'ANSWERED'; respondedBy: string;
};

export async function publicApi<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('The public records service is unavailable. Please try again later.');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'The request could not be completed.');
  return data as T;
}

export function usePublicPortal() {
  const [publicTenders, setTenders] = useState<PublishedTender[]>([]);
  const [bidderQueries, setQueries] = useState<PublishedClarification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [tenders, queries] = await Promise.all([
        publicApi<PublishedTender[]>('/api/public/tenders'),
        publicApi<PublishedClarification[]>('/api/public/clarifications'),
      ]);
      setTenders(tenders); setQueries(queries);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load public records.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  return { publicTenders, bidderQueries, loading, error, reload };
}
