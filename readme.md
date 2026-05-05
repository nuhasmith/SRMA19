# SRMA 19 Bantul — Website & Sistem Absensi QR

Sistem informasi terpadu untuk **Sekolah Rakyat Menengah Atas 19 Bantul**, sebuah sekolah berasrama gratis di Sonosewu, Ngestiharjo, Kasihan, Bantul, DIY yang beroperasi mulai **Juli 2025**. Proyek ini mencakup:

- 🌐 **Website publik** yang menampilkan profil sekolah, jadwal kegiatan, dan statistik peserta.
- 📱 **Sistem absensi QR** yang berjalan di perangkat mobile petugas, dengan deteksi sesi otomatis, dukungan manual untuk admin, dan anti‑duplikasi.
- 🛠️ **Dashboard admin** berbasis web untuk mengelola data peserta, petugas, absensi, jadwal kegiatan, serta impor/ekspor CSV/PDF.
- 👤 **Dashboard petugas** dengan akses terbatas untuk melihat data absensi dan melakukan scan.

Semua data disimpan di **Google Sheets** melalui **Google Apps Script** sebagai backend API.

---

## ✨ Fitur Utama

### Website Publik (`index.html`)
- Desain modern, responsif (mobile‑first), SEO‑friendly dengan meta tags, Open Graph, dan JSON‑LD.
- Menampilkan visi‑misi, fasilitas, jadwal kegiatan (real‑time dari Google Sheets), lokasi (Google Maps), dan kontak WhatsApp.
- Statistik peserta (total, rombongan belajar, putra/putri) diambil langsung dari Google Sheets dengan cache 5 menit.
- Navbar dinamis: jika pengguna sudah login (petugas/admin), tampilkan dropdown nama & role; jika belum, tombol “Area Petugas”.
- Tombol "Kembali ke Atas" muncul setelah menggulir >500px.

### Absensi QR (`absensi.html`)
- **Scan QR Code** menggunakan kamera HP/laptop dengan pustaka `html5‑qrcode` (fps 30, area deteksi 280px, cooldown 1,5 detik).
- **Deteksi sesi otomatis** berdasarkan jam real‑time dari jadwal yang tersimpan di Google Sheets.
- **Mode manual khusus admin**: bisa memilih sesi di luar jadwal.
- **Konfirmasi absensi**: mencatat kode peserta, nama, sesi, dan nama petugas ke spreadsheet, dilengkapi pengecekan duplikasi.
- Log absensi lokal (`localStorage`), indikator koneksi, dan notifikasi toast.

### Dashboard Admin (`admin.html`)
- **Single Page Application** dengan preload data dari `sessionStorage` dan background refresh.
- **Dashboard**: statistik jumlah peserta, total absensi, absensi hari ini, dan tabel absensi terbaru.
- **Data Absensi**: tabel dengan filter tanggal/sesi, ekspor PDF.
- **Data Peserta**: CRUD lengkap (tambah, edit, hapus, toggle status Aktif/Nonaktif/Lulus), multi‑delete dengan checkbox, pencarian, filter status & rombel, impor CSV, ekspor CSV/PDF.
- **Jadwal Kegiatan**: CRUD, edit inline, simpan ke server, reset ke default.
- **Data Petugas**: list petugas, tambah, edit, hapus, toggle status aktif/nonaktif (hanya admin).
- **Scan QR**: iframe yang memuat `absensi.html` di dalam dashboard.
- Sidebar collapsible (desktop) & bottom navigation bar (mobile) dengan sheet tambahan untuk opsi lain (Logout, Website Utama, dll.).

### Dashboard Petugas (`petugas.html`)
- Dashboard dengan menu terbatas: Dashboard (statistik ringkas), Data Absensi (lihat & filter, ekspor PDF), Scan QR (iframe), dan Logout.
- Tidak memiliki akses ke manajemen peserta, petugas, atau jadwal.

### Otentikasi & Role
- **Login** menggunakan username & PIN (terenkripsi di Google Sheets).
- Pengecekan status aktif: akun nonaktif tidak dapat login.
- Setelah login, redirect sesuai role: admin → `admin.html`, petugas → `petugas.html`.
- Session disimpan di `localStorage` melalui modul `auth.js`.

---

## 📁 Struktur File
SRMA19-Bantul/
├── index.html # Website publik
├── login.html # Halaman login petugas/admin
├── admin.html # Dashboard admin (full akses)
├── petugas.html # Dashboard petugas (terbatas)
├── absensi.html # Halaman scan QR absensi
├── api.js # Modul komunikasi dengan Google Apps Script
├── auth.js # Modul otentikasi & session management
├── appscript.gs # Kode Google Apps Script (backend API)
├── README.md # Dokumentasi (file ini)
└── (opsional) folder assets/


---

## ⚙️ Persyaratan

