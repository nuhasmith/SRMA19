// ============================================
// auth.js - Modul Otentikasi Petugas
// SRMA 19 Bantul
// ============================================

const Auth = (() => {
  const STORAGE_KEY = 'srma19_auth';

  /**
   * Ambil data otentikasi dari localStorage
   * @returns {object|null} Data user atau null
   */
  function getAuthData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error('Gagal membaca data otentikasi:', e);
      return null;
    }
  }

  /**
   * Simpan data otentikasi ke localStorage
   * @param {object} data - Data user yang akan disimpan
   */
  function setAuthData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Gagal menyimpan data otentikasi:', e);
    }
  }

  /**
   * Hapus data otentikasi dari localStorage
   */
  function clearAuthData() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Gagal menghapus data otentikasi:', e);
    }
  }

  // --- PUBLIC API ---

  return {
    /**
     * Cek apakah pengguna sudah login
     * @returns {boolean} true jika sesi valid
     */
    isLoggedIn() {
      const auth = getAuthData();
      return !!(auth && auth.username && auth.token);
    },

    /**
     * Dapatkan data pengguna yang sedang login
     * @returns {object|null} { username, nama, role, token, loginTime }
     */
    getCurrentUser() {
      return getAuthData();
    },

    /**
     * Login dengan username & PIN, lalu simpan sesi
     * @param {string} username - Username petugas
     * @param {string} pin - PIN petugas
     * @returns {Promise<object>} { success: boolean, message?: string, user?: object }
     */
    async login(username, pin) {
      try {
        const response = await API.login(username, pin);

        if (response.status === 'success') {
          const authData = {
            username: username,
            nama: response.nama,
            role: response.role,
            token: response.token,
            loginTime: new Date().toISOString()
          };
          setAuthData(authData);
          return { success: true, user: authData };
        } else {
          return { success: false, message: response.message || 'Username atau PIN salah.' };
        }
      } catch (error) {
        console.error('Login error:', error);
        return { success: false, message: 'Gagal terhubung ke server. Periksa koneksi internet.' };
      }
    },

    /**
     * Logout dan hapus sesi
     */
    logout() {
      clearAuthData();
    },

    /**
     * Proteksi halaman: jika belum login, redirect ke halaman login
     * @param {string} [redirectUrl='login.html'] - URL halaman login
     * @returns {boolean} true jika sudah login
     */
    requireAuth(redirectUrl = 'login.html') {
      if (!this.isLoggedIn()) {
        // Hindari redirect loop
        if (window.location.pathname.indexOf(redirectUrl) === -1) {
          window.location.href = redirectUrl;
        }
        return false;
      }
      return true;
    }
  };
})();