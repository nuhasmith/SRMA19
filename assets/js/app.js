// ============================================================
//  APP.JS – Router SPA untuk Semua Role (FINAL v44.0)
//  Fitur: 
//   - Mode Publik Default (Link Utama Langsung ke Beranda)
//   - Dashboard Khusus Role (Admin/Petugas/Humas) via ?dashboard=1
//   - Bottom Navbar 4+1, Bottom Sheet, QR Slider
//   - Anti Error, Safe DOM, Cache & Preload
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
    let currentPage = 'public';

    // ============================================================
    //  INIT
    // ============================================================
    function init() {
        currentUser = Auth.getCurrentUser();

        // Cek apakah pengguna secara eksplisit meminta dashboard
        const urlParams = new URLSearchParams(window.location.search);
        const wantsDashboard = urlParams.get('dashboard') === '1' || window.location.hash === '#dashboard';

        if (wantsDashboard && currentUser) {
            // Jika pengguna login dan meminta dashboard, tampilkan dashboard
            SafeStorage.removeItem(PUBLIC_VIEW_KEY, 'session');
            renderShell(currentUser.role);
            const page = SafeStorage.getItem(MENU_KEY, 'local') || 'dashboard';
            navigate(page);
        } else {
            // SELALU tampilkan halaman publik sebagai default
            SafeStorage.setItem(PUBLIC_VIEW_KEY, 'true', 'session');
            showPublicPage();
        }
        window.addEventListener('scroll', handleGlobalScroll);
    }

    // ============================================================
    //  HANDLER SCROLL (Diperbaiki)
    // ============================================================
    function handleGlobalScroll() {
        if (currentPage === 'public') {
            updateNavbarUser(); // alias updatePublicNavbar
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
    //  RENDER SHELL (Dashboard)
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
    //  MENU & NAVIGASI (Dashboard)
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
    //  HALAMAN PUBLIK (Default saat pertama kali masuk)
    // ============================================================
    async function showPublicPage() {
        currentPage = 'public';
        SafeStorage.setItem(PUBLIC_VIEW_KEY, 'true', 'session');

        // Render kerangka halaman publik yang lengkap
        document.body.innerHTML = `
            <nav class="navbar navbar-expand-lg fixed-top" id="navbar">
                <div class="container">
                    <a class="navbar-brand" href="index.html">
                        <img src="srma.webp" alt="SRMA 19"> SRMA 19
                    </a>
                    <button class="navbar-toggler border-0 shadow-none" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
                        <span class="navbar-toggler-icon"></span>
                    </button>
                    <div class="collapse navbar-collapse" id="navMenu">
                        <ul class="navbar-nav mx-auto mb-2 mb-lg-0">
                            <li class="nav-item"><a class="nav-link" href="#beranda">Beranda</a></li>
                            <li class="nav-item"><a class="nav-link" href="#tentang">Tentang</a></li>
                            <li class="nav-item"><a class="nav-link" href="#jadwal">Jadwal</a></li>
                            <li class="nav-item"><a class="nav-link" href="#berita">Berita</a></li>
                            <li class="nav-item"><a class="nav-link" href="#galeri">Galeri</a></li>
                            <li class="nav-item"><a class="nav-link" href="#lokasi">Lokasi</a></li>
                        </ul>
                        <div id="navbarUserArea"></div>
                    </div>
                </div>
            </nav>

            <!-- Bottom Nav Mobile -->
            <div class="bottom-nav" id="bottomNavMobile">
                <a class="bottom-nav-item" href="#beranda"><i class="fas fa-home"></i><span>Beranda</span></a>
                <a class="bottom-nav-item" href="#tentang"><i class="fas fa-info-circle"></i><span>Tentang</span></a>
                <a class="bottom-nav-item" href="#jadwal"><i class="fas fa-clock"></i><span>Jadwal</span></a>
                <a class="bottom-nav-item" href="#berita"><i class="fas fa-newspaper"></i><span>Berita</span></a>
                <a class="bottom-nav-item" href="login.html"><i class="fas fa-user-lock"></i><span>Petugas</span></a>
            </div>

            <!-- Hero -->
            <header class="hero-section" id="beranda">
                <div class="container text-center">
                    <div class="hero-badge">Sekolah Rakyat Unggulan</div>
                    <h1>SRMA 19 Bantul</h1>
                    <p class="hero-subtitle">Mencetak generasi cerdas, mandiri, dan berakhlak mulia.</p>
                    <div class="hero-buttons">
                        <a href="#berita" class="btn-hero-primary">Lihat Berita</a>
                        <a href="#lokasi" class="btn-hero-outline">Lokasi Kami</a>
                    </div>
                </div>
            </header>

            <!-- Statistik -->
            <section class="stat-section">
                <div class="container">
                    <div class="row text-center">
                        <div class="col-6 col-md-3"><div class="stat-number" id="statPeserta">0</div><div class="stat-label">Peserta</div></div>
                        <div class="col-6 col-md-3"><div class="stat-number" id="statBerita">0</div><div class="stat-label">Berita</div></div>
                        <div class="col-6 col-md-3"><div class="stat-number" id="statGaleri">0</div><div class="stat-label">Galeri</div></div>
                        <div class="col-6 col-md-3"><div class="stat-number" id="statKunjungan">0</div><div class="stat-label">Kunjungan</div></div>
                    </div>
                </div>
            </section>

            <!-- Tentang -->
            <section class="py-6" id="tentang">
                <div class="container">
                    <h2 class="section-title text-center">Tentang Kami</h2>
                    <p class="section-subtitle text-center">SRMA 19 Bantul adalah sekolah rakyat yang berkomitmen memberikan pendidikan berkualitas bagi seluruh anak Indonesia.</p>
                </div>
            </section>

            <!-- Jadwal -->
            <section class="py-6 bg-light" id="jadwal">
                <div class="container">
                    <h2 class="section-title text-center">Jadwal Kegiatan</h2>
                    <div class="timeline-wrapper" id="publicJadwalContainer">
                        <div class="text-center py-5"><div class="spinner-border text-primary"></div></div>
                    </div>
                </div>
            </section>

            <!-- Berita -->
            <section class="py-6" id="berita">
                <div class="container">
                    <h2 class="section-title text-center">Berita Terbaru</h2>
                    <div class="row g-4" id="publicBeritaContainer">
                        <div class="col-12 text-center"><div class="spinner-border text-primary"></div></div>
                    </div>
                </div>
            </section>

            <!-- Galeri -->
            <section class="py-6 bg-light" id="galeri">
                <div class="container">
                    <h2 class="section-title text-center">Galeri</h2>
                    <div class="row g-4" id="publicGaleriContainer">
                        <div class="col-12 text-center"><div class="spinner-border text-primary"></div></div>
                    </div>
                </div>
            </section>

            <!-- Lokasi -->
            <section class="py-6" id="lokasi">
                <div class="container">
                    <h2 class="section-title text-center">Lokasi Kami</h2>
                    <div class="map-wrapper">
                        <iframe src="https://maps.google.com/maps?q=-7.80694,110.34333&z=15&output=embed" width="100%" height="400" style="border:0;" allowfullscreen="" loading="lazy"></iframe>
                    </div>
                </div>
            </section>

            <!-- Footer -->
            <footer class="footer">
                <div class="container text-center">
                    <p>&copy; 2026 SRMA 19 Bantul</p>
                </div>
            </footer>
        `;

        // Load data publik dari API
        try {
            const [pesertaRes, beritaRes, galeriRes, hitsRes, jadwalRes] = await Promise.all([
                API.listPeserta(),
                API.listBerita('Publish', 3),
                API.listGaleri('Publish', 6),
                API.getHits(),
                API.getJadwal()
            ]);

            // Update statistik
            document.getElementById('statPeserta').textContent = (pesertaRes.data || []).length;
            document.getElementById('statBerita').textContent = (beritaRes.data || []).length;
            document.getElementById('statGaleri').textContent = (galeriRes.data || []).length;
            document.getElementById('statKunjungan').textContent = hitsRes.total || 0;

            // Render Berita
            const beritaHtml = (beritaRes.data || []).map(b => {
                const imgSrc = (b.Gambar && b.Gambar.startsWith('http')) ? b.Gambar : 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image';
                const excerpt = (b.Isi || '').replace(/<[^>]*>/g, '').substring(0, 100);
                return `
                    <div class="col-md-4">
                        <div class="card-custom berita-card">
                            <img src="${imgSrc}" class="card-img-top" alt="${b.Judul}" style="height:180px;object-fit:cover;">
                            <div class="card-body">
                                <h5 class="news-title">${b.Judul}</h5>
                                <p class="news-excerpt">${excerpt}...</p>
                                <a href="detail.html?id=${b.ID}" class="read-more">Baca Selengkapnya <i class="fas fa-arrow-right"></i></a>
                            </div>
                        </div>
                    </div>`;
            }).join('');
            document.getElementById('publicBeritaContainer').innerHTML = beritaHtml || '<p class="text-muted text-center">Belum ada berita dipublikasikan.</p>';

            // Render Galeri
            const galeriHtml = (galeriRes.data || []).map(g => {
                const imgSrc = (g.Gambar && g.Gambar.startsWith('http')) ? g.Gambar : 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image';
                return `
                    <div class="col-md-4">
                        <div class="card-custom p-2">
                            <img src="${imgSrc}" class="img-fluid rounded-3" style="width:100%;height:200px;object-fit:cover;" alt="${g.Judul}">
                            <div class="mt-2 text-center fw-semibold">${g.Judul}</div>
                        </div>
                    </div>`;
            }).join('');
            document.getElementById('publicGaleriContainer').innerHTML = galeriHtml || '<p class="text-muted text-center">Belum ada galeri.</p>';

            // Render Jadwal
            const jadwalData = jadwalRes.data || [];
            if (jadwalData.length) {
                const grouped = {};
                jadwalData.forEach(j => {
                    const agama = j.agama || 'Lainnya';
                    if (!grouped[agama]) grouped[agama] = [];
                    grouped[agama].push(`<div class="schedule-item"><span class="schedule-time">${j.mulai}</span><span class="schedule-name">${j.nama}</span><span class="schedule-duration">${j.mulai} - ${j.selesai}</span></div>`);
                });
                let jadwalHtml = '<div class="schedule-container">';
                for (const [agama, items] of Object.entries(grouped)) {
                    jadwalHtml += `<div class="schedule-group" style="border-left-color: ${items[0]?.color || '#0d6efd'};"><h6 class="fw-bold mb-2"><i class="fas fa-users me-2"></i>${agama}</h6>${items.join('')}</div>`;
                }
                jadwalHtml += '</div>';
                document.getElementById('publicJadwalContainer').innerHTML = jadwalHtml;
            } else {
                document.getElementById('publicJadwalContainer').innerHTML = '<p class="text-muted text-center">Belum ada jadwal.</p>';
            }

            // Update navbar user area
            updateNavbarUser();

            // Aktifkan scroll navbar
            const navbar = document.getElementById('navbar');
            window.addEventListener('scroll', () => {
                if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);
            });

        } catch (e) {
            console.error('Gagal memuat data publik:', e);
            document.getElementById('publicBeritaContainer').innerHTML = '<p class="text-muted text-center">Gagal memuat berita.</p>';
            document.getElementById('publicGaleriContainer').innerHTML = '<p class="text-muted text-center">Gagal memuat galeri.</p>';
            document.getElementById('publicJadwalContainer').innerHTML = '<p class="text-muted text-center">Gagal memuat jadwal.</p>';
            updateNavbarUser();
        }
    }

    // ============================================================
    //  NAVBAR USER AREA (Untuk Publik)
    // ============================================================
    function updateNavbarUser() {
        const container = document.getElementById('navbarUserArea');
        if (!container) return;
        const user = Auth.getCurrentUser();
        if (user && user.username) {
            container.innerHTML = `<a href="index.html?dashboard=1" class="btn btn-nav-cta"><i class="fas fa-tachometer-alt me-1"></i> Dashboard</a>`;
        } else {
            container.innerHTML = `<a href="login.html" class="btn btn-nav-cta"><i class="fas fa-user-lock me-2"></i>Area Petugas</a>`;
        }
    }

    // ============================================================
    //  TOMBOL SCROLL KE ATAS (Diperbaiki: Null Handling)
    // ============================================================
    function toggleScrollTopButton() {
        let btn = document.getElementById('btnScrollTop');
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'btnScrollTop';
            btn.className = 'btn-scroll-top';
            btn.innerHTML = '<i class="fas fa-chevron-up"></i>';
            btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
            document.body.appendChild(btn);
        }
        if (window.scrollY > 400) btn.classList.add('show');
        else btn.classList.remove('show');
    }

    // ============================================================
    //  UTIL NAVIGASI & LOGOUT
    // ============================================================
    function goToDashboard() { SafeStorage.removeItem(PUBLIC_VIEW_KEY, 'session'); window.location.href = 'index.html?dashboard=1'; }
    function goToPublicSite() { SafeStorage.setItem(PUBLIC_VIEW_KEY, 'true', 'session'); window.location.href = 'index.html'; }
    function logout() {
        if (confirm('Logout?')) {
            Auth.logout();
            SafeStorage.removeItem(MENU_KEY, 'local');
            SafeStorage.removeItem(PUBLIC_VIEW_KEY, 'session');
            window.location.href = 'index.html'; // kembali ke publik
        }
    }

    // ============================================================
    //  EXPOSE KE GLOBAL
    // ============================================================
    window.openMobileMenu = openMobileMenu;
    window.closeMobileMenu = closeMobileMenu;

    window.App = {
        init, navigate, logout, goToPublicSite, goToDashboard,
        openMobileMenu, closeMobileMenu
    };

    document.addEventListener('DOMContentLoaded', init);
})();