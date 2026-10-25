import React, { useState } from 'react';
import { Image, Platform, Pressable, Share, View } from 'react-native';
import { signOut } from '../api';
import { useApp } from '../store';
import { C } from '../theme';
import { Btn, Card, Chip, Field, Header, Icon, ListItem, Note, Row, Screen, Spacer, T, Toggle, GradBox } from '../ui';

const LOGO_H = require('../../assets/brand/logo_horizontal_t.webp');

export const ARTICLES = [
  { slug: 'sisa-aman', title: 'Atur gaji tanpa ribet: mulai dari sisa aman', minutes: 3, body: ['Daripada mencatat semua hal sekaligus, mulai dari satu angka: berapa yang aman dipakai sampai gajian berikutnya.', 'Kurangi pendapatan dengan pengeluaran rutin, cicilan, dan setoran target. Sisanya bagi dengan jumlah hari sampai gajian.', 'Angka harian ini membantumu memutuskan jajan atau nongkrong tanpa merasa bersalah, karena target tetap aman.'], cta: ['Lihat sisa amanku', 'tab:home'] },
  { slug: 'dana-cadangan', title: 'Kenapa dana cadangan harus dipisah dari DP', minutes: 2, body: ['DP adalah uang untuk tujuan yang sudah pasti. Dana cadangan adalah uang untuk hal yang tidak bisa diprediksi.', 'Kalau dicampur, satu kejadian darurat bisa membuat target DP mundur berbulan-bulan, atau membuatmu telat bayar cicilan setelah punya kendaraan.', 'Target umum dana cadangan adalah 3 sampai 6 bulan pengeluaran esensial.'], cta: ['Atur dana cadangan', 'tab:goal_ef'] },
  { slug: 'dp-ideal', title: 'Berapa DP yang ideal untuk kendaraan', minutes: 3, body: ['Semakin besar DP, semakin kecil pokok pinjaman, sehingga cicilan bulanan dan total bunga ikut turun.', 'Bandingkan beberapa persentase DP di Planner, lalu pilih yang membuat sisa kas setelah cicilan tetap positif.', 'Syarat DP minimum mengikuti ketentuan yang berlaku dan kebijakan perusahaan pembiayaan.'], cta: ['Ubah target DP', 'go:edit_goal'] },
  { slug: 'baca-simulasi', title: 'Cara membaca simulasi cicilan', minutes: 2, body: ['Lihat tiga angka: cicilan per bulan, total yang dibayar, dan sisa kas setelah cicilan.', 'Tenor panjang membuat cicilan ringan, tapi total bayar lebih besar. Tenor pendek sebaliknya.', 'Gunakan stress test untuk melihat apakah skenario masih aman jika pendapatan turun.'], cta: ['Buka Planner', 'tab:planner'] },
  { slug: 'privasi', title: 'Kebijakan privasi singkat', minutes: 2, body: ['OTO CUAN hanya menyimpan data yang kamu masukkan untuk menghitung perencanaan keuangan.', 'Data tidak dibagikan ke OTO Finance kecuali kamu meminta konsultasi dan menyetujui berbagi ringkasan.', 'Kamu bisa melihat, mengekspor, dan meminta penghapusan data kapan saja dari menu Profil.'], cta: ['Kembali', 'back'] },
];

export function Reminders() {
  const { view, nav, run } = useApp();
  const v = view!; const g = v.gamification; const dp = v.goals.down_payment;
  const list: ['deposit' | 'budget_review' | 'data_update', string, string][] = [['deposit', 'Pengingat Nabung Yuk', 'Setiap hari, pukul 19.00'], ['budget_review', 'Review anggaran', 'Setiap Minggu malam'], ['data_update', 'Perbarui data keuangan', 'Setelah gajian']];
  const badges = [
    { big: '25%', label: 'DP pertama', on: dp.percent >= 25, tone: 'o' },
    { big: `${Math.max(g.longest_streak, 7)} hr`, label: 'Streak terpanjang', on: g.longest_streak >= 7, tone: 't' },
    { big: '10', label: 'Latte pertama penuh', on: g.latte_total >= 10, tone: 'o' },
  ];
  return (
    <Screen>
      <Header title="Pengingat & Badge" />
      <GradBox style={{ borderRadius: 22, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Image source={require('../../assets/gami/flame.webp')} style={{ width: 52, height: 60, borderRadius: 14 }} />
        <View style={{ flex: 1 }}><T s={26} w="x" c={C.onOrange} lh={32}>{g.streak} hari</T><T s={13} w="b" c={C.onOrange}>Nabung Yuk berturut-turut · rekor {g.longest_streak} hari</T></View>
      </GradBox>
      <Card>
        <T w="b">Badge</T>
        <Row gap={8} style={{ marginTop: 10, alignItems: 'stretch' }}>
          {badges.map((b) => (
            <View key={b.label} style={{ flex: 1, borderRadius: 16, padding: 12, alignItems: 'center', backgroundColor: b.on ? (b.tone === 't' ? C.tealTint : C.orangeTint) : C.chipBg }}>
              <T s={19} w="x" c={b.on ? (b.tone === 't' ? C.tealDark : C.orangeText) : C.muted}>{b.big}</T>
              <T s={11} w="b" center c={b.on ? C.ink : C.muted}>{b.on ? b.label : 'Belum terbuka'}</T>
            </View>
          ))}
        </Row>
      </Card>
      <Card style={{ paddingVertical: 4 }}>
        {list.map(([k, l, s], i) => (
          <Row key={k} style={{ paddingVertical: 11, borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: C.line }}>
            <View><T s={13.5} w="b">{l}</T><T s={11.5} c={C.muted}>{s}</T></View>
            <Toggle label={l} on={v.reminders[k]} onPress={() => run((a) => a.reminder(k, !v.reminders[k]))} />
          </Row>
        ))}
      </Card>
      <Btn v="o" title="Nabung Yuk Sekarang" onPress={() => nav.go('gami_intro')} />
    </Screen>
  );
}

export function Notifications() {
  const { view, nav, run } = useApp();
  const list = view!.notifications;
  return (
    <Screen>
      <Header title="Notifikasi" right={<T s={13} w="b" c={C.tealDark} onPress={() => run((a) => a.readNotifications(), 'Semua notifikasi dibaca')}>Tandai dibaca</T>} />
      <Card style={{ paddingVertical: 4 }}>
        {[...list, { id: 'demo-broken', title: 'Streak kamu terputus (contoh)', body: 'Lihat yang terjadi kalau lupa nabung sehari.', deep_link: 'gami_broken', read_at: 'x', created_at: '' } as any].map((n, i, arr) => (
          <Pressable key={n.id} accessibilityRole="button" onPress={() => nav.open(n.deep_link)} style={{ flexDirection: 'row', gap: 12, paddingVertical: 13, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: C.line }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: 6, backgroundColor: n.read_at ? '#CBD7DB' : C.orange }} />
            <View style={{ flex: 1 }}><T s={13.5} w="x">{n.title}</T><T s={12} c={C.muted}>{n.body}</T></View>
          </Pressable>
        ))}
      </Card>
      <T s={11.5} c={C.muted} center>Atur jenis dan frekuensi notifikasi di Profil, Pengingat & badge.</T>
    </Screen>
  );
}

export function Profile() {
  const { view, nav, run } = useApp();
  const v = view!;
  return (
    <Screen>
      <Header title="Profil" />
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center' }}><T s={22} w="x" c={C.white}>{(v.profile.full_name || 'S')[0].toUpperCase()}</T></View>
        <View style={{ flex: 1 }}><T s={17} w="x">{v.profile.full_name || 'Pengguna OTO CUAN'}</T><T s={12.5} c={C.muted}>{v.profile.phone || v.profile.email}</T></View>
        <T s={13} w="b" c={C.tealDark} onPress={() => nav.go('edit_profile')}>Ubah</T>
      </Card>
      <Pressable accessibilityRole="button" onPress={() => nav.tab('readiness')} style={{ borderRadius: 22, overflow: 'hidden' }}>
        <GradBox style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}><T s={14.5} w="x" c={C.onOrange}>Siap bicara dengan OTO Finance?</T><T s={12.5} w="s" c={C.onOrange}>Cek profil kesiapan, lalu pilih cara konsultasi.</T></View>
          <Icon name="chev" color={C.onOrange} />
        </GradBox>
      </Pressable>
      <T s={12} w="b" c={C.muted} style={{ marginLeft: 4, letterSpacing: 1 }}>PRIVASI & DATA</T>
      <Card style={{ paddingVertical: 2 }}>
        <ListItem icon="shield" title="Kelola persetujuan" right={v.consents.share_summary ? 'Berbagi: aktif' : 'Berbagi: mati'} onPress={() => nav.go('privacy')} />
        <ListItem icon="list" title="Lihat dan perbarui data keuangan" onPress={() => nav.go('setup')} />
        <ListItem icon="download" title="Ekspor data saya" onPress={() => nav.go('export')} />
        <ListItem icon="trash" title="Minta penghapusan akun" danger last onPress={() => nav.go('delete')} />
      </Card>
      <T s={12} w="b" c={C.muted} style={{ marginLeft: 4, letterSpacing: 1 }}>APLIKASI</T>
      <Card style={{ paddingVertical: 2 }}>
        <ListItem icon="bell" title="Pengingat & badge" right={`${Object.values(v.reminders).filter(Boolean).length} aktif`} onPress={() => nav.go('reminders')} />
        <ListItem icon="help" title="Bantuan & edukasi" onPress={() => nav.go('help')} />
        <ListItem icon="logout" title="Keluar" last onPress={async () => { await signOut(); await run((a) => a.state(0)); nav.reset('splash'); }} />
      </Card>
      <View style={{ alignItems: 'center', gap: 4 }}><Image source={LOGO_H} style={{ width: 120, height: 16 }} resizeMode="contain" /><T s={11} c={C.muted}>Versi 1.0 · didukung OTO Finance</T></View>
    </Screen>
  );
}

export function EditProfile() {
  const { view, nav, run } = useApp();
  const [name, setName] = useState(view!.profile.full_name);
  const [email, setEmail] = useState(view!.profile.email || '');
  return (
    <Screen white>
      <Header title="Ubah Profil" grey />
      <Field label="Nama panggilan" value={name} onChangeText={setName} maxLength={60} />
      <Field label="Email (opsional)" value={email} onChangeText={setEmail} keyboardType="email-address" maxLength={120} />
      <Field label="Nomor HP" value={view!.profile.phone || '-'} editable={false} />
      <T s={11.5} c={C.muted}>Mengganti nomor HP perlu verifikasi ulang demi keamanan akun.</T>
      <Spacer />
      <Btn title="Simpan" onPress={async () => { if (await run((a) => a.profile({ full_name: name, email }), 'Profil tersimpan')) nav.back(); }} />
    </Screen>
  );
}

export function Privacy() {
  const { view, nav, run } = useApp();
  const c = view!.consents;
  return (
    <Screen>
      <Header title="Kelola Persetujuan" />
      <Card><Row><View style={{ flex: 1 }}><T w="b">Syarat & Kebijakan Privasi</T><T s={11.5} c={C.muted}>Disetujui · versi 1.0</T></View><T s={11} w="b" c={C.muted}>Wajib</T></Row></Card>
      <Card><Row><View style={{ flex: 1 }}><T w="b">Info promo & edukasi</T><T s={11.5} c={C.muted}>Push dan email</T></View><Toggle label="Info promo" on={c.marketing} onPress={() => run((a) => a.consents({ marketing: !c.marketing }))} /></Row></Card>
      <Card><Row><View style={{ flex: 1 }}><T w="b">Bagikan ringkasan ke OTO Finance</T><T s={11.5} c={C.muted}>Hanya saat kamu meminta konsultasi</T></View><Toggle label="Bagikan ringkasan" on={c.share_summary} onPress={() => run((a) => a.consents({ share_summary: !c.share_summary }))} /></Row></Card>
      <Card><T w="b">Yang tidak pernah kami lakukan</T><T s={12.5} lh={18} c={C.body} style={{ marginTop: 6 }}>Menjual datamu, memindahkan uangmu, atau memakai data aplikasi sebagai keputusan kredit resmi.</T></Card>
      <Btn v="g" title="Baca Kebijakan Privasi" onPress={() => nav.go('article', { slug: 'privasi' })} />
    </Screen>
  );
}

export function Export() {
  const { nav, run, say } = useApp();
  const [format, setFormat] = useState<'JSON' | 'CSV'>('JSON');
  const doExport = async () => {
    let data: any = null;
    await run(async (a) => { data = await a.exportData(); });
    if (!data) return;
    const text = format === 'JSON' ? JSON.stringify(data, null, 2)
      : ['tanggal,jenis,kategori,nominal,catatan', ...(data.transactions || []).map((t: any) => [t.occurred_on, t.type, t.category_code || '', t.amount, `"${String(t.note || '').replace(/"/g, '""')}"`].join(','))].join('\n');
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([text], { type: format === 'JSON' ? 'application/json' : 'text/csv' });
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = `otocuan-data.${format.toLowerCase()}`; a.click(); URL.revokeObjectURL(url);
      say('File data disiapkan');
    } else { await Share.share({ message: text, title: 'Data OTO CUAN' }); }
    nav.back();
  };
  return (
    <Screen white>
      <Header title="Ekspor Data" grey />
      <T s={14} lh={21} c={C.muted}>Unduh salinan data keuangan, target, transaksi, dan skenario yang kamu simpan.</T>
      <T s={13} w="b" c={C.muted}>Format file</T>
      <Row gap={8}>{(['JSON', 'CSV'] as const).map((f) => <Chip key={f} label={f === 'CSV' ? 'CSV (transaksi)' : 'JSON (lengkap)'} on={format === f} onPress={() => setFormat(f)} style={{ flex: 1, minHeight: 50 }} />)}</Row>
      <Spacer />
      <Btn title="Unduh Data" icon="download" onPress={doExport} />
    </Screen>
  );
}

export function Delete() {
  const { nav, run } = useApp();
  const [ok, setOk] = useState(false);
  return (
    <Screen white>
      <Header title="Hapus Akun" grey />
      <View style={{ backgroundColor: C.redTint, borderRadius: 18, padding: 16, gap: 6 }}>
        <T w="b" c={C.red}>Ini tidak bisa dibatalkan setelah 14 hari</T>
        <T s={12.5} lh={18}>Data keuangan, target, latte, streak, dan skenario akan dihapus sesuai kebijakan privasi. Permintaan konsultasi yang sudah terkirim mengikuti kebijakan OTO Finance.</T>
      </View>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: ok }} onPress={() => setOk(!ok)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.bg, borderRadius: 16, padding: 14 }}>
        <View style={{ width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: C.red, backgroundColor: ok ? C.red : C.white, alignItems: 'center', justifyContent: 'center' }}>{ok ? <Icon name="check" size={14} color={C.white} sw={3} /> : null}</View>
        <T s={12.5} w="s" style={{ flex: 1 }}>Saya paham dan ingin menghapus akun</T>
      </Pressable>
      <Spacer />
      <Btn v="d" title="Hapus Akun Saya" disabled={!ok} onPress={async () => { if (!ok) return; await run(async (a) => { await a.deleteAccount(); }); nav.reset('deleted'); }} />
      <Btn v="g" title="Batal" onPress={nav.back} />
    </Screen>
  );
}

export function Deleted() {
  const { nav, run } = useApp();
  return (
    <Screen white padTop={150} style={{ alignItems: 'center' }}>
      <T s={24} w="x">Permintaan diterima</T>
      <T s={14.5} lh={22} c={C.muted} center>Akunmu akan dihapus dalam 14 hari. Masuk lagi sebelum itu untuk membatalkan.</T>
      <Spacer />
      <Btn title="Selesai" onPress={async () => { await signOut(); await run((a) => a.state(0)); nav.reset('splash'); }} style={{ alignSelf: 'stretch' }} />
    </Screen>
  );
}

export function Help() {
  const { nav, say } = useApp();
  return (
    <Screen>
      <Header title="Bantuan & Edukasi" />
      <T s={12} w="b" c={C.muted} style={{ marginLeft: 4, letterSpacing: 1 }}>BACAAN SINGKAT</T>
      {ARTICLES.slice(0, 4).map((a, i) => (
        <Card key={a.slug} onPress={() => nav.go('article', { slug: a.slug })} label={a.title} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
          <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: i % 2 ? C.orangeTint : C.tealTint, alignItems: 'center', justifyContent: 'center' }}><T w="x" c={i % 2 ? C.orangeText : C.tealDark}>{i + 1}</T></View>
          <View style={{ flex: 1 }}><T w="x">{a.title}</T><T s={11.5} c={C.muted}>{a.minutes} menit baca</T></View>
        </Card>
      ))}
      <Card style={{ paddingVertical: 4 }}>
        <ListItem icon="mail" title="Hubungi customer service" onPress={() => say('Hubungi OTO Finance lewat kanal resmi di situs perusahaan')} />
        <ListItem icon="help" title="Pertanyaan umum" last onPress={() => nav.go('article', { slug: 'privasi' })} />
      </Card>
      <Note tone="teal" text="OTO CUAN tidak pernah meminta OTP, PIN, atau password melalui chat atau telepon." icon="shield" />
    </Screen>
  );
}

export function Article() {
  const { nav, route } = useApp();
  const a = ARTICLES.find((x) => x.slug === route.params?.slug) || ARTICLES[0];
  const [label, target] = a.cta;
  const cta = () => { if (target === 'back') return nav.back(); const [kind, name] = target.split(':'); kind === 'tab' ? nav.tab(name) : nav.go(name); };
  return (
    <Screen white>
      <Header title="" grey />
      <T s={12} w="b" c={C.orangeText} style={{ letterSpacing: 1 }}>EDUKASI · {a.minutes} MENIT</T>
      <T s={25} w="x" lh={31}>{a.title}</T>
      {a.body.map((p, i) => <T key={i} s={15} lh={24} c={C.body}>{p}</T>)}
      <Spacer />
      <Btn v="o" title={label} onPress={cta} />
    </Screen>
  );
}
