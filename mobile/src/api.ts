// Data layer. RemoteApi calls the FastAPI backend (Supabase-backed). LocalApi runs the same
// domain rules on-device so the app is fully usable as a demo before the backend is connected.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as E from './engine';

export type GoalPatch = Partial<{ vehicle: 'motor' | 'mobil'; vehicle_price: number; dp_percent: number; months_cover: number; monthly_contribution: number }>;
export interface Api {
  mode: 'local' | 'remote';
  state(week?: number): Promise<E.View>;
  profile(p: { full_name?: string; email?: string }): Promise<E.View>;
  consents(c: Partial<E.State['consents']>): Promise<E.View>;
  finance(f: Partial<E.State['finance']> & { budgets?: Record<string, number> }): Promise<E.View>;
  addTx(t: { type: 'in' | 'out'; amount: number; category_code?: string; note?: string }): Promise<E.View>;
  goal(kind: E.GoalKind, f: GoalPatch): Promise<E.View>;
  deposit(d: { goal: E.GoalKind; amount: number; via_nabung_yuk: boolean }): Promise<E.View>;
  saveScenario(s: { tenor_months: number; stress_test: boolean }): Promise<E.View>;
  deleteScenario(id: string): Promise<E.View>;
  consult(c: { channel: 'cabang' | 'chat' | 'telepon'; slot?: string; share_summary: boolean }): Promise<E.View>;
  readNotifications(): Promise<E.View>;
  reminder(kind: 'deposit' | 'budget_review' | 'data_update', enabled: boolean): Promise<E.View>;
  exportData(): Promise<any>;
  deleteAccount(): Promise<void>;
  reset(): Promise<E.View>;
}

const env = (k: string) => (process.env as any)[k] as string | undefined;
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const API_URL = process.env.EXPO_PUBLIC_API_URL || '/api';
export const DATA_MODE: 'local' | 'remote' = (process.env.EXPO_PUBLIC_DATA_MODE as any) === 'remote' ? 'remote' : 'local';

export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { storage: AsyncStorage as any, persistSession: true, autoRefreshToken: true, detectSessionInUrl: typeof window !== 'undefined' && !!(window as any).location } }) : null;
void env;

