// ============================================================
//  DASHBOARD_HUMAS.JS – Dashboard untuk Role Humas
//  SRMA 19 Bantul
//  Versi: 1.0.0 - SPA Ready
// ============================================================

(function() {
    'use strict';

    // Ambil fungsi bersama
    const { getCachedData: getCache, setCachedData: setCache, showToast: toast } = window.Common;

    // ============================================================
    //  STATE
    // ============================================================
    let beritaData = [];
    let galeriData = [];

    // ============================================================
    //  RENDER DASHBOARD HUMAS
    // ============================================================
    function renderDashboardHumas(container) {
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h4 class="fw-bold mb-0"><i class="fas fa-tachometer-alt me-2" style="color:#0d6efd;"></i>Dashboard Humas</h4>
                <button class="btn btn-outline-primary rounded-pill" onclick="HumasDashboard.refresh()">
                    <i class="fas fa-sync-alt me-1"></i> Refresh
                </button>
            </div>
            <div class="stat-grid">
                <div class="stat-card">
                    <div class="stat-icon blue"><i class="fas fa-newspaper"></i></div>
                    <div class="stat-value" id="humasTotalBerita">-</div>
                    <div class="stat-label">Total Berita</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green"><i class="fas fa-images"></i></div>
                    <div class="stat-value" id="humasTotalGaleri">-</div>
                    <div class="stat-label">Total Konten Galeri</div>
                </div>
            </div>
            <div class="card-modern">
                <h6 class="fw-bold mb-3"><i class="fas fa-clock me-2" style="color:#0d6efd;"></i>Berita Terbaru</h6>
                <div id="humasRecentBerita"></div>
            </div>
        `;
        loadDashboardStats(true);
    }

    // ============================================================
    //  LOAD DATA STATISTIK
    // ============================================================
    async function loadDashboardStats(forceRefresh = false) {
        if (!forceRefresh) {
            const cached = getCache();
            if (cached && cached.berita && cached.galeri) {
                updateStats(cached);
                updateRecentBerita(cached.berita || []);
                return;
            }
        }
        try {
            const [beritaRes, galeriRes] = await Promise.all([
                API.listBerita(),
                API.listGaleri()
            ]);
            const data = {
                berita: beritaRes.status === 'success' ? beritaRes.data : [],
                galeri: galeriRes.status === 'success' ? galeriRes.data : []
            };
            setCache(data);
            updateStats(data);
            updateRecentBerita(data.berita || []);
        } catch (e) {
            console.error('Gagal refresh dashboard humas:', e);
        } finally {
            document.querySelectorAll('.skeleton').forEach(el => el.classList.remove('skeleton'));
        }
    }

    // ============================================================
    //  UPDATE STATISTIK
    // ============================================================
    function updateStats(data) {
        document.getElementById('humasTotalBerita').textContent = data.berita?.length || 0;
        document.getElementById('humasTotalGaleri').textContent = data.galeri?.length || 0;
    }

    // ============================================================
    //  UPDATE BERITA TERBARU
    // ============================================================
    function updateRecentBerita(berita) {
        const container = document.getElementById('humasRecentBerita');
        if (!container) return;
        if (!berita || berita.length === 0) {
            container.innerHTML = '<p class="text-center text-muted py-2">Belum ada berita.</p>';
            return;
        }
        let rows = '';
        berita.slice(0, 5).forEach(b => {
            const statusClass = b.Status === 'Publish' ? 'badge-success' : b.Status === 'Scheduled' ? 'badge-warning' : 'badge-secondary';
            rows += `<div class="d-flex justify-content-between align-items-center border-bottom py-2">
                <span><strong>${b.Judul}</strong> <span class="badge ${statusClass}">${b.Status || 'Draft'}</span></span>
                <small class="text-muted">${new Date(b.Tanggal).toLocaleDateString('id-ID')}</small>
            </div>`;
        });
        container.innerHTML = rows;
    }

    // ============================================================
    //  REFRESH DASHBOARD
    // ============================================================
    async function refresh() {
        toast('Memperbarui data...', 'info');
        localStorage.removeItem('srma19_data');
        await loadDashboardStats(true);
        toast('Data dashboard diperbarui', 'success');
    }

    // ============================================================
    //  EXPOSE KE GLOBAL
    // ============================================================
    window.HumasDashboard = {
        renderDashboardHumas,
        refresh,
        loadDashboardStats,
        updateStats,
        updateRecentBerita
    };

    console.log('✅ Humas Dashboard module loaded');
})();