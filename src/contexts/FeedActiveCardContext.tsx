'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';

type FeedRegisterContextValue = {
  registerCard: (id: string, el: HTMLElement | null) => void;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
};

type FeedActiveCardContextValue = {
  activeCardId: string | null;
  registerCard: (id: string, el: HTMLElement | null) => void;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
};

const FeedRegisterContext = createContext<FeedRegisterContextValue | null>(null);
const FeedActiveCardContext = createContext<string | null>(null);

/** Primary card: dominant viewport share; tuned for snap slots ~100dvh */
const VISIBILITY_THRESHOLD = 0.62;
const ROOT_MARGIN = '-12% 0px -12% 0px';

export function FeedActiveCardProvider({
  children,
  scrollContainerRef,
}: {
  children: ReactNode;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const entriesRef = useRef<Map<string, HTMLElement>>(new Map());
  const ratiosRef = useRef<Map<string, number>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);

  const registerCard = useCallback((id: string, el: HTMLElement | null) => {
    const observer = observerRef.current;
    if (el) {
      el.dataset.feedCardId = id;
      entriesRef.current.set(id, el);
      if (observer) observer.observe(el);
    } else {
      const prev = entriesRef.current.get(id);
      if (prev && observer) observer.unobserve(prev);
      entriesRef.current.delete(id);
      ratiosRef.current.delete(id);
    }
  }, []);

  useEffect(() => {
    const root = scrollContainerRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (intersectionEntries) => {
        intersectionEntries.forEach((entry) => {
          const id = (entry.target as HTMLElement).dataset.feedCardId;
          if (id) ratiosRef.current.set(id, entry.intersectionRatio);
        });
        const above = Array.from(ratiosRef.current.entries()).filter(
          ([_, r]) => r >= VISIBILITY_THRESHOLD
        );
        if (above.length === 0) {
          setActiveCardId((prev) => (prev ? null : prev));
          return;
        }
        above.sort((a, b) => b[1] - a[1]);
        const next = above[0][0];
        setActiveCardId((prev) => (prev === next ? prev : next));
      },
      {
        root,
        rootMargin: ROOT_MARGIN,
        threshold: [0, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 1],
      }
    );
    observerRef.current = observer;

    const entries = Array.from(entriesRef.current.entries());
    entries.forEach(([id, el]) => {
      el.dataset.feedCardId = id;
      observer.observe(el);
    });

    return () => {
      entries.forEach(([, el]) => observer.unobserve(el));
      observerRef.current = null;
    };
  }, [scrollContainerRef]);

  const registerValue = useMemo(
    () => ({ registerCard, scrollContainerRef }),
    [registerCard, scrollContainerRef]
  );

  return (
    <FeedRegisterContext.Provider value={registerValue}>
      <FeedActiveCardContext.Provider value={activeCardId}>
        {children}
      </FeedActiveCardContext.Provider>
    </FeedRegisterContext.Provider>
  );
}

/** Use in VideoFeedCard — stable, does not re-render when activeCardId changes */
export function useFeedRegister(): FeedRegisterContextValue | null {
  return useContext(FeedRegisterContext);
}

/** Use in FeedVideoList — re-renders when activeCardId changes */
export function useFeedActiveCard(): FeedActiveCardContextValue | null {
  const activeCardId = useContext(FeedActiveCardContext);
  const register = useContext(FeedRegisterContext);
  return useMemo(() => {
    if (!register) return null;
    return { ...register, activeCardId };
  }, [register, activeCardId]);
}
