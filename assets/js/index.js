// ============================================================
//  INDEX.JS – Inisialisasi Aplikasi SPA & Fallback Error
//  SRMA 19 Bantul
//  Versi: 1.0.0 - SPA Ready
// ============================================================

(function() {
    'use strict';

    /**
     * Inisialisasi utama aplikasi.
     * Memanggil router SPA (App.init()) setelah semua modul dimuat.
     */
    function initApp() {
        // Pastikan App sudah terdefinisi (dari app.js)
        if (typeof window.App === 'undefined') {
            console.error('App router tidak ditemukan. Pastikan app.js dimuat sebelum index.js.');
            // Tampilkan pesan error ke pengguna
            document.body.innerHTML = '<div class="alert alert-danger m-3">Terjadi kesalahan: modul inti tidak dimuat.</div>';
            return;
        }

        try {
            // Panggil router utama (akan menampilkan dashboard atau halaman publik)
            window.App.init();
        } catch (error) {
            console.error('Kesalahan saat inisialisasi App:', error);
            // Tampilkan pesan yang lebih ramah
            const mainContent = document.getElementById('mainContent') || document.body;
            mainContent.innerHTML = '<div class="alert alert-danger m-3">Terjadi kesalahan saat memuat aplikasi. Silakan muat ulang halaman.</div>';
        }
    }

    // Jalankan setelah DOM siap
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }

    // Global error handler untuk menangkap error tak terduga (opsional)
    window.addEventListener('error', function(e) {
        console.error('Uncaught error:', e.error || e.message);
    });
})();