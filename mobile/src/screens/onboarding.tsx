import React, { useEffect, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { DATA_MODE, hasSession, sendOtp, verifyOtp } from '../api';
import { useApp } from '../store';
import { C, digits, num, rp } from '../theme';
import { Btn, Card, Field, Header, Icon, IconBtn, Note, Row, Screen, Spacer, T, Toggle } from '../ui';

const LOGO = require('../../assets/brand/logo_stacked_t.webp');
const ICON = require('../../assets/brand/app_icon.png');

export function Splash() {
  const { nav, run } = useApp();
  useEffect(() => {
    // Returning user (or magic-link sign-in): skip onboarding and load their own data.
    hasSession().then(async (yes) => { if (yes && (await run((a) => a.state(0)))) nav.reset('home'); }).catch(() => {});
  }, []);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Buka OTO CUAN" onPress={() => nav.reset('onboarding')} style={{ flex: 1, backgroundColor: '#E9F8FA', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <Svg width="100%" height="100%" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice" style={{ position: 'absolute' }}>
        <Path d="M0 0 H390 V844 H0 Z" fill="#F7FDFE" />
        <Path d="M0 0 H390 V150 C320 205 250 120 170 160 C100 195 50 150 0 175 Z" fill="#E4F7FA" />
        <Path d="M390 250 C330 300 300 230 230 270 C170 305 150 380 210 420 C260 455 330 400 390 430 Z" fill="#C9EFF5" opacity={0.7} />
        <Path d="M0 470 C60 440 110 500 170 480 C240 455 270 520 230 570 C190 615 90 600 0 640 Z" fill="#BFEBF3" opacity={0.6} />
        <Path d="M0 844 V700 C70 660 140 720 220 690 C290 665 340 700 390 680 V844 Z" fill="#A9E3EE" opacity={0.75} />
        <Path d="M0 844 V760 C90 730 170 790 260 765 C320 748 360 770 390 760 V844 Z" fill="#8FD9E7" opacity={0.6} />
      </Svg>
      <Image source={LOGO} style={{ width: 230, height: 124 }} resizeMode="contain" accessibilityLabel="OTO CUAN" />
      <T s={12} w="s" c={C.tealDark} style={{ position: 'absolute', bottom: 48 }}>didukung oleh OTO Finance · ketuk untuk mulai</T>
    </Pressable>
  );
}

const SLIDES = [
  { eb: 'OBSERVE', title: 'Lihat ke mana uangmu pergi', text: 'Catat pendapatan dan pengeluaran, lalu lihat berapa yang benar-benar aman dipakai sampai gajian.', ex: 'Aman dipakai: Rp200 rb per hari', bg: C.tealTint, fg: C.teal },
  { eb: 'TRANSFORM', title: 'Kumpulkan DP sambil bikin latte', text: 'Nabung Yuk mengubah setoran harian jadi latte. Isi 10 latte dan buka hadiah sambil DP-mu bertambah.', ex: 'Streak 7 hari · Latte 7/10', bg: C.orangeTint, fg: C.orange },
  { eb: 'OPTIMIZE', title: 'Simulasikan cicilan dengan tenang', text: 'Bandingkan tenor, lihat sisa kas setelah cicilan, lalu konsultasi ke OTO Finance kalau sudah siap.', ex: 'Tenor 60 bulan · sisa kas Rp800 rb', bg: '#EEF1F3', fg: C.ink },
];
export function Onboarding() {
  const { nav } = useApp();
  const [i, setI] = useState(0);
  const s = SLIDES[i];
  return (
    <Screen white padTop={52}>
      <Row><T s={12.5} w="s" c={C.muted}>{i + 1} dari 3</T><Pressable onPress={() => nav.go('login')} hitSlop={10}><T s={14} w="b" c={C.tealDark}>Lewati</T></Pressable></Row>
      <Image source={LOGO} style={{ width: 150, height: 81, alignSelf: 'center', marginTop: 8 }} resizeMode="contain" />
      <View style={{ marginTop: 14, borderRadius: 28, padding: 22, backgroundColor: s.bg, minHeight: 300, gap: 12 }}>
        <T s={12} w="b" c={s.fg} style={{ letterSpacing: 1 }}>{s.eb}</T>
        <T s={27} w="x" lh={33}>{s.title}</T>
        <T s={15} lh={23} c={C.body}>{s.text}</T>
        <Spacer />
        <Row style={{ backgroundColor: C.white, borderRadius: 18, padding: 14, justifyContent: 'flex-start' }} gap={12}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: s.fg, alignItems: 'center', justifyContent: 'center' }}><T s={16} w="x" c={C.white}>{i + 1}</T></View>
          <T s={12.5} w="s">{s.ex}</T>
        </Row>
      </View>
      <Spacer />
      <Row style={{ justifyContent: 'center' }} gap={6}>{SLIDES.map((_, k) => <View key={k} style={{ height: 6, borderRadius: 3, width: k === i ? 22 : 6, backgroundColor: k === i ? C.teal : '#CBD7DB' }} />)}</Row>
      <Btn v="o" title={i < 2 ? 'Lanjut' : 'Mulai Siap-siap'} onPress={() => (i < 2 ? setI(i + 1) : nav.go('login'))} />
      <T s={11.5} c={C.muted} center>OTO CUAN adalah alat edukasi dan perencanaan, bukan penilaian kredit resmi OTO Finance.</T>
    </Screen>
  );
}

export function Login() {
  const { nav, say, busy } = useApp();
  const [phone, setPhone] = useState('812 3456 7890');
  const [email, setEmail] = useState('');
  const [useEmail, setUseEmail] = useState(DATA_MODE === 'remote');
  const submit = async () => {
    const target = useEmail ? { email: email.trim() } : { phone: '+62' + digits(phone) };
    if (useEmail ? !/^\S+@\S+\.\S+$/.test(email.trim()) : String(digits(phone)).length < 9) { say(useEmail ? 'Email belum valid' : 'Nomor HP belum lengkap'); return; }
    try { await sendOtp(target); nav.go('otp', { target }); say('Kode verifikasi terkirim'); } catch (e: any) { say(e.message); }
  };
  return (
    <Screen white>
      <IconBtn name="back" label="Kembali" bg={C.chipBg} onPress={nav.back} />
      <Image source={ICON} style={{ width: 60, height: 60, marginTop: 8 }} />
      <T s={26} w="x">Masuk ke OTO CUAN</T>
      <T s={14.5} lh={22} c={C.muted}>{useEmail ? 'Kami kirim kode 6 angka ke emailmu.' : 'Pakai nomor HP. Kami kirim kode verifikasi lewat SMS.'}</T>
      {useEmail ? <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="nama@email.com" /> : (
        <Row style={{ alignItems: 'flex-end' }}>
          <View style={{ height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, paddingHorizontal: 14, justifyContent: 'center' }}><T w="s">+62</T></View>
          <View style={{ flex: 1 }}><Field label="Nomor HP" value={phone} onChangeText={setPhone} keyboardType="phone-pad" /></View>
        </Row>
      )}
      <Btn title="Kirim Kode Verifikasi" onPress={submit} disabled={busy} />
      <Row style={{ marginVertical: 4 }}><View style={{ flex: 1, height: 1, backgroundColor: C.line }} /><T s={12.5} c={C.muted}>atau</T><View style={{ flex: 1, height: 1, backgroundColor: C.line }} /></Row>
      <Btn v="plain" icon={useEmail ? undefined : 'mail'} title={useEmail ? 'Pakai nomor HP' : 'Lanjut dengan Email'} onPress={() => setUseEmail(!useEmail)} />
      {DATA_MODE === 'remote' ? <Pressable onPress={() => nav.go('consent')} style={{ alignSelf: 'center', padding: 10 }}><T w="b" c={C.tealDark}>Coba demo tanpa akun</T></Pressable> : null}
      <Spacer />
      <Note tone="teal" icon="shield" text="Datamu dienkripsi. OTO CUAN tidak meminta PIN atau password rekening bankmu." />
    </Screen>
  );
}

export function Otp() {
  const { nav, route, say, run } = useApp();
  const [code, setCode] = useState('');
  const target = route.params?.target || {};
  const verify = async () => {
    if (code.length < 6) { say('Masukkan 6 angka kode'); return; }
    try { await verifyOtp(target, code); await run((a) => a.state(0)); nav.go('consent'); } catch (e: any) { say(e.message); }
  };
  return (
    <Screen white>
      <IconBtn name="back" label="Kembali" bg={C.chipBg} onPress={nav.back} />
      <T s={26} w="x" style={{ marginTop: 8 }}>Masukkan kode</T>
      <T s={14.5} lh={22} c={C.muted}>Kode 6 angka sudah dikirim ke {target.email || target.phone}.{DATA_MODE === 'remote' && target.email ? ' Kalau yang masuk berupa link, cukup ketuk link-nya di HP ini.' : ''}</T>
      <Field label="Kode verifikasi" big value={code} onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} placeholder="••••••" />
      {DATA_MODE === 'local' ? <T s={11.5} c={C.muted}>Mode demo: ketik 6 angka apa saja.</T> : null}
      <Btn title="Verifikasi" onPress={verify} disabled={code.length < 6} />
      <Pressable onPress={async () => { try { await sendOtp(target); say('Kode baru terkirim'); } catch (e: any) { say(e.message); } }} style={{ alignSelf: 'center', padding: 12 }}><T w="b" c={C.tealDark}>Kirim ulang kode</T></Pressable>
    </Screen>
  );
}

export function Consent() {
  const { nav, view, run, say } = useApp();
  const [c, setC] = useState({ terms: true, marketing: view?.consents.marketing ?? false, share_summary: view?.consents.share_summary ?? false });
  const rows: [keyof typeof c, string, string][] = [['terms', 'Syarat & Kebijakan Privasi', 'Wajib untuk memakai aplikasi'], ['marketing', 'Info promo & edukasi', 'Opsional'], ['share_summary', 'Bagikan ringkasan ke OTO Finance', 'Opsional, hanya saat kamu minta konsultasi']];
  const next = async () => { if (!c.terms) { say('Setujui syarat dan kebijakan dulu'); return; } if (await run((a) => a.consents(c))) nav.go('setup', { first: true }); };
  return (
    <Screen>
      <IconBtn name="back" label="Kembali" onPress={nav.back} />
      <T s={24} w="x">Datamu, kendalimu</T>
      <T s={14} lh={21} c={C.muted}>Kami jelaskan untuk apa datamu dipakai. Pilihan ini bisa diubah kapan saja di Profil.</T>
      <Card style={{ gap: 10 }}>
        <T s={13} w="b" c={C.tealDark}>Data yang kami simpan</T>
        {['Pendapatan, pengeluaran, dan cicilan yang kamu masukkan sendiri.', 'Target DP, dana cadangan, latte, dan simulasi cicilan yang kamu simpan.', 'Semua angka adalah estimasi, bukan skor kredit.'].map((t, i) => (
          <Row key={i} style={{ justifyContent: 'flex-start', alignItems: 'flex-start' }}><T w="x" c={C.teal}>{i + 1}</T><T s={13} lh={19} style={{ flex: 1 }}>{t}</T></Row>
        ))}
      </Card>
      {rows.map(([k, t, sub]) => (
        <Card key={k} style={{ paddingVertical: 14 }}><Row><View style={{ flex: 1 }}><T w="b">{t}</T><T s={11.5} c={C.muted}>{sub}</T></View><Toggle label={t} on={c[k]} onPress={() => setC({ ...c, [k]: !c[k] })} /></Row></Card>
      ))}
      <Spacer />
      <Btn v="o" title="Setuju & Lanjutkan" onPress={next} disabled={!c.terms} />
    </Screen>
  );
}

export function Setup() {
  const { nav, view, run, route } = useApp();
  const f = view!.finance;
  const [income, setIncome] = useState(num(f.net_income));
  const [obl, setObl] = useState(num(f.obligations));
  const [ess, setEss] = useState(num(f.essential_expense));
  const [budgets, setBudgets] = useState<Record<string, string>>(Object.fromEntries(['makan', 'rumah', 'transport', 'tagihan', 'belanja', 'lain'].map((k) => [k, num(f.categories.find((c) => c.code === k)?.amount || 0)])));
  const labels: Record<string, string> = { makan: 'Makan & nongkrong', rumah: 'Kos & rumah', transport: 'Transportasi', tagihan: 'Tagihan', belanja: 'Belanja', lain: 'Lainnya' };
  const total = Object.values(budgets).reduce((a, b) => a + digits(b), 0);
  const left = digits(income) - total - digits(obl);
  const save = async () => {
    const v = await run((a) => a.finance({ net_income: digits(income), obligations: digits(obl), essential_expense: Math.max(1, digits(ess)), budgets: Object.fromEntries(Object.entries(budgets).map(([k, v]) => [k, digits(v)])) }), 'Financial Snapshot diperbarui');
    if (v) route.params?.first ? nav.reset('home') : nav.back();
  };
  const fmtSet = (set: (s: string) => void) => (t: string) => set(num(digits(t)));
  return (
    <Screen>
      <Header eyebrow="FINANCIAL CAPACITY CHECK" title="Kondisi keuanganmu" />
      <T s={12.5} c={C.muted}>Isi angka per bulan. Cukup perkiraan, bisa diperbarui kapan saja.</T>
      <Card style={{ gap: 10 }}>
        <Field label="Pendapatan bersih per bulan" value={income} onChangeText={fmtSet(setIncome)} keyboardType="number-pad" />
        <Field label="Cicilan dan kewajiban rutin" value={obl} onChangeText={fmtSet(setObl)} keyboardType="number-pad" />
        <Field label="Pengeluaran esensial (kos, makan pokok, tagihan)" value={ess} onChangeText={fmtSet(setEss)} keyboardType="number-pad" />
      </Card>
      <Card style={{ gap: 10 }}>
        <Row><T w="b">Pengeluaran per kategori</T><T s={11} w="b" c={C.muted}>Diinput manual</T></Row>
        {Object.keys(budgets).map((k) => (
          <Row key={k}><T s={13} style={{ flex: 1 }}>{labels[k]}</T><View style={{ width: 150 }}><Field value={budgets[k]} onChangeText={(t) => setBudgets({ ...budgets, [k]: num(digits(t)) })} keyboardType="number-pad" /></View></Row>
        ))}
        <Row style={{ borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10 }}><T w="b">Total pengeluaran</T><T w="b">{rp(total)}</T></Row>
      </Card>
      <Card style={{ backgroundColor: C.tealTint }}><Row><T w="b">Estimasi sisa kas</T><T s={20} w="x" c={left >= 0 ? C.tealDark : C.red}>{rp(left)}</T></Row></Card>
      <Btn v="o" title="Hitung Financial Snapshot" onPress={save} />
    </Screen>
  );
}
export { Icon };
