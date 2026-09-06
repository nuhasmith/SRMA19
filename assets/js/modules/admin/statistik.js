// ============================================================
//  STATISTIK.JS – Statistik Kunjungan Website
//  SRMA 19 Bantul
//  Versi: 1.0.0 - SPA Ready
//  Fungsi: Menampilkan total kunjungan dan tabel harian
// ============================================================

(function() {
    'use strict';

    // Ambil fungsi bersama
    const { showToast: toast } = window.Common;

    // ============================================================
    //  RENDER STATISTIK
    // ============================================================
    function renderStatistik(container) {
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h4 class="fw-bold mb-0"><i class="fas fa-chart-bar me-2" style="color:#0d6efd;"></i>Statistik Kunjungan Website</h4>
                <div class="d-flex gap-2 flex-wrap">
                    <button class="btn btn-outline-primary rounded-pill" onclick="Statistik.refreshStats()">
                        <i class="fas fa-sync-alt me-1"></i> Refresh
                    </button>
                    <button class="btn btn-outline-danger rounded-pill" onclick="Statistik.resetStats()">
                        <i class="fas fa-trash-alt me-1"></i> Reset Data
                    </button>
                </div>
            </div>
            <div class="row g-3 mb-3">
                <div class="col-md-6 col-lg-4">
                    <div class="card shadow-sm border-0 bg-white p-4 text-center rounded-4">
                        <div class="display-4 fw-bold text-primary" id="totalHits">-</div>
                        <div class="text-muted small text-uppercase fw-semibold mt-2">Total Kunjungan</div>
                    </div>
                </div>
            </div>
            <div class="card-modern p-0">
                <div class="card-header p-3 bg-light border-bottom">
                    <h6 class="fw-bold mb-0"><i class="fas fa-calendar-day me-2"></i>Kunjungan Harian</h6>
                </div>
                <div class="table-responsive">
                    <table class="table table-sm table-hover mb-0">
                        <thead class="table-light">
                            <tr><th>Tanggal</th><th class="text-end">Hits</th><th class="text-end">IP Unik</th></tr>
                        </thead>
                        <tbody id="dailyHitsTableBody">
                            <tr><td colspan="3" class="text-center py-3 text-muted">Memuat data...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        loadStatsData();
    }

    // ============================================================
    //  LOAD DATA STATISTIK
    // ============================================================
    async function loadStatsData() {
        try {
            const res = await API.getHits();
            if (res.status === 'success') {
                document.getElementById('totalHits').textContent = res.total || 0;
                const tbody = document.getElementById('dailyHitsTableBody');
                if (res.daily && res.daily.length > 0) {
                    let rows = '';
                    res.daily.forEach(d => {
                        rows += `<tr><td>${d.tanggal}</td><td class="text-end fw-bold">${d.hits}</td><td class="text-end text-muted">${d.ips || 0}</td></tr>`;
                    });
                    tbody.innerHTML = rows;
                } else {
                    tbody.innerHTML = '<tr><td colspan="3" class="text-center py-3 text-muted">Belum ada data kunjungan.</td></tr>';
                }
            } else {
                toast('Gagal memuat statistik', 'error');
            }
        } catch (e) {
            toast('Gagal terhubung ke server', 'error');
        }
    }

    // ============================================================
    //  REFRESH STATISTIK
    // ============================================================
    async function refreshStats() {
        toast('Memperbarui statistik...', 'info');
        await loadStatsData();
        toast('Statistik diperbarui', 'success');
    }

    // ============================================================
    //  RESET STATISTIK (dengan konfirmasi)
    // ============================================================
    async function resetStats() {
        if (!confirm('⚠️ Yakin ingin menghapus semua data kunjungan? Tindakan ini tidak bisa dibatalkan.')) return;
        const btn = document.querySelector('button[onclick*="resetStats"]');
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Meriset...'; }
        try {
            const res = await API.resetHits();
            if (res.status === 'success') {
                toast(res.message || 'Data kunjungan direset.', 'success');
                await loadStatsData();
            } else {
                toast(res.message || 'Gagal mereset statistik.', 'error');
            }
        } catch (e) {
            toast('Gagal terhubung ke server.', 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-trash-alt me-1"></i> Reset Data'; }
        }
    }

    // ============================================================
    //  EXPOSE KE GLOBAL
    // ============================================================
    window.Statistik = {
        renderStatistik,
        loadStatsData,
        refreshStats,
        resetStats
    };

    console.log('✅ Statistik module loaded');
})();