// ============================================
// api.js - Modul Komunikasi Google Apps Script
// SRMA 19 Bantul | Versi Final 7.2
// ============================================

const API = (() => {
  // ⚠️ GANTI dengan URL Web App Google Apps Script Anda
  const BASE_URL = 'https://script.google.com/macros/s/AKfycbwL_AvQhA9DcGw-gat6_CZpNxtmwgitT6tAFvBaC9cJ8WqVbTd-hLKymt7ODgz-FAz2/exec';

  /**
   * Request handler dengan error management
   * @param {string} action - Nama action
   * @param {object} params - Parameter request
   * @returns {Promise<object>} Response JSON
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
        mode: 'cors',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request gagal:', error);
      return {
        status: 'error',
        message: 'Gagal terhubung ke server. Periksa koneksi internet dan URL App Script.'
      };
    }
  }

  // --- PUBLIC API METHODS ---
  return {
    /**
     * Tes koneksi server
     * @returns {Promise<object>} { status: 'ok', time: '...' }
     */
    ping: () => request('ping'),

    /**
     * Autentikasi petugas
     * @param {string} username - Username
     * @param {string} pin - PIN
     * @returns {Promise<object>} { status, nama, role, token }
     */
    login: (username, pin) => request('auth', { username, pin }),

    /**
     * Cari peserta berdasarkan kode QR
     * @param {string} code - Kode peserta (contoh: SRMA19-001)
     * @returns {Promise<object>} Data peserta + sesi otomatis
     */
    searchPeserta: (code) => request('search', { code }),

    /**
     * Catat absensi peserta
     * @param {string} code - Kode peserta
     * @param {string} nama - Nama peserta
     * @param {string} sesi - Kode sesi (contoh: sesi_1)
     * @param {string} sesiNama - Nama sesi
     * @param {string} [petugas=''] - Nama petugas
     * @returns {Promise<object>} Status pencatatan
     */
    recordAbsensi: (code, nama, sesi, sesiNama, petugas = '') =>
      request('record', { code, nama, sesi, sesi_nama: sesiNama, petugas }),

    /**
     * Ambil semua data peserta
     * @returns {Promise<object>} { status: 'success', data: [...], total }
     */
    listPeserta: () => request('list_peserta'),

    /**
     * Ambil data absensi dengan filter opsional
     * @param {string} [tanggal=''] - Format YYYY-MM-DD
     * @param {string} [sesi=''] - Nama sesi
     * @returns {Promise<object>} { status: 'success', data: [...], total }
     */
    listAbsensi: (tanggal = '', sesi = '') =>
      request('list_absensi', { tanggal, sesi }),

    /**
     * Ambil jadwal kegiatan dari Google Sheet
     * @returns {Promise<object>} { status: 'success', data: [{id, nama, mulai, selesai, icon, color, bg}] }
     */
    getJadwal: () => request('get_jadwal'),

    /**
     * Simpan jadwal kegiatan ke Google Sheet
     * @param {Array} jadwal - Array objek jadwal [{id, nama, mulai, selesai, icon, color, bg}]
     * @returns {Promise<object>} { status: 'ok', message, count }
     */
    saveJadwal: (jadwal) => request('save_jadwal', { data: JSON.stringify(jadwal) }),

    /**
     * Tambah peserta baru
     * @param {object} data - { kode, nama, jk, asal, rombel, keterangan }
     * @returns {Promise<object>} { status: 'ok', message }
     */
    addPeserta: (data) => request('add_peserta', data),

    /**
     * Update data peserta berdasarkan kode
     * @param {object} data - { kode, nama?, jk?, asal?, rombel?, keterangan? }
     * @returns {Promise<object>} { status: 'ok', message }
     */
    updatePeserta: (data) => request('update_peserta', data),

    /**
     * Hapus peserta berdasarkan kode
     * @param {string} kode - Kode peserta
     * @returns {Promise<object>} { status: 'ok', message }
     */
    deletePeserta: (kode) => request('delete_peserta', { kode }),

    /**
     * Impor banyak peserta dari CSV
     * @param {Array} rows - Array data peserta [['kode','nama','jk','asal','rombel','status'],...]
     * @returns {Promise<object>} { status: 'ok', added, updated }
     */
    importPeserta: (rows) => request('import_peserta', { data: JSON.stringify(rows) }),

    /**
     * Ambil semua data petugas
     * @returns {Promise<object>} { status: 'success', data: [...], total }
     */
    listPetugas: () => request('list_petugas'),

    /**
     * Tambah petugas baru
     * @param {object} data - { username, pin, nama, role, status? }
     * @returns {Promise<object>} { status: 'ok', message }
     */
    addPetugas: (data) => request('add_petugas', data),

    /**
     * Update data petugas berdasarkan username (termasuk status)
     * @param {object} data - { username, pin?, nama?, role?, status? }
     * @returns {Promise<object>} { status: 'ok', message }
     */
    updatePetugas: (data) => request('update_petugas', data),

    /**
     * Hapus petugas berdasarkan username
     * @param {string} username - Username petugas
     * @returns {Promise<object>} { status: 'ok', message }
     */
    deletePetugas: (username) => request('delete_petugas', { username }),

    /**
     * Setup ulang sheet (isi data dummy)
     * @returns {Promise<object>} { status: 'ok', message }
     */
    setup: () => request('setup')
  };
})();