-- Reference data for OTO CUAN
insert into expense_categories (code, label, color, is_essential, sort_order) values
  ('makan',     'Makan & nongkrong', '#FF7702', false, 1),
  ('rumah',     'Kos & rumah',       '#0088A3', true,  2),
  ('transport', 'Transportasi',      '#5FB8CB', true,  3),
  ('tagihan',   'Tagihan',           '#FCC025', true,  4),
  ('belanja',   'Belanja',           '#8E6CC8', false, 5),
  ('lain',      'Lainnya',           '#A9B8BE', false, 6)
on conflict (code) do nothing;

insert into rewards (code, title, latte_required, description) values
  ('voucher_kopi',  'Voucher kopi',        10, 'Voucher minuman dari mitra kedai kopi'),
  ('cashback_saldo','Cashback saldo',      20, 'Cashback saldo e-wallet mitra'),
  ('tote_bag',      'Exclusive tote bag',  30, 'Tote bag edisi OTO CUAN')
on conflict (code) do nothing;

-- Illustrative planner assumption, NOT an official OTO Finance rate. Replace with official parameters.
insert into calc_parameters (key, value, version, note) values
  ('planner_flat_rate_annual', 0.06, 'demo-2026-10', 'Contoh bunga flat per tahun untuk simulasi'),
  ('stress_income_drop',       0.10, 'demo-2026-10', 'Penurunan pendapatan untuk stress test'),
  ('readiness_goal_threshold', 0.50, 'rules-1.0',    'Progres minimal agar indikator target dianggap baik')
on conflict (key, version) do nothing;

insert into education_articles (slug, title, minutes, body, cta_label, cta_target) values
  ('sisa-aman', 'Atur gaji tanpa ribet: mulai dari sisa aman', 3,
   '["Daripada mencatat semua hal sekaligus, mulai dari satu angka: berapa yang aman dipakai sampai gajian berikutnya.","Kurangi pendapatan dengan pengeluaran rutin, cicilan, dan setoran target. Sisanya bagi dengan jumlah hari sampai gajian.","Angka harian ini membantumu memutuskan jajan atau nongkrong tanpa merasa bersalah, karena target tetap aman."]',
   'Lihat sisa amanku', 'home'),
  ('dana-cadangan', 'Kenapa dana cadangan harus dipisah dari DP', 2,
   '["DP adalah uang untuk tujuan yang sudah pasti. Dana cadangan adalah uang untuk hal yang tidak bisa diprediksi.","Kalau dicampur, satu kejadian darurat bisa membuat target DP mundur berbulan-bulan, atau membuatmu telat bayar cicilan setelah punya kendaraan.","Target umum dana cadangan adalah 3 sampai 6 bulan pengeluaran esensial."]',
   'Atur dana cadangan', 'goal_ef'),
  ('dp-ideal', 'Berapa DP yang ideal untuk kendaraan', 3,
   '["Semakin besar DP, semakin kecil pokok pinjaman, sehingga cicilan bulanan dan total bunga ikut turun.","Bandingkan beberapa persentase DP di Planner, lalu pilih yang membuat sisa kas setelah cicilan tetap positif.","Syarat DP minimum mengikuti ketentuan yang berlaku dan kebijakan perusahaan pembiayaan."]',
   'Ubah target DP', 'edit_goal'),
  ('baca-simulasi', 'Cara membaca simulasi cicilan', 2,
   '["Lihat tiga angka: cicilan per bulan, total yang dibayar, dan sisa kas setelah cicilan.","Tenor panjang membuat cicilan ringan, tapi total bayar lebih besar. Tenor pendek sebaliknya.","Gunakan stress test untuk melihat apakah skenario masih aman jika pendapatan turun."]',
   'Buka Planner', 'planner')
on conflict (slug) do nothing;
