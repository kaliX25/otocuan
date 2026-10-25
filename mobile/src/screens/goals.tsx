import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop, Text as SvgText } from 'react-native-svg';
import { useApp } from '../store';
import { C, F, digits, jt, num, rp } from '../theme';
import { Bar, Btn, Card, Chip, Field, GradBox, Header, Icon, Note, Row, Screen, Seg, Spacer, T, TabTitle } from '../ui';

function GoalTabs({ value }: { value: 'dp' | 'ef' }) {
  const { nav } = useApp();
  return <Seg items={[['dp', 'DP Kendaraan'], ['ef', 'Dana Cadangan']]} value={value} onChange={(v) => nav.tab(v === 'dp' ? 'goal_dp' : 'goal_ef')} />;
}

export function GoalDp() {
  const { view, nav, run } = useApp();
  const v = view!; const dp = v.goals.down_payment; const f = v.finance;
  const dash = (289 * dp.percent) / 100;
  const left = f.cash_left - v.goals.emergency.monthly_contribution - dp.monthly_contribution;
  const note = dp.months_left === 0 ? ['Target DP tercapai! Kamu bisa cek simulasi cicilan dan konsultasi.', C.tealDark] : left < 0 ? ['Setoran ini melebihi sisa kasmu. Turunkan setoran atau perpanjang waktu.', C.red]
    : left < 1000000 ? [`${dp.months_left} bulan lagi, tapi sisa aman dipakai tinggal ${jt(left)}. Pastikan realistis.`, C.orangeText]
      : [`${dp.months_left} bulan lagi. Sisa aman dipakai ${jt(left)} per bulan.`, C.tealDark];
  return (
    <Screen>
      <TabTitle eyebrow="TRANSFORM" title="Target Saya" color={C.orangeText} />
      <GoalTabs value="dp" />
      <Card style={{ flexDirection: 'row', gap: 16, alignItems: 'center', borderRadius: 22 }}>
        <Svg width={112} height={112} viewBox="0 0 112 112">
          <Defs><SvgGrad id="og" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#FCC025" /><Stop offset="1" stopColor="#FF7702" /></SvgGrad></Defs>
          <Circle cx={56} cy={56} r={46} fill="none" stroke="#FFEBD3" strokeWidth={12} />
          <Circle cx={56} cy={56} r={46} fill="none" stroke="url(#og)" strokeWidth={12} strokeLinecap="round" strokeDasharray={`${dash} 289`} transform="rotate(-90 56 56)" />
          <SvgText x={56} y={60} textAnchor="middle" fontFamily={F.x} fontSize={24} fontWeight="800" fill={C.ink}>{dp.percent}%</SvgText>
          <SvgText x={56} y={78} textAnchor="middle" fontFamily={F.s} fontSize={11} fill={C.muted}>terkumpul</SvgText>
        </Svg>
        <View style={{ flex: 1 }}>
          <T s={12} w="b" c={C.orangeText}>{dp.vehicle.toUpperCase()} IMPIAN</T>
          <T s={12.5} c={C.muted}>Harga perkiraan {jt(dp.vehicle_price)}</T>
          <T s={21} w="x" style={{ marginTop: 4 }}>{rp(dp.saved)}</T>
          <T s={12.5} c={C.muted}>dari DP {dp.dp_percent}% {jt(dp.target)}</T>
          <T s={13} w="b" c={C.tealDark} style={{ paddingTop: 8 }} onPress={() => nav.go('edit_goal')}>Ubah target</T>
        </View>
      </Card>
      <Card>
        <T w="b">Setoran per bulan</T>
        <Row style={{ marginTop: 10 }} gap={8}>
          {[1000000, 1500000, 2000000].map((x) => <Chip key={x} tone="orange" label={jt(x)} on={dp.monthly_contribution === x} onPress={() => run((a) => a.goal('down_payment', { monthly_contribution: x }))} style={{ flex: 1 }} />)}
        </Row>
        <Row style={{ marginTop: 12 }} gap={8}>
          <View style={{ flex: 1, backgroundColor: C.bg, borderRadius: 14, padding: 12 }}><T s={11.5} c={C.muted}>Kekurangan</T><T s={16} w="x">{jt(dp.shortfall)}</T></View>
          <View style={{ flex: 1, backgroundColor: C.bg, borderRadius: 14, padding: 12 }}><T s={11.5} c={C.muted}>Estimasi tercapai</T><T s={16} w="x">{dp.eta}</T></View>
        </Row>
        <T s={12.5} lh={18} c={note[1] as string} style={{ marginTop: 10 }}>{note[0]}</T>
      </Card>
      <Card>
        <T w="b">Milestone</T>
        <Row style={{ marginTop: 12 }}>
          {[25, 50, 75, 100].map((p) => {
            const ok = dp.percent >= p;
            return (
              <View key={p} style={{ alignItems: 'center', flex: 1 }}>
                {ok ? <GradBox style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" color={C.onOrange} size={18} sw={3} /></GradBox>
                  : <View style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', borderColor: '#CBD7DB' }} />}
                <T s={11.5} w="b" style={{ marginTop: 5 }}>{p}%</T><T s={10.5} c={C.muted}>{jt((dp.target * p) / 100)}</T>
              </View>
            );
          })}
        </Row>
      </Card>
      <Btn v="o" title="Catat Setoran DP" onPress={() => nav.go('deposit', { goal: 'down_payment' })} />
      <Btn v="g" title="Nabung Yuk (isi latte)" onPress={() => nav.go('gami_intro')} />
    </Screen>
  );
}

export function GoalEf() {
  const { view, nav, run } = useApp();
  const v = view!; const ef = v.goals.emergency; const f = v.finance;
  const [evt, setEvt] = useState<'motor' | 'sakit' | 'gaji'>('motor');
  const events = { motor: ['Motor rusak', 2500000], sakit: ['Biaya berobat', 1500000], gaji: ['Gaji telat 1 bulan', f.essential_expense] } as const;
  const cost = events[evt][1] as number; const remain = ef.saved - cost;
  return (
    <Screen>
      <TabTitle eyebrow="TRANSFORM" title="Target Saya" color={C.orangeText} />
      <GoalTabs value="ef" />
      <View style={{ backgroundColor: C.teal, borderRadius: 22, padding: 18 }}>
        <Row><T s={13} w="s" c="#D6F0F5">Dana cadangan terkumpul</T><View style={{ backgroundColor: C.tealDeep, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}><T s={11} w="b" c={C.white}>Terpisah dari DP</T></View></Row>
        <T s={30} w="x" c={C.white} lh={38}>{rp(ef.saved)}</T>
        <View style={{ marginTop: 10 }}><Bar pct={ef.percent} color={C.white} bg="#2FA0B7" h={10} /></View>
        <Row style={{ marginTop: 8 }}><T s={12.5} c="#D6F0F5">{ef.percent}% dari {jt(ef.target)}</T><T s={12.5} c="#D6F0F5">Tercapai {ef.eta}</T></Row>
      </View>
      <Card>
        <T w="b">Mau aman berapa bulan?</T>
        <T s={12.5} c={C.muted}>Pengeluaran esensialmu {rp(f.essential_expense)} per bulan</T>
        <Row style={{ marginTop: 10 }} gap={8}>
          {[3, 6, 12].map((m) => <Chip key={m} label={`${m} bln`} sub={jt(f.essential_expense * m)} on={ef.months_cover === m} onPress={() => run((a) => a.goal('emergency', { months_cover: m }))} style={{ flex: 1 }} />)}
        </Row>
        <T s={13} w="b" c={C.muted} style={{ marginTop: 12 }}>Setoran rutin per bulan</T>
        <Row style={{ marginTop: 6 }} gap={8}>
          {[300000, 500000, 750000].map((x) => <Chip key={x} label={rp(x)} on={ef.monthly_contribution === x} onPress={() => run((a) => a.goal('emergency', { monthly_contribution: x }))} style={{ flex: 1 }} />)}
        </Row>
      </Card>
      <Card>
        <Row style={{ justifyContent: 'flex-start' }} gap={8}><Icon name="alert" size={18} color={C.orangeText} /><T w="b">Simulasi kejadian darurat</T></Row>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {(Object.keys(events) as (keyof typeof events)[]).map((k) => <Chip key={k} round tone="orange" label={events[k][0] as string} on={evt === k} onPress={() => setEvt(k)} />)}
        </View>
        <T s={13} lh={19} style={{ marginTop: 12 }}>
          {remain >= 0 ? `Biaya sekitar ${rp(cost)} bisa ditutup dana cadanganmu. Sisa dana ${rp(remain)} dan setoran DP tidak perlu berhenti.` : `Biaya sekitar ${rp(cost)} belum tertutup. Kurang ${rp(-remain)}, jadi lanjutkan setoran rutinmu.`}
        </T>
      </Card>
      <Btn title="Catat Setoran Dana Cadangan" onPress={() => nav.go('deposit', { goal: 'emergency' })} />
    </Screen>
  );
}

export function Deposit() {
  const { view, nav, run, route } = useApp();
  const v = view!;
  const [goal, setGoal] = useState<'down_payment' | 'emergency'>(route.params?.goal || 'down_payment');
  const [amt, setAmt] = useState(goal === 'down_payment' ? v.goals.down_payment.monthly_contribution : v.goals.emergency.monthly_contribution);
  const g = v.goals[goal];
  const save = async () => { const r = await run((a) => a.deposit({ goal, amount: amt, via_nabung_yuk: false })); if (r) nav.replace('deposit_done', { goal, amount: amt }); };
  return (
    <Screen white>
      <Header title="Catat Setoran" grey />
      <T s={13} w="b" c={C.muted}>Untuk target</T>
      <Row gap={8}>
        <Chip label={`DP ${v.goals.down_payment.vehicle === 'mobil' ? 'Mobil' : 'Motor'}`} sub={`${jt(v.goals.down_payment.saved)} / ${jt(v.goals.down_payment.target)}`} on={goal === 'down_payment'} onPress={() => setGoal('down_payment')} style={{ flex: 1, minHeight: 58 }} />
        <Chip label="Dana Cadangan" sub={`${jt(v.goals.emergency.saved)} / ${jt(v.goals.emergency.target)}`} on={goal === 'emergency'} onPress={() => setGoal('emergency')} style={{ flex: 1, minHeight: 58 }} />
      </Row>
      <T s={13} w="b" c={C.muted}>Nominal setoran</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {[250000, 500000, 1000000, 1500000].map((x) => <Chip key={x} tone="orange" label={rp(x)} on={amt === x} onPress={() => setAmt(x)} style={{ width: '48.5%', minHeight: 50 }} />)}
      </View>
      <Card style={{ backgroundColor: C.bg, gap: 8 }}>
        <Row><T s={12.5} c={C.muted}>Saldo target sekarang</T><T s={12.5} w="b">{rp(g.saved)}</T></Row>
        <Row><T s={12.5} c={C.muted}>Setelah setor</T><T s={12.5} w="b" c={C.tealDark}>{rp(g.saved + amt)}</T></Row>
      </Card>
      <T s={11.5} c={C.muted}>Pencatatan virtual. Uangmu tetap di rekening atau e-wallet milikmu, OTO CUAN tidak memindahkan dana.</T>
      <Spacer />
      <Btn v="o" title="Simpan Setoran" onPress={save} />
    </Screen>
  );
}

export function DepositDone() {
  const { view, nav, route } = useApp();
  const g = view!.goals[route.params?.goal as 'down_payment' | 'emergency' || 'down_payment'];
  return (
    <Screen white padTop={100} style={{ alignItems: 'center' }}>
      <GradBox style={{ width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={44} color={C.white} sw={3} /></GradBox>
      <T s={15} w="b" c={C.orangeText} style={{ marginTop: 10 }}>Setoran tercatat</T>
      <T s={34} w="x" lh={42}>{rp(route.params?.amount || 0)}</T>
      <T s={14.5} lh={22} c={C.muted} center>{route.params?.goal === 'emergency' ? 'Dana cadangan' : 'Tabungan DP'} sekarang {rp(g.saved)}.</T>
      <Card style={{ alignSelf: 'stretch', backgroundColor: C.orangeTint, marginTop: 8 }}>
        <Row><T w="b">Progres</T><T w="b">{g.percent}%</T></Row>
        <View style={{ marginTop: 10 }}><Bar pct={g.percent} grad bg="#FFE1BC" h={10} /></View>
      </Card>
      <Spacer />
      <Btn v="g" title="Isi Latte di Nabung Yuk" onPress={() => nav.replace('gami_intro')} style={{ alignSelf: 'stretch' }} />
      <Btn v="o" title="Kembali ke Home" onPress={() => nav.reset('home')} style={{ alignSelf: 'stretch' }} />
    </Screen>
  );
}

export function EditGoal() {
  const { view, nav, run } = useApp();
  const dp = view!.goals.down_payment;
  const [vehicle, setVehicle] = useState<'motor' | 'mobil'>(dp.vehicle);
  const [price, setPrice] = useState(num(dp.vehicle_price));
  const [pct, setPct] = useState(dp.dp_percent);
  const target = Math.round((digits(price) * pct) / 100);
  const save = async () => { if (await run((a) => a.goal('down_payment', { vehicle, vehicle_price: Math.max(1, digits(price)), dp_percent: pct }), 'Target DP diperbarui')) nav.back(); };
  return (
    <Screen white>
      <Header title="Ubah Target DP" grey />
      <T s={13} w="b" c={C.muted}>Jenis kendaraan</T>
      <Row gap={8}>
        {(['motor', 'mobil'] as const).map((k) => <Chip key={k} label={k === 'motor' ? 'Motor' : 'Mobil'} on={vehicle === k} onPress={() => { setVehicle(k); setPrice(num(k === 'motor' ? 30000000 : 160000000)); }} style={{ flex: 1, minHeight: 50 }} />)}
      </Row>
      <Field label="Harga perkiraan" value={price} onChangeText={(t) => setPrice(num(digits(t)))} keyboardType="number-pad" />
      <T s={13} w="b" c={C.muted}>Persentase DP</T>
      <Row gap={8}>{[15, 20, 25, 30].map((p) => <Chip key={p} tone="orange" label={`${p}%`} on={pct === p} onPress={() => setPct(p)} style={{ flex: 1 }} />)}</Row>
      <Card style={{ backgroundColor: C.orangeTint, gap: 8 }}>
        <Row><T s={12.5} c={C.muted}>Target DP baru</T><T s={18} w="x">{rp(target)}</T></Row>
        <Row><T s={12.5} c={C.muted}>Sudah terkumpul</T><T s={12.5} w="b">{rp(dp.saved)}</T></Row>
      </Card>
      <T s={11.5} c={C.muted}>Harga adalah perkiraanmu. Harga resmi dan syarat DP mengikuti dealer dan OTO Finance.</T>
      <Spacer />
      <Btn v="o" title="Simpan Target" onPress={save} />
    </Screen>
  );
}
export { Note };
