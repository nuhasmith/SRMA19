// ============================================================
//  DASHBOARD.JS – Preload + Auto Refresh + Manual (VERY FAST)
//  SRMA 19 Bantul
//  Versi: 15.0.0 - Full Fix, Robust, Handle Partial Errors
// ============================================================

(function() {
    'use strict';

    const Common = window.Common || { getCachedData: () => null, setCachedData: () => {}, showToast: () => {} };
    const { getCachedData: getCache, setCachedData: setCache, showToast: toast } = Common;
    const SafeStorage = window.SafeStorage || (() => {
        const mem = { local: {}, session: {} };
        return { getItem: (k, t='local') => mem[t][k] || null, setItem: (k, v, t='local') => mem[t][k] = v, removeItem: (k, t='local') => delete mem[t][k] };
    })();

    let refreshInterval = null;
    let isRefreshing = false;
    const AUTO_REFRESH_MS = 60000; // 60 detik

    function safeSetHTML(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }
    function safeSetText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }

    // Fungsi fetch dengan timeout agar tidak stuck lama
    function fetchWithTimeout(promise, ms = 15000) {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
        ]);
    }

    // Fungsi aman: jika request gagal, kembalikan null tanpa melempar error
    async function safeFetch(promise) {
        try {
            const res = await fetchWithTimeout(promise);
            return res;
        } catch (e) {
            console.error('Request gagal:', e);
            return null;
        }
    }

    async function preloadAllData(showLoadingToast = true) {
        if (isRefreshing) return;
        isRefreshing = true;
        try {
            if (showLoadingToast) toast('Memuat semua data...', 'info');

            // Gunakan Promise.allSettled agar tidak gagal total jika salah satu error
            const results = await Promise.allSettled([
                safeFetch(API.listPeserta()),
                safeFetch(API.listAbsensi('', '', 1, 1000)),
                safeFetch(API.listIzin()),
                safeFetch(API.getJadwal()),
                safeFetch(API.listPetugas()),
                safeFetch(API.listWaliAsuh()),
                safeFetch(API.listAlumni()),
                safeFetch(API.listBerita()),
                safeFetch(API.listGaleri())
            ]);

            // Ambil hasil yang sukses (status: 'fulfilled') dan data tidak null
            const [pesertaRes, absensiRes, izinRes, jadwalRes, petugasRes, waliRes, alumniRes, beritaRes, galeriRes] = results.map(r => r.status === 'fulfilled' ? r.value : null);

            // Simpan ke cache hanya data yang berhasil
            const cacheData = {};
            if (pesertaRes && pesertaRes.status === 'success') cacheData.peserta = pesertaRes.data || [];
            if (absensiRes && absensiRes.status === 'success') cacheData.absensi = absensiRes.data || [];
            if (izinRes && izinRes.status === 'success') cacheData.izin = izinRes.data || [];
            if (jadwalRes && jadwalRes.status === 'success') cacheData.jadwal = jadwalRes.data || [];
            if (petugasRes && petugasRes.status === 'success') cacheData.petugas = petugasRes.data || [];
            if (waliRes && waliRes.status === 'success') cacheData.waliAsuh = waliRes.data || [];
            if (alumniRes && alumniRes.status === 'success') cacheData.alumni = alumniRes.data || [];
            if (beritaRes && beritaRes.status === 'success') cacheData.berita = beritaRes.data || [];
            if (galeriRes && galeriRes.status === 'success') cacheData.galeri = galeriRes.data || [];

            // Gabungkan dengan cache lama (jika ada) agar data yang gagal tetap ada dari cache sebelumnya
            const existingCache = getCache() || {};
            Object.assign(existingCache, cacheData);
            setCache(existingCache);

            console.log('✅ Data berhasil di-preload:', Object.keys(cacheData));
            if (showLoadingToast) toast('Semua data siap!', 'success');

            // Jika ada request yang gagal, beri tahu pengguna (tapi tidak mengganggu)
            const failedCount = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value === null)).length;
            if (failedCount > 0) {
                toast(`⚠️ ${failedCount} data gagal dimuat. Periksa koneksi.`, 'warning');
            }
        } catch (e) {
            console.error('❌ Gagal preload data:', e);
            if (showLoadingToast) toast('Gagal memuat sebagian data. Periksa koneksi.', 'error');
        } finally {
            isRefreshing = false;
        }
    }

    function startAutoRefresh() {
        if (refreshInterval) clearInterval(refreshInterval);
        refreshInterval = setInterval(() => {
            if (!document.hidden && window.App && window.App.currentPage === 'dashboard') {
                preloadAllData(false).then(() => {
                    // Render ulang dashboard setelah data siap
                    const container = document.getElementById('mainContent');
                    if (container && container.dataset.page === 'dashboard') {
                        const user = Auth.getCurrentUser();
                        if (user) {
                            delete container.dataset.rendered; // Reset guard agar bisa render ulang
                            if (user.role === 'admin') renderAdminDashboard(container);
                            else if (user.role === 'petugas') renderPetugasDashboard(container);
                            else if (user.role === 'humas') renderHumasDashboard(container);
                        }
                    }
                });
            }
        }, AUTO_REFRESH_MS);
    }

    function stopAutoRefresh() { if (refreshInterval) clearInterval(refreshInterval); refreshInterval = null; }

    // ============================================================
    //  RENDER DASHBOARD (TUNGGU DATA SEGERA TERSEDIA)
    // ============================================================
    async function renderDashboard(container) {
        const user = Auth.getCurrentUser();
        if (!user) { container.innerHTML = '<div class="text-center py-5 text-muted">Silakan login.</div>'; return; }

        container.dataset.page = 'dashboard';

        // Cek apakah cache sudah tersedia
        const cached = getCache();

        // Jika cache kosong atau tidak ada data peserta, muat data
        if (!cached || !cached.peserta) {
            container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="text-muted mt-2">Memuat data dashboard...</p></div>';
            await preloadAllData(true); // Tunggu sampai selesai
        }

        // Setelah data siap (dari cache baru), render dashboard
        if (user.role === 'admin') renderAdminDashboard(container);
        else if (user.role === 'petugas') renderPetugasDashboard(container);
        else if (user.role === 'humas') renderHumasDashboard(container);
        else container.innerHTML = '<div class="text-center py-5 text-muted">Role tidak dikenali.</div>';

        // Mulai interval auto refresh
        startAutoRefresh();
    }

    // ============================================================
    //  FUNGSI RENDER DASHBOARD (Baca Cache, Jangan 0 Jika Ada Data)
    // ============================================================
    function renderAdminDashboard(container) {
        if (!container) return;
        
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h4 class="fw-bold mb-0"><i class="fas fa-tachometer-alt me-2" style="color:#0d6efd;"></i>Dashboard Admin</h4>
                <div class="d-flex gap-2 flex-wrap">
                    <button class="btn btn-outline-primary rounded-pill" onclick="Dashboard.refreshData()"><i class="fas fa-sync-alt me-1"></i> Refresh</button>
                    <button class="btn btn-outline-secondary rounded-pill" onclick="Dashboard.backupData()"><i class="fas fa-cloud-download-alt me-1"></i> Backup</button>
                </div>
            </div>
            <div class="stat-grid">
                <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-users"></i></div><div class="stat-value" id="adminTotalPeserta">0</div><div class="stat-label">Total Peserta</div></div>
                <div class="stat-card"><div class="stat-icon green"><i class="fas fa-clipboard-check"></i></div><div class="stat-value" id="adminTotalAbsensi">0</div><div class="stat-label">Total Absensi</div></div>
                <div class="stat-card"><div class="stat-icon orange"><i class="fas fa-calendar-day"></i></div><div class="stat-value" id="adminHadirHariIni">0</div><div class="stat-label">Hadir Hari Ini</div></div>
                <div class="stat-card"><div class="stat-icon purple"><i class="fas fa-file-medical-alt"></i></div><div class="stat-value" id="adminIzinHariIni">0</div><div class="stat-label">Izin Hari Ini</div></div>
            </div>
            <div class="card-modern p-0">
                <div class="card-header p-3 border-bottom"><h6><i class="fas fa-clock me-2" style="color:#0d6efd;"></i>Absensi Terbaru</h6></div>
                <div id="adminRecentAbsensi"></div>
            </div>
        `;

        const cached = getCache();
        if (cached) {
            const today = new Date().toISOString().split('T')[0];
            const totalPeserta = cached.peserta?.length || 0;
            const totalAbsensi = cached.absensi?.length || 0;
            const hadirHariIni = cached.absensi?.filter(a => a.Tanggal === today && a.Status === 'Hadir').length || 0;
            const izinHariIni = cached.izin?.filter(i => i.Tanggal === today).length || 0;

            safeSetText('adminTotalPeserta', totalPeserta);
            safeSetText('adminTotalAbsensi', totalAbsensi);
            safeSetText('adminHadirHariIni', hadirHariIni);
            safeSetText('adminIzinHariIni', izinHariIni);

            const table = document.getElementById('adminRecentAbsensi');
            if (table && cached.absensi?.length) {
                let rows = '';
                cached.absensi.slice(-6).reverse().forEach((a, i) => {
                    rows += `<tr><td>${i + 1}</td><td>${a.Tanggal}</td><td>${a.Jam}</td><td><code>${String(a.Kode).slice(-4)}</code></td><td>${a.Nama}</td><td>${a.Sesi_Nama}</td><td><span class="badge-status ${a.Status === 'Hadir' ? 'hadir' : 'tidak'}">${a.Status}</span></td></tr>`;
                });
                table.innerHTML = `<table class="table table-sm table-hover mb-0"><thead><tr><th>No</th><th>Tgl</th><th>Jam</th><th>Kode</th><th>Nama</th><th>Sesi</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`;
            } else if (table) {
                table.innerHTML = '<p class="text-center py-3 text-muted">Belum ada data absensi.</p>';
            }
        }
    }

    function renderPetugasDashboard(container) {
        if (!container) return;
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h4 class="fw-bold mb-0"><i class="fas fa-tachometer-alt me-2" style="color:#0d6efd;"></i>Dashboard Petugas</h4>
                <button class="btn btn-outline-primary rounded-pill" onclick="Dashboard.refreshData()"><i class="fas fa-sync-alt me-1"></i> Refresh</button>
            </div>
            <div class="stat-grid">
                <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-users"></i></div><div class="stat-value" id="petugasTotalPeserta">0</div><div class="stat-label">Total Peserta</div></div>
                <div class="stat-card"><div class="stat-icon green"><i class="fas fa-clipboard-check"></i></div><div class="stat-value" id="petugasHadirHariIni">0</div><div class="stat-label">Hadir Hari Ini</div></div>
                <div class="stat-card"><div class="stat-icon purple"><i class="fas fa-file-medical-alt"></i></div><div class="stat-value" id="petugasIzinHariIni">0</div><div class="stat-label">Izin Hari Ini</div></div>
                <div class="stat-card"><div class="stat-icon orange"><i class="fas fa-user-check"></i></div><div class="stat-value" id="petugasJumlahDampingan">0</div><div class="stat-label">Murid Dampingan</div></div>
            </div>
            <div class="card-modern p-0">
                <div class="card-header p-3 border-bottom"><h6><i class="fas fa-clock me-2" style="color:#0d6efd;"></i>Absensi Murid Dampingan Hari Ini</h6></div>
                <div id="petugasRecentAbsensi"></div>
            </div>
        `;
        const cached = getCache();
        if (cached) {
            const user = Auth.getCurrentUser();
            const petugasNama = user?.nama || '';
            const dampingan = cached.peserta?.filter(p => (p.Wali_Asuh_1 === petugasNama || p.Wali_Asuh_2 === petugasNama)) || [];
            const today = new Date().toISOString().split('T')[0];
            safeSetText('petugasTotalPeserta', cached.peserta?.length || 0);
            safeSetText('petugasHadirHariIni', cached.absensi?.filter(a => a.Tanggal === today && a.Status === 'Hadir').length || 0);
            safeSetText('petugasIzinHariIni', cached.izin?.filter(i => i.Tanggal === today).length || 0);
            safeSetText('petugasJumlahDampingan', dampingan.length);

            const table = document.getElementById('petugasRecentAbsensi');
            if (table) {
                const filtered = cached.absensi?.filter(a => dampingan.some(d => d.Kode === a.Kode)) || [];
                if (filtered.length) {
                    let rows = '';
                    filtered.slice(-6).reverse().forEach((a, i) => {
                        rows += `<tr><td>${i + 1}</td><td>${a.Jam}</td><td><code>${String(a.Kode).slice(-4)}</code></td><td>${a.Nama}</td><td>${a.Sesi_Nama}</td><td><span class="badge-status ${a.Status === 'Hadir' ? 'hadir' : 'tidak'}">${a.Status}</span></td></tr>`;
                    });
                    table.innerHTML = `<table class="table table-sm table-hover mb-0"><thead><tr><th>No</th><th>Jam</th><th>Kode</th><th>Nama</th><th>Sesi</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>`;
                } else {
                    table.innerHTML = '<p class="text-center py-3 text-muted">Belum ada absensi murid dampingan</p>';
                }
            }
        }
    }

    function renderHumasDashboard(container) {
        if (!container) return;
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h4 class="fw-bold mb-0"><i class="fas fa-tachometer-alt me-2" style="color:#0d6efd;"></i>Dashboard Humas</h4>
                <button class="btn btn-outline-primary rounded-pill" onclick="Dashboard.refreshData()"><i class="fas fa-sync-alt me-1"></i> Refresh</button>
            </div>
            <div class="stat-grid">
                <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-newspaper"></i></div><div class="stat-value" id="humasTotalBerita">0</div><div class="stat-label">Total Berita</div></div>
                <div class="stat-card"><div class="stat-icon green"><i class="fas fa-images"></i></div><div class="stat-value" id="humasTotalGaleri">0</div><div class="stat-label">Total Konten Galeri</div></div>
            </div>
            <div class="card-modern">
                <h6 class="fw-bold mb-3"><i class="fas fa-clock me-2" style="color:#0d6efd;"></i>Berita Terbaru</h6>
                <div id="humasRecentBerita"></div>
            </div>
        `;
        const cached = getCache();
        if (cached) {
            safeSetText('humasTotalBerita', cached.berita?.length || 0);
            safeSetText('humasTotalGaleri', cached.galeri?.length || 0);
            const containerBerita = document.getElementById('humasRecentBerita');
            if (containerBerita) {
                if (cached.berita?.length) {
                    let rows = '';
                    cached.berita.slice(0, 5).forEach(b => {
                        rows += `<div class="d-flex justify-content-between align-items-center border-bottom py-2"><span><strong>${b.Judul}</strong> <span class="badge ${b.Status === 'Publish' ? 'bg-success' : 'bg-secondary'}">${b.Status || 'Draft'}</span></span><small class="text-muted">${new Date(b.Tanggal).toLocaleDateString('id-ID')}</small></div>`;
                    });
                    containerBerita.innerHTML = rows;
                } else {
                    containerBerita.innerHTML = '<p class="text-center text-muted py-2">Belum ada berita.</p>';
                }
            }
        }
    }

    // ============================================================
    //  REFRESH & BACKUP (Manual)
    // ============================================================
    async function refreshData() {
        await preloadAllData(true);
        const mainContent = document.getElementById('mainContent');
        if (mainContent) {
            const user = Auth.getCurrentUser();
            if (user) {
                if (user.role === 'admin') renderAdminDashboard(mainContent);
                else if (user.role === 'petugas') renderPetugasDashboard(mainContent);
                else if (user.role === 'humas') renderHumasDashboard(mainContent);
            }
        }
        toast('Data dashboard diperbarui', 'success');
    }

    async function backupData() {
        if (!confirm('Ambil backup semua data? Proses ini mungkin memakan waktu beberapa detik.')) return;
        toast('Mengambil data...', 'info');
        const btn = document.querySelector('button[onclick*="backupData"]');
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Memproses...'; }
        try {
            const [peserta, absensi, jadwal, petugas, izin, wali, alumni] = await Promise.all([
                API.listPeserta(), API.listAbsensi('', '', 1, 1000), API.getJadwal(),
                API.listPetugas(), API.listIzin(), API.listWaliAsuh(), API.listAlumni()
            ]);
            const backup = {
                timestamp: new Date().toISOString(),
                peserta: peserta.data || [], absensi: absensi.data || [], jadwal: jadwal.data || [],
                petugas: petugas.data || [], izin: izin.data || [], waliAsuh: wali.data || [], alumni: alumni.data || []
            };
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `backup_srma19_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast('✅ Backup berhasil diunduh!', 'success');
        } catch (e) {
            toast('❌ Gagal backup: ' + e.message, 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-cloud-download-alt me-1"></i> Backup'; }
        }
    }

    // ============================================================
    //  EXPOSE KE GLOBAL
    // ============================================================
    window.Dashboard = {
        renderDashboard,
        refreshData,
        backupData,
        stopAutoRefresh
    };

    console.log('✅ Dashboard module loaded (v15.0.0 - Full Fix, Robust, Handle Partial Errors)');
})();