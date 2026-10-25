# OTO CUAN

Aplikasi pendamping keuangan Gen Z untuk menyiapkan kepemilikan kendaraan bersama OTO Finance:
sisa aman sampai gajian, target DP dan dana cadangan, **Nabung Yuk** (gamifikasi latte, streak harian,
kalender, hadiah), simulasi cicilan, profil kesiapan, dan konsultasi sukarela ke OTO Finance.

> Semua angka adalah estimasi dari data yang dimasukkan pengguna, bukan skor kredit dan bukan keputusan kredit.
> Bunga di Planner (flat 6%/tahun, `demo-2026-10`) hanya contoh. Ganti dengan parameter resmi di tabel `calc_parameters`.

## Stack

| Lapisan | Teknologi |
|---|---|
| Frontend | React Native (Expo SDK 52, TypeScript), jalan di Android, iOS, dan web (react-native-web) |
| Backend | FastAPI (Python 3.12), dideploy sebagai Vercel Python Function di `/api/*` |
| Database & Auth | Supabase (Postgres + Row Level Security, OTP via SMS/email, JWT) |
| Hosting | Vercel (static web build + serverless API dalam satu project) |

Diagram ada di `docs/architecture.png` dan `docs/erd.png` (sumber Mermaid: `docs/*.mmd`).

## Struktur

```
api/index.py                 Entry Vercel untuk FastAPI
backend/app/engine.py        Aturan domain (sisa aman, ETA, simulasi, streak & latte, readiness)
backend/app/store.py         PostgresStore (Supabase) + MemoryStore (demo)
backend/app/main.py          Routes FastAPI
backend/tests/               Pytest (6 test)
supabase/migrations/         Skema + RLS + trigger user baru
supabase/seed.sql            Data referensi (kategori, hadiah, parameter, artikel)
mobile/                      Aplikasi Expo (src/screens/*, src/engine.ts, src/api.ts)
vercel.json                  Build web + routing /api
```

## Mode data

- `EXPO_PUBLIC_DATA_MODE=local` (default): semua fitur jalan di perangkat dengan data contoh persona Steven. Cocok untuk demo dan juri, tanpa backend.
- `EXPO_PUBLIC_DATA_MODE=remote`: login OTP/magic link email Supabase, data lewat FastAPI ke Supabase. Tanpa login, tombol **Coba demo tanpa akun** tetap membuka semua fitur dengan data contoh di perangkat.

## Jalankan lokal

```bash
# backend
pip install -r requirements.txt fastapi[standard] pytest httpx
python -m pytest backend/tests          # 6 passed
uvicorn backend.app.main:app --reload   # http://localhost:8000/api/docs

# frontend
cd mobile && npm install
npx expo start                          # tekan w untuk web, atau scan QR dengan Expo Go
```

## Setup Supabase

1. Buat project di supabase.com (region Singapore).
2. SQL Editor: jalankan `supabase/migrations/20261025000000_init.sql`, lalu `supabase/seed.sql`.
3. Authentication > Providers: aktifkan **Email** (OTP). Untuk SMS, aktifkan **Phone** dan hubungkan provider SMS (Twilio/MessageBird/Vonage).
4. Catat: Project URL, `anon` key, dan connection string **Transaction pooler** (port 6543).

## Deploy ke Vercel (domain `otocuan.vercel.app`)

Repo ini sudah tersambung ke project Vercel `otocuan`: setiap push ke `main` otomatis deploy ke production, branch lain jadi preview.


1. Push folder ini ke repo GitHub baru, misalnya `otocuan`.
2. Di vercel.com: **Add New > Project**, import repo, **Project Name: `otocuan`**. Framework preset: *Other*. Root directory: repo root (konfigurasi diambil dari `vercel.json`).
3. Environment Variables (Production):
   - `EXPO_PUBLIC_DATA_MODE` = `remote` (atau `local` untuk demo tanpa database)
   - `EXPO_PUBLIC_API_URL` = `/api`
   - `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `DEMO_MODE` = `false`. Backend memakai Supabase REST dengan JWT pengguna, jadi tidak perlu password database atau service key (RLS tetap berlaku). `DATABASE_URL` opsional jika ingin koneksi Postgres langsung.
4. Deploy. Aplikasi tersedia di `https://otocuan.vercel.app` (jika nama itu masih tersedia; Vercel menambahkan akhiran kalau sudah dipakai).
5. Domain sendiri (misalnya `otocuan.id`): beli domain di registrar, lalu Vercel > Project > Settings > Domains > Add, dan ikuti instruksi DNS.

Alternatif CLI: `npm i -g vercel && vercel login && vercel --prod` dari root repo.

## API ringkas

`GET /api/health` · `GET /api/state?week=0` · `PUT /api/profile` · `PUT /api/consents` · `PUT /api/finance` ·
`POST /api/transactions` · `PUT /api/goals/{down_payment|emergency}` · `POST /api/deposits` (`via_nabung_yuk` untuk latte & streak) ·
`POST /api/planner/simulate` · `POST/DELETE /api/scenarios` · `POST /api/consultations` · `POST /api/notifications/read` ·
`PUT /api/reminders/{kind}` · `POST /api/export` · `POST /api/account/delete`. Dokumentasi interaktif: `/api/docs`.

## Aturan Nabung Yuk

- Setiap setoran lewat Nabung Yuk menambah 1 latte; 10 latte = 1 gelas penuh.
- Streak harian naik jika setor hari ini dan kemarin; setor dua kali di hari yang sama tidak menambah streak.
- Lewat lebih dari 1 hari: streak kembali 0 (layar "Streak kamu terputus"), latte tetap tersimpan.
- Hadiah: voucher kopi (10 latte), cashback saldo (20), tote bag (30). Hadiah adalah contoh dan perlu mitra nyata sebelum rilis.
- Setoran adalah pencatatan virtual; aplikasi tidak memindahkan uang.

Ilustrasi Nabung Yuk adalah aset desain tim OTO CUAN.
