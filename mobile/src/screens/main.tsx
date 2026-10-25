import React, { useState } from 'react';
import { Image, Pressable, TextInput, View } from 'react-native';
import { CATEGORIES } from '../engine';
import { useApp } from '../store';
import { C, F, digits, jt, num, rp } from '../theme';
import { Bar, Btn, Card, Chip, Field, GradBox, Header, Icon, IconBtn, Note, Row, Screen, Seg, Spacer, T, TabTitle } from '../ui';

const LOGO_H = require('../../assets/brand/logo_horizontal_t.webp');

export function Home() {
  const { view, nav } = useApp();
  const v = view!;
  const f = v.finance, dp = v.goals.down_payment, ef = v.goals.emergency, g = v.gamification;
  const unread = v.notifications.some((n) => !n.read_at);
  const makan = f.categories.find((c) => c.code === 'makan')?.amount || 0;
  return (
    <Screen bottom={96}>
      <Row>
        <Image source={LOGO_H} style={{ width: 160, height: 22 }} resizeMode="contain" accessibilityLabel="OTO CUAN" />
        <Row gap={8}>
          <View>
            <IconBtn name="bell" label="Notifikasi" onPress={() => nav.go('notifications')} />
            {unread ? <View style={{ position: 'absolute', top: 10, right: 11, width: 8, height: 8, borderRadius: 4, backgroundColor: C.orange }} /> : null}
          </View>
          <IconBtn label="Profil" bg={C.teal} onPress={() => nav.go('profile')}><T s={15} w="x" c={C.white}>{(v.profile.full_name || 'S')[0].toUpperCase()}</T></IconBtn>
        </Row>
      </Row>
      <View><T s={20} w="x">Halo, {v.profile.full_name || 'Kamu'}</T><T s={12.5} c={C.muted}>Ringkasan per {new Date(v.today).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</T></View>
      <Pressable accessibilityRole="button" onPress={() => nav.tab('finance')} style={{ backgroundColor: C.teal, borderRadius: 22, padding: 18 }}>
        <T s={13} w="s" c="#D6F0F5">Aman dipakai sampai gajian</T>
        <T s={32} w="x" c={C.white} lh={40}>{rp(f.safe_to_spend)}</T>
        <T s={12.5} c="#D6F0F5">{f.days_to_payday} hari lagi gajian, sekitar {rp(f.safe_per_day)} per hari</T>
        <Row style={{ marginTop: 14 }} gap={8}>
          {[['Sisa kas', jt(f.cash_left)], ['Setoran target', jt(f.planned_saving)], ['Cicilan aktif', jt(f.obligations)]].map(([a, b]) => (
            <View key={a} style={{ flex: 1, backgroundColor: C.tealDeep, borderRadius: 12, padding: 10 }}><T s={11} c="#D6F0F5">{a}</T><T s={14} w="b" c={C.white}>{b}</T></View>
          ))}
        </Row>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => nav.go(g.broken ? 'gami_broken' : 'gami_intro')} style={{ borderRadius: 18, overflow: 'hidden' }}>
        <GradBox style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Image source={require('../../assets/gami/flame.webp')} style={{ width: 44, height: 50, borderRadius: 12 }} />
          <View style={{ flex: 1 }}>
            <T s={15} w="x" c={C.onOrange}>Nabung Yuk · streak {g.streak} hari</T>
            <T s={12} w="s" c={C.onOrange}>{g.saved_today ? `Latte hari ini sudah terisi · ${g.latte_cycle}/10` : `Latte kamu ${g.latte_cycle}/10 · isi latte hari ini`}</T>
          </View>
          <Icon name="chev" color={C.onOrange} />
        </GradBox>
      </Pressable>
      <Row><T s={15} w="x">Target aktif</T><Pressable onPress={() => nav.tab('goal_dp')} hitSlop={8}><T s={13} w="b" c={C.tealDark}>Lihat semua</T></Pressable></Row>
      <Row gap={10} style={{ alignItems: 'stretch' }}>
        <Card style={{ flex: 1, padding: 14 }} onPress={() => nav.tab('goal_dp')} label="Target DP">
          <T s={12} w="b" c={C.orangeText}>DP {dp.vehicle.toUpperCase()}</T>
          <T s={17} w="x">{jt(dp.saved)}</T><T s={11.5} c={C.muted}>dari {jt(dp.target)}</T>
          <View style={{ marginTop: 10 }}><Bar pct={dp.percent} grad bg="#FFEBD3" /></View>
          <T s={11.5} w="b" style={{ marginTop: 6 }}>{dp.percent}% · {dp.eta}</T>
        </Card>
        <Card style={{ flex: 1, padding: 14 }} onPress={() => nav.tab('goal_ef')} label="Dana cadangan">
          <T s={12} w="b" c={C.tealDark}>DANA CADANGAN</T>
          <T s={17} w="x">{jt(ef.saved)}</T><T s={11.5} c={C.muted}>dari {jt(ef.target)}</T>
          <View style={{ marginTop: 10 }}><Bar pct={ef.percent} /></View>
          <T s={11.5} w="b" style={{ marginTop: 6 }}>{ef.percent}% · {ef.eta}</T>
        </Card>
      </Row>
      <Card style={{ flexDirection: 'row', gap: 12, padding: 14 }}>
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: C.tealTint, alignItems: 'center', justifyContent: 'center' }}><Icon name="bulb" size={18} color={C.tealDark} /></View>
        <View style={{ flex: 1 }}>
          <T s={13.5} w="x">Insight minggu ini</T>
          <T s={12.5} lh={18} c={C.body}>{makan > 2000000 ? `Pengeluaran makan dan nongkrong sudah ${jt(makan)} bulan ini. Kurangi sedikit agar setoran DP tetap aman.` : 'Pengeluaran makan dan nongkrong naik 18% dari bulan lalu. Kurangi Rp200.000 agar setoran DP tetap aman.'}</T>
          <Pressable onPress={() => nav.go('txlist', { cat: 'makan', filter: 'out' })} style={{ paddingTop: 8 }}><T s={12.5} w="b" c={C.tealDark}>Lihat pengeluaran</T></Pressable>
        </View>
      </Card>
      <Card onPress={() => nav.tab('planner')} label="Simulasi cicilan" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}><Icon name="chart" color={C.white} /></View>
        <View style={{ flex: 1 }}><T s={14} w="x">Coba simulasi cicilan</T><T s={11.5} c={C.muted}>Lihat sisa kasmu setelah cicilan</T></View>
        <Icon name="chev" size={18} color={C.muted} />
      </Card>
    </Screen>
  );
}

export function Finance() {
  const { view, nav } = useApp();
  const [period, setPeriod] = useState('0');
  const f = view!.finance;
  const months = ['Bulan ini', 'Bulan lalu', '2 bulan lalu'];
  return (
    <Screen>
      <TabTitle eyebrow="OBSERVE" title="Keuanganku" right={<Btn small h={44} icon="plus" title="Transaksi" onPress={() => nav.go('add_tx')} style={{ paddingHorizontal: 14 }} />} />
      <Seg items={months.map((m, i) => [String(i), m])} value={period} onChange={setPeriod} />
      {period === '0' ? (
        <>
          <Card>
            <Row><T w="b">Financial Snapshot</T><T s={11} w="b" c={C.muted}>Diinput manual</T></Row>
            {[['Pendapatan bersih', rp(f.net_income)], ['Pengeluaran', '- ' + rp(f.expense_total)], ['Cicilan dan kewajiban', '- ' + rp(f.obligations)]].map(([a, b]) => (
              <Row key={a} style={{ marginTop: 9 }}><T s={13.5} c={C.body}>{a}</T><T s={13.5} w="b">{b}</T></Row>
            ))}
            <View style={{ height: 1, backgroundColor: C.line, marginVertical: 10 }} />
            <Row><T w="b">Sisa kas bulanan</T><T s={22} w="x" c={f.cash_left >= 0 ? C.tealDark : C.red}>{rp(f.cash_left)}</T></Row>
            <T s={11.5} c={C.muted} style={{ marginTop: 6 }}>Sisa kas = pendapatan - pengeluaran - kewajiban rutin</T>
          </Card>
          <Card>
            <T w="b">Pengeluaran per kategori</T>
            <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginTop: 12, gap: 2 }}>
              {f.categories.map((c) => <View key={c.code} style={{ flex: Math.max(2, c.share), backgroundColor: c.color }} />)}
            </View>
            {f.categories.map((c, i) => (
              <Pressable key={c.code} accessibilityRole="button" onPress={() => nav.go('txlist', { cat: c.code, filter: 'out' })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: i < f.categories.length - 1 ? 1 : 0, borderBottomColor: C.line }}>
                <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: c.color }} />
                <T s={13} style={{ flex: 1 }}>{c.label}</T><T s={13} w="b">{rp(c.amount)}</T><Icon name="chev" size={16} color={C.muted} />
              </Pressable>
            ))}
          </Card>
          <Card style={{ paddingVertical: 4 }}>
            <Pressable onPress={() => nav.go('txlist', { filter: 'all' })} style={{ flexDirection: 'row', paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: C.line }}><T w="s" style={{ flex: 1 }}>Riwayat transaksi</T><T s={12.5} c={C.muted}>{view!.transactions.length} transaksi</T></Pressable>
            <Pressable onPress={() => nav.go('setup')} style={{ flexDirection: 'row', paddingVertical: 13 }}><T w="s" style={{ flex: 1 }}>Ubah data keuangan</T><T s={12.5} w="b" c={C.tealDark}>Ubah</T></Pressable>
          </Card>
        </>
      ) : (
        <Card style={{ alignItems: 'center', paddingVertical: 30, gap: 8 }}>
          <T s={15} w="x">Belum ada data {months[+period].toLowerCase()}</T>
          <T s={12.5} c={C.muted} center>Kamu mulai mencatat bulan ini. Data bulan sebelumnya muncul otomatis setelah bulan berganti.</T>
          <Btn v="g" title="Tambah Transaksi" onPress={() => nav.go('add_tx')} style={{ alignSelf: 'stretch', marginTop: 8 }} />
        </Card>
      )}
    </Screen>
  );
}

export function TxList() {
  const { view, nav, route } = useApp();
  const [filter, setFilter] = useState<string>(route.params?.filter || 'all');
  const [cat, setCat] = useState<string | undefined>(route.params?.cat);
  let txs = view!.transactions.filter((t) => filter === 'all' || t.type === filter);
  if (cat) txs = txs.filter((t) => t.category_code === cat);
  const labelOf = (t: any) => (t.type === 'out' ? CATEGORIES[t.category_code][0] : t.type === 'in' ? 'Pemasukan' : t.via_nabung_yuk ? 'Nabung Yuk' : 'Setoran target');
  return (
    <Screen>
      <Header title={cat ? CATEGORIES[cat][0] : 'Riwayat Transaksi'} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {[['all', 'Semua'], ['out', 'Pengeluaran'], ['in', 'Pemasukan'], ['goal', 'Setoran']].map(([k, l]) => (
          <Chip key={k} round label={l} on={filter === k && !cat} onPress={() => { setFilter(k); setCat(undefined); }} />
        ))}
      </View>
      <Card style={{ paddingVertical: 4 }}>
        {txs.length === 0 ? <T s={12.5} c={C.muted} center style={{ paddingVertical: 24 }}>Belum ada transaksi di sini.</T> : txs.map((t, i) => {
          const out = t.type === 'out', inc = t.type === 'in';
          return (
            <Row key={t.id} style={{ paddingVertical: 12, borderBottomWidth: i < txs.length - 1 ? 1 : 0, borderBottomColor: C.line }} gap={12}>
              <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: out ? C.orangeTint : inc ? C.greenTint : C.tealTint }}>
                <T s={16} w="x" c={out ? C.orangeText : inc ? C.green : C.tealDark}>{out ? '−' : inc ? '+' : '↑'}</T>
              </View>
              <View style={{ flex: 1 }}><T w="b">{t.note}</T><T s={11.5} c={C.muted}>{labelOf(t)} · {new Date(t.occurred_on).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</T></View>
              <T w="b" c={out ? C.ink : inc ? C.green : C.tealDark}>{(out ? '- ' : '+ ') + rp(t.amount)}</T>
            </Row>
          );
        })}
      </Card>
      <Btn title="Tambah Transaksi" onPress={() => nav.go('add_tx')} />
    </Screen>
  );
}

export function AddTx() {
  const { view, nav, run, say } = useApp();
  const [type, setType] = useState<'out' | 'in'>('out');
  const [amt, setAmt] = useState('');
  const [cat, setCat] = useState('makan');
  const [note, setNote] = useState('');
  const n = digits(amt);
  const f = view!.finance;
  const save = async () => {
    if (!n) { say('Isi nominal dulu'); return; }
    if (await run((a) => a.addTx({ type, amount: n, category_code: type === 'out' ? cat : undefined, note: note.trim() || undefined }), 'Transaksi tersimpan')) nav.back();
  };
  return (
    <Screen white>
      <Header title="Tambah Transaksi" close grey />
      <Seg bg={C.chipBg} items={[['out', 'Pengeluaran'], ['in', 'Pemasukan']]} value={type} onChange={(v) => setType(v as any)} />
      <T s={13} w="b" c={C.muted} style={{ marginTop: 4 }}>Nominal</T>
      <Row style={{ borderBottomWidth: 2, borderBottomColor: C.teal, paddingBottom: 8, justifyContent: 'flex-start' }} gap={6}>
        <T s={22} w="b" c={C.muted}>Rp</T>
        <TextInput accessibilityLabel="Nominal" value={amt} onChangeText={(t) => setAmt(digits(t) ? num(digits(t)) : '')} placeholder="0" keyboardType="number-pad" placeholderTextColor="#9AA8AE"
          style={{ flex: 1, fontFamily: F.x, fontSize: 34, color: C.ink, padding: 0, outlineStyle: 'none' } as any} />
      </Row>
      {type === 'out' ? (
        <>
          <T s={13} w="b" c={C.muted}>Kategori</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(CATEGORIES).map(([k, [l]]) => <Chip key={k} label={l} on={cat === k} onPress={() => setCat(k)} style={{ width: '31.5%' }} />)}
          </View>
        </>
      ) : null}
      <Field label="Catatan (opsional)" value={note} onChangeText={setNote} placeholder="Contoh: kopi sore bareng tim" maxLength={140} />
      <Note text={type === 'out' ? `Setelah ini, sisa aman dipakai jadi ${rp(f.safe_to_spend - n)} sampai gajian.` : `Pemasukan menambah sisa kasmu jadi ${rp(f.cash_left + n)} bulan ini.`} />
      <Spacer />
      <Btn title="Simpan Transaksi" onPress={save} />
    </Screen>
  );
}
