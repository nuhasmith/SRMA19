// ============================================================
//  COMMON.JS – Fungsi Bersama untuk Semua Modul (SafeStorage Complete)
//  SRMA 19 Bantul
//  Versi: 3.2.0 - Final Fix, Anti Tracking Prevention, Robust
// ============================================================

(function() {
    'use strict';

    // ============================================================
    //  SAFE STORAGE - PATCH GLOBAL (Mengatasi Tracking Prevention)
    //  Jika browser memblokir localStorage/sessionStorage, kita
    //  otomatis menggantinya dengan penyimpanan memori internal.
    // ============================================================
    const SafeStorage = (() => {
        const memoryStore = {
            local: {},
            session: {}
        };

        // Cek apakah storage type tersedia (localStorage/sessionStorage)
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

        // Ambil storage asli jika ada, jika tidak gunakan memori
        const getStorage = (type) => {
            if (isStorageAvailable(type)) return window[type];
            return null;
        };

        return {
            getItem: (key, type = 'local') => {
                const storage = getStorage(type === 'session' ? 'sessionStorage' : 'localStorage');
                if (storage) return storage.getItem(key);
                // Fallback ke memori
                return memoryStore[type][key] || null;
            },
            setItem: (key, value, type = 'local') => {
                const storage = getStorage(type === 'session' ? 'sessionStorage' : 'localStorage');
                if (storage) return storage.setItem(key, value);
                // Fallback ke memori
                memoryStore[type][key] = value;
            },
            removeItem: (key, type = 'local') => {
                const storage = getStorage(type === 'session' ? 'sessionStorage' : 'localStorage');
                if (storage) return storage.removeItem(key);
                // Fallback ke memori
                delete memoryStore[type][key];
            },
            clear: (type = 'local') => {
                const storage = getStorage(type === 'session' ? 'sessionStorage' : 'localStorage');
                if (storage) return storage.clear();
                // Fallback ke memori
                memoryStore[type] = {};
            }
        };
    })();

    // OVERRIDE GLOBAL STORAGE (Jika diblokir, langsung pakai memori)
    // Kita gunakan SafeStorage untuk fallback
    (function() {
        // Cek localStorage
        try {
            const testKey = '__test__';
            window.localStorage.setItem(testKey, '1');
            window.localStorage.removeItem(testKey);
        } catch (e) {
            Object.defineProperty(window, 'localStorage', {
                get: () => ({
                    getItem: (k) => SafeStorage.getItem(k, 'local'),
                    setItem: (k, v) => SafeStorage.setItem(k, v, 'local'),
                    removeItem: (k) => SafeStorage.removeItem(k, 'local'),
                    clear: () => SafeStorage.clear('local')
                })
            });
        }
        // Cek sessionStorage
        try {
            const testKey = '__test__';
            window.sessionStorage.setItem(testKey, '1');
            window.sessionStorage.removeItem(testKey);
        } catch (e) {
            Object.defineProperty(window, 'sessionStorage', {
                get: () => ({
                    getItem: (k) => SafeStorage.getItem(k, 'session'),
                    setItem: (k, v) => SafeStorage.setItem(k, v, 'session'),
                    removeItem: (k) => SafeStorage.removeItem(k, 'session'),
                    clear: () => SafeStorage.clear('session')
                })
            });
        }
    })();

    // ============================================================
    //  CONSTANTS
    // ============================================================
    const CACHE_KEY = 'srma19_data';
    const CACHE_DURATION = 5 * 60 * 1000; // 5 menit
    const SESSION_CACHE_KEY = 'srma19_session_cache';

    // ============================================================
    //  LOCAL CACHE (localStorage - dengan SafeStorage)
    // ============================================================
    function getCachedData() {
        try {
            const raw = SafeStorage.getItem(CACHE_KEY, 'local');
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (Date.now() - data.timestamp > CACHE_DURATION) {
                SafeStorage.removeItem(CACHE_KEY, 'local');
                return null;
            }
            return data.payload;
        } catch {
            return null;
        }
    }

    function setCachedData(payload) {
        try {
            SafeStorage.setItem(CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                payload: payload
            }), 'local');
        } catch {}
    }

    function clearCache() {
        SafeStorage.removeItem(CACHE_KEY, 'local');
    }

    // ============================================================
    //  SESSION CACHE (sessionStorage - dengan SafeStorage)
    // ============================================================
    function getSessionCache() {
        try {
            const raw = SafeStorage.getItem(SESSION_CACHE_KEY, 'session');
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    }

    function setSessionCache(key, data, ttl = 5 * 60 * 1000) {
        const cache = getSessionCache();
        cache[key] = {
            data: data,
            timestamp: Date.now(),
            ttl: ttl
        };
        try {
            SafeStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cache), 'session');
        } catch {}
    }

    function getSessionCacheData(key) {
        const cache = getSessionCache();
        const entry = cache[key];
        if (!entry) return null;
        if (Date.now() - entry.timestamp > entry.ttl) {
            delete cache[key];
            try {
                SafeStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cache), 'session');
            } catch {}
            return null;
        }
        return entry.data;
    }

    function clearSessionCache() {
        SafeStorage.removeItem(SESSION_CACHE_KEY, 'session');
    }

    // ============================================================
    //  TOAST NOTIFICATION
    // ============================================================
    function showToast(msg, type = 'info') {
        const colors = {
            success: ['#10b981', '#ecfdf5', 'fa-check-circle'],
            error:   ['#ef4444', '#fef2f2', 'fa-times-circle'],
            warning: ['#f59e0b', '#fffbeb', 'fa-exclamation-triangle'],
            info:    ['#3b82f6', '#eff6ff', 'fa-info-circle']
        };
        const [border, bg, icon] = colors[type] || colors.info;

        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast-item has-progress';
        toast.innerHTML = `
            <div class="toast-icon ${type}"><i class="fas ${icon}"></i></div>
            <div class="toast-content">
                <div class="toast-title">${type === 'success' ? 'Berhasil' : type === 'error' ? 'Gagal' : type === 'warning' ? 'Peringatan' : 'Informasi'}</div>
                <div class="toast-message">${msg}</div>
            </div>
            <button class="toast-close" onclick="this.closest('.toast-item').remove()"><i class="fas fa-times"></i></button>
            <div class="toast-progress" style="color:${border};"></div>
        `;
        container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.add('removing');
                setTimeout(() => {
                    if (toast.parentNode) toast.remove();
                }, 300);
            }
        }, 3800);

        // Klik untuk close
        toast.addEventListener('click', function(e) {
            if (!e.target.closest('.toast-close')) {
                this.classList.add('removing');
                setTimeout(() => {
                    if (this.parentNode) this.remove();
                }, 300);
            }
        });
    }

    // ============================================================
    //  MODAL CLOSE
    // ============================================================
    function closeModal() {
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
    }

    // ============================================================
    //  LOGOUT (Bersihkan Semua Sesi & Cache)
    // ============================================================
    function handleLogout() {
        if (confirm('Logout?')) {
            // Panggil Auth.logout jika ada
            if (window.Auth && typeof window.Auth.logout === 'function') {
                window.Auth.logout();
            }
            // Bersihkan semua cache
            clearCache();
            clearSessionCache();
            // Redirect ke index
            window.location.href = 'index.html';
        }
    }

    // ============================================================
    //  EXPOSE TO GLOBAL
    // ============================================================
    window.Common = {
        // Storage
        getCachedData,
        setCachedData,
        clearCache,
        getSessionCache,
        setSessionCache,
        getSessionCacheData,
        clearSessionCache,
        // UI
        showToast,
        closeModal,
        handleLogout,
        // Expose SafeStorage global agar modul lain bisa mengaksesnya
        safeStorage: SafeStorage
    };

    // Ekspos juga SafeStorage langsung ke window
    window.SafeStorage = SafeStorage;

    console.log('✅ Common module loaded (v3.2.0 - Final Fix)');
})();