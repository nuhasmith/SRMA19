// ============================================================
//  APP.JS – Router SPA untuk Semua Role (FINAL v42.0)
//  Fitur: Bottom Navbar 4+1, Bottom Sheet "Lainnya",
//         QR Slider Toggle & Auto-Hide, Global Functions Fix
// ============================================================

(function() {
    'use strict';

    // --- SAFE STORAGE ---
    const SafeStorage = window.SafeStorage || (() => {
        const mem = { local: {}, session: {} };
        return {
            getItem: (k, t='local') => mem[t][k] || null,
            setItem: (k, v, t='local') => mem[t][k] = v,
            removeItem: (k, t='local') => delete mem[t][k]
        };
    })();

    // --- KONSTANTA ---
    const MENU_KEY = 'srma19_active_menu';
    const PUBLIC_VIEW_KEY = 'srma19_public_view';
    const CACHE_KEY = 'srma19_public_data';
    const SETTINGS_KEY = 'srma19_settings_cached';
    const TTL = 10 * 60 * 1000;

    let currentUser = null;
    let currentPage = 'dashboard';

    // ============================================================
    //  INIT
    // ============================================================
    function init() {
        currentUser = Auth.getCurrentUser();
        const publicMode = SafeStorage.getItem(PUBLIC_VIEW_KEY, 'session') === 'true';
        if (currentUser && !publicMode) {
            renderShell(currentUser.role);
            const page = SafeStorage.getItem(MENU_KEY, 'local') || 'dashboard';
            navigate(page);
        } else {
            showPublicPage();
        }
        window.addEventListener('scroll', handleGlobalScroll);
    }

    // ============================================================
    //  HANDLER SCROLL
    // ============================================================
    function handleGlobalScroll() {
        if (currentPage === 'public') {
            updatePublicNavbar();
            toggleScrollTopButton();
        }
    }

    // ============================================================
    //  NAVIGASI & ROUTING
    // ============================================================
    function navigate(page) {
        currentPage = page;
        SafeStorage.setItem(MENU_KEY, page, 'local');
        document.querySelectorAll('.nav-item, .bottom-item').forEach(el => {
            el.classList.toggle('active', el.dataset.page === page);
        });
        const container = document.getElementById('mainContent');
        if (!container) return;
        const renderFn = getRenderFunction(currentUser.role, page);
        if (renderFn) {
            container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="text-muted mt-2">Memuat...</p></div>';
            setTimeout(() => renderFn(container), 50);
        } else {
            if (page !== 'dashboard') {
                navigate('dashboard');
            } else {
                container.innerHTML = '<div class="text-center py-5 text-muted">Halaman tidak ditemukan</div>';
            }
        }
        updateQrSliderVisibility();
    }

    // ============================================================
    //  GET RENDER FUNCTION (Role-aware)
    // ============================================================
    function getRenderFunction(role, page) {
        const renderMap = {
            admin: {
                dashboard: 'Dashboard.renderDashboard',
                peserta: 'Peserta.renderPeserta',
                absensi: 'Absensi.renderAbsensi',
                izin: 'Izin.renderIzin',
                jadwal: 'Jadwal.renderJadwal',
                petugas: 'Petugas.renderPetugas',
                wali_asuh: 'WaliAsuh.renderWaliAsuh',
                alumni: 'Alumni.renderAlumni',
                laporan: 'Laporan.renderLaporan',
                berita: 'Berita.renderBerita',
                galeri: 'GaleriAdmin.renderGaleriAdmin',
                scanqr: 'AbsensiQR.renderAbsensiQR',
                statistik: 'Statistik.renderStatistik',
                pengaturan: 'PengaturanWebsite.renderPengaturanWebsite',
                schedule_override: 'ScheduleOverride.renderScheduleOverride',
                profil: 'Profil.renderProfil'
            },
            petugas: {
                dashboard: 'PetugasDashboard.renderDashboardPetugas',
                absensi: 'PetugasAbsensi.renderAbsensiPetugas',
                izin: 'PetugasIzin.renderIzinPetugas',
                jadwal: 'PetugasJadwal.renderJadwalPetugas',
                wali_asuh: 'PetugasWaliAsuh.renderWaliAsuhPetugas',
                alumni: 'PetugasAlumni.renderAlumniPetugas',
                laporan: 'PetugasLaporan.renderLaporanPetugas',
                scanqr: 'PetugasScanQR.renderScanQR',
                profil: 'Profil.renderProfil'
            },
            humas: {
                dashboard: 'HumasDashboard.renderDashboardHumas',
                berita: 'HumasBerita.renderBeritaHumas',
                galeri: 'HumasGaleri.renderGaleriHumas',
                profil: 'Profil.renderProfil'
            }
        };
        const path = renderMap[role]?.[page];
        if (!path) return null;
        const [objName, funcName] = path.split('.');
        const obj = window[objName];
        if (obj && typeof obj[funcName] === 'function') return obj[funcName].bind(obj);
        return null;
    }

    // ============================================================
    //  RENDER SHELL
    // ============================================================
    function renderShell(role) {
        document.body.innerHTML = `
            <aside id="sidebar" class="sidebar">
                <div class="sidebar-header">
                    <div class="logo-area" onclick="App.goToPublicSite()" style="cursor:pointer;">
                        <img src="srma.webp" alt="SRMA 19"><span class="logo-text">SRMA 19</span>
                    </div>
                    <button class="toggle-btn" id="toggleSidebar"><i class="fas fa-chevron-left" id="collapseIcon"></i></button>
                </div>
                <div class="sidebar-nav" id="sidebarNav"></div>
                <div class="sidebar-footer">
                    <div class="user-info"><div class="user-avatar" id="userAvatar"></div><div class="user-details"><strong id="userName"></strong><small id="userRole" class="text-muted"></small></div></div>
                    <button class="btn btn-outline-danger btn-logout" onclick="App.logout()"><i class="fas fa-sign-out-alt me-2"></i><span>Logout</span></button>
                </div>
            </aside>

            <!-- BOTTOM NAVBAR: 4 MENU UTAMA + LAINNYA -->
            <div class="bottom-nav" id="bottomNav"></div>

            <!-- OVERLAY UNTUK BOTTOM SHEET -->
            <div class="mobile-menu-overlay" id="mobileMenuOverlay" onclick="closeMobileMenu()" style="display:none;"></div>

            <!-- BOTTOM SHEET MENU LAINNYA -->
            <div class="mobile-menu-sheet" id="mobileMenuSheet">
                <div class="mobile-sheet-header">
                    <span class="fw-bold">Menu Lainnya</span>
                    <button class="btn-close" onclick="closeMobileMenu()"></button>
                </div>
                <div id="mobileMenuItems" class="mobile-sheet-body"></div>
            </div>

            <div class="main-content" id="mainContent"></div>

            <!-- QR SLIDER -->
            <div id="mobileQrSlider" class="mobile-scan-slider" title="Scan QR">
                <button class="slider-toggle" id="toggleScanSlider" aria-label="Toggle Scan QR">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <a href="#" class="slider-scan-btn" id="scanQRBtn" title="Scan QR">
                    <i class="fas fa-qrcode"></i>
                </a>
            </div>

            <div class="toast-container" id="toastContainer"></div>
        `;

        const menus = getMenus(role);
        fillSidebar(menus);
        fillBottomNav(menus, role);
        fillMobileMenuSheet(menus, role);

        document.getElementById('userName').textContent = currentUser.nama || 'User';
        document.getElementById('userRole').textContent = currentUser.role;
        document.getElementById('userAvatar').textContent = (currentUser.nama || '?').charAt(0).toUpperCase();
        document.getElementById('toggleSidebar').addEventListener('click', function() {
            const sidebar = document.getElementById('sidebar');
            const mainContent = document.getElementById('mainContent');
            const icon = document.getElementById('collapseIcon');
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
            const isCollapsed = sidebar.classList.contains('collapsed');
            icon.className = isCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
        });

        initQrSlider();
        updateQrSliderVisibility();
    }

    // ============================================================
    //  QR SLIDER
    // ============================================================
    function initQrSlider() {
        const slider = document.getElementById('mobileQrSlider');
        const toggle = document.getElementById('toggleScanSlider');
        const scanBtn = document.getElementById('scanQRBtn');

        if (!slider || !toggle || !scanBtn) return;

        toggle.addEventListener('click', function(e) {
            e.stopPropagation();
            slider.classList.toggle('open');
            const icon = toggle.querySelector('i');
            if (slider.classList.contains('open')) {
                icon.className = 'fas fa-chevron-right';
            } else {
                icon.className = 'fas fa-chevron-left';
            }
        });

        scanBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            window.App.navigate('scanqr');
            setTimeout(() => {
                slider.classList.remove('open');
                const icon = toggle.querySelector('i');
                icon.className = 'fas fa-chevron-left';
            }, 100);
        });

        document.addEventListener('click', function(e) {
            if (!slider.contains(e.target)) {
                slider.classList.remove('open');
                const icon = toggle.querySelector('i');
                icon.className = 'fas fa-chevron-left';
            }
        });
    }

    function updateQrSliderVisibility() {
        const slider = document.getElementById('mobileQrSlider');
        if (!slider) return;
        if (currentPage === 'scanqr') {
            slider.style.display = 'none';
        } else {
            slider.style.display = 'flex';
        }
    }

    // ============================================================
    //  MENU & NAVIGASI
    // ============================================================
    function getMenus(role) {
        const commonMenus = [
            { id: 'dashboard', label: 'Dashboard', icon: 'fa-tachometer-alt' },
            { id: 'profil', label: 'Profil', icon: 'fa-user-circle' }
        ];
        if (role === 'admin') return [
            { id: 'dashboard', label: 'Dashboard', icon: 'fa-tachometer-alt' },
            { id: 'peserta', label: 'Peserta', icon: 'fa-users' },
            { id: 'absensi', label: 'Absensi', icon: 'fa-clipboard-list' },
            { id: 'izin', label: 'Izin', icon: 'fa-file-medical-alt' },
            { id: 'jadwal', label: 'Jadwal', icon: 'fa-calendar-alt' },
            { id: 'petugas', label: 'Petugas', icon: 'fa-user-shield' },
            { id: 'wali_asuh', label: 'Wali Asuh', icon: 'fa-users-cog' },
            { id: 'alumni', label: 'Alumni', icon: 'fa-graduation-cap' },
            { id: 'laporan', label: 'Laporan', icon: 'fa-chart-pie' },
            { id: 'berita', label: 'Berita', icon: 'fa-newspaper' },
            { id: 'galeri', label: 'Galeri', icon: 'fa-images' },
            { id: 'scanqr', label: 'Scan QR', icon: 'fa-qrcode' },
            { id: 'statistik', label: 'Statistik', icon: 'fa-chart-bar' },
            { id: 'pengaturan', label: 'Pengaturan', icon: 'fa-cog' },
            { id: 'profil', label: 'Profil', icon: 'fa-user-circle' }
        ];
        if (role === 'petugas') return [
            { id: 'dashboard', label: 'Dashboard', icon: 'fa-tachometer-alt' },
            { id: 'absensi', label: 'Absensi', icon: 'fa-clipboard-list' },
            { id: 'izin', label: 'Izin', icon: 'fa-file-medical-alt' },
            { id: 'jadwal', label: 'Jadwal', icon: 'fa-calendar-alt' },
            { id: 'wali_asuh', label: 'Wali Asuh', icon: 'fa-users-cog' },
            { id: 'alumni', label: 'Alumni', icon: 'fa-graduation-cap' },
            { id: 'laporan', label: 'Laporan', icon: 'fa-chart-pie' },
            { id: 'scanqr', label: 'Scan QR', icon: 'fa-qrcode' },
            { id: 'profil', label: 'Profil', icon: 'fa-user-circle' }
        ];
        if (role === 'humas') return [
            { id: 'dashboard', label: 'Dashboard', icon: 'fa-tachometer-alt' },
            { id: 'berita', label: 'Berita', icon: 'fa-newspaper' },
            { id: 'galeri', label: 'Galeri', icon: 'fa-images' },
            { id: 'profil', label: 'Profil', icon: 'fa-user-circle' }
        ];
        return commonMenus;
    }

    function fillSidebar(menus) {
        const nav = document.getElementById('sidebarNav');
        nav.innerHTML = menus.map(menu => `<a class="nav-item" data-page="${menu.id}" onclick="App.navigate('${menu.id}')"><i class="fas ${menu.icon}"></i><span>${menu.label}</span></a>`).join('');
    }

    function fillBottomNav(menus, role) {
        const nav = document.getElementById('bottomNav');
        if (!nav) return;

        let mainMenus = [];
        if (role === 'admin') {
            mainMenus = menus.filter(m => ['dashboard', 'peserta', 'absensi', 'izin'].includes(m.id));
        } else if (role === 'petugas') {
            mainMenus = menus.filter(m => ['dashboard', 'absensi', 'izin', 'jadwal'].includes(m.id));
        } else if (role === 'humas') {
            mainMenus = menus.filter(m => ['dashboard', 'berita', 'galeri'].includes(m.id));
        }

        if (mainMenus.length < 4) {
            mainMenus = menus.slice(0, 4);
        }

        let html = mainMenus.map(menu => 
            `<a class="bottom-item" data-page="${menu.id}" onclick="App.navigate('${menu.id}')">
                <i class="fas ${menu.icon}"></i>
                <span>${menu.label}</span>
            </a>`
        ).join('');

        html += `<button class="bottom-item" onclick="openMobileMenu()">
            <i class="fas fa-ellipsis-h"></i>
            <span>Lainnya</span>
        </button>`;

        nav.innerHTML = html;
    }

    function fillMobileMenuSheet(menus, role) {
        const container = document.getElementById('mobileMenuItems');
        if (!container) return;

        let excludedIds = [];
        if (role === 'admin') {
            excludedIds = ['dashboard', 'peserta', 'absensi', 'izin'];
        } else if (role === 'petugas') {
            excludedIds = ['dashboard', 'absensi', 'izin', 'jadwal'];
        } else if (role === 'humas') {
            excludedIds = ['dashboard', 'berita', 'galeri'];
        }

        const extraMenus = menus.filter(m => !excludedIds.includes(m.id));

        let html = '';
        extraMenus.forEach(menu => {
            html += `<a class="mobile-menu-item" onclick="closeMobileMenu(); App.navigate('${menu.id}')">
                <i class="fas ${menu.icon} me-2"></i> ${menu.label}
            </a>`;
        });
        html += `<hr>`;
        html += `<a class="mobile-menu-item text-danger" onclick="closeMobileMenu(); App.logout()">
            <i class="fas fa-sign-out-alt me-2"></i> Logout
        </a>`;
        container.innerHTML = html;
    }

    // ============================================================
    //  BOTTOM SHEET OPEN/CLOSE (Global Functions)
    // ============================================================
    function openMobileMenu() {
        const sheet = document.getElementById('mobileMenuSheet');
        const overlay = document.getElementById('mobileMenuOverlay');
        if (sheet) sheet.classList.add('show');
        if (overlay) overlay.style.display = 'block';
    }

    function closeMobileMenu() {
        const sheet = document.getElementById('mobileMenuSheet');
        const overlay = document.getElementById('mobileMenuOverlay');
        if (sheet) sheet.classList.remove('show');
        if (overlay) overlay.style.display = 'none';
    }

    // ============================================================
    //  HALAMAN PUBLIK (Sederhana)
    // ============================================================
    async function showPublicPage() {
        currentPage = 'public';
        SafeStorage.setItem(PUBLIC_VIEW_KEY, 'true', 'session');
        document.body.innerHTML = '<div class="text-center py-5">Memuat halaman publik...</div>';
    }

    // ============================================================
    //  UTIL NAVIGASI
    // ============================================================
    function goToDashboard() { SafeStorage.removeItem(PUBLIC_VIEW_KEY, 'session'); window.location.href = 'index.html'; }
    function goToPublicSite() { SafeStorage.setItem(PUBLIC_VIEW_KEY, 'true', 'session'); window.location.href = 'index.html'; }
    function logout() { if (confirm('Logout?')) { Auth.logout(); SafeStorage.removeItem(MENU_KEY, 'local'); SafeStorage.removeItem(PUBLIC_VIEW_KEY, 'session'); window.location.href = 'index.html'; } }

    // ============================================================
    //  EXPOSE KE GLOBAL (Termasuk fungsi global untuk HTML lama)
    // ============================================================
    window.openMobileMenu = openMobileMenu;
    window.closeMobileMenu = closeMobileMenu;

    window.App = {
        init, navigate, logout, goToPublicSite, goToDashboard,
        openMobileMenu, closeMobileMenu
    };

    document.addEventListener('DOMContentLoaded', init);
})();