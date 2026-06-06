// ============================================
// api.js - Modul Komunikasi Google Apps Script
// SRMA 19 Bantul | Versi 15.0 (Lengkap: Semua Menu)
// ============================================

const API = (() => {
  // ⚠️ GANTI dengan URL Web App Google Apps Script Anda
  const BASE_URL = 'https://script.google.com/macros/s/AKfycbzzndGZ7yH2YN8_thEFO9eCaGl-_stuzMozaBSHjpFbr3e87OcG8Suu8Csgxw7wujr-/exec';

  /**
   * Request handler untuk GET (query string)
   */
  async function request(action, params = {}) {
    const url = new URL(BASE_URL);
    url.searchParams.append('action', action);

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, value);
      }
    });

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        mode: 'cors',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      console.error('API request gagal:', error);
      return { status: 'error', message: 'Gagal terhubung ke server. Periksa koneksi internet dan URL App Script.' };
    }
  }

  /**
   * Request handler khusus POST dengan JSON body
   * (untuk data besar seperti foto profil, bukti surat, array panjang)
   */
  async function requestPostJSON(action, data) {
    const url = new URL(BASE_URL);
    url.searchParams.append('action', action);

    try {
      const response = await fetch(url.toString(), {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return await response.json();
    } catch (error) {
      console.error('API request POST JSON gagal:', error);
      return { status: 'error', message: 'Gagal terhubung ke server. Periksa koneksi internet dan URL App Script.' };
    }
  }

  // --- PUBLIC API METHODS ---
  return {
    // Tes koneksi
    ping: () => request('ping'),

    // Autentikasi (dengan device info untuk log)
    login: (username, pin) => {
      const device = navigator.userAgent || 'Unknown';
      return request('auth', { username, pin, device, ip: '' });
    },
    resetPin: (username) => request('reset_pin', { username }),

    // Absensi
    searchPeserta: (code) => request('search', { code }),

    // 🔥 recordAbsensi dengan parameter lengkap (status kehadiran, puasa, pelanggaran, kesehatan)
    recordAbsensi: (
      code, 
      nama, 
      sesi, 
      sesiNama, 
      petugas = '', 
      agama = '', 
      puasa = 'Tidak', 
      pelanggaran = 'Tidak Ada', 
      pelanggaranKeterangan = '', 
      kondisiKesehatan = 'Sehat', 
      keteranganKesehatan = '',
      status = 'Hadir'
    ) =>
      request('record', { 
        code, 
        nama, 
        sesi, 
        sesi_nama: sesiNama, 
        petugas, 
        agama,
        puasa,
        pelanggaran,
        pelanggaran_keterangan: pelanggaranKeterangan,
        kondisi_kesehatan: kondisiKesehatan,
        keterangan_kesehatan: keteranganKesehatan,
        status
      }),

    // listAbsensi dengan pagination (page, limit)
    listAbsensi: (tanggal = '', sesi = '', page = 1, limit = 100) =>
      request('list_absensi', { tanggal, sesi, page, limit }),

    deleteAbsensi: (timestamps) => requestPostJSON('delete_absensi', { timestamps }),

    // Peserta
    listPeserta: () => request('list_peserta'),
    addPeserta: (data) => request('add_peserta', data),
    updatePeserta: (data) => request('update_peserta', data),
    deletePeserta: (kode) => request('delete_peserta', { kode }),
    importPeserta: (rows) => request('import_peserta', { data: JSON.stringify(rows) }),

    // Jadwal
    getJadwal: () => request('get_jadwal'),
    saveJadwal: (jadwal) => request('save_jadwal', { data: JSON.stringify(jadwal) }),
    updatePrayerTimes: (date) => request('update_prayer_times', { date }),

    // Petugas
    listPetugas: () => request('list_petugas'),
    addPetugas: (data) => request('add_petugas', data),
    updatePetugas: (data) => request('update_petugas', data),
    deletePetugas: (username) => request('delete_petugas', { username }),

    // Profil
    getProfile: (username) => request('get_profile', { username }),
    updateProfile: (data) => requestPostJSON('update_profile', data),

    // Izin (dengan bukti surat base64)
    addIzin: (data) => requestPostJSON('add_izin', data),
    updateIzin: (data) => requestPostJSON('update_izin', data),
    deleteIzin: (id) => request('delete_izin', { id }),
    listIzin: (kode = '', tanggal = '') => request('list_izin', { kode_peserta: kode, tanggal }),

    // Generate ketidakhadiran + izin
    generateAbsence: (tanggal) => request('generate_absence', { tanggal }),

    // Arsip lulus & alumni
    arsipLulus: () => request('arsip_lulus'),
    listAlumni: () => request('list_alumni'),

    // Log Login
    listLoginLog: (limit = 500) => request('list_login_log', { limit }),

    // Wali Asuh (CRUD lengkap)
    listWaliAsuh: () => request('list_wali_asuh'),
    addWaliAsuh: (data) => request('add_wali_asuh', data),
    updateWaliAsuh: (data) => request('update_wali_asuh', data),
    deleteWaliAsuh: (id) => request('delete_wali_asuh', { id }),

    // Setup otomatis
    setup: () => request('setup')
  };
})();