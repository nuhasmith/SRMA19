// ============================================================
//  API.JS – Lapisan Komunikasi dengan Backend (Google Apps Script)
//  SRMA 19 Bantul
//  Versi: 3.0.0 - Lengkap, Anti Error, SPA Ready
//  Method `getDashboardStats` SUDAH ADA + Fallback Aman
// ============================================================

(function() {
    'use strict';

    // --- SAFE STORAGE (Mengatasi Tracking Prevention & Private Mode) ---
    const SafeStorage = window.SafeStorage || (() => {
        const memoryStore = {};
        const isStorageAvailable = (type) => {
            try {
                const storage = window[type];
                const x = '__storage_test__';
                storage.setItem(x, x);
                storage.removeItem(x);
                return true;
            } catch (e) {
                return false;
            }
        };
        const getStorage = (type) => {
            if (isStorageAvailable(type)) return window[type];
            return null;
        };
        return {
            getItem: (key, type = 'local') => {
                const storage = getStorage(type === 'session' ? 'sessionStorage' : 'localStorage');
                if (storage) return storage.getItem(key);
                return memoryStore[type + '_' + key] || null;
            },
            setItem: (key, value, type = 'local') => {
                const storage = getStorage(type === 'session' ? 'sessionStorage' : 'localStorage');
                if (storage) return storage.setItem(key, value);
                memoryStore[type + '_' + key] = value;
            },
            removeItem: (key, type = 'local') => {
                const storage = getStorage(type === 'session' ? 'sessionStorage' : 'localStorage');
                if (storage) return storage.removeItem(key);
                delete memoryStore[type + '_' + key];
            }
        };
    })();

    // --- KONSTANTA ---
    // ⚠️ PASTIKAN URL INI ADALAH URL DEPLOY TERBARU DARI GOOGLE APPS SCRIPT
    const BASE_URL = 'https://script.google.com/macros/s/AKfycbzLZq8Pk0zdDPZwJf6bQvP2QgsPcVzd2i54wvrvBoXjr9GYW9VvWHxyD4pidNvw6PnS/exec';
    const TOKEN_KEY = 'srma19_auth_token';
    const TIMEOUT_NORMAL = 15000; // 15 detik
    const TIMEOUT_UPLOAD = 120000; // 120 detik

    // --- HELPER: Dapatkan token dari localStorage/SafeStorage ---
    function getAuthToken() {
        return SafeStorage.getItem(TOKEN_KEY, 'local') || '';
    }

    // ============================================================
    //  FUNGSI DASAR REQUEST POST (Dengan Token Otomatis)
    // ============================================================
    function requestPost(action, data = {}) {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', BASE_URL, true);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            xhr.timeout = TIMEOUT_NORMAL;

            const params = new URLSearchParams();
            // Tambahkan token otentikasi jika ada
            const token = getAuthToken();
            if (token) params.append('token', token);

            // Tambahkan action dan data
            params.append('action', action);
            for (const [key, value] of Object.entries(data)) {
                if (value !== undefined && value !== null) {
                    params.append(key, value);
                }
            }

            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const result = JSON.parse(xhr.responseText);
                        resolve(result);
                    } catch (e) {
                        resolve({ status: 'error', message: 'Respons server bukan JSON yang valid.' });
                    }
                } else {
                    resolve({ status: 'error', message: `HTTP Error ${xhr.status}: ${xhr.statusText}` });
                }
            };

            xhr.ontimeout = function() {
                resolve({ status: 'error', message: 'Request timeout. Kemungkinan server lambat atau gambar terlalu besar.' });
            };

            xhr.onerror = function() {
                resolve({ status: 'error', message: 'Gagal terhubung ke server. Pastikan URL deploy sudah benar.' });
            };

            xhr.send(params.toString());
        });
    }

    // ============================================================
    //  FUNGSI UPLOAD FILE (Base64 dengan Progress Callback)
    // ============================================================
    async function uploadFileData(action, fileBase64, fileName, progressCallback = null) {
        return new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', BASE_URL, true);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            xhr.timeout = TIMEOUT_UPLOAD;

            const params = new URLSearchParams();
            const token = getAuthToken();
            if (token) params.append('token', token);
            params.append('action', action);
            params.append('fileData', fileBase64);
            params.append('fileName', fileName);

            if (typeof progressCallback === 'function') {
                progressCallback(10);
                setTimeout(() => progressCallback(50), 200);
                setTimeout(() => progressCallback(90), 400);
            }

            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const result = JSON.parse(xhr.responseText);
                        if (typeof progressCallback === 'function') progressCallback(100);
                        resolve(result);
                    } catch (e) {
                        resolve({ status: 'error', message: 'Gagal memproses upload, format JSON tidak valid.' });
                    }
                } else {
                    resolve({ status: 'error', message: `Upload Gagal (HTTP ${xhr.status}).` });
                }
            };

            xhr.ontimeout = function() {
                resolve({ status: 'error', message: 'Upload Timeout. Maksimal gambar 1-2MB agar terkirim.' });
            };

            xhr.onerror = function() {
                resolve({ status: 'error', message: 'Gagal terhubung ke server saat upload.' });
            };

            xhr.send(params.toString());
        });
    }

    // ============================================================
    //  PUBLIC API METHODS (Semua Action yang Tersedia)
    // ============================================================
    const API = {
        // --- SISTEM & AUTH ---
        ping: () => requestPost('ping'),
        login: (username, pin) => {
            const device = navigator.userAgent || 'Unknown';
            return requestPost('auth', { username, pin, device, ip: '' });
        },
        resetPin: (username) => requestPost('reset_pin', { username }),

        // --- PESERTA ---
        listPeserta: () => requestPost('list_peserta'),
        addPeserta: (data) => requestPost('add_peserta', data),
        updatePeserta: (data) => requestPost('update_peserta', data),
        deletePeserta: (kode) => requestPost('delete_peserta', { kode }),
        searchPeserta: (code) => requestPost('search', { code }),
        importPeserta: (rows) => requestPost('import_peserta', { data: JSON.stringify(rows) }),
        arsipLulus: () => requestPost('arsip_lulus'),

        // --- ABSENSI ---
        recordAbsensi: (code, nama, sesi, sesiNama, petugas = '', agama = '', puasa = 'Tidak', pelanggaran = 'Tidak Ada', pelanggaranKeterangan = '', kondisiKesehatan = 'Sehat', keteranganKesehatan = '', status = 'Hadir') =>
            requestPost('record', {
                code, nama, sesi, sesi_nama: sesiNama, petugas, agama, puasa,
                pelanggaran, pelanggaran_keterangan: pelanggaranKeterangan,
                kondisi_kesehatan: kondisiKesehatan, keterangan_kesehatan: keteranganKesehatan, status
            }),
        updateAbsensi: (data) => requestPost('update_absensi', data),
        listAbsensi: (tanggal = '', sesi = '', page = 1, limit = 100) =>
            requestPost('list_absensi', { tanggal, sesi, page, limit }),
        deleteAbsensi: (timestamps) => requestPost('delete_absensi', { timestamps: JSON.stringify(timestamps) }),
        generateAbsence: (tanggal) => requestPost('generate_absence', { tanggal }),

        // --- JADWAL ---
        getJadwal: () => requestPost('get_jadwal'),
        saveJadwal: (jadwal) => requestPost('save_jadwal', { data: JSON.stringify(jadwal) }),
        updatePrayerTimes: (date) => requestPost('update_prayer_times', { date }),

        // --- PETUGAS & PROFIL ---
        listPetugas: () => requestPost('list_petugas'),
        addPetugas: (data) => requestPost('add_petugas', data),
        updatePetugas: (data) => requestPost('update_petugas', data),
        deletePetugas: (username) => requestPost('delete_petugas', { username }),
        getProfile: (username) => requestPost('get_profile', { username }),
        updateProfile: (data) => requestPost('update_profile', data),

        // --- IZIN ---
        addIzin: (data) => requestPost('add_izin', data),
        updateIzin: (data) => requestPost('update_izin', data),
        deleteIzin: (id) => requestPost('delete_izin', { id }),
        listIzin: (kode = '', tanggal = '') =>
            requestPost('list_izin', { kode_peserta: kode, tanggal }),

        // --- ALUMNI & LOG ---
        listAlumni: () => requestPost('list_alumni'),
        listLoginLog: (limit = 500) => requestPost('list_login_log', { limit }),

        // --- WALI ASUH ---
        listWaliAsuh: () => requestPost('list_wali_asuh'),
        addWaliAsuh: (data) => requestPost('add_wali_asuh', data),
        updateWaliAsuh: (data) => requestPost('update_wali_asuh', data),
        deleteWaliAsuh: (id) => requestPost('delete_wali_asuh', { id }),
        syncWaliCount: () => requestPost('sync_wali_count'),

        // --- PEMINJAMAN HP ---
        recordHP: (data) => requestPost('record_hp', data),
        checkHP: (data) => requestPost('check_hp', data),

        // --- BERITA ---
        listBerita: (status = '', limit = 0) =>
            requestPost('list_berita', { status, limit }),
        addBerita: (data) => requestPost('add_berita', data),
        updateBerita: (data) => requestPost('update_berita', data),
        deleteBerita: (id) => requestPost('delete_berita', { id }),

        // --- GALERI ---
        listGaleri: (status = '', limit = 0) =>
            requestPost('list_galeri', { status, limit }),
        addGaleri: (data) => requestPost('add_galeri', data),
        updateGaleri: (data) => requestPost('update_galeri', data),
        deleteGaleri: (id) => requestPost('delete_galeri', { id }),

        // --- UPLOAD & DRIVE ---
        uploadFileData: uploadFileData,
        uploadBeritaImage: (fileBase64, fileName) =>
            uploadFileData('upload_berita_image', fileBase64, fileName),
        listDriveImages: () => requestPost('list_drive_images'),

        // --- SCHEDULE OVERRIDE ---
        listScheduleOverrides: (startDate = '', endDate = '') =>
            requestPost('list_schedule_overrides', { startDate, endDate }),
        addScheduleOverride: (data) => requestPost('add_schedule_override', data),
        deleteScheduleOverride: (id) => requestPost('delete_schedule_override', { id }),

        // --- STATISTIK KUNJUNGAN ---
        getHits: () => requestPost('get_hits'),
        incrementHit: (ip) => requestPost('increment_hit', { ip }),
        resetHits: () => requestPost('reset_hits'),

        // --- PENGATURAN WEBSITE ---
        getSettings: () => requestPost('get_settings'),
        updateSettings: (key, value) => requestPost('update_settings', { key, value }),

        // --- SETUP AWAL ---
        setup: () => requestPost('setup'),

        // --- DASHBOARD STATS (Optimasi) ---
        getDashboardStats: () => requestPost('get_dashboard_stats')
    };

    // ============================================================
    //  EKSPOR KE GLOBAL SCOPE (Untuk SPA)
    // ============================================================
    window.API = API;
    // Ekspos SafeStorage agar modul lain bisa menggunakannya
    window.SafeStorage = SafeStorage;

    console.log('✅ API layer loaded (v3.0.0 - Lengkap, Anti Error, getDashboardStats ada)');
})();