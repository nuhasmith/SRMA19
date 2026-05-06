// ============================================
// api.js - Modul Komunikasi Google Apps Script
// SRMA 19 Bantul | Versi 7.5 (POST JSON + CORS)
// ============================================

const API = (() => {
  // ⚠️ GANTI dengan URL Web App Google Apps Script Anda
  const BASE_URL = 'https://script.google.com/macros/s/AKfycbyVzDvaqEoBkTSdwHNyRLaT3h3L-JHnjWBUDEHGsxGAg3mldBOzNg9BekainAOIO2M1/exec';

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
   * (untuk data besar seperti foto profil)
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
    ping: () => request('ping'),
    login: (username, pin) => request('auth', { username, pin }),
    resetPin: (username) => request('reset_pin', { username }),
    searchPeserta: (code) => request('search', { code }),
    recordAbsensi: (code, nama, sesi, sesiNama, petugas = '') =>
      request('record', { code, nama, sesi, sesi_nama: sesiNama, petugas }),
    listPeserta: () => request('list_peserta'),
    listAbsensi: (tanggal = '', sesi = '') =>
      request('list_absensi', { tanggal, sesi }),
    getJadwal: () => request('get_jadwal'),
    saveJadwal: (jadwal) => request('save_jadwal', { data: JSON.stringify(jadwal) }),
    addPeserta: (data) => request('add_peserta', data),
    updatePeserta: (data) => request('update_peserta', data),
    deletePeserta: (kode) => request('delete_peserta', { kode }),
    importPeserta: (rows) => request('import_peserta', { data: JSON.stringify(rows) }),
    listPetugas: () => request('list_petugas'),
    addPetugas: (data) => request('add_petugas', data),
    updatePetugas: (data) => request('update_petugas', data),
    deletePetugas: (username) => request('delete_petugas', { username }),
    getProfile: (username) => request('get_profile', { username }),
    // Khusus untuk updateProfile (dengan foto) gunakan POST JSON
    updateProfile: (data) => requestPostJSON('update_profile', data),
    setup: () => request('setup')
  };
})();