// ------------------------------------------------------------------ local
const KEY = 'otocuan.state.v1';
export class LocalApi implements Api {
  mode = 'local' as const;
  private s: E.State | null = null;
  private week = 0;
  private async load() {
    if (this.s) return this.s;
    try { const raw = await AsyncStorage.getItem(KEY); if (raw) this.s = JSON.parse(raw); } catch {}
    if (!this.s) this.s = E.demoState(new Date());
    return this.s;
  }
  private async save(extra: Partial<E.View> = {}) {
    try { await AsyncStorage.setItem(KEY, JSON.stringify(this.s)); } catch {}
    return { ...E.fullView(this.s!, new Date(), this.week), ...extra } as E.View;
  }
  async state(week = 0) { this.week = week; await this.load(); return this.save(); }
  async profile(p: { full_name?: string; email?: string }) {
    const s = await this.load();
    if (p.full_name?.trim()) s.profile.full_name = p.full_name.trim();
    if (p.email !== undefined) s.profile.email = p.email;
    return this.save();
  }
  async consents(c: Partial<E.State['consents']>) { const s = await this.load(); Object.assign(s.consents, c); return this.save(); }
  async finance(f: Partial<E.State['finance']> & { budgets?: Record<string, number> }) {
    const s = await this.load(); const { budgets, ...rest } = f;
    Object.assign(s.finance, rest); if (budgets) Object.assign(s.budgets, budgets);
    return this.save();
  }
  async addTx(t: { type: 'in' | 'out'; amount: number; category_code?: string; note?: string }) {
    const s = await this.load();
    if (!(t.amount > 0)) throw new Error('Isi nominal dulu');
    if (t.type === 'out' && !t.category_code) throw new Error('Pilih kategori pengeluaran');
    const note = t.note || (t.type === 'out' ? E.CATEGORIES[t.category_code!][0] : 'Pemasukan lain');
    s.transactions.push({ id: E.uid(), type: t.type, category_code: t.type === 'out' ? t.category_code! : null, goal_id: null, amount: t.amount, note, via_nabung_yuk: false, occurred_on: E.iso(new Date()), created_at: new Date().toISOString() });
    if (t.type === 'out') s.budgets[t.category_code!] = (s.budgets[t.category_code!] || 0) + t.amount; else s.finance.net_income += t.amount;
    return this.save();
  }
  async goal(kind: E.GoalKind, f: GoalPatch) { const s = await this.load(); Object.assign(s.goals[kind], f); return this.save(); }
  async deposit(d: { goal: E.GoalKind; amount: number; via_nabung_yuk: boolean }) {
    const s = await this.load(); const today = new Date();
    let rewards: string[] = [];
    if (d.via_nabung_yuk) { s.gami = E.applySaving(s.gami, today); rewards = E.newlyUnlocked(s.gami.latte_total, s.unlocked_rewards); s.unlocked_rewards.push(...rewards); }
    s.goals[d.goal].saved_amount += d.amount;
    const note = d.via_nabung_yuk ? 'Nabung Yuk (latte)' : d.goal === 'down_payment' ? 'Setor DP' : 'Setor dana cadangan';
    s.transactions.push({ id: E.uid(), type: 'goal', category_code: null, goal_id: s.goals[d.goal].id, amount: d.amount, note, via_nabung_yuk: d.via_nabung_yuk, occurred_on: E.iso(today), created_at: new Date().toISOString() });
    for (const code of rewards) {
      const title = E.REWARDS.find((r) => r.code === code)!.title;
      s.notifications.unshift({ id: E.uid(), kind: 'reward', title: `Hadiah terbuka: ${title}`, body: 'Latte kamu sudah cukup. Cek di Progress & Reward.', deep_link: 'gami_progress', read_at: null, created_at: new Date().toISOString() });
    }
    return this.save({ last_deposit: { amount: d.amount, goal: d.goal, rewards_unlocked: rewards } });
  }
  async saveScenario(x: { tenor_months: number; stress_test: boolean }) {
    const s = await this.load(); const sim = E.simulate(s, x.tenor_months, x.stress_test); const g = s.goals.down_payment;
    s.scenarios.unshift({ id: E.uid(), vehicle_price: g.vehicle_price, dp_percent: g.dp_percent, tenor_months: x.tenor_months, flat_rate: sim.flat_rate, params_version: sim.params_version, monthly_payment: sim.monthly_payment, total_payment: sim.total_payment, cash_left: sim.cash_left, stress_test: x.stress_test, created_at: new Date().toISOString() });
    return this.save();
  }
  async deleteScenario(id: string) { const s = await this.load(); s.scenarios = s.scenarios.filter((x) => x.id !== id); return this.save(); }
  async consult(c: { channel: 'cabang' | 'chat' | 'telepon'; slot?: string; share_summary: boolean }) {
    const s = await this.load(); const t = new Date();
    const ref = `OC-${String(t.getFullYear()).slice(2)}${String(t.getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const req = { id: E.uid(), channel: c.channel, slot: c.channel === 'telepon' ? c.slot : null, share_summary: c.share_summary, reference_code: ref, status: 'submitted', created_at: t.toISOString() };
    s.consultations.unshift({ ...req, summary: c.share_summary ? E.summaryForConsultation(s, t) : null });
    return this.save({ consultation: req });
  }
  async readNotifications() { const s = await this.load(); s.notifications.forEach((n) => (n.read_at = n.read_at || new Date().toISOString())); return this.save(); }
  async reminder(kind: 'deposit' | 'budget_review' | 'data_update', enabled: boolean) { const s = await this.load(); s.reminders[kind] = enabled; return this.save(); }
  async exportData() { const s = await this.load(); return { exported_at: new Date().toISOString(), ...s }; }
  async deleteAccount() { const s = await this.load(); s.profile.delete_requested_at = new Date().toISOString(); await this.save(); }
  async reset() { this.s = E.demoState(new Date()); return this.save(); }
}

// ------------------------------------------------------------------ remote
export class RemoteApi implements Api {
  mode = 'remote' as const;
  private demoId: string | null = null;
  private async headers() {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    const session = supabase ? (await supabase.auth.getSession()).data.session : null;
    if (session) h.Authorization = `Bearer ${session.access_token}`;
    else {
      if (!this.demoId) {
        try { this.demoId = await AsyncStorage.getItem('otocuan.demo'); } catch {}
        if (!this.demoId) { this.demoId = 'demo-' + E.uid(); try { await AsyncStorage.setItem('otocuan.demo', this.demoId); } catch {} }
      }
      h['X-Demo-User'] = this.demoId;
    }
    return h;
  }
  private async call(method: string, path: string, body?: any) {
    const res = await fetch(`${API_URL}${path}`, { method, headers: await this.headers(), body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Gagal terhubung ke server. Coba lagi.');
    return data;
  }
  state = (week = 0) => this.call('GET', `/state?week=${week}`);
  profile = (p: any) => this.call('PUT', '/profile', p);
  consents = (c: any) => this.call('PUT', '/consents', c);
  finance = (f: any) => this.call('PUT', '/finance', f);
  addTx = (t: any) => this.call('POST', '/transactions', t);
  goal = (kind: E.GoalKind, f: GoalPatch) => this.call('PUT', `/goals/${kind}`, f);
  deposit = (d: any) => this.call('POST', '/deposits', d);
  saveScenario = (s: any) => this.call('POST', '/scenarios', s);
  deleteScenario = (id: string) => this.call('DELETE', `/scenarios/${id}`);
  consult = (c: any) => this.call('POST', '/consultations', c);
  readNotifications = () => this.call('POST', '/notifications/read');
  reminder = (kind: string, enabled: boolean) => this.call('PUT', `/reminders/${kind}`, { enabled });
  exportData = () => this.call('POST', '/export');
  deleteAccount = async () => { await this.call('POST', '/account/delete'); };
  reset = () => this.call('POST', '/demo/reset');
}

// Remote mode: signed-in users talk to the backend; without a session the app stays fully usable
// as an on-device demo (persona Steven), so anyone can explore every feature before logging in.
export async function hasSession() {
  if (DATA_MODE !== 'remote' || !supabase) return false;
  return !!(await supabase.auth.getSession()).data.session;
}
const local = new LocalApi();
const remote = new RemoteApi();
const pick = async (): Promise<Api> => ((await hasSession()) ? remote : local);
export const api: Api = DATA_MODE !== 'remote' ? local : new Proxy({} as Api, {
  get(_t, prop: keyof Api) {
    if (prop === 'mode') return 'remote';
    return async (...args: any[]) => ((await pick()) as any)[prop](...args);
  },
});

// ------------------------------------------------------------------ auth
export async function sendOtp(target: { phone?: string; email?: string }) {
  if (DATA_MODE !== 'remote' || !supabase) return { demo: true };
  const redirect = typeof window !== 'undefined' && (window as any).location ? (window as any).location.origin : undefined;
  const { error } = target.email
    ? await supabase.auth.signInWithOtp({ email: target.email, options: { emailRedirectTo: redirect } })
    : await supabase.auth.signInWithOtp({ phone: target.phone! });
  if (error) throw new Error(error.message);
  return { demo: false };
}
export async function verifyOtp(target: { phone?: string; email?: string }, token: string) {
  if (DATA_MODE !== 'remote' || !supabase) return true;
  const { error } = target.email
    ? await supabase.auth.verifyOtp({ email: target.email, token, type: 'email' })
    : await supabase.auth.verifyOtp({ phone: target.phone!, token, type: 'sms' });
  if (error) throw new Error('Kode salah atau kedaluwarsa.');
  return true;
}
export async function signOut() { if (supabase) await supabase.auth.signOut(); }
