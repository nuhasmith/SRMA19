// ============================================================
//  APP.JS – Router SPA untuk Semua Role (FINAL ULTRA FIX v15.0)
//  SRMA 19 Bantul
//  Fitur: Login Redirect, Footer Navigation, Mobile Navbar, Carousel
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
    let publicRefreshInterval = null;
    let galleryImages = [];
    let currentGalleryIndex = 0;

    // ============================================================
    //  INIT – Utama
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
        document.querySelectorAll('.nav-item[data-page], .bottom-item[data-page]').forEach(el => {
            el.classList.toggle('active', el.dataset.page === page);
        });
        const container = document.getElementById('mainContent');
        if (!container) return;
        const renderFn = getRenderFunction(currentUser.role, page);
        if (renderFn) {
            container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="text-muted mt-2">Memuat...</p></div>';
            setTimeout(() => renderFn(container), 50);
        } else {
            container.innerHTML = '<div class="text-center py-5 text-muted">Halaman tidak ditemukan</div>';
        }
    }

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
    //  RENDER SHELL (Untuk Role Login)
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
            <div class="bottom-nav" id="bottomNav"></div>
            <div class="main-content" id="mainContent"></div>
            <div class="toast-container" id="toastContainer"></div>
        `;
        const menus = getMenus(role);
        fillSidebar(menus);
        fillBottomNav(menus);
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
    }

    function getMenus(role) {
        const commonMenus = [
            { id: 'dashboard', label: 'Dashboard', icon: 'fa-tachometer-alt' },
            { id: 'profil', label: 'Profil', icon: 'fa-user-circle' }
        ];
        if (role === 'admin') return [
            ...commonMenus.slice(0, 1),
            { id: 'peserta', label: 'Data Peserta', icon: 'fa-users' },
            { id: 'absensi', label: 'Data Absensi', icon: 'fa-clipboard-list' },
            { id: 'izin', label: 'Data Izin', icon: 'fa-file-medical-alt' },
            { id: 'jadwal', label: 'Jadwal Kegiatan', icon: 'fa-calendar-alt' },
            { id: 'petugas', label: 'Data Petugas', icon: 'fa-user-shield' },
            { id: 'wali_asuh', label: 'Wali Asuh', icon: 'fa-users-cog' },
            { id: 'alumni', label: 'Data Alumni', icon: 'fa-graduation-cap' },
            { id: 'laporan', label: 'Laporan Summary', icon: 'fa-chart-pie' },
            { id: 'berita', label: 'Manajemen Berita', icon: 'fa-newspaper' },
            { id: 'galeri', label: 'Galeri', icon: 'fa-images' },
            { id: 'scanqr', label: 'Scan QR', icon: 'fa-qrcode' },
            { id: 'statistik', label: 'Statistik', icon: 'fa-chart-bar' },
            { id: 'pengaturan', label: 'Pengaturan Website', icon: 'fa-cog' },
            ...commonMenus.slice(1)
        ];
        if (role === 'petugas') return [
            ...commonMenus.slice(0, 1),
            { id: 'absensi', label: 'Data Absensi', icon: 'fa-clipboard-list' },
            { id: 'izin', label: 'Data Izin', icon: 'fa-file-medical-alt' },
            { id: 'jadwal', label: 'Jadwal Kegiatan', icon: 'fa-calendar-alt' },
            { id: 'wali_asuh', label: 'Wali Asuh', icon: 'fa-users-cog' },
            { id: 'alumni', label: 'Data Alumni', icon: 'fa-graduation-cap' },
            { id: 'laporan', label: 'Laporan Summary', icon: 'fa-chart-pie' },
            { id: 'scanqr', label: 'Scan QR', icon: 'fa-qrcode' },
            ...commonMenus.slice(1)
        ];
        if (role === 'humas') return [
            ...commonMenus.slice(0, 1),
            { id: 'berita', label: 'Manajemen Berita', icon: 'fa-newspaper' },
            { id: 'galeri', label: 'Galeri', icon: 'fa-images' },
            ...commonMenus.slice(1)
        ];
        return commonMenus;
    }

    function fillSidebar(menus) {
        const nav = document.getElementById('sidebarNav');
        nav.innerHTML = menus.map(menu => `<a class="nav-item" data-page="${menu.id}" onclick="App.navigate('${menu.id}')"><i class="fas ${menu.icon}"></i><span>${menu.label}</span></a>`).join('');
    }

    function fillBottomNav(menus) {
        const nav = document.getElementById('bottomNav');
        const mobileMenus = menus.filter(m => ['dashboard', 'peserta', 'absensi', 'izin', 'jadwal'].includes(m.id));
        if (mobileMenus.length < 5) {
            const extra = menus.filter(m => !['dashboard', 'peserta', 'absensi', 'izin', 'jadwal'].includes(m.id));
            mobileMenus.push(...extra.slice(0, 5 - mobileMenus.length));
        }
        nav.innerHTML = mobileMenus.map(menu => `<a class="bottom-item" data-page="${menu.id}" onclick="App.navigate('${menu.id}')"><i class="fas ${menu.icon}"></i><span>${menu.label}</span></a>`).join('');
    }

    // ============================================================
    //  HALAMAN PUBLIK (Dengan Footer Navigation & Mobile)
    // ============================================================
    async function showPublicPage() {
        currentPage = 'public';
        SafeStorage.setItem(PUBLIC_VIEW_KEY, 'true', 'session');
        const settings = await getSettingsWithCache();
        document.body.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="text-muted mt-2">Memuat...</p></div>';
        const html = buildPublicHTML(settings);
        document.body.innerHTML = html;
        await loadPublicData();
        updatePublicNavbar();
        toggleScrollTopButton();
    }

    function buildPublicHTML(settings) {
        const showBerita = settings.show_berita !== 'false';
        const showGaleri = settings.show_video !== 'false';
        const showJadwal = settings.show_jadwal !== 'false';
        const showStatistik = settings.show_statistik !== 'false';
        const showFasilitas = settings.show_fasilitas !== 'false';
        const showTentang = settings.show_tentang !== 'false';
        const isLoggedIn = !!currentUser;
        const isAdminOrPetugas = currentUser && (currentUser.role === 'admin' || currentUser.role === 'petugas');

        let sections = `
            <nav class="navbar navbar-expand-lg fixed-top" id="navbar">
                <div class="container">
                    <a class="navbar-brand" href="index.html"><img src="srma.webp" alt="SRMA 19"> SRMA 19</a>
                    <div class="d-flex align-items-center gap-2">
                        ${isLoggedIn ? `
                            <div class="dropdown d-lg-none">
                                <button class="btn btn-nav-cta dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                    <i class="fas fa-user-circle me-1"></i>${currentUser.nama.split(' ')[0]}
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end">
                                    <li><a class="dropdown-item" href="#" onclick="App.goToDashboard()"><i class="fas fa-tachometer-alt me-2"></i>Dashboard</a></li>
                                    <li><a class="dropdown-item" href="#" onclick="App.logout()"><i class="fas fa-sign-out-alt me-2"></i>Logout</a></li>
                                </ul>
                            </div>
                        ` : `
                            <a href="login.html" class="btn btn-nav-cta d-lg-none"><i class="fas fa-sign-in-alt me-2"></i>Masuk</a>
                        `}
                        <button class="navbar-toggler border-0 shadow-none" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu"><span class="navbar-toggler-icon"></span></button>
                    </div>
                    <div class="collapse navbar-collapse" id="navMenu">
                        <ul class="navbar-nav mx-auto">
                            ${showTentang ? '<li class="nav-item"><a class="nav-link" href="#tentang">Tentang</a></li>' : ''}
                            ${showFasilitas ? '<li class="nav-item"><a class="nav-link" href="#fasilitas">Fasilitas</a></li>' : ''}
                            ${showJadwal ? '<li class="nav-item"><a class="nav-link" href="#jadwal">Jadwal</a></li>' : ''}
                            ${showBerita ? '<li class="nav-item"><a class="nav-link" href="#berita">Berita</a></li>' : ''}
                            ${showGaleri ? '<li class="nav-item"><a class="nav-link" href="#galeri">Galeri</a></li>' : ''}
                            <li class="nav-item"><a class="nav-link" href="#lokasi">Lokasi</a></li>
                        </ul>
                        <div id="navbarUserArea" class="d-none d-lg-block">
                            ${currentUser ? `
                                <div class="dropdown">
                                    <button class="btn btn-nav-cta dropdown-toggle" type="button" data-bs-toggle="dropdown">
                                        <i class="fas fa-user-circle me-1"></i>${currentUser.nama} <span class="badge bg-light text-dark ms-1">${currentUser.role}</span>
                                    </button>
                                    <ul class="dropdown-menu dropdown-menu-end">
                                        <li><a class="dropdown-item" href="#" onclick="App.goToDashboard()"><i class="fas fa-tachometer-alt me-2"></i>Dashboard</a></li>
                                        ${isAdminOrPetugas ? '<li><a class="dropdown-item" href="#" onclick="App.navigateToScanQR()"><i class="fas fa-qrcode me-2"></i>Scan QR</a></li>' : ''}
                                        <li><hr class="dropdown-divider"></li>
                                        <li><a class="dropdown-item" href="#" onclick="App.logout()"><i class="fas fa-sign-out-alt me-2"></i>Logout</a></li>
                                    </ul>
                                </div>
                            ` : `<a href="login.html" class="btn btn-nav-cta"><i class="fas fa-sign-in-alt me-2"></i>Masuk</a>`}
                        </div>
                    </div>
                </div>
            </nav>

            <section class="hero-section" id="top">
                <div class="container text-center">
                    <div class="hero-badge"><i class="far fa-calendar-check me-2"></i>Beroperasi Juli 2025</div>
                    <h1>Sekolah Rakyat<br><span class="highlight">SRMA 19 Bantul</span></h1>
                    <p class="hero-subtitle">Sekolah menengah atas berasrama <strong>gratis</strong> bagi siswa dari keluarga kurang mampu.</p>
                    <a href="#tentang" class="btn btn-hero-primary">Pelajari Lebih</a>
                    <a href="#lokasi" class="btn btn-hero-outline">Lihat Lokasi</a>
                </div>
            </section>
        `;

        if (showStatistik) {
            sections += `
                <div class="container position-relative" style="margin-top:-60px;">
                    <div class="stat-section text-center" id="statSection">
                        <div class="row g-4">
                            <div class="col-6 col-lg-3"><div class="stat-number" id="statTotalPeserta">0</div><div class="stat-label">Total Peserta</div></div>
                            <div class="col-6 col-lg-3"><div class="stat-number" id="statRombel">0</div><div class="stat-label">Rombongan Belajar</div></div>
                            <div class="col-6 col-lg-3"><div class="stat-number" id="statPutra">0</div><div class="stat-label">Putra</div></div>
                            <div class="col-6 col-lg-3"><div class="stat-number" id="statPutri">0</div><div class="stat-label">Putri</div></div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (showTentang) {
            sections += `
                <section id="tentang" class="py-6 bg-white">
                    <div class="container py-5">
                        <div class="text-center mb-5"><span class="section-label">Tentang Kami</span><h2 class="section-title">Mengenal SRMA 19 Bantul</h2><p class="section-subtitle">Program percontohan Kementerian Pekerjaan Umum.</p></div>
                        <div class="row g-4">
                            <div class="col-lg-6"><div class="card-custom p-4"><h4 class="fw-bold mb-3">Visi & Misi</h4><p>Menyediakan akses pendidikan gratis bagi siswa kurang mampu.</p></div></div>
                            <div class="col-lg-6"><div class="card-custom p-4"><h4 class="fw-bold mb-3">Latar Belakang</h4><p>Beroperasi mulai Juli 2025 dengan sistem berasrama penuh.</p></div></div>
                        </div>
                    </div>
                </section>
            `;
        }

        if (showFasilitas) {
            sections += `
                <section id="fasilitas" class="py-6 bg-gradient-light">
                    <div class="container py-5">
                        <div class="text-center mb-5"><span class="section-label">Fasilitas</span><h2 class="section-title">Fasilitas Lengkap & Modern</h2><p class="section-subtitle">Dirancang untuk mendukung pembelajaran dan kehidupan asrama yang nyaman.</p></div>
                        <div class="row g-4">
                            <div class="col-md-6 col-lg-4"><div class="card-custom p-4 text-center"><div class="card-icon-wrap blue mx-auto"><i class="fas fa-bed"></i></div><h5 class="fw-bold text-dark">Asrama Putra & Putri</h5><p class="mb-0 small">Asrama terpisah dengan pengawasan 24 jam.</p></div></div>
                            <div class="col-md-6 col-lg-4"><div class="card-custom p-4 text-center"><div class="card-icon-wrap green mx-auto"><i class="fas fa-chalkboard-teacher"></i></div><h5 class="fw-bold text-dark">Ruang Kelas</h5><p class="mb-0 small">10 rombel dengan ruang kelas modern.</p></div></div>
                            <div class="col-md-6 col-lg-4"><div class="card-custom p-4 text-center"><div class="card-icon-wrap orange mx-auto"><i class="fas fa-book-open"></i></div><h5 class="fw-bold text-dark">Perpustakaan</h5><p class="mb-0 small">Koleksi buku lengkap mendukung literasi.</p></div></div>
                            <div class="col-md-6 col-lg-4"><div class="card-custom p-4 text-center"><div class="card-icon-wrap purple mx-auto"><i class="fas fa-utensils"></i></div><h5 class="fw-bold text-dark">Ruang Makan</h5><p class="mb-0 small">Menu bergizi seimbang untuk seluruh siswa.</p></div></div>
                            <div class="col-md-6 col-lg-4"><div class="card-custom p-4 text-center"><div class="card-icon-wrap rose mx-auto"><i class="fas fa-futbol"></i></div><h5 class="fw-bold text-dark">Lapangan Olahraga</h5><p class="mb-0 small">Area outdoor untuk futsal, basket, voli.</p></div></div>
                            <div class="col-md-6 col-lg-4"><div class="card-custom p-4 text-center"><div class="card-icon-wrap teal mx-auto"><i class="fas fa-shield-alt"></i></div><h5 class="fw-bold text-dark">Keamanan 24 Jam</h5><p class="mb-0 small">Sistem keamanan terpadu.</p></div></div>
                        </div>
                    </div>
                </section>
            `;
        }

        if (showJadwal) {
            sections += `
                <section id="jadwal" class="py-6 bg-white">
                    <div class="container py-5">
                        <div class="text-center mb-5"><span class="section-label">Jadwal Harian</span><h2 class="section-title">Kegiatan Terstruktur</h2><p class="section-subtitle">Rutinitas harian yang membentuk kedisiplinan, karakter, dan kebersamaan.</p></div>
                        <div id="jadwalContainer"><div class="text-center py-4"><div class="spinner-border text-primary"></div><p class="text-muted mt-2">Memuat jadwal...</p></div></div>
                    </div>
                </section>
            `;
        }

        if (showBerita) {
            sections += `
                <section id="berita" class="py-6 bg-gradient-light">
                    <div class="container py-5">
                        <div class="text-center mb-5"><span class="section-label">Berita & Update</span><h2 class="section-title">Berita Terbaru SRMA 19</h2><p class="section-subtitle">Informasi terkini seputar kegiatan sekolah.</p></div>
                        <div class="carousel-wrapper">
                            <button class="carousel-prev" id="beritaPrev" onclick="App.scrollCarousel('beritaTrack', -1)"><i class="fas fa-chevron-left"></i></button>
                            <div id="beritaTrack" class="carousel-track"></div>
                            <button class="carousel-next" id="beritaNext" onclick="App.scrollCarousel('beritaTrack', 1)"><i class="fas fa-chevron-right"></i></button>
                        </div>
                        <div class="text-center mt-4"><button class="btn btn-outline-primary rounded-pill px-5" onclick="App.showAllBerita()"><i class="fas fa-list me-2"></i>Lihat Semua Berita</button></div>
                    </div>
                </section>
            `;
        }

        if (showGaleri) {
            sections += `
                <section id="galeri" class="py-6 bg-white">
                    <div class="container py-5">
                        <div class="text-center mb-5"><h2 class="section-title">Galeri</h2></div>
                        <div class="carousel-wrapper">
                            <button class="carousel-prev" id="galeriPrev" onclick="App.scrollCarousel('galeriTrack', -1)"><i class="fas fa-chevron-left"></i></button>
                            <div id="galeriTrack" class="carousel-track"></div>
                            <button class="carousel-next" id="galeriNext" onclick="App.scrollCarousel('galeriTrack', 1)"><i class="fas fa-chevron-right"></i></button>
                        </div>
                        <div class="text-center mt-4"><button class="btn btn-outline-primary rounded-pill px-5" onclick="App.showAllGaleri()"><i class="fas fa-images me-2"></i>Lihat Semua Galeri</button></div>
                    </div>
                </section>
            `;
        }

        sections += `
            <section id="lokasi" class="py-6 bg-gradient-light">
                <div class="container py-5">
                    <div class="text-center mb-5"><span class="section-label">Lokasi</span><h2 class="section-title">Temukan Kami</h2><p class="section-subtitle">Berada di kawasan strategis Sentra Terpadu Prof. Dr. Soeharso.</p></div>
                    <div class="row g-4 align-items-center">
                        <div class="col-lg-5">
                            <div class="card-custom p-4 h-100">
                                <h5 class="fw-bold text-dark mb-3"><i class="fas fa-map-pin me-2" style="color:var(--accent);"></i>Alamat Lengkap</h5>
                                <p>Sentra Terpadu Prof. Dr. Soeharso<br>Sonosewu, Ngestiharjo<br>Kec. Kasihan, Kab. Bantul, DIY</p>
                                <hr>
                                <a href="https://maps.app.goo.gl/qCGz2qiij2d6h9pK7" target="_blank" class="btn btn-primary rounded-pill"><i class="fas fa-map-marker-alt me-1"></i> Buka di Google Maps</a>
                            </div>
                        </div>
                        <div class="col-lg-7"><div class="map-wrapper"><iframe src="https://maps.google.com/maps?q=-7.80694,110.34333&z=16&output=embed" allowfullscreen loading="lazy"></iframe></div></div>
                    </div>
                </div>
            </section>

            <!-- ===== FOOTER DENGAN NAVIGASI (FIX WARNA AKSES) ===== -->
            <footer class="footer">
                <div class="container">
                    <div class="row g-4">
                        <div class="col-md-4">
                            <h5 class="footer-title">SRMA 19 Bantul</h5>
                            <p class="small opacity-75">Sekolah Rakyat Menengah Atas 19 Bantul, program percontohan Kementerian PU.</p>
                        </div>
                        <div class="col-md-4">
                            <h5 class="footer-title">Navigasi</h5>
                            <ul class="list-unstyled small opacity-75">
                                <li><a href="#top">Beranda</a></li>
                                ${showTentang ? '<li><a href="#tentang">Tentang</a></li>' : ''}
                                ${showFasilitas ? '<li><a href="#fasilitas">Fasilitas</a></li>' : ''}
                                ${showJadwal ? '<li><a href="#jadwal">Jadwal</a></li>' : ''}
                                ${showBerita ? '<li><a href="#berita">Berita</a></li>' : ''}
                                ${showGaleri ? '<li><a href="#galeri">Galeri</a></li>' : ''}
                                <li><a href="#lokasi">Lokasi</a></li>
                            </ul>
                        </div>
                        <div class="col-md-4">
                            <h5 class="footer-title">Akses</h5>
                            <div class="d-grid gap-2">
                                ${isLoggedIn ? `
                                    <button class="btn btn-outline-light btn-sm fw-semibold" onclick="App.goToDashboard()"><i class="fas fa-tachometer-alt me-2"></i>Dashboard</button>
                                    <button class="btn btn-outline-danger btn-sm fw-semibold" onclick="App.logout()"><i class="fas fa-sign-out-alt me-2"></i>Logout</button>
                                ` : `
                                    <a href="login.html" class="btn btn-outline-light btn-sm fw-semibold text-decoration-none"><i class="fas fa-sign-in-alt me-2"></i>Masuk</a>
                                `}
                            </div>
                        </div>
                    </div>
                    <hr class="border-secondary opacity-10 my-4">
                    <div class="text-center small opacity-75"><p class="mb-0">&copy; 2026 SRMA 19 Bantul</p></div>
                </div>
            </footer>

            <button id="btnScrollTop" class="btn-scroll-top" onclick="App.scrollToTop()" title="Kembali ke atas"><i class="fas fa-chevron-up"></i></button>

            <div id="galleryLightbox" class="gallery-lightbox" style="display:none;">
                <button class="lightbox-close" onclick="App.closeGalleryLightbox()">&times;</button>
                <button class="lightbox-prev" onclick="App.prevGalleryImage()">&#10094;</button>
                <img id="lightboxImage" src="" alt="Galeri">
                <button class="lightbox-next" onclick="App.nextGalleryImage()">&#10095;</button>
            </div>

            <div class="toast-container" id="toastContainer"></div>
        `;
        return sections;
    }

    // ============================================================
    //  BOTTOM NAV MOBILE (PENTING: Label Masuk/Akun)
    // ============================================================
    function renderBottomNavMobile() {
        const bottomNav = document.getElementById('bottomNav');
        if (!bottomNav) return;
        const isLoggedIn = !!currentUser;
        bottomNav.innerHTML = `
            <a class="bottom-nav-item" href="index.html#top"><i class="fas fa-home"></i><span>Beranda</span></a>
            <a class="bottom-nav-item" href="index.html#tentang"><i class="fas fa-info-circle"></i><span>Tentang</span></a>
            <a class="bottom-nav-item" href="index.html#fasilitas"><i class="fas fa-building"></i><span>Fasilitas</span></a>
            <a class="bottom-nav-item" href="index.html#jadwal"><i class="fas fa-clock"></i><span>Jadwal</span></a>
            ${isLoggedIn ? '<a class="bottom-nav-item" href="#" onclick="App.goToDashboard()"><i class="fas fa-user-circle"></i><span>Akun</span></a>' : '<a class="bottom-nav-item" href="login.html"><i class="fas fa-sign-in-alt"></i><span>Masuk</span></a>'}
        `;
    }

    // ============================================================
    //  SETTINGS CACHE & LOAD DATA PUBLIK
    // ============================================================
    async function getSettingsWithCache() {
        const cached = SafeStorage.getItem(SETTINGS_KEY, 'session');
        if (cached) {
            try { const parsed = JSON.parse(cached); if (Date.now() - parsed.timestamp < TTL) return parsed.data; } catch {}
        }
        try {
            const res = await API.getSettings();
            if (res.status === 'success') {
                SafeStorage.setItem(SETTINGS_KEY, JSON.stringify({ timestamp: Date.now(), data: res.data }), 'session');
                return res.data;
            }
        } catch (e) {}
        return { show_berita:'true', show_video:'true', show_jadwal:'true', show_statistik:'true', show_fasilitas:'true', show_tentang:'true' };
    }

    async function loadPublicData() {
        const cached = SafeStorage.getItem(CACHE_KEY, 'session');
        if (cached) {
            try { const parsed = JSON.parse(cached); if (Date.now() - parsed.timestamp < TTL) { renderCachedData(parsed.data); } } catch {}
        }
        try {
            const [peserta, jadwal, berita, galeri] = await Promise.all([
                API.listPeserta(), API.getJadwal(), API.listBerita('Publish', 20), API.listGaleri('Publish', 20)
            ]);
            const data = {
                peserta: peserta.data || [],
                jadwal: jadwal.data || [],
                berita: berita.data || [],
                galeri: galeri.data || []
            };
            SafeStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data }), 'session');
            renderPublicData(data);
        } catch (e) { console.error('Gagal fetch data publik:', e); }
    }

    function renderCachedData(data) {
        renderStats(data.peserta);
        renderJadwal(data.jadwal);
        renderBeritaGrid(data.berita);
        renderGaleri(data.galeri);
    }

    function renderPublicData(data) {
        renderStats(data.peserta);
        renderJadwal(data.jadwal);
        renderBeritaGrid(data.berita);
        renderGaleri(data.galeri);
    }

    function renderStats(pesertaData) {
        const isMale = (val) => { if (!val) return false; const l = String(val).toLowerCase(); return l.includes('laki') || l === 'l'; };
        const isFemale = (val) => { if (!val) return false; const l = String(val).toLowerCase(); return l.includes('perempuan') || l.includes('wanita') || l === 'p'; };
        const el1 = document.getElementById('statTotalPeserta');
        const el2 = document.getElementById('statRombel');
        const el3 = document.getElementById('statPutra');
        const el4 = document.getElementById('statPutri');
        if (el1) el1.textContent = pesertaData.length;
        if (el2) el2.textContent = new Set(pesertaData.map(x => x.Rombel).filter(Boolean)).size;
        if (el3) el3.textContent = pesertaData.filter(x => isMale(x.Jenis_Kelamin || x.jk)).length;
        if (el4) el4.textContent = pesertaData.filter(x => isFemale(x.Jenis_Kelamin || x.jk)).length;
    }

    function renderJadwal(jadwalData) {
        const container = document.getElementById('jadwalContainer');
        if (!container) return;
        if (!jadwalData || jadwalData.length === 0) { container.innerHTML = '<div class="text-center py-4 text-muted">Belum ada jadwal kegiatan.</div>'; return; }
        const allItems = [...jadwalData].sort((a, b) => a.mulai.localeCompare(b.mulai));
        const timeGroups = {};
        allItems.forEach(item => { const k = item.mulai; if (!timeGroups[k]) timeGroups[k] = []; timeGroups[k].push(item); });
        let html = '<div class="timeline-wrapper">';
        for (const [time, items] of Object.entries(timeGroups)) {
            html += `<div class="timeline-item"><div class="timeline-dot" style="background:${items[0].color || '#0d6efd'};"></div><span class="timeline-time">${time}</span><div class="timeline-content">${items.map(item => `<span class="activity-card" style="background:${agamaColors[item.agama] || '#0d6efd'};"><i class="fas ${item.icon || 'fa-circle'}"></i> ${item.nama} <small style="font-size:0.7em;">(${item.agama})</small></span>`).join('')}</div></div>`;
        }
        html += '</div>';
        container.innerHTML = html;
    }

    const agamaColors = { Islam:'#10b981', Kristen:'#3b82f6', Katolik:'#8b5cf6', Hindu:'#f59e0b', Buddha:'#6366f1', Penghayat:'#22c55e' };

    function renderBeritaGrid(beritaData) {
        const track = document.getElementById('beritaTrack');
        if (!track) return;
        if (!beritaData || beritaData.length === 0) { track.innerHTML = '<div class="text-center py-4 text-muted">Belum ada berita.</div>'; return; }
        let html = '';
        beritaData.forEach(b => {
            let imgSrc = 'https://placehold.co/600x400/e2e8f0/64748b?text=No+Image';
            if (b.Gambar && (String(b.Gambar).startsWith('data:image') || String(b.Gambar).startsWith('http'))) imgSrc = b.Gambar;
            html += `<div class="carousel-item-wrapper"><div class="card-custom news-card" onclick="window.location.href='detail.html?id=${b.ID}'"><img src="${imgSrc}" class="card-img-top" alt="${b.Judul}"><div class="card-body"><h5 class="news-title">${b.Judul}</h5><p>${(String(b.Isi||'').replace(/<[^>]*>/g, '')).substring(0,100)}...</p><span class="read-more">Baca Selengkapnya <i class="fas fa-arrow-right"></i></span></div></div></div>`;
        });
        track.innerHTML = html;
        updateCarouselButtons('berita', beritaData.length);
    }

    function renderGaleri(galeriData) {
        const track = document.getElementById('galeriTrack');
        if (!track) return;
        if (!galeriData || galeriData.length === 0) { track.innerHTML = '<div class="text-center py-4 text-muted">Belum ada galeri.</div>'; return; }
        galleryImages = galeriData.filter(g => g.Gambar && String(g.Gambar).trim() !== '').map(g => String(g.Gambar));
        let html = '';
        galleryImages.forEach((imgSrc, index) => {
            html += `<div class="carousel-item-wrapper"><img src="${imgSrc}" class="card-img-top" alt="Galeri ${index+1}" onclick="App.openGalleryLightbox(${index})" style="cursor:pointer;" onerror="this.onerror=null;this.src='https://placehold.co/600x400/e2e8f0/64748b?text=No+Image';"></div>`;
        });
        track.innerHTML = html;
        updateCarouselButtons('galeri', galleryImages.length);
    }

    // ============================================================
    //  CAROUSEL HELPERS
    // ============================================================
    function updateCarouselButtons(prefix, count) {
        const prev = document.getElementById(prefix + 'Prev');
        const next = document.getElementById(prefix + 'Next');
        if (!prev || !next) return;
        if (count <= 5) { prev.classList.add('disabled'); next.classList.add('disabled'); }
        else { prev.classList.remove('disabled'); next.classList.remove('disabled'); }
    }

    function scrollCarousel(trackId, dir) {
        const track = document.getElementById(trackId);
        if (!track) return;
        const item = track.querySelector('.carousel-item-wrapper');
        if (!item) return;
        const w = item.offsetWidth + 20;
        track.scrollBy({ left: dir * w, behavior: 'smooth' });
    }

    // ============================================================
    //  LIGHTBOX & SCROLL
    // ============================================================
    function openGalleryLightbox(index) {
        if (!galleryImages.length) return;
        currentGalleryIndex = index;
        document.getElementById('lightboxImage').src = galleryImages[currentGalleryIndex];
        document.getElementById('galleryLightbox').style.display = 'flex';
    }
    function closeGalleryLightbox() { document.getElementById('galleryLightbox').style.display = 'none'; }
    function prevGalleryImage() { currentGalleryIndex = (currentGalleryIndex - 1 + galleryImages.length) % galleryImages.length; document.getElementById('lightboxImage').src = galleryImages[currentGalleryIndex]; }
    function nextGalleryImage() { currentGalleryIndex = (currentGalleryIndex + 1) % galleryImages.length; document.getElementById('lightboxImage').src = galleryImages[currentGalleryIndex]; }

    function updatePublicNavbar() {
        const sections = document.querySelectorAll('section[id]');
        const navLinks = document.querySelectorAll('.navbar .nav-link');
        if (!sections.length || !navLinks.length) return;
        const pos = window.scrollY + 100;
        let currentId = '';
        sections.forEach(s => { const top = s.offsetTop, h = s.offsetHeight; if (pos >= top && pos < top + h) currentId = s.id; });
        navLinks.forEach(l => { l.classList.remove('active'); if (l.getAttribute('href') === '#' + currentId) l.classList.add('active'); });
    }

    function toggleScrollTopButton() {
        const btn = document.getElementById('btnScrollTop');
        if (!btn) return;
        if (window.scrollY > 400) btn.classList.add('show'); else btn.classList.remove('show');
    }

    function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

    // ============================================================
    //  NAVIGASI UTIL
    // ============================================================
    function showAllBerita() { window.location.href = 'semua-berita.html'; }
    function showAllGaleri() { window.location.href = 'galeri.html'; }
    function navigateToScanQR() { SafeStorage.setItem(MENU_KEY, 'scanqr', 'local'); goToDashboard(); }
    function goToDashboard() { SafeStorage.removeItem(PUBLIC_VIEW_KEY, 'session'); window.location.href = 'index.html'; }
    function goToPublicSite() { SafeStorage.setItem(PUBLIC_VIEW_KEY, 'true', 'session'); window.location.href = 'index.html'; }
    function logout() { if (confirm('Logout?')) { Auth.logout(); SafeStorage.removeItem(MENU_KEY, 'local'); SafeStorage.removeItem(PUBLIC_VIEW_KEY, 'session'); window.location.href = 'index.html'; } }

    // ============================================================
    //  EXPOSE
    // ============================================================
    window.App = {
        init, navigate, logout, goToPublicSite, goToDashboard, navigateToScanQR,
        showAllBerita, showAllGaleri, scrollToTop, scrollCarousel,
        openGalleryLightbox, closeGalleryLightbox, prevGalleryImage, nextGalleryImage
    };

    document.addEventListener('DOMContentLoaded', init);
})();