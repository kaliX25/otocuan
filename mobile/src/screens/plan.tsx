import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { simulate } from '../engine';
import { useApp } from '../store';
import { C, jt, rp } from '../theme';
import { Btn, Card, Chip, GradBox, Header, Icon, Row, Screen, Spacer, T, TabTitle, Tag, Toggle } from '../ui';

const LEVEL: Record<string, [string, string, string]> = { menekan: ['Menekan', C.red, C.redTint], ketat: ['Ketat', C.orangeText, C.orangeTint], longgar: ['Longgar', C.tealDark, C.tealTint] };
const levelOf = (left: number) => (left < 0 ? 'menekan' : left < 500000 ? 'ketat' : 'longgar');

export function Planner() {
  const { view, nav, run } = useApp();
  const v = view!; const dp = v.goals.down_payment; const f = v.finance;
  const [tenor, setTenor] = useState(60);
  const [stress, setStress] = useState(false);
  // same formula as the server (engine.simulate); computed locally so the comparison reacts instantly
  const principal = dp.vehicle_price - dp.target;
  const sim = (t: number) => { const m = (principal * (1 + (0.06 * t) / 12)) / t; const drop = stress ? Math.round(f.net_income * 0.1) : 0; return { m: Math.round(m), left: Math.round(f.cash_left - m - drop), drop, total: Math.round(m * t) }; };
  const cur = sim(tenor); const lv = LEVEL[levelOf(cur.left)];
  const note = cur.left < 0 ? 'Skenario ini berpotensi membuat defisit. Coba tenor lebih panjang, DP lebih besar, atau kurangi pengeluaran.'
    : cur.left < 500000 ? 'Masih positif tapi tipis. Pastikan dana cadangan cukup sebelum memilih skenario ini.' : 'Sisa kas masih punya ruang. Tetap jaga dana cadangan untuk kebutuhan tak terduga.';
  void simulate;
  return (
    <Screen>
      <TabTitle eyebrow="OPTIMIZE" title="Simulasi Cicilan" color={C.ink} right={<Chip round label={`Tersimpan (${v.scenarios.length})`} onPress={() => nav.go('scenarios')} />} />
      <Card style={{ flexDirection: 'row', paddingVertical: 14 }}>
        {[['Harga', jt(dp.vehicle_price)], [`DP ${dp.dp_percent}%`, jt(dp.target)], ['Pokok', jt(principal)]].map(([a, b]) => <View key={a} style={{ flex: 1 }}><T s={11.5} c={C.muted}>{a}</T><T s={15} w="x">{b}</T></View>)}
      </Card>
      <Row><T w="b">Bandingkan tenor</T><T s={13} w="b" c={C.tealDark} onPress={() => nav.go('edit_goal')}>Ubah harga/DP</T></Row>
      <Row gap={8}>
        {[36, 48, 60].map((t) => { const s = sim(t); const l = LEVEL[levelOf(s.left)]; const on = tenor === t; return (
          <Pressable key={t} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setTenor(t)} style={{ flex: 1, borderRadius: 16, borderWidth: on ? 2 : 1.5, borderColor: on ? C.teal : C.line, backgroundColor: C.white, padding: 10, alignItems: 'center', gap: 3 }}>
            <T s={12} w="b" c={C.muted}>{t} bulan</T><T s={15} w="x">{jt(s.m)}</T><Tag text={l[0]} fg={l[1]} bg={l[2]} />
          </Pressable>
        ); })}
      </Row>
      <Card style={{ gap: 8 }}>
        <Row><T s={13} c={C.body}>Sisa kas sebelum cicilan</T><T s={13} w="b">{rp(f.cash_left)}</T></Row>
        <Row><T s={13} c={C.body}>Estimasi cicilan baru</T><T s={13} w="b">- {rp(cur.m)}</T></Row>
        {stress ? <Row><T s={13} c={C.body}>Pendapatan turun 10%</T><T s={13} w="b">- {rp(cur.drop)}</T></Row> : null}
        <View style={{ height: 1, backgroundColor: C.line }} />
        <Row><T w="b">Sisa kas setelah cicilan</T><T s={20} w="x" c={lv[1]}>{rp(cur.left)}</T></Row>
        <View style={{ backgroundColor: lv[2], borderRadius: 12, padding: 10 }}><T s={12.5} lh={18}>{note}</T></View>
      </Card>
      <Card style={{ paddingVertical: 12 }}><Row><View style={{ flex: 1 }}><T s={13.5} w="x">Stress test</T><T s={11.5} c={C.muted}>Bagaimana kalau pendapatan turun 10%?</T></View><Toggle label="Stress test" on={stress} onPress={() => setStress(!stress)} /></Row></Card>
      <T s={11.5} c={C.muted}>Asumsi: bunga flat 6% per tahun sebagai contoh ({v.planner.params_version}), bukan tarif resmi. Total bayar {jt(cur.total)}. Hasil ini estimasi, bukan penawaran atau keputusan kredit.</T>
      <Row gap={8}>
        <Btn v="g" small h={50} title="Simpan Skenario" style={{ flex: 1 }} onPress={() => run((a) => a.saveScenario({ tenor_months: tenor, stress_test: stress }), `Skenario ${tenor} bulan tersimpan`)} />
        <Btn small h={50} title="Cek Kesiapan" style={{ flex: 1 }} onPress={() => nav.tab('readiness')} />
      </Row>
    </Screen>
  );
}

