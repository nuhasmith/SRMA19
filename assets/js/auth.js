// ============================================================
//  AUTH.JS – Modul Otentikasi & Manajemen Sesi (SafeStorage Complete)
//  SRMA 19 Bantul
//  Versi: 4.0.0 - Full Fix, Anti Tracking Prevention, Robust
// ============================================================

(function() {
    'use strict';

    // SafeStorage Fallback (Jika common.js belum dimuat)
    const SafeStorage = window.SafeStorage || (() => {
        const memoryStore = {
            local: {},
            session: {}
        };
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
                return memoryStore[type][key] || null;
            },
            setItem: (key, value, type = 'local') => {
                const storage = getStorage(type === 'session' ? 'sessionStorage' : 'localStorage');
                if (storage) return storage.setItem(key, value);
                memoryStore[type][key] = value;
            },
            removeItem: (key, type = 'local') => {
                const storage = getStorage(type === 'session' ? 'sessionStorage' : 'localStorage');
                if (storage) return storage.removeItem(key);
                delete memoryStore[type][key];
            },
            clear: (type = 'local') => {
                const storage = getStorage(type === 'session' ? 'sessionStorage' : 'localStorage');
                if (storage) return storage.clear();
                memoryStore[type] = {};
            }
        };
    })();

    // ============================================================
    //  KONSTANTA
    // ============================================================
    const STORAGE_KEY = 'srma19_auth';
    const TOKEN_KEY = 'srma19_auth_token';

    // ============================================================
    //  FUNGSI INTERNAL (Menggunakan SafeStorage)
    // ============================================================
    function getAuthData() {
        try {
            const raw = SafeStorage.getItem(STORAGE_KEY, 'local');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.error('❌ Gagal membaca data otentikasi:', e);
            return null;
        }
    }

    function setAuthData(data) {
        try {
            SafeStorage.setItem(STORAGE_KEY, JSON.stringify(data), 'local');
            // Simpan token terpisah untuk akses cepat
            if (data && data.token) {
                SafeStorage.setItem(TOKEN_KEY, data.token, 'local');
            }
        } catch (e) {
            console.error('❌ Gagal menyimpan data otentikasi:', e);
        }
    }

    function clearAuthData() {
        try {
            SafeStorage.removeItem(STORAGE_KEY, 'local');
            SafeStorage.removeItem(TOKEN_KEY, 'local');
        } catch (e) {
            console.error('❌ Gagal menghapus data otentikasi:', e);
        }
    }

    function clearAllSessionData() {
        try {
            // Hapus semua kunci terkait
            const keys = [
                'srma19_admin_data',
                'srma19_petugas_data',
                'srma19_humas_data',
                'srma19_public_data',
                'srma19_active_menu',
                'srma19_data',
                'srma19_settings',
                'srma19_sound_enabled',
                'srma19_absensi_log',
                'srma19_absensi_state',
                'srma19_session_cache',
                'srma19_settings_cached',
                'srma19_public_data',
                'srma19_profile_data'
            ];
            keys.forEach(key => {
                SafeStorage.removeItem(key, 'local');
                SafeStorage.removeItem(key, 'session');
            });
            SafeStorage.removeItem(TOKEN_KEY, 'local');
        } catch (e) {
            console.error('❌ Gagal membersihkan data sesi:', e);
        }
    }

    // ============================================================
    //  PUBLIC API
    // ============================================================
    window.Auth = {
        /**
         * Cek apakah pengguna sudah login
         */
        isLoggedIn() {
            const auth = getAuthData();
            return !!(auth && auth.username && auth.token);
        },

        /**
         * Dapatkan data pengguna saat ini
         */
        getCurrentUser() {
            return getAuthData();
        },

        /**
         * Dapatkan token sesi saat ini
         */
        getToken() {
            const auth = getAuthData();
            return auth ? auth.token : null;
        },

        /**
         * Dapatkan role pengguna saat ini
         */
        getRole() {
            const user = getAuthData();
            return user ? user.role : null;
        },

        /**
         * Login dengan username & password
         */
        async login(username, password) {
            try {
                if (typeof API === 'undefined' || typeof API.login !== 'function') {
                    return { success: false, message: 'Modul API tidak dimuat dengan benar.' };
                }

                const response = await API.login(username, password);

                if (!response || response.status !== 'success') {
                    return {
                        success: false,
                        message: (response && response.message) ? response.message : 'Username atau password salah.'
                    };
                }

                const authData = {
                    username: username,
                    nama: response.nama || username,
                    role: response.role || 'petugas',
                    token: response.token || generateUUID(),
                    loginTime: new Date().toISOString()
                };
                setAuthData(authData);

                return { success: true, user: authData };
            } catch (error) {
                console.error('❌ Login error (network/server):', error);
                return { success: false, message: 'Gagal terhubung ke server. Periksa koneksi internet.' };
            }
        },

        /**
         * Logout dan hapus semua sesi
         */
        logout(redirect = false) {
            clearAuthData();
            clearAllSessionData();
            if (redirect) {
                try {
                    window.location.href = 'index.html';
                } catch (e) {
                    console.error('Gagal redirect setelah logout:', e);
                }
            }
        },

        /**
         * Proteksi halaman: jika belum login, redirect ke halaman login
         */
        requireAuth(redirectUrl = 'login.html') {
            if (!this.isLoggedIn()) {
                try {
                    if (window.location.pathname.indexOf(redirectUrl) === -1) {
                        window.location.href = redirectUrl;
                    }
                } catch (e) {
                    console.error('Gagal redirect ke halaman login:', e);
                }
                return false;
            }
            return true;
        },

        /**
         * Perbarui data user di localStorage (misalnya setelah update profil)
         */
        updateUser(updates) {
            const current = getAuthData();
            if (current) {
                const updated = { ...current, ...updates };
                setAuthData(updated);
            }
        },

        /**
         * Cek apakah sesi masih valid
         */
        isSessionValid() {
            const user = getAuthData();
            if (!user || !user.token) return false;
            return true;
        }
    };

    // Helper UUID sederhana (jika API tidak memberikan token)
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Ekspos SafeStorage global (untuk berjaga-jaga jika common.js belum dipanggil)
    window.SafeStorage = SafeStorage;

    console.log('✅ Auth module loaded (v4.0.0 - SafeStorage Complete)');
})();