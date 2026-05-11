# SRMA 19 Bantul — Sistem Informasi Sekolah Rakyat

Sistem informasi terpadu untuk **Sekolah Rakyat Menengah Atas 19 Bantul**, sebuah sekolah berasrama gratis di Sonosewu, Ngestiharjo, Kasihan, Bantul, DIY.  
Proyek ini mencakup website publik, dashboard admin & petugas, sistem absensi QR, manajemen data siswa, jadwal multi‑agama, perizinan, dan pelaporan.

---

## ✨ Fitur Utama

### Website Publik (`index.html`)
- Desain modern, responsif, SEO‑friendly dengan meta tags, Open Graph, dan JSON‑LD.
- Statistik peserta (total, rombongan belajar, putra/putri) diambil langsung dari Google Sheets dengan cache 5 menit.
- **Jadwal kegiatan** ditampilkan dalam tabel yang menggabungkan semua agama, dilengkapi filter per agama dan badge berwarna.
- **Peta lokasi** dengan marker merah dan tombol “Buka di Google Maps” yang mengarah ke lokasi persis sekolah.
- Navbar dinamis: jika pengguna sudah login, tampilkan dropdown nama & role; jika belum, tombol “Area Petugas”.
- Tombol WhatsApp mengambang dan tombol “Kembali ke Atas” yang presisi sejajar horizontal.

### Absensi QR (`absensi.html`)
- **Scan QR Code** menggunakan kamera HP/laptop dengan pustaka `html5‑qrcode`.
- **Deteksi sesi otomatis** berdasarkan **agama peserta** (dari sheet Peserta dan Jadwal).
- **Mode manual khusus admin**: memilih sesi bebas dari dropdown.
- **Konfirmasi absensi** mencatat kode, nama, sesi, dan petugas ke spreadsheet, dengan pengecekan duplikasi.
- **Suara on/off**: ikon speaker untuk mengaktifkan/menonaktifkan bunyi beep saat QR berhasil dibaca.
- Log absensi lokal (`localStorage`) dan indikator koneksi.

### Dashboard Admin (iframe-based)
- **Navigasi cepat** dengan sidebar tetap dan konten di dalam iframe – tidak reload saat pindah menu.
- **Preload data saat login**: seluruh data diambil dan disimpan di `sessionStorage`, sehingga dashboard langsung muncul tanpa loading.
- **Dashboard** (`dashboard_content.html`): statistik, absensi terbaru, backup data.
- **Data Absensi** (`absensi_admin.html`): tabel dengan pagination (100 data/halaman), filter, pencarian, **generate “Tidak Berangkat” + “Izin”**, hapus multi‑select, ekspor PDF/CSV, refresh manual.
- **Data Peserta** (`peserta_admin.html`): CRUD lengkap, filter multi‑kriteria (status, rombel, angkatan, agama), impor CSV, ekspor CSV/PDF, toggle status, **arsip lulus** (pindahkan ke sheet Alumni), refresh manual.
- **Jadwal Kegiatan** (`jadwal_admin.html`): CRUD jadwal multi‑agama, tampilan per agama dengan filter, ikon & warna, refresh.
- **Data Petugas** (`petugas_admin.html`): CRUD petugas, toggle status, hapus multi‑select, refresh.
- **Data Izin** (`izin_admin.html`): CRUD izin, upload bukti surat (base64, maks 49KB), hapus multi‑select, refresh.
- **Log Login** (`login_log_admin.html`): riwayat login semua pengguna beserta device.
- **Rekap Absensi** (`rekap_absensi_admin.html`): ringkasan kehadiran per peserta dalam rentang tanggal.
- **Scan QR** (iframe ke `absensi.html`).

### Dashboard Petugas (iframe-based)
- Dashboard terbatas (`dashboard_petugas.html` + `dashboard_petugas_content.html`): statistik, absensi terbaru.
- **Data Absensi** (`absensi_petugas.html`): tabel dengan pagination, filter, ekspor PDF. **Tanpa** tombol generate.
- **Data Izin** (`izin_petugas.html`): CRUD izin, upload bukti surat.
- **Scan QR** (`scanqr_petugas.html` / iframe `absensi.html`).

