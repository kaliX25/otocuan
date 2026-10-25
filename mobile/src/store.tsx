import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, Api } from './api';
import type { View as AppView } from './engine';

export type Route = { name: string; params?: any };
export const TAB_ROOTS = ['home', 'finance', 'goal_dp', 'goal_ef', 'planner', 'readiness'];

type Nav = {
  route: Route; stack: Route[];
  go: (name: string, params?: any) => void; back: () => void; tab: (name: string) => void;
  replace: (name: string, params?: any) => void; reset: (name: string, params?: any) => void;
  open: (deepLink: string | null) => void;
};
type Ctx = {
  view: AppView | null; busy: boolean; nav: Nav; route: Route; toast: string; say: (m: string) => void;
  run: (fn: (a: Api) => Promise<AppView | void>, ok?: string) => Promise<AppView | null>;
  week: number; setWeek: (w: number) => void;
};
const AppCtx = createContext<Ctx>(null as any);
export const useApp = () => useContext(AppCtx);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<Route[]>([{ name: 'splash' }]);
  const [view, setView] = useState<AppView | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [week, setWeekState] = useState(0);
  const timer = useRef<any>(null);

  const say = useCallback((m: string) => {
    setToast(m); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(''), 2400);
  }, []);

  useEffect(() => { api.state(0).then(setView).catch((e) => say(e.message)); return () => clearTimeout(timer.current); }, [say]);

  const run = useCallback(async (fn: (a: Api) => Promise<AppView | void>, ok?: string) => {
    setBusy(true);
    try {
      const v = await fn(api);
      if (v) setView(v);
      if (ok) say(ok);
      return (v as AppView) || null;
    } catch (e: any) { say(e?.message || 'Terjadi kesalahan. Coba lagi.'); return null; }
    finally { setBusy(false); }
  }, [say]);

  const setWeek = useCallback((w: number) => { setWeekState(w); api.state(w).then(setView).catch((e) => say(e.message)); }, [say]);

  const nav: Nav = useMemo(() => {
    const go = (name: string, params?: any) => setStack((s) => [...s, { name, params }]);
    const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : [{ name: 'home' }]));
    const tab = (name: string) => setStack([{ name }]);
    const replace = (name: string, params?: any) => setStack((s) => [...s.slice(0, -1), { name, params }]);
    const reset = (name: string, params?: any) => setStack([{ name, params }]);
    const open = (link: string | null) => {
      if (!link) return;
      const [name, arg] = link.split(':');
      if (name === 'txlist') go('txlist', { cat: arg, filter: 'out' }); else go(name);
    };
    return { route: stack[stack.length - 1], stack, go, back, tab, replace, reset, open };
  }, [stack]);

  return <AppCtx.Provider value={{ view, busy, nav, route: nav.route, toast, say, run, week, setWeek }}>{children}</AppCtx.Provider>;
}
