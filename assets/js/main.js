// ============================================================
//  MAIN.JS – Navigasi, Sidebar Toggle, Bottom Sheet (Mobile)
//  SRMA 19 Bantul
//  Versi: 1.0.0 - SPA Ready
// ============================================================

(function() {
    'use strict';

    // --- KONSTANTA ---
    const MENU_KEY = 'srma19_active_menu';

    // ============================================================
    //  NAVIGASI (dipanggil dari sidebar / bottom nav)
    //  Fungsi ini meneruskan ke App.navigate() jika ada
    // ============================================================
    function navigate(page) {
        if (typeof window.App !== 'undefined' && window.App.navigate) {
            window.App.navigate(page);
        } else {
            console.error('App router belum dimuat!');
        }
    }

    // ============================================================
    //  SIDEBAR TOGGLE
    // ============================================================
    function toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('mainContent');
        const icon = document.getElementById('collapseIcon');
        if (!sidebar || !mainContent || !icon) return;

        sidebar.classList.toggle('collapsed');
        mainContent.classList.toggle('expanded');

        const isCollapsed = sidebar.classList.contains('collapsed');
        icon.className = isCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
    }

    // ============================================================
    //  BOTTOM SHEET (untuk menu "Lainnya" di mobile)
    // ============================================================
    function toggleBottomSheet() {
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

        // Daftar menu tambahan sesuai role (disederhanakan, bisa dibuat dinamis)
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

        // Tutup saat klik di luar
        setTimeout(() => {
            document.addEventListener('click', function closeSheet(e) {
                if (!overlay.contains(e.target) && !e.target.closest('.bottom-item')) {
                    overlay.remove();
                    document.removeEventListener('click', closeSheet);
                }
            });
        }, 100);
    }

    // ============================================================
    //  INISIALISASI EVENT LISTENER (Saat DOM siap)
    // ============================================================
    function init() {
        // Pastikan event toggle sidebar terpasang
        const toggleBtn = document.getElementById('toggleSidebar');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', toggleSidebar);
        }

        // Pastikan event toggle scan slider (mobile) terpasang
        const scanSliderToggle = document.getElementById('toggleScanSlider');
        if (scanSliderToggle) {
            scanSliderToggle.addEventListener('click', function() {
                const slider = document.getElementById('mobileScanSlider');
                if (slider) {
                    slider.classList.toggle('open');
                    const icon = this.querySelector('i');
                    if (icon) {
                        icon.className = slider.classList.contains('open') ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
                    }
                }
            });
        }
    }

    // ============================================================
    //  EXPOSE KE GLOBAL
    // ============================================================
    window.navigate = navigate;
    window.toggleSidebar = toggleSidebar;
    window.toggleBottomSheet = toggleBottomSheet;
    window.handleLogout = window.Common.handleLogout; // dari Common

    // Jalankan init setelah DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('✅ Main module loaded');
})();