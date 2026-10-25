// Domain rules, mirrored from backend/app/engine.py so the app also works offline (demo mode).
// Figures are estimates from user input, never a credit decision.

export const PARAMS_VERSION = 'demo-2026-10';
export const RULES_VERSION = 'rules-1.0';
export const FLAT_RATE_ANNUAL = 0.06; // illustrative only, not an official OTO Finance rate
export const STRESS_INCOME_DROP = 0.1;
export const GOAL_THRESHOLD = 0.5;
export const LATTE_CYCLE = 10;
export const TENORS = [36, 48, 60] as const;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTHS_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export const CATEGORIES: Record<string, [string, string]> = {
  makan: ['Makan & nongkrong', '#FF7702'],
  rumah: ['Kos & rumah', '#0088A3'],
  transport: ['Transportasi', '#5FB8CB'],
  tagihan: ['Tagihan', '#FCC025'],
  belanja: ['Belanja', '#8E6CC8'],
  lain: ['Lainnya', '#A9B8BE'],
};
export const REWARDS = [
  { code: 'voucher_kopi', title: 'Voucher kopi', latte_required: 10 },
  { code: 'cashback_saldo', title: 'Cashback saldo', latte_required: 20 },
  { code: 'tote_bag', title: 'Exclusive tote bag', latte_required: 30 },
];

export type GoalKind = 'down_payment' | 'emergency';
export type Tx = {
  id: string; type: 'in' | 'out' | 'goal'; category_code: string | null; goal_id: string | null;
  amount: number; note: string; via_nabung_yuk: boolean; occurred_on: string; created_at: string;
};
export type Scenario = {
  id: string; vehicle_price: number; dp_percent: number; tenor_months: number; flat_rate: number; params_version: string;
  monthly_payment: number; total_payment: number; cash_left: number; stress_test: boolean; created_at: string;
};
export type Notification = { id: string; kind: string; title: string; body: string; deep_link: string | null; read_at: string | null; created_at: string };
export type State = {
  profile: { full_name: string; phone: string; email: string; delete_requested_at?: string | null };
  consents: { terms: boolean; marketing: boolean; share_summary: boolean };
  finance: { net_income: number; essential_expense: number; obligations: number };
  budgets: Record<string, number>;
  goals: {
    down_payment: { id: string; vehicle: 'motor' | 'mobil'; vehicle_price: number; dp_percent: number; monthly_contribution: number; saved_amount: number };
    emergency: { id: string; months_cover: number; monthly_contribution: number; saved_amount: number };
  };
  transactions: Tx[];
  gami: { latte_total: number; current_streak: number; longest_streak: number; last_saving_date: string | null };
  unlocked_rewards: string[];
  scenarios: Scenario[];
  notifications: Notification[];
  reminders: Record<'deposit' | 'budget_review' | 'data_update', boolean>;
  consultations: any[];
};

// ---------------------------------------------------------------- dates
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const dayDiff = (a: Date, b: Date) => Math.round((parse(iso(a)).getTime() - parse(iso(b)).getTime()) / 86400000);
export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const nowIso = () => new Date().toISOString();

export function monthLabel(base: Date, ahead: number) {
  if (ahead <= 0) return 'Tercapai';
  const idx = base.getMonth() + ahead;
  return `${MONTHS[idx % 12]} ${base.getFullYear() + Math.floor(idx / 12)}`;
}
const monthsToReach = (short: number, monthly: number) => (short <= 0 ? 0 : monthly <= 0 ? 999 : Math.ceil(short / monthly));

// ---------------------------------------------------------------- finance
export const expenseTotal = (s: State) => Object.values(s.budgets).reduce((a, b) => a + b, 0);
export const cashLeft = (s: State) => s.finance.net_income - expenseTotal(s) - s.finance.obligations;
export const plannedSaving = (s: State) => s.goals.down_payment.monthly_contribution + s.goals.emergency.monthly_contribution;
export const safeToSpend = (s: State) => cashLeft(s) - plannedSaving(s);
export const dpTarget = (g: State['goals']['down_payment']) => Math.round((g.vehicle_price * g.dp_percent) / 100);
export const emergencyTarget = (s: State) => s.finance.essential_expense * s.goals.emergency.months_cover;

export function goalView(s: State, kind: GoalKind, today: Date) {
  const g = s.goals[kind];
  const target = kind === 'down_payment' ? dpTarget(s.goals.down_payment) : emergencyTarget(s);
  const saved = g.saved_amount;
  const percent = target ? Math.min(100, Math.round((saved / target) * 100)) : 0;
  const months = monthsToReach(target - saved, g.monthly_contribution);
  return { kind, target, saved, percent, shortfall: Math.max(0, target - saved), months_left: months, eta: monthLabel(today, months), monthly_contribution: g.monthly_contribution };
}

// ---------------------------------------------------------------- planner
export function simulate(s: State, tenor: number, stress: boolean) {
  const g = s.goals.down_payment;
  const principal = g.vehicle_price - dpTarget(g);
  const monthly = (principal * (1 + (FLAT_RATE_ANNUAL * tenor) / 12)) / tenor;
  const drop = stress ? Math.round(s.finance.net_income * STRESS_INCOME_DROP) : 0;
  const left = cashLeft(s) - monthly - drop;
  const level = left < 0 ? 'menekan' : left < 500000 ? 'ketat' : 'longgar';
  return { tenor_months: tenor, principal, monthly_payment: Math.round(monthly), total_payment: Math.round(monthly * tenor), cash_left: Math.round(left), stress_test: stress, stress_drop: drop, level, flat_rate: FLAT_RATE_ANNUAL, params_version: PARAMS_VERSION };
}

// ---------------------------------------------------------------- gamification
const streakAlive = (g: State['gami'], today: Date) => !!g.last_saving_date && dayDiff(today, parse(g.last_saving_date)) <= 1;
export const currentStreak = (g: State['gami'], today: Date) => (streakAlive(g, today) ? g.current_streak : 0);

export function applySaving(g: State['gami'], today: Date): State['gami'] {
  const t = iso(today);
  let streak: number;
  if (g.last_saving_date === t) streak = g.current_streak || 1;
  else if (g.last_saving_date && dayDiff(today, parse(g.last_saving_date)) === 1) streak = g.current_streak + 1;
  else streak = 1;
  return { latte_total: g.latte_total + 1, current_streak: streak, longest_streak: Math.max(g.longest_streak, streak), last_saving_date: t };
}
export const newlyUnlocked = (total: number, unlocked: string[]) => REWARDS.filter((r) => total >= r.latte_required && !unlocked.includes(r.code)).map((r) => r.code);
export const latteInCycle = (total: number) => (total === 0 ? 0 : total % LATTE_CYCLE === 0 ? LATTE_CYCLE : total % LATTE_CYCLE);

export function weekCalendar(s: State, today: Date, weekOffset = 0) {
  const days = new Set(s.transactions.filter((t) => t.type === 'goal' && t.via_nabung_yuk).map((t) => t.occurred_on));
  const wd = (today.getDay() + 6) % 7;
  const monday = addDays(today, -wd + weekOffset * 7);
  const out = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(monday, i); const k = iso(d);
    const diff = dayDiff(d, today);
    const status = days.has(k) ? 'saved' : diff > 0 ? 'future' : diff === 0 ? 'today' : 'missed';
    return { date: k, day: DAYS[i], num: d.getDate(), status };
  });
  return { label: `${MONTHS_FULL[monday.getMonth()]} ${monday.getFullYear()}`, week_offset: weekOffset, days: out };
}

export function gamificationView(s: State, today: Date, weekOffset = 0) {
  const g = s.gami; const total = g.latte_total; const cycle = latteInCycle(total);
  const nxt = REWARDS.find((r) => !s.unlocked_rewards.includes(r.code)) || null;
  return {
    streak: currentStreak(g, today), longest_streak: g.longest_streak,
    broken: !!g.last_saving_date && !streakAlive(g, today), saved_today: g.last_saving_date === iso(today),
    latte_total: total, latte_cycle: cycle, latte_percent: cycle * 10,
    next_reward: nxt ? { ...nxt, progress: Math.min(total, nxt.latte_required) } : null,
    rewards: REWARDS.map((r) => ({ ...r, unlocked: s.unlocked_rewards.includes(r.code) })),
    calendar: weekCalendar(s, today, weekOffset),
  };
}

// ---------------------------------------------------------------- readiness
export function readiness(s: State, today: Date) {
  const dp = goalView(s, 'down_payment', today); const ef = goalView(s, 'emergency', today);
  const left = cashLeft(s); const goodScenario = s.scenarios.some((x) => x.cash_left >= 0); const dataOk = s.finance.net_income > 0;
  const indicators = [
    { key: 'data', label: 'Kelengkapan data', good: dataOk, value: dataOk ? 'Semua bagian terisi' : 'Pendapatan belum diisi', rule: 'Pendapatan, pengeluaran, dan kewajiban sudah diisi.' },
    { key: 'cashflow', label: 'Arus kas bulanan', good: left > 0, value: `Sisa kas Rp${left.toLocaleString('id-ID')}`, rule: 'Pendapatan dikurangi pengeluaran dan kewajiban hasilnya positif.' },
    { key: 'scenario', label: 'Simulasi cicilan', good: goodScenario, value: `${s.scenarios.length} skenario tersimpan`, rule: 'Ada skenario tersimpan dengan sisa kas positif setelah cicilan.' },
    { key: 'dp', label: 'Progres DP', good: dp.percent >= GOAL_THRESHOLD * 100, value: `${dp.percent}% dari target`, rule: 'DP sudah mencapai minimal 50% dari target.' },
    { key: 'emergency', label: 'Dana cadangan', good: ef.percent >= GOAL_THRESHOLD * 100, value: `${ef.percent}% dari target`, rule: 'Dana cadangan mencapai minimal 50% dari target.' },
  ];
  const count = indicators.filter((i) => i.good).length;
  const title = count === 5 ? 'Siap untuk konsultasi' : count >= 3 ? 'Sedang membangun kesiapan' : 'Baru mulai';
  return { indicators, ready_count: count, title, rules_version: RULES_VERSION, disclaimer: 'Profil ini bukan skor kredit dan bukan jaminan persetujuan.' };
}

// ---------------------------------------------------------------- full view
export function fullView(s: State, today: Date, weekOffset = 0) {
  const exp = expenseTotal(s);
  const categories = Object.entries(s.budgets).filter(([, a]) => a > 0).map(([code, amount]) => ({ code, label: CATEGORIES[code][0], color: CATEGORIES[code][1], amount, share: exp ? Math.round((amount / exp) * 100) : 0 }));
  const safe = safeToSpend(s);
  return {
    today: iso(today), profile: s.profile, consents: s.consents, reminders: s.reminders,
    finance: { ...s.finance, expense_total: exp, cash_left: cashLeft(s), planned_saving: plannedSaving(s), safe_to_spend: safe, safe_per_day: Math.floor(Math.max(0, safe) / 7), days_to_payday: 7, categories },
    goals: { down_payment: { ...s.goals.down_payment, ...goalView(s, 'down_payment', today) }, emergency: { ...s.goals.emergency, ...goalView(s, 'emergency', today) } },
    transactions: [...s.transactions].sort((a, b) => (a.occurred_on + a.created_at < b.occurred_on + b.created_at ? 1 : -1)),
    gamification: gamificationView(s, today, weekOffset),
    planner: { tenors: TENORS.map((t) => simulate(s, t, false)), flat_rate: FLAT_RATE_ANNUAL, params_version: PARAMS_VERSION },
    scenarios: s.scenarios, readiness: readiness(s, today), notifications: s.notifications, consultations: s.consultations,
  };
}
export type View = ReturnType<typeof fullView> & { last_deposit?: { amount: number; goal: GoalKind; rewards_unlocked: string[] }; consultation?: any };

// ---------------------------------------------------------------- demo data
export function demoState(today: Date): State {
  const dpId = uid(), efId = uid();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  const tx = (p: Partial<Tx>): Tx => ({ id: uid(), type: 'out', category_code: null, goal_id: null, amount: 0, note: '', via_nabung_yuk: false, occurred_on: iso(today), created_at: nowIso(), ...p });
  const txs: Tx[] = [
    tx({ type: 'in', amount: 9500000, note: 'Gaji bulan ini', occurred_on: iso(first) }),
    tx({ type: 'out', category_code: 'tagihan', amount: 350000, note: 'Listrik dan internet', occurred_on: iso(addDays(first, Math.min(4, today.getDate() - 1))) }),
    tx({ type: 'goal', goal_id: dpId, amount: 1500000, note: 'Setor DP Mobil', occurred_on: iso(first) }),
    tx({ type: 'out', category_code: 'makan', amount: 85000, note: 'Kopi sore bareng tim', occurred_on: iso(addDays(today, -1)) }),
    tx({ type: 'out', category_code: 'transport', amount: 32000, note: 'Ojek online ke kantor', occurred_on: iso(addDays(today, -1)) }),
  ];
  for (let b = 1; b <= 7; b++) txs.push(tx({ type: 'goal', goal_id: dpId, amount: 50000, note: 'Nabung Yuk (latte)', via_nabung_yuk: true, occurred_on: iso(addDays(today, -b)) }));
  const n = (title: string, body: string, kind: string, deep_link: string): Notification => ({ id: uid(), kind, title, body, deep_link, read_at: null, created_at: nowIso() });
  return {
    profile: { full_name: 'Steven', phone: '+62 812 3456 7890', email: 'steven@email.com' },
    consents: { terms: true, marketing: false, share_summary: false },
    finance: { net_income: 9500000, essential_expense: 4000000, obligations: 800000 },
    budgets: { makan: 1900000, rumah: 1600000, transport: 900000, tagihan: 500000, belanja: 0, lain: 400000 },
    goals: {
      down_payment: { id: dpId, vehicle: 'mobil', vehicle_price: 160000000, dp_percent: 25, monthly_contribution: 1500000, saved_amount: 12000000 },
      emergency: { id: efId, months_cover: 3, monthly_contribution: 500000, saved_amount: 4200000 },
    },
    transactions: txs,
    gami: { latte_total: 7, current_streak: 7, longest_streak: 7, last_saving_date: iso(addDays(today, -1)) },
    unlocked_rewards: [], scenarios: [],
    notifications: [
      n('Waktunya Nabung Yuk', 'Isi latte hari ini supaya streak 7 hari tetap menyala.', 'deposit', 'gami'),
      n('Pengeluaran nongkrong naik', 'Naik 18% dari bulan lalu. Cek kategorimu.', 'insight', 'txlist:makan'),
      n('Perbarui data keuangan', 'Perbarui setelah gajian berikutnya.', 'data', 'setup'),
    ],
    reminders: { deposit: true, budget_review: true, data_update: false },
    consultations: [],
  };
}

export function summaryForConsultation(s: State, today: Date) {
  return { cash_left: cashLeft(s), dp: goalView(s, 'down_payment', today), emergency: goalView(s, 'emergency', today), ready_count: readiness(s, today).ready_count, rules_version: RULES_VERSION };
}