export function Scenarios() {
  const { view, nav, run } = useApp();
  const list = view!.scenarios;
  return (
    <Screen>
      <Header title="Skenario Tersimpan" />
      {list.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: 30, gap: 8 }}>
          <T w="b">Belum ada skenario</T><T s={12.5} c={C.muted} center>Simpan simulasi dari Planner untuk membandingkannya di sini.</T>
          <Btn v="g" title="Buka Planner" onPress={nav.back} style={{ alignSelf: 'stretch', marginTop: 8 }} />
        </Card>
      ) : list.map((s) => { const l = LEVEL[levelOf(s.cash_left)]; return (
        <Card key={s.id} style={{ gap: 6 }}>
          <Row><T w="b">{s.tenor_months} bulan · {jt(s.vehicle_price)}</T><Tag text={l[0]} fg={l[1]} bg={l[2]} /></Row>
          <Row><T s={12.5} c={C.muted}>Cicilan per bulan</T><T s={12.5} w="b">{rp(s.monthly_payment)}</T></Row>
          <Row><T s={12.5} c={C.muted}>Sisa kas setelah cicilan</T><T s={12.5} w="b">{rp(s.cash_left)}</T></Row>
          <Row><T s={12} c={C.muted}>DP {s.dp_percent}%{s.stress_test ? ' · stress test' : ''}</T><T s={13} w="b" c={C.red} onPress={() => run((a) => a.deleteScenario(s.id), 'Skenario dihapus')}>Hapus</T></Row>
        </Card>
      ); })}
    </Screen>
  );
}

export function Readiness() {
  const { view, nav } = useApp();
  const v = view!; const r = v.readiness;
  const [open, setOpen] = useState<string | null>(null);
  const actions: Record<string, [string, () => void]> = {
    data: ['Perbarui data', () => nav.go('setup')], cashflow: ['Lihat keuangan', () => nav.tab('finance')], scenario: ['Buka Planner', () => nav.tab('planner')],
    dp: ['Catat setoran DP', () => nav.go('deposit', { goal: 'down_payment' })], emergency: ['Catat setoran cadangan', () => nav.go('deposit', { goal: 'emergency' })],
  };
  const steps = r.indicators.filter((i) => !i.good).map((i) => ({ data: 'Lengkapi data keuanganmu.', cashflow: 'Kurangi pengeluaran agar arus kas kembali positif.', scenario: 'Simpan minimal satu skenario cicilan dengan sisa kas positif.', dp: `Lanjutkan setoran DP ${jt(v.goals.down_payment.monthly_contribution)} sampai mencapai 50%.`, emergency: 'Tambah dana cadangan sampai setengah dari target.' } as any)[i.key]);
  return (
    <Screen>
      <TabTitle eyebrow="OPTIMIZE" title="Profil Kesiapan" color={C.ink} />
      <View style={{ backgroundColor: C.ink, borderRadius: 22, padding: 16 }}>
        <T s={12.5} w="s" c="#B8C6CC">Status saat ini</T>
        <T s={21} w="x" c={C.white}>{r.title}</T>
        <Row gap={4} style={{ marginTop: 12 }}>{[0, 1, 2, 3, 4].map((i) => <View key={i} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: i < r.ready_count ? C.yellow : '#3A4C55' }} />)}</Row>
        <T s={11.5} c="#B8C6CC" style={{ marginTop: 8 }}>{r.ready_count} dari 5 indikator sudah baik · aturan {r.rules_version}</T>
      </View>
      <Card style={{ paddingVertical: 4 }}>
        {r.indicators.map((it, i) => (
          <View key={it.key}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: open === it.key }} onPress={() => setOpen(open === it.key ? null : it.key)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: i < 4 && open !== it.key ? 1 : 0, borderBottomColor: C.line }}>
              <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: it.good ? C.tealTint : C.orangeTint, alignItems: 'center', justifyContent: 'center' }}>
                {it.good ? <Icon name="check" size={16} color={C.tealDark} sw={3} /> : <T w="x" c={C.orangeText}>…</T>}
              </View>
              <View style={{ flex: 1 }}><T s={13.5} w="b">{it.label}</T><T s={11.5} c={C.muted}>{it.value}</T></View>
              <Tag text={it.good ? 'Baik' : 'Dibangun'} fg={it.good ? C.tealDark : C.orangeText} bg={it.good ? C.tealTint : C.orangeTint} />
            </Pressable>
            {open === it.key ? (
              <View style={{ backgroundColor: C.bg, borderRadius: 10, padding: 10, marginBottom: 10 }}>
                <T s={11.5} lh={17} c={C.body}>{it.rule}</T>
                <T s={12.5} w="b" c={C.tealDark} style={{ paddingTop: 6 }} onPress={actions[it.key][1]}>{actions[it.key][0]}</T>
              </View>
            ) : null}
          </View>
        ))}
      </Card>
      <Card style={{ gap: 6 }}>
        <T w="b">Langkah berikutnya</T>
        {(steps.length ? steps : ['Semua indikator baik. Kamu bisa konsultasi dengan OTO Finance kapan saja.']).slice(0, 3).map((t, i) => (
          <Row key={i} style={{ justifyContent: 'flex-start', alignItems: 'flex-start' }}><T w="x" c={C.orangeText}>{i + 1}</T><T s={12.5} lh={18} style={{ flex: 1 }}>{t}</T></Row>
        ))}
      </Card>
      <Btn v="o" title="Konsultasi dengan OTO Finance" onPress={() => nav.go('consult')} />
      <T s={11} c={C.muted} center>Opsional. {r.disclaimer}</T>
    </Screen>
  );
}

