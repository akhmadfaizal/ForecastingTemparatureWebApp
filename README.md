# Dashboard React

Dashboard React untuk monitoring suhu ruang server dan prediksi H+60, H+120,
serta H+180. Tampilan memakai Fluent UI. Grafik memakai Recharts.

Dashboard ini mengikuti Arsitektur 2. Peramban hanya membaca API aplikasi dan
tidak menjalankan model, tidak menulis pembacaan manual, serta tidak menerima
kredensial Aiven atau token pengiriman snapshot.

## Struktur folder

Struktur `src/` mengikuti pola *Intermediate* dari [How To Structure React Projects From Beginner To Advanced](https://blog.webdevsimplified.com/2022-07/react-folder-structure/).
Hanya folder yang terpakai yang dibuat; tidak ada folder kosong.

```text
src/
  main.jsx                  titik masuk, satu-satunya file di root src/
  assets/                   styles.css, pipeline.css
  components/
    ui/                     PredictionRow, ReadingsTable, LoadingBlock, dll.
    charts/                 TemperatureChart
  data/                     mockData.js, pipelineSnapshot.json (+ testnya)
  hooks/                    useDashboardData.js
  pages/
    Dashboard/index.jsx     halaman utama (App)
    Pipeline/               PipelineModel, CleaningVisual, SourceIdentityVisual
  services/                 api.js (akses API eksternal)
  utils/                    utils.js, polling.js (+ test masing-masing)
```

Tes diletakkan di samping file yang diuji, bukan di folder `__tests__` terpisah.
Komponen/hook khusus satu halaman tinggal di folder halaman itu; yang dipakai
lintas halaman naik ke `components/`, `hooks/`, `utils/`, atau `services/`.

## Pengembangan

Jalankan `npm install`, lalu `npm run dev`. Secara bawaan Vite meneruskan
`/api` dan `/health` ke backend production
`https://skripsi-temperature-api.vercel.app`. Untuk memakai backend lokal,
salin `.env.example` menjadi `.env.local`, lalu isi
`VITE_API_PROXY_TARGET=http://127.0.0.1:3000`.

## Build

Jalankan `npm run build`. Hasil build tersedia pada folder `dist`.

Build production memakai `https://skripsi-temperature-api.vercel.app` secara
bawaan, agar deployment ulang tidak kehilangan alamat backend.
`VITE_API_BASE_URL` dapat mengganti alamat tersebut. Pengembangan tetap
memakai proxy Vite. Origin dashboard production sudah diizinkan backend.

Gunakan `http://localhost:5173/?demo=1` untuk melihat data simulasi yang
diberi penanda jelas dan tidak disimpan ke Aiven.

Jalankan `npm run visual-check` ketika API aktif untuk memeriksa lebar viewport
mobile, overflow elemen, dan error JavaScript.

## Visual 3D ruang server

Dashboard menampilkan **Ringkasan**, **Riwayat & prediksi**, **Data sensor**, dan
**Visual 3D** dalam satu halaman, dengan judul yang sama seperti menu navigasi.
Visual 3D berada langsung di bawah Data sensor. Menu menggeser halaman ke
bagian terkait dan penanda aktif mengikuti posisi scroll.

Menu **Visual 3D** mengarah ke `/#visual-3d`, dengan penampil lokal pada
`/visual-3d/index.html` yang dimuat saat mendekati area tampilan.
Model dapat diputar, pintu geser diklik untuk buka/tutup,
dan sensor/server/Mini PC diklik untuk melihat detail. Menu juga tersedia pada
ponsel; tombol tampilan penuh membuka penampil dalam tab baru. Semua pustaka
Three.js dan model disertakan pada `public/visual-3d`; tidak memerlukan CDN.

Detail perangkat berdasarkan vault. Lima layanan Mini PC berstatus aktif pada
pemeriksaan 4 Oktober 2026 pukul 17:22:09 WIB, bukan status langsung.
Geometri yang belum diukur tetap ilustratif.
# Visualisasi pipeline model

Bagian `#pipeline` tersedia setelah Visual 3D dan dapat diakses melalui menu Pipeline Model. Lima belas tahap memperlihatkan data sebelum/sesudah, grafik, tabel, sekuens dengan pilihan horizon dan kode sumber. Snapshot data dan kode berasal dari 6 Oktober 2026 untuk jendela 42 hari. Menurut catatan 11 Oktober, config aktif sudah 42 hari, praproses selesai dan tuning berjalan di PC; hasil final 42 hari belum tersedia. Cuplikan kode belum diekspor ulang; halaman bukan monitor training langsung.

Untuk memperbarui snapshot lokal, jalankan `python3 scripts/export-pipeline-snapshot.py` dari folder frontend dengan pandas, NumPy dan PyYAML tersedia. Script membaca CSV dan fungsi pipeline di workspace induk; tidak menjalankan training atau mengubah run. Setelah itu jalankan `npm run test`, `npm run lint` dan `npm run build`. Contoh interpolasi pendek yang sengaja dibuat kosong ditandai simulasi.


## Deployment dan Git — 11 Oktober 2026

Production: https://skripsi-temperature-dashboard.vercel.app . Deployment
`dpl_H1ZULU17HP5j4PDhoWqpJokYsVmw` READY, termasuk Pipeline Model.
Lima tes, lint/build, HTTP 200 dan interaksi browser production terverifikasi.
Vercel Authentication tetap aktif. Backend/Aiven terhubung; data terakhir
saat pemeriksaan 10 Oktober 2026 pukul 08.25 WIB dan ditandai data lama.

Folder lokal ini belum menjadi repositori Git dan proyek Vercel belum
terhubung repo (`link: null`). Deployment memakai CLI langsung dari folder
`web_frontend`, bukan push Git. Tidak ada repo/commit yang dibuat pada sesi ini.


## Model Blender unggahan — 12 Oktober 2026

Visual 3D memakai ekspor GLB dari `/Users/afi/Downloads/Ruang Server Kayreach - Visual 3D.blend`. File Blender unduhan identik dengan sumber; hash dan daftar objek terdapat pada `public/visual-3d/model_source.json`. Posisi label Mini PC dan sudut keseluruhan/denah mengikuti geometri baru, dengan framing untuk ponsel. Render perspektif dibuat ulang. Pintu geser serta panel sensor/server/Mini PC tetap tersedia.

Garis sensor–Mini PC 3,468 m dan meja–ruang server 2,0 m berasal dari model, belum dikonfirmasi sebagai ukuran lapangan. Penampil membedakannya dari jarak lapangan terdokumentasi 1,5 m. Arsip 5 Oktober, HTML mandiri, ZIP dan gambar/naskah Bab 3 belum mengikuti geometri unggahan ini.

Deployment model unggahan: `dpl_3VUbrEazDeYJaJTgyhu332skSZqF` READY pada 12 Oktober 2026. Browser production memverifikasi model baru dan backend/Aiven terhubung.


## Pembaruan prediksi cepat — 13 Oktober 2026

Prediksi terbaru diperiksa setiap **5 detik setelah permintaan sebelumnya selesai**.
Health dan riwayat 288 slot tetap diperiksa setiap 60 detik; pembacaan riwayat tidak
diulang pada setiap pemeriksaan prediksi. Kedua interval dapat diatur melalui
`VITE_PREDICTION_POLL_MS` dan `VITE_HISTORY_POLL_MS` (minimum 1000 ms; nilai tidak
valid kembali ke default). Angka 5 detik adalah keputusan rekayasa: mengalokasikan
5/60 atau sekitar 8,3% dari batas keterlambatan notifikasi 60 detik untuk menunggu
pemeriksaan web, menyisakan waktu bagi API, penyimpanan, jaringan, dan render.
Ini bukan angka yang ditentukan jurnal dan bukan jaminan bahwa hasil selalu
muncul dalam 5 detik. Permintaan lambat menambah waktu tunggu.

Setiap kanal hanya memiliki satu permintaan aktif, termasuk ketika tombol muat
ulang ditekan. Permintaan dibatalkan setelah 15 detik. Tab tersembunyi berhenti
memeriksa dan membatalkan permintaan aktif; tab yang kembali terlihat memeriksa
segera. Pergantian mode simulasi dan unmount membatalkan permintaan sehingga
respons lama tidak menimpa tampilan baru. Permintaan membaca API dengan
`cache: no-store`.

Setiap `.prediction-row` menyertakan `data-prediction-id`, `data-model`,
`data-horizon`, `data-generated-at` dan `data-rendered-at` untuk bukti pengujian
browser. `data-rendered-at` adalah waktu baris masuk atau berubah pada DOM browser,
bukan waktu sensor, penerimaan Telegram, atau jaminan pengguna sudah membacanya.
Waktu hanya diubah jika identitas atau nilai prediksi berubah, sehingga pembaruan
status koneksi tidak membuat bukti waktu baru untuk prediksi lama. ID baru harus
dicocokkan dengan baris database dan catatan pemicu dari percobaan yang sama.

Perubahan ini sudah diterapkan pada sumber dan build lokal. Deployment dashboard
production belum dilakukan dalam perubahan ini.