- **Google Sheets** – sebagai database (4 sheet: `Peserta`, `Absensi`, `Petugas`, `Jadwal`).
- **Google Apps Script** – di‑deploy sebagai Web App untuk menyediakan REST API.
- **Hosting statis** – untuk file HTML/JS/CSS (bisa GitHub Pages, Netlify, Vercel, atau server lokal).

---

## 🚀 Panduan Deploy

### 1. Google Apps Script (Backend)
1. Buka Google Sheets, buat spreadsheet baru.
2. Buka menu **Extensions > Apps Script**.
3. Hapus kode default, salin seluruh isi `appscript.gs` ke editor.
4. **Pastikan runtime V8** (pojok kiri atas, pilih “V8”).
5. Simpan proyek, lalu klik **Deploy > New Deployment**.
6. Pilih **Web App**, isi:
   - **Execute as**: Me
   - **Who has access**: Anyone
7. Klik **Deploy**, salin URL yang muncul (contoh: `https://script.google.com/macros/s/.../exec`).
8. Buka file `api.js`, ganti nilai `BASE_URL` dengan URL tersebut.

### 2. File Frontend (HTML/JS/CSS)
1. Unduh atau clone semua file di repositori ini.
2. Pastikan `api.js` sudah berisi URL Apps Script yang benar.
3. Upload ke hosting statis favorit Anda (contoh: drag & drop ke GitHub Pages, atau gunakan Live Server di VSCode).
4. Akses `index.html` untuk publik, `login.html` untuk petugas/admin.

---

## 🔑 Akun Demo

| Username   | PIN    | Role    | Status |
|------------|--------|---------|--------|
| `admin`    | 123456 | admin   | Aktif  |
| `petugas1` | 654321 | petugas | Aktif  |

---

## 📡 API Reference

Semua permintaan dikirim ke `BASE_URL` (Apps Script) dengan method GET/POST. Parameter dikirim sebagai query string atau body JSON.

| Action            | Parameter                                         | Deskripsi                           |
|-------------------|---------------------------------------------------|-------------------------------------|
| `ping`            | -                                                 | Tes koneksi                        |
| `auth`            | `username`, `pin`                                 | Login petugas/admin                |
| `search`          | `code`                                            | Cari peserta + sesi otomatis       |
| `record`          | `code, nama, sesi, sesi_nama, petugas`            | Catat kehadiran                    |
| `list_peserta`    | -                                                 | Ambil semua peserta                |
| `list_absensi`    | `tanggal`, `sesi` (optional)                      | Ambil data absensi                 |
| `get_jadwal`      | -                                                 | Ambil jadwal kegiatan              |
| `save_jadwal`     | `data` (JSON array)                               | Simpan jadwal ke sheet             |
| `add_peserta`     | `kode, nama, jk, asal, rombel, keterangan`       | Tambah peserta baru                |
| `update_peserta`  | `kode, nama?, jk?, asal?, rombel?, keterangan?`  | Ubah data peserta                  |
| `delete_peserta`  | `kode`                                            | Hapus peserta                      |
| `import_peserta`  | `data` (JSON array 2D)                            | Impor banyak peserta               |
| `list_petugas`    | -                                                 | Ambil semua petugas                |
| `add_petugas`     | `username, pin, nama, role, status`               | Tambah petugas                     |
| `update_petugas`  | `username, pin?, nama?, role?, status?`           | Ubah data petugas                  |
| `delete_petugas`  | `username`                                        | Hapus petugas                      |
| `setup`           | -                                                 | Inisialisasi sheet & data dummy    |

---

## 🧠 Catatan Teknis

- **CORS**: Apps Script sudah mengizinkan origin `*` melalui header `Access-Control-Allow-Origin`.
- **Konversi Waktu**: Google Sheets menyimpan jam sebagai DateTime. API secara otomatis mengonversi ke format `HH:mm`.
- **Caching**: Data di halaman publik di‑cache di `sessionStorage` selama 5 menit. Dashboard admin menyimpan data di `sessionStorage` untuk rendering instan, lalu refresh di background.
- **Anti‑duplikasi**: Absensi dicegah untuk kombinasi kode peserta, sesi, dan tanggal yang sama.
- **Keamanan PIN**: Disarankan untuk tidak menyimpan PIN dalam bentuk plain‑text di spreadsheet. Untuk produksi, tambahkan hashing sederhana atau gunakan autentikasi eksternal.
- **Mode Mobile**: Navigasi bawah ala Telegram muncul di layar ≤768px. Sidebar desktop otomatis tersembunyi.

---

## 📝 Lisensi

Proyek ini dibuat untuk keperluan internal **SRMA 19 Bantul**. Silakan digunakan, dimodifikasi, dan dikembangkan lebih lanjut sesuai kebutuhan.

---

**Dibangun dengan ❤️ untuk pendidikan Indonesia.**  
_SRMA 19 Bantul — Sekolah Rakyat, Generasi Hebat! 🇮🇩_