# SRMA 19 Bantul — Website & Sistem Absensi QR

Sistem informasi terpadu untuk **Sekolah Rakyat Menengah Atas 19 Bantul**, sebuah sekolah berasrama gratis di Sonosewu, Ngestiharjo, Kasihan, Bantul, DIY yang beroperasi mulai **Juli 2025**. Proyek ini mencakup:

- 🌐 **Website publik** (`index.html`) yang menampilkan profil sekolah, jadwal kegiatan, dan statistik peserta (real‑time dari Google Sheets).
- 📱 **Sistem absensi QR** (`absensi.html`) yang berjalan di perangkat mobile petugas, dengan deteksi sesi otomatis, dukungan manual untuk admin, suara on/off, dan anti‑duplikasi.
- 🛠️ **Dashboard admin** (`admin.html`) berbasis web untuk mengelola data peserta, petugas, absensi, jadwal kegiatan, serta impor/ekspor CSV/PDF.
- 👤 **Dashboard petugas** (`petugas.html`) dengan akses terbatas untuk melihat data absensi dan melakukan scan.
- 🧑‍💼 **Halaman profil** (`profile.html`) untuk admin & petugas mengganti foto profil, nama, dan PIN.

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
- **Fitur suara on/off**: ikon speaker di header untuk mengaktifkan/menonaktifkan bunyi beep saat QR berhasil dibaca (status disimpan di `localStorage`).

### Dashboard Admin (`admin.html`)
- **Single Page Application** dengan preload data dari `localStorage` (cache 30 menit) dan background refresh.
- **Dashboard**: statistik jumlah peserta, total absensi, absensi hari ini, dan tabel absensi terbaru.
- **Data Absensi**: tabel dengan filter tanggal/sesi, ekspor PDF.
- **Data Peserta**: CRUD lengkap (tambah, edit, hapus, toggle status Aktif/Nonaktif/Lulus), multi‑delete dengan checkbox, pencarian, filter status & rombel & angkatan, impor CSV, ekspor CSV/PDF.
- **Jadwal Kegiatan**: CRUD, edit inline, simpan ke server, reset ke default.
- **Data Petugas**: list petugas, tambah, edit, hapus, toggle status aktif/nonaktif (hanya admin).
- **Scan QR**: iframe yang memuat `absensi.html` di dalam dashboard.
- Sidebar collapsible (desktop) & bottom navigation bar (mobile) dengan sheet tambahan untuk opsi lain (Logout, Website Utama, Profil, dll.).
- **Avatar profil** di header sidebar (foto atau inisial).

### Dashboard Petugas (`petugas.html`)
- Dashboard dengan menu terbatas: Dashboard (statistik ringkas), Data Absensi (lihat & filter, ekspor PDF), Scan QR (iframe), Profil, dan Logout.
- Tidak memiliki akses ke manajemen peserta, petugas, atau jadwal.
- **Avatar profil** di header sidebar (foto atau inisial).

### Profil Pengguna (`profile.html`)
- **Untuk admin & petugas**: melihat dan mengubah nama, PIN, serta mengunggah foto profil (maks 500KB, dikirim sebagai base64 via POST JSON).
- **Toggle show/hide PIN** untuk keamanan.
- **Placeholder inisial** jika belum ada foto.
- Tombol kembali menyesuaikan role (admin → `admin.html`, petugas → `petugas.html`).

### Otentikasi & Role
- **Login** menggunakan username & PIN (tersimpan di Google Sheets).
- Pengecekan status aktif: akun nonaktif tidak dapat login.
- Setelah login, redirect sesuai role: admin → `admin.html`, petugas → `petugas.html`.
- Session disimpan di `localStorage` melalui modul `auth.js`.
- **Reset PIN**: pengguna bisa mereset PIN sendiri melalui modal “Lupa PIN?” di halaman login.

---

## 📁 Struktur File
SRMA19-Bantul/
├── index.html # Website publik
├── login.html # Halaman login petugas/admin
├── admin.html # Dashboard admin (full akses)
├── petugas.html # Dashboard petugas (terbatas)
├── absensi.html # Halaman scan QR absensi
├── profile.html # Halaman profil pengguna
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