### Profil Pengguna (`profile.html`)
- Mengubah nama, PIN, dan foto profil (base64, maks 500KB sebelum kompresi).
- Placeholder inisial jika belum ada foto.
- Tombol kembali sesuai role.

### Otentikasi & Role
- Login dengan username & PIN (disimpan di sheet Petugas).
- Session disimpan di `localStorage` melalui modul `auth.js`.
- Setelah login, sistem langsung preload semua data ke `sessionStorage` sesuai role, lalu redirect ke dashboard.
- Reset PIN melalui modal “Lupa PIN?”.

---

## 📁 Struktur File
SRMA19-Bantul/
index.html # Website publik
login.html # Halaman login (preload data setelah sukses)
dashboard_admin.html # Dashboard admin (induk iframe)
dashboard_content.html # Konten dashboard admin (dalam iframe)
absensi_admin.html # Manajemen absensi admin
peserta_admin.html # Manajemen peserta admin
jadwal_admin.html # Manajemen jadwal admin
petugas_admin.html # Manajemen petugas admin
izin_admin.html # Manajemen izin admin
login_log_admin.html # Log login
rekap_absensi_admin.html # Rekap absensi
dashboard_petugas.html # Dashboard petugas (induk iframe)
dashboard_petugas_content.html # Konten dashboard petugas (dalam iframe)
absensi_petugas.html # Absensi petugas
izin_petugas.html # Izin petugas
scanqr_petugas.html # Scan QR petugas
absensi.html # Halaman scan QR absensi (multi‑agama)
profile.html # Profil pengguna
api.js # Modul komunikasi Google Apps Script
auth.js # Modul otentikasi & session
code.gs # Kode Google Apps Script (backend)
srma.webp # Logo / favicon
README.md # Dokumentasi (file ini)


---

## ⚙️ Teknologi

| Komponen | Teknologi |
|----------|-----------|
| Frontend | HTML5, CSS3 (Bootstrap 5), JavaScript (ES6+) |
| Backend  | Google Apps Script (V8) |
| Database | Google Sheets (7 sheet) |
| QR Code | `html5-qrcode` |
| PDF Export | `html2pdf.js` |
| Font & Ikon | Inter (Google Fonts), Font Awesome 6 |
| Session & Cache | `sessionStorage`, `localStorage`, `CacheService` |

---

## 🚀 Cara Deploy

### 1. Google Apps Script (Backend)
1. Buka Google Sheets, buat spreadsheet baru.
2. Buka menu **Extensions > Apps Script**.
3. Hapus kode default, salin seluruh isi `code.gs` ke editor.
4. **Pastikan runtime V8** (pojok kiri atas, pilih “V8”).
5. Simpan proyek, lalu klik **Deploy > New Deployment**.
6. Pilih **Web App**, isi:
   - **Execute as**: Me
   - **Who has access**: Anyone
7. Klik **Deploy**, salin URL yang muncul (contoh: `https://script.google.com/macros/s/.../exec`).
8. Buka file `api.js`, ganti nilai `BASE_URL` dengan URL tersebut.

### 2. File Frontend (HTML/JS/CSS)
1. Clone atau unduh semua file dari repositori ini.
2. Pastikan `api.js` sudah berisi URL Apps Script yang benar.
3. Upload ke hosting statis favorit Anda (GitHub Pages, Netlify, Vercel, atau server lokal).
4. Akses `index.html` untuk publik, `login.html` untuk petugas/admin.

---

## 🔑 Akun Demo

| Username   | PIN    | Role    |
|------------|--------|---------|
| `admin`    | 123456 | admin   |
| `petugas1` | 654321 | petugas |

---

## 📡 API Reference

Semua permintaan dikirim ke `BASE_URL` dengan method GET/POST. Parameter dikirim sebagai query string atau body JSON (untuk data besar).