export function Consult() {
  const { view, nav, run } = useApp();
  const [channel, setChannel] = useState<'cabang' | 'chat' | 'telepon'>('cabang');
  const [slot, setSlot] = useState('Besok 10.00');
  const [share, setShare] = useState<boolean>(true);
  const meta = { cabang: ['Datang ke cabang terdekat', 'Konsultan membantu membaca simulasimu'], chat: ['Chat dengan konsultan', 'Lewat kanal chat resmi OTO Finance'], telepon: ['Dijadwalkan telepon', 'Konsultan menelepon di waktu pilihanmu'] } as const;
  const send = async () => { const r = await run((a) => a.consult({ channel, slot: channel === 'telepon' ? slot : undefined, share_summary: share })); if (r) nav.reset('consult_done', { req: r.consultation, channel, slot, share }); };
  return (
    <Screen white>
      <Header title="Konsultasi OTO Finance" grey />
      <T s={12.5} c={C.muted}>Pilih cara yang paling nyaman. Kamu tidak sedang mengajukan kredit.</T>
      {(Object.keys(meta) as (keyof typeof meta)[]).map((k) => (
        <Pressable key={k} accessibilityRole="radio" accessibilityState={{ checked: channel === k }} onPress={() => setChannel(k)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, borderWidth: 1.5, borderColor: channel === k ? C.teal : C.line, backgroundColor: channel === k ? C.tealTint : C.white }}>
          <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.teal, alignItems: 'center', justifyContent: 'center' }}>{channel === k ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: C.teal }} /> : null}</View>
          <View style={{ flex: 1 }}><T w="x">{meta[k][0]}</T><T s={12} w="s" c={C.muted}>{meta[k][1]}</T></View>
        </Pressable>
      ))}
      {channel === 'telepon' ? (<><T s={13} w="b" c={C.muted}>Pilih waktu</T><Row gap={8}>{['Besok 10.00', 'Besok 15.00', 'Lusa 10.00'].map((t) => <Chip key={t} label={t} on={slot === t} onPress={() => setSlot(t)} style={{ flex: 1 }} />)}</Row></>) : null}
      <Card style={{ backgroundColor: C.bg }}><Row><View style={{ flex: 1 }}><T s={13.5} w="x">Bagikan ringkasan kesiapan</T><T s={11.5} c={C.muted}>Arus kas, progres DP, dan skenario cicilan. Bukan data transaksi detail.</T></View><Toggle label="Bagikan ringkasan" on={share} onPress={() => setShare(!share)} /></Row></Card>
      <Spacer />
      <Btn v="o" title="Kirim Permintaan" onPress={send} />
    </Screen>
  );
}

export function ConsultDone() {
  const { nav, route } = useApp();
  const p = route.params || {};
  const msg = p.channel === 'cabang' ? 'Tunjukkan nomor referensi saat datang ke cabang. Konsultan akan membantu membaca simulasimu.' : p.channel === 'chat' ? 'Konsultan akan menghubungimu lewat chat resmi dalam 1 hari kerja.' : `Konsultan akan menelepon ${String(p.slot || '').toLowerCase()}.`;
  return (
    <Screen white padTop={100} style={{ alignItems: 'center' }}>
      <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={44} color={C.white} sw={3} /></View>
      <T s={24} w="x" style={{ marginTop: 10 }}>Permintaan terkirim</T>
      <T s={14.5} lh={22} c={C.muted} center>{msg}</T>
      <Card style={{ alignSelf: 'stretch', backgroundColor: C.bg, gap: 8 }}>
        <Row><T s={12.5} c={C.muted}>Nomor referensi</T><T s={12.5} w="b">{p.req?.reference_code}</T></Row>
        <Row><T s={12.5} c={C.muted}>Data dibagikan</T><T s={12.5} w="b">{p.share ? 'Ringkasan kesiapan' : 'Tidak ada'}</T></Row>
      </Card>
      <Spacer />
      <Btn v="o" title="Kembali ke Home" onPress={() => nav.reset('home')} style={{ alignSelf: 'stretch' }} />
    </Screen>
  );
}
export { GradBox };
