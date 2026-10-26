'use client';

import { useState } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { get, set, del } from 'idb-keyval';

const DAY = 1000 * 60 * 60 * 24;

export default function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, gcTime: DAY, retry: 2, refetchOnWindowFocus: false },
        },
      })
  );

  const [persister] = useState(() =>
    createAsyncStoragePersister({
      storage:
        typeof window === 'undefined'
          ? undefined
          : {
              getItem: (k) => get(k),
              setItem: (k, v) => set(k, v),
              removeItem: (k) => del(k),
            },
    })
  );

  return (
    <PersistQueryClientProvider client={client} persistOptions={{ persister, maxAge: DAY }}>
      {children}
    </PersistQueryClientProvider>
  );
}