| Action | Parameter | Deskripsi |
|--------|-----------|-----------|
| `ping` | - | Tes koneksi |
| `auth` | `username`, `pin`, `device`, `ip` | Login petugas/admin + mencatat log |
| `reset_pin` | `username` | Reset PIN ke 123456 |
| `search` | `code` | Cari peserta + sesi otomatis |
| `record` | `code, nama, sesi, sesi_nama, petugas, agama` | Catat kehadiran |
| `list_peserta` | - | Ambil semua peserta |
| `list_absensi` | `tanggal, sesi, page, limit` | Ambil data absensi (paginated) |
| `delete_absensi` | `timestamps` (JSON array) | Hapus absensi berdasarkan timestamp |
| `get_jadwal` | - | Ambil jadwal kegiatan |
| `save_jadwal` | `data` (JSON array) | Simpan jadwal ke sheet |
| `add_peserta` | `kode, nama, jk, agama, asal, rombel, keterangan, angkatan` | Tambah peserta |
| `update_peserta` | `kode, …` (field yang ingin diubah) | Ubah data peserta |
| `delete_peserta` | `kode` | Hapus peserta |
| `import_peserta` | `data` (JSON array 2D) | Impor banyak peserta |
| `list_petugas` | - | Ambil semua petugas |
| `add_petugas` | `username, pin, nama, role, status, foto` | Tambah petugas |
| `update_petugas` | `username, …` | Ubah data petugas |
| `delete_petugas` | `username` | Hapus petugas |
| `get_profile` | `username` | Ambil profil (termasuk foto) |
| `update_profile` | `username, nama, pin, foto` | Ubah profil pengguna (POST JSON) |
| `add_izin` | `kode_peserta, nama_peserta, tanggal, keterangan, bukti_surat, petugas` | Tambah izin |
| `update_izin` | `id, keterangan?, bukti_surat?` | Ubah izin |
| `delete_izin` | `id` | Hapus izin |
| `list_izin` | `kode_peserta?, tanggal?` | Ambil daftar izin |
| `generate_absence` | `tanggal` | Generate “Tidak Berangkat” dan “Izin” |
| `arsip_lulus` | - | Pindahkan peserta Lulus ke sheet Alumni |
| `list_alumni` | - | Lihat data alumni |
| `list_login_log` | `limit` | Ambil log login terbaru |
| `setup` | - | Inisialisasi sheet & data dummy |

---

## 🧠 Catatan Teknis

- **CORS**: Apps Script sudah mengizinkan origin `*` melalui header `Access-Control-Allow-Origin`.
- **Format Waktu**: `formatTimeValue` menggunakan `getHours()`/`getMinutes()` agar jam sesuai dengan sheet.
- **Cache**: Data master (peserta, jadwal, petugas) di‑cache di `CacheService` (5 menit) dan `sessionStorage` (frontend).
- **Pagination**: `list_absensi` mendukung `page` & `limit` untuk menangani puluhan ribu data tanpa beban.
- **Anti‑duplikasi absensi**: Kombinasi kode peserta, sesi, dan tanggal dicegah duplikat.
- **Generate Tidak Berangkat + Izin**: Hanya admin yang dapat menjalankan. Sistem mengecek kehadiran & izin, lalu mengisi `Tidak Berangkat` atau `Izin` untuk semua peserta di setiap sesi yang sudah lewat.
- **Arsip Lulus**: Peserta dengan status `Lulus` dapat dipindahkan ke sheet `Alumni` melalui tombol “Arsip Lulus”, menjaga data peserta aktif tetap ringkas.
- **Preload saat login**: Data langsung diambil dan disimpan ke `sessionStorage` sebelum redirect, sehingga dashboard tampil instan.
- **Iframe navigasi**: Sidebar tetap, konten dimuat dalam iframe, memberikan pengalaman seperti SPA tanpa reload.
- **Log Login**: Setiap login berhasil dicatat di sheet `LoginLog`, dapat dipantau admin melalui menu Log Login.

---

## 📝 Lisensi

Proyek ini dibuat untuk keperluan internal **SRMA 19 Bantul**. Silakan digunakan, dimodifikasi, dan dikembangkan lebih lanjut sesuai kebutuhan.

**Dibangun dengan ❤️ untuk pendidikan Indonesia.**  
_SRMA 19 Bantul — Sekolah Rakyat, Generasi Hebat! 🇮🇩_