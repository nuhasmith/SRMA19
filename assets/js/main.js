// ============================================================
//  MAIN.JS – Navigasi, Sidebar Toggle, Bottom Sheet (Mobile)
//  SRMA 19 Bantul
//  Versi: 2.0.0 - Final (Terintegrasi dengan App Router)
// ============================================================

(function() {
    'use strict';

    // ============================================================
    //  DELEGASI KE APP ROUTER (Jika tersedia)
    // ============================================================
    function navigate(page) {
        if (window.App && typeof window.App.navigate === 'function') {
            window.App.navigate(page);
        } else {
            console.error('App router belum dimuat!');
        }
    }

    function toggleSidebar() {
        // Fungsi toggle sidebar sudah ditangani di app.js (event listener),
        // tapi kita sediakan fallback jika dipanggil dari HTML.
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        const icon = document.getElementById('collapseIcon');
        if (!sidebar || !mainContent || !icon) return;
        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');
        const isCollapsed = sidebar.classList.contains('collapsed');
        icon.className = isCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
    }

    function toggleBottomSheet() {
        // Buka menu "Lainnya" menggunakan fungsi dari app.js jika ada
        if (window.App && typeof window.App.openMobileMenu === 'function') {
            window.App.openMobileMenu();
        } else {
            // Fallback: buat bottom sheet sederhana
            const existing = document.querySelector('.bottom-sheet-overlay');
            if (existing) {
                existing.remove();
                return;
            }
            const overlay = document.createElement('div');
            overlay.className = 'bottom-sheet-overlay';
            overlay.style.cssText = `
                position: fixed;
                bottom: 60px;
                left: 0;
                right: 0;
                z-index: 1060;
                background: #fff;
                border-radius: 16px 16px 0 0;
                box-shadow: 0 -10px 40px rgba(0,0,0,0.15);
                padding: 16px 20px 24px;
                max-height: 60vh;
                overflow-y: auto;
                animation: slideUp 0.3s ease;
            `;
            // Daftar menu tambahan (fallback)
            const menuItems = [
                { page: 'jadwal', label: 'Jadwal Kegiatan', icon: 'fa-calendar-alt' },
                { page: 'wali_asuh', label: 'Wali Asuh', icon: 'fa-users-cog' },
                { page: 'alumni', label: 'Data Alumni', icon: 'fa-graduation-cap' },
                { page: 'laporan', label: 'Laporan Summary', icon: 'fa-chart-pie' },
                { page: 'petugas', label: 'Data Petugas', icon: 'fa-user-shield' },
                { page: 'scanqr', label: 'Scan QR', icon: 'fa-qrcode' }
            ];
            let html = '<div style="display:flex;flex-direction:column;gap:6px;">';
            menuItems.forEach(item => {
                html += `
                    <button class="btn btn-outline-secondary w-100 text-start"
                            onclick="navigate('${item.page}');this.closest('.bottom-sheet-overlay').remove()">
                        <i class="fas ${item.icon} me-2"></i> ${item.label}
                    </button>
                `;
            });
            html += '<hr>';
            html += `
                <button class="btn btn-outline-danger w-100 text-start"
                        onclick="handleLogout();this.closest('.bottom-sheet-overlay').remove()">
                    <i class="fas fa-sign-out-alt me-2"></i> Logout
                </button>
            </div>`;
            overlay.innerHTML = html;
            document.body.appendChild(overlay);

            setTimeout(() => {
                document.addEventListener('click', function closeSheet(e) {
                    if (!overlay.contains(e.target) && !e.target.closest('.bottom-item')) {
                        overlay.remove();
                        document.removeEventListener('click', closeSheet);
                    }
                });
            }, 100);
        }
    }

    function handleLogout() {
        if (confirm('Logout?')) {
            // Panggil Auth.logout dan bersihkan cache
            if (window.Auth && typeof window.Auth.logout === 'function') {
                window.Auth.logout();
            }
            if (window.Common && typeof window.Common.clearCache === 'function') {
                window.Common.clearCache();
                window.Common.clearSessionCache();
            }
            // Redirect ke halaman publik
            window.location.href = 'index.html';
        }
    }

    // ============================================================
    //  EXPOSE KE GLOBAL
    // ============================================================
    window.navigate = navigate;
    window.toggleSidebar = toggleSidebar;
    window.toggleBottomSheet = toggleBottomSheet;
    window.handleLogout = handleLogout;

    // ============================================================
    //  INISIALISASI TAMBAHAN (Jika diperlukan)
    // ============================================================
    function init() {
        // Pastikan event listener toggle sidebar terpasang (jika belum)
        const toggleBtn = document.getElementById('toggleSidebar');
        if (toggleBtn && !toggleBtn.dataset.bound) {
            toggleBtn.addEventListener('click', toggleSidebar);
            toggleBtn.dataset.bound = 'true';
        }

        // Pastikan event listener QR slider (mobile) terpasang (jika belum)
        const scanSliderToggle = document.getElementById('toggleScanSlider');
        if (scanSliderToggle && !scanSliderToggle.dataset.bound) {
            scanSliderToggle.addEventListener('click', function() {
                const slider = document.getElementById('mobileQrSlider');
                if (slider) {
                    slider.classList.toggle('open');
                    const icon = this.querySelector('i');
                    if (icon) {
                        icon.className = slider.classList.contains('open') ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
                    }
                }
            });
            scanSliderToggle.dataset.bound = 'true';
        }
    }

    // Jalankan init setelah DOM siap
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('✅ Main module loaded (v2.0.0 - Terintegrasi dengan App Router)');
})();