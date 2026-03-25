'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ViewerSession = {
  id: string;
  username: string;
  role?: string;
} | null;

type ViewerContextValue = {
  viewer: ViewerSession;
  loading: boolean;
  refresh: () => Promise<void>;
};

const ViewerContext = createContext<ViewerContextValue | null>(null);

export function ViewerProvider({ children }: { children: ReactNode }) {
  const [viewer, setViewer] = useState<ViewerSession>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const data = (await res.json()) as { ok?: boolean; user?: { id: string; username: string; role?: string } };
      if (data?.ok && data.user?.id) {
        setViewer({
          id: data.user.id,
          username: data.user.username,
          role: data.user.role,
        });
      } else {
        setViewer(null);
      }
    } catch {
      setViewer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ viewer, loading, refresh }), [viewer, loading, refresh]);

  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}

export function useViewer(): ViewerContextValue {
  const ctx = useContext(ViewerContext);
  if (!ctx) {
    return { viewer: null, loading: false, refresh: async () => {} };
  }
  return ctx;
}