Semua permintaan dikirim ke `BASE_URL` (Apps Script) dengan method GET/POST. Parameter dikirim sebagai query string atau body JSON (untuk `update_profile` digunakan POST JSON karena data foto besar).

| Action            | Parameter                                         | Deskripsi                           |
|-------------------|---------------------------------------------------|-------------------------------------|
| `ping`            | -                                                 | Tes koneksi                        |
| `auth`            | `username`, `pin`                                 | Login petugas/admin                |
| `reset_pin`       | `username`                                        | Reset PIN ke 123456                |
| `search`          | `code`                                            | Cari peserta + sesi otomatis       |
| `record`          | `code, nama, sesi, sesi_nama, petugas`            | Catat kehadiran                    |
| `list_peserta`    | -                                                 | Ambil semua peserta                |
| `list_absensi`    | `tanggal`, `sesi` (optional)                      | Ambil data absensi                 |
| `get_jadwal`      | -                                                 | Ambil jadwal kegiatan              |
| `save_jadwal`     | `data` (JSON array)                               | Simpan jadwal ke sheet             |
| `add_peserta`     | `kode, nama, jk, asal, rombel, keterangan, angkatan` | Tambah peserta baru             |
| `update_peserta`  | `kode, nama?, jk?, asal?, rombel?, keterangan?, angkatan?` | Ubah data peserta           |
| `delete_peserta`  | `kode`                                            | Hapus peserta                      |
| `import_peserta`  | `data` (JSON array 2D)                            | Impor banyak peserta               |
| `list_petugas`    | -                                                 | Ambil semua petugas                |
| `add_petugas`     | `username, pin, nama, role, status, foto`         | Tambah petugas                     |
| `update_petugas`  | `username, pin?, nama?, role?, status?, foto?`    | Ubah data petugas                  |
| `delete_petugas`  | `username`                                        | Hapus petugas                      |
| `get_profile`     | `username`                                        | Ambil profil (termasuk foto)       |
| `update_profile`  | `username, nama?, pin?, foto?`                   | Ubah profil pengguna (POST JSON)   |
| `setup`           | -                                                 | Inisialisasi sheet & data dummy    |

---

## 🧠 Catatan Teknis

- **CORS**: Apps Script sudah mengizinkan origin `*` melalui header `Access-Control-Allow-Origin`.
- **Konversi Waktu**: Google Sheets menyimpan jam sebagai DateTime. API secara otomatis mengonversi ke format `HH:mm` agar tampilan jadwal tetap bersih.
- **Caching**: Data di halaman publik di‑cache di `sessionStorage` selama 5 menit. Dashboard admin & petugas menyimpan data di `localStorage` selama 30 menit untuk rendering instan, lalu refresh di background.
- **Anti‑duplikasi**: Absensi dicegah untuk kombinasi kode peserta, sesi, dan tanggal yang sama.
- **Keamanan PIN**: Disarankan untuk tidak menyimpan PIN dalam bentuk plain‑text di spreadsheet. Untuk produksi, tambahkan hashing sederhana atau gunakan autentikasi eksternal.
- **Mode Mobile**: Navigasi bawah ala Telegram muncul di layar ≤768px. Sidebar desktop otomatis tersembunyi.
- **Pengiriman Foto Profil**: menggunakan POST JSON (`requestPostJSON`) dengan `Content-Type: text/plain` untuk menghindari preflight CORS. Data base64 dipotong hingga 45.000 karakter agar muat di sel Google Sheets.
- **Suara Absensi**: bunyi beep dihasilkan melalui Web Audio API. Status on/off disimpan di `localStorage`.

---

## 📝 Lisensi

Proyek ini dibuat untuk keperluan internal **SRMA 19 Bantul**. Silakan digunakan, dimodifikasi, dan dikembangkan lebih lanjut sesuai kebutuhan.

---

**Dibangun dengan ❤️ untuk pendidikan Indonesia.**  
_SRMA 19 Bantul — Sekolah Rakyat, Generasi Hebat! 🇮🇩_