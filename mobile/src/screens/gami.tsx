// Nabung Yuk: the team's coffee-machine gamification, rebuilt so every number is live.
// The illustrations are the team's artwork; all cards, counts, calendar and rewards are rendered from data.
import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleProp, View, ViewStyle, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../store';
import { C, F, rpSp } from '../theme';
import { Cup, Icon, T } from '../ui';

const IMG = {
  g1: require('../../assets/gami/g1.webp'), g2: require('../../assets/gami/g2.webp'), g3: require('../../assets/gami/g3.webp'),
  g4: require('../../assets/gami/g4.webp'), g5: require('../../assets/gami/g5.webp'), g6: require('../../assets/gami/g6.webp'), g7: require('../../assets/gami/g7.webp'),
  flame: require('../../assets/gami/flame.webp'), cloud: require('../../assets/gami/cloud.webp'), wallet: require('../../assets/gami/wallet.webp'),
  coins: require('../../assets/gami/coins.webp'), gift: require('../../assets/gami/gift.webp'), percent: require('../../assets/gami/percent.webp'), tote: require('../../assets/gami/tote.webp'),
  cups: [0, 1, 2, 3, 4, 5].map((i) => [require('../../assets/gami/cup0.webp'), require('../../assets/gami/cup1.webp'), require('../../assets/gami/cup2.webp'), require('../../assets/gami/cup3.webp'), require('../../assets/gami/cup4.webp'), require('../../assets/gami/cup5.webp')][i]),
  cupMiss: require('../../assets/gami/cup6.webp'),
};
const W = 390, H = 847;

// Lays children out in the 390 x 847 design space and scales it to the device width.
function Canvas({ bg, children, bgColor = '#BFE6F5' }: { bg: any; children?: React.ReactNode; bgColor?: string }) {
  const { width } = useWindowDimensions();
  const w = Math.min(width, 430); const s = w / W;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: bgColor }} contentContainerStyle={{ alignItems: 'center' }} bounces={false}>
      <View style={{ width: w, height: H * s, overflow: 'hidden' }}>
        <View style={{ width: W, height: H, transform: [{ scale: s }], transformOrigin: 'top left' } as any}>
          <Image source={bg} style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }} resizeMode="cover" />
          {children}
        </View>
      </View>
    </ScrollView>
  );
}
const Abs = ({ x, y, w, h, style, children }: { x: number; y: number; w: number; h?: number; style?: StyleProp<ViewStyle>; children?: React.ReactNode }) => (
  <View style={[{ position: 'absolute', left: x, top: y, width: w, height: h }, style]}>{children}</View>
);
const Back = () => { const { nav } = useApp(); return <Pressable accessibilityRole="button" accessibilityLabel="Kembali" onPress={nav.back} style={{ position: 'absolute', left: 23, top: 60, width: 40, height: 40, borderRadius: 20 }} />; };
const card: ViewStyle = { backgroundColor: C.cream, borderRadius: 26, shadowColor: '#7A5A2A', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } };
const P = ({ s = 14, w = 'pop', c = C.gInk, children, style, center }: { s?: number; w?: 'pop' | 'popS' | 'popM'; c?: string; children: React.ReactNode; style?: any; center?: boolean }) => (
  <T s={s} c={c} style={[{ fontFamily: F[w], textAlign: center ? 'center' : undefined }, style]} lh={Math.round(s * 1.25)}>{children}</T>
);
function GreenBtn({ title, onPress, x, y, w, h = 60, icon }: { title: string; onPress: () => void; x: number; y: number; w: number; h?: number; icon?: boolean }) {
  const { busy } = useApp();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} disabled={busy} onPress={onPress} style={({ pressed }) => ({ position: 'absolute', left: x, top: y, width: w, height: h, opacity: pressed || busy ? 0.8 : 1 })}>
      <View style={{ flex: 1, borderRadius: h / 2, borderWidth: 3, borderColor: '#FFFFFF', overflow: 'hidden', shadowColor: '#0F6E43', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}>
        <LinearGradient colors={['#26B36B', '#127F4C']} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 }}>
          {icon ? <Cup on size={24} /> : null}
          <P s={18} c="#FFFFFF">{title}</P>
        </LinearGradient>
      </View>
    </Pressable>
  );
}
function LatteBar({ n, width = 320 }: { n: number; width?: number }) {
  const cell = width / 10;
  return (
    <View style={{ width, height: 40, borderRadius: 20, backgroundColor: '#EFE9DD', overflow: 'hidden', flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: n === 0 ? 0 : Math.min(width, cell * n + 6), backgroundColor: C.latteRed, borderRadius: 20 }} />
      {Array.from({ length: 10 }, (_, i) => <View key={i} style={{ width: cell, alignItems: 'center' }}><Cup on={i < n} size={22} /></View>)}
    </View>
  );
}
function LatteCard({ n, x, y, w, h }: { n: number; x: number; y: number; w: number; h: number }) {
  return (
    <Abs x={x} y={y} w={w} h={h} style={[card, { paddingHorizontal: 22, paddingTop: 16 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View><P s={14} w="popM">Latte kamu</P><P s={19}>{n * 10}% penuh</P></View>
        <P s={19} style={{ marginTop: 8 }}>{n}<P s={15} w="popM">/10</P></P>
      </View>
      <View style={{ marginTop: 10 }}><LatteBar n={n} width={w - 44} /></View>
    </Abs>
  );
}

// ---------------------------------------------------------------- intro
export function GamiIntro() {
  const { nav, view } = useApp();
  const [step, setStep] = useState(0);
  const t = useRef<any[]>([]);
  const next = () => nav.replace(view!.gamification.broken ? 'gami_broken' : 'gami_streak');
  useEffect(() => {
    t.current = [setTimeout(() => setStep(1), 650), setTimeout(next, 1700)];
    return () => t.current.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Lanjut ke Nabung Yuk" onPress={() => { t.current.forEach(clearTimeout); next(); }} style={{ flex: 1 }}>
      <Canvas bg={step === 0 ? IMG.g2 : IMG.g3} bgColor="#FFFFFF" />
    </Pressable>
  );
}

// ---------------------------------------------------------------- streak home
export function GamiStreak() {
  const { view, nav } = useApp();
  const g = view!.gamification;
  return (
    <Canvas bg={IMG.g1}>
      <Back />
      <Abs x={48} y={118} w={324} h={176} style={[card, { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, gap: 14 }]}>
        <Image source={IMG.flame} style={{ width: 62, height: 72 }} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <P s={34} style={{ letterSpacing: -0.5 }}>{g.streak} hari</P>
          <P s={18} style={{ marginTop: -2 }}>berturut-turut</P>
          <P s={13} w="popM" c={C.gMuted} style={{ marginTop: 6 }}>{g.saved_today ? 'Latte hari ini sudah terisi. Sampai besok!' : g.streak > 0 ? 'Kamu konsisten! Teruskan ritual menabungmu.' : 'Mulai streak pertamamu hari ini.'}</P>
        </View>
      </Abs>
      <LatteCard n={g.latte_cycle} x={18} y={560} w={356} h={116} />
      <GreenBtn title={g.saved_today ? 'Tambah tabungan' : 'Mulai menabung'} x={28} y={682} w={334} h={62} onPress={() => nav.go('gami_deposit')} />
      <Pressable accessibilityRole="button" accessibilityLabel="Lihat progress dan reward" onPress={() => nav.go('gami_progress')} style={{ position: 'absolute', left: 120, top: 756, width: 150, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 18 }}>
        <P s={13} w="popS" c={C.gGreenDark}>Progress & Reward</P>
      </Pressable>
    </Canvas>
  );
}

// ---------------------------------------------------------------- deposit
const AMOUNTS = [50000, 100000, 150000, 200000];
export function GamiDeposit() {
  const { view, nav, run } = useApp();
  const [amt, setAmt] = useState(50000);
  const dp = view!.goals.down_payment;
  const press = async () => { const r = await run((a) => a.deposit({ goal: 'down_payment', amount: amt, via_nabung_yuk: true })); if (r) nav.replace('gami_success', { amount: amt, rewards: r.last_deposit?.rewards_unlocked || [] }); };
  return (
    <Canvas bg={IMG.g4}>
      <Back />
      <Abs x={40} y={130} w={312} h={90} style={[card, { backgroundColor: '#FDFDFB', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, gap: 16 }]}>
        <Image source={IMG.wallet} style={{ width: 52, height: 44 }} resizeMode="contain" />
        <View><P s={13} w="popM" c={C.gMuted}>Saldo Tabungan DP</P><P s={22}>{rpSp(dp.saved)}</P></View>
      </Abs>
      <Pressable accessibilityRole="button" accessibilityLabel="Pencet tombol mesin kopi" onPress={press} style={{ position: 'absolute', left: 205, top: 295, width: 70, height: 70, borderRadius: 35 }} />
      <Abs x={8} y={490} w={374} h={268} style={[card, { padding: 22, paddingTop: 18 }]}>
        <P s={16}>Pilih nominal tabungan</P>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 14 }}>
          {AMOUNTS.map((a) => (
            <Pressable key={a} accessibilityRole="button" accessibilityState={{ selected: amt === a }} onPress={() => setAmt(a)}
              style={{ width: 158, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: amt === a ? '#E3F5EA' : C.gChip, borderWidth: 2.5, borderColor: amt === a ? C.gGreen : 'transparent' }}>
              <P s={15} c={amt === a ? C.gGreenDark : C.gInk}>{rpSp(a)}</P>
            </Pressable>
          ))}
        </View>
        <P s={11.5} w="popM" c={C.gMuted} style={{ marginTop: 12 }} center>Pencatatan virtual: uangmu tetap di rekening milikmu.</P>
      </Abs>
      <GreenBtn title="Pencet tombol sekarang" x={30} y={684} w={330} h={58} onPress={press} />
    </Canvas>
  );
}

// ---------------------------------------------------------------- success
export function GamiSuccess() {
  const { view, nav, route } = useApp();
  const g = view!.gamification;
  const rewards: string[] = route.params?.rewards || [];
  return (
    <Canvas bg={IMG.g5}>
      <Back />
      <Abs x={40} y={132} w={314} h={108} style={[card, { backgroundColor: '#FDFEF8', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 14 }]}>
        <Image source={IMG.coins} style={{ width: 58, height: 70 }} resizeMode="contain" />
        <View style={{ flex: 1 }}><P s={14.5} w="popS">Tabungan berhasil disetor!</P><P s={30} c="#138B62">{rpSp(route.params?.amount || 0)}</P></View>
      </Abs>
      {rewards.length ? (
        <Abs x={60} y={250} w={270} style={{ backgroundColor: '#FFF4D6', borderRadius: 16, padding: 10, borderWidth: 2, borderColor: C.yellow }}>
          <P s={13} c={C.orangeText} center>Latte penuh! Hadiah terbuka di Progress & Reward</P>
        </Abs>
      ) : null}
      <LatteCard n={g.latte_cycle} x={13} y={546} w={364} h={124} />
      <GreenBtn title="Lihat Progress" x={30} y={684} w={330} h={58} onPress={() => nav.replace('gami_progress')} />
    </Canvas>
  );
}

// ---------------------------------------------------------------- progress & reward
export function GamiProgress() {
  const { view, say, week, setWeek } = useApp();
  const g = view!.gamification;
  const cal = g.calendar;
  useEffect(() => () => { if (week !== 0) setWeek(0); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const nr = g.next_reward;
  const others = g.rewards.filter((r) => !nr || r.code !== nr.code);
  const rewardImg: Record<string, any> = { voucher_kopi: IMG.gift, cashback_saldo: IMG.percent, tote_bag: IMG.tote };
  let cupIdx = 0;
  return (
    <Canvas bg={IMG.g6}>
      <Back />
      <Abs x={28} y={218} w={345} h={530} style={[card, { backgroundColor: '#FBF5E8', borderRadius: 22, padding: 12, gap: 10 }]}>
        <View style={{ backgroundColor: '#FFFDF8', borderRadius: 18, padding: 12 }}>
          <P s={16}>Kalender Menabung</P>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Minggu sebelumnya" onPress={() => setWeek(week - 1)} hitSlop={10} style={{ padding: 6 }}><Icon name="chevL" size={18} color={C.gInk} /></Pressable>
            <View style={{ backgroundColor: '#F4ECDC', borderRadius: 14, paddingHorizontal: 22, paddingVertical: 5 }}><P s={13} w="popS">{cal.label}</P></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Minggu berikutnya" disabled={week >= 0} onPress={() => setWeek(week + 1)} hitSlop={10} style={{ padding: 6, opacity: week >= 0 ? 0.3 : 1 }}><Icon name="chev" size={18} color={C.gInk} /></Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 8 }}>
            {cal.days.map((d) => {
              const miss = d.status === 'missed', saved = d.status === 'saved', today = d.status === 'today';
              const img = saved ? IMG.cups[cupIdx++ % 6] : miss ? IMG.cupMiss : null;
              return (
                <Pressable key={d.date} accessibilityRole="button" accessibilityLabel={`${d.day} ${d.num}: ${saved ? 'sudah menabung' : miss ? 'terlewat' : today ? 'hari ini' : 'belum'}`}
                  onPress={() => say(saved ? `${d.num}: latte terisi` : miss ? `${d.num}: terlewat. Setor rutin agar streak tetap menyala` : today ? 'Hari ini belum ada latte. Yuk isi!' : 'Hari ini belum tiba')}
                  style={{ flex: 1, alignItems: 'center', borderRadius: 12, paddingVertical: 4, backgroundColor: miss ? '#FDE9E6' : today ? '#E8F6EE' : '#F8F2E6', borderWidth: miss || today ? 1.5 : 0, borderColor: miss ? '#F08A80' : C.gGreen, borderStyle: today ? 'dashed' : 'solid' }}>
                  <P s={10.5} w="popM" c={miss ? C.latteRed : C.gMuted}>{d.day}</P>
                  <P s={14} c={miss ? C.latteRed : C.gInk}>{d.num}</P>
                  <View style={{ width: 34, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                    {img ? <Image source={img} style={{ width: 34, height: 43, opacity: miss ? 0.55 : 1, borderRadius: 6 }} resizeMode="cover" /> : <View style={{ width: 22, height: 26, borderRadius: 6, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#CDBFA6' }} />}
                    {saved || miss ? (
                      <View style={{ position: 'absolute', right: -4, bottom: -2, width: 18, height: 18, borderRadius: 9, backgroundColor: saved ? '#1E9E5A' : '#D9302A', borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name={saved ? 'check' : 'close'} size={10} color="#FFFFFF" sw={4} />
                      </View>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={{ backgroundColor: '#FFFDF8', borderRadius: 18, padding: 12, paddingBottom: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}><P s={16}>Latte kamu</P><P s={16}>{g.latte_cycle}<P s={13} w="popM">/10</P></P></View>
          <LatteBar n={g.latte_cycle} width={297} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 }}>
          <P s={15.5}>Hadiah Berikutnya</P>
          <Pressable onPress={() => say(`Total latte ${g.latte_total}. Hadiah: voucher kopi (10), cashback (20), tote bag (30)`)} hitSlop={8}><P s={12.5} w="popM" c="#A15A12">Lihat Semua ›</P></Pressable>
        </View>
        {nr ? (
          <Pressable accessibilityRole="button" onPress={() => say(`Kumpulkan ${nr.latte_required - g.latte_total} latte lagi untuk ${nr.title.toLowerCase()}`)} style={{ backgroundColor: '#FFFFFF', borderRadius: 18, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Image source={rewardImg[nr.code]} style={{ width: 64, height: 60 }} resizeMode="contain" />
            <View style={{ flex: 1 }}>
              <P s={15}>{nr.title}</P><P s={11.5} w="popM" c={C.gMuted}>Capai {nr.latte_required} latte</P>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
                <View style={{ flex: 1, height: 9, borderRadius: 5, backgroundColor: '#F2ECE2', overflow: 'hidden' }}>
                  <LinearGradient colors={['#FF7A1A', '#FCC025']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${(nr.progress / nr.latte_required) * 100}%`, height: 9 }} />
                </View>
                <P s={11.5} w="popM" c={C.gMuted}>{nr.progress}/{nr.latte_required}</P>
              </View>
            </View>
          </Pressable>
        ) : <View style={{ backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16 }}><P s={14} center>Semua hadiah sudah terbuka. Keren!</P></View>}
        <P s={15.5} style={{ paddingHorizontal: 4 }}>Reward Lainnya</P>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {others.slice(0, 2).map((r) => (
            <Pressable key={r.code} accessibilityRole="button" onPress={() => say(r.unlocked ? `${r.title} sudah terbuka` : `${r.title} terbuka di ${r.latte_required} latte`)} style={{ flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Image source={rewardImg[r.code]} style={{ width: 40, height: 44, opacity: r.unlocked ? 1 : 0.9 }} resizeMode="contain" />
              <View style={{ flex: 1 }}><P s={12}>{r.title}</P><P s={10.5} w="popM" c={r.unlocked ? C.gGreen : C.gMuted}>{r.unlocked ? 'Terbuka' : `Capai ${r.latte_required} latte`}</P></View>
            </Pressable>
          ))}
        </View>
      </Abs>
    </Canvas>
  );
}

// ---------------------------------------------------------------- streak broken
export function GamiBroken() {
  const { view, nav } = useApp();
  const g = view!.gamification;
  return (
    <Canvas bg={IMG.g7} bgColor="#3D3A6B">
      <Back />
      <Abs x={48} y={168} w={296} h={98} style={[card, { backgroundColor: '#EEEDF4', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, gap: 16 }]}>
        <Image source={IMG.cloud} style={{ width: 70, height: 60 }} resizeMode="contain" />
        <View><P s={30} c="#1C1B4A">0 hari</P><P s={17} c="#1C1B4A">berturut-turut</P></View>
      </Abs>
      <Abs x={40} y={378} w={310} style={{ backgroundColor: 'rgba(28,27,74,0.55)', borderRadius: 14, padding: 8 }}><P s={12.5} w="popM" c="#FFFFFF" center>Rekor terpanjangmu {g.longest_streak} hari. Latte kamu tetap aman di {g.latte_cycle}/10.</P></Abs>
      <GreenBtn title="Menabung Sekarang" icon x={18} y={663} w={354} h={70} onPress={() => nav.replace('gami_deposit')} />
    </Canvas>
  );
}
