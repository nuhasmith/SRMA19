// ============================================================
//  DASHBOARD_PETUGAS.JS – Dashboard untuk Role Petugas
//  SRMA 19 Bantul
//  Versi: 1.0.0 - SPA Ready
// ============================================================

(function() {
    'use strict';

    // Ambil fungsi bersama
    const { getCachedData: getCache, setCachedData: setCache, showToast: toast } = window.Common;
    const { getMuridDampingan } = window.PetugasCommon;

    // ============================================================
    //  RENDER DASHBOARD PETUGAS
    // ============================================================
    function renderDashboardPetugas(container) {
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h4 class="fw-bold mb-0"><i class="fas fa-tachometer-alt me-2" style="color:#0d6efd;"></i>Dashboard Petugas</h4>
                <button class="btn btn-outline-primary rounded-pill" onclick="PetugasDashboard.refresh()">
                    <i class="fas fa-sync-alt me-1"></i> Refresh
                </button>
            </div>
            <div class="stat-grid">
                <div class="stat-card">
                    <div class="stat-icon blue"><i class="fas fa-users"></i></div>
                    <div class="stat-value" id="petugasTotalPeserta">-</div>
                    <div class="stat-label">Total Peserta</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green"><i class="fas fa-clipboard-check"></i></div>
                    <div class="stat-value" id="petugasHadirHariIni">-</div>
                    <div class="stat-label">Hadir Hari Ini</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon purple"><i class="fas fa-file-medical-alt"></i></div>
                    <div class="stat-value" id="petugasIzinHariIni">-</div>
                    <div class="stat-label">Izin Hari Ini</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon orange"><i class="fas fa-user-check"></i></div>
                    <div class="stat-value" id="petugasJumlahDampingan">-</div>
                    <div class="stat-label">Murid Dampingan</div>
                </div>
            </div>
            <div class="card-modern p-0">
                <div class="card-header p-3 border-bottom">
                    <h6><i class="fas fa-clock me-2" style="color:#0d6efd;"></i>Absensi Murid Dampingan Hari Ini</h6>
                </div>
                <div id="petugasRecentAbsensi"></div>
            </div>
        `;
        loadDashboardStats(true);
    }

    // ============================================================
    //  REFRESH DATA
    // ============================================================
    async function refresh() {
        toast('Memperbarui data...', 'info');
        await loadDashboardStats(true);
        toast('Data dashboard diperbarui', 'success');
    }

    // ============================================================
    //  LOAD DATA STATISTIK
    // ============================================================
    async function loadDashboardStats(forceRefresh = false) {
        if (!forceRefresh) {
            const cached = getCache();
            if (cached) {
                updateStats(cached);
                updateTable(cached.absensi || []);
                return;
            }
        }
        try {
            const [pesertaRes, absensiRes, izinRes] = await Promise.all([
                API.listPeserta(),
                API.listAbsensi('', '', 1, 10),
                API.listIzin()
            ]);
            const data = {
                peserta: pesertaRes.status === 'success' ? pesertaRes.data : [],
                absensi: absensiRes.status === 'success' ? absensiRes.data : [],
                izin: izinRes.status === 'success' ? izinRes.data : []
            };
            setCache(data);
            updateStats(data);
            updateTable(data.absensi || []);
        } catch (e) {
            console.error('Gagal refresh dashboard petugas:', e);
        } finally {
            document.querySelectorAll('.skeleton').forEach(el => el.classList.remove('skeleton'));
        }
    }

    // ============================================================
    //  UPDATE STATISTIK
    // ============================================================
    function updateStats(data) {
        const user = Auth.getCurrentUser();
        const petugasNama = user.nama || '';
        const pesertaDampingan = getMuridDampingan(data.peserta, petugasNama);
        const jumlahDampingan = pesertaDampingan.length;

        const totalPeserta = data.peserta?.length || 0;
        const today = new Date().toISOString().split('T')[0];
        const hadirHariIni = data.absensi?.filter(a => a.Tanggal === today && a.Status === 'Hadir').length || 0;
        const izinHariIni = data.izin?.filter(i => i.Tanggal === today).length || 0;

        document.getElementById('petugasTotalPeserta').textContent = totalPeserta;
        document.getElementById('petugasHadirHariIni').textContent = hadirHariIni;
        document.getElementById('petugasIzinHariIni').textContent = izinHariIni;
        document.getElementById('petugasJumlahDampingan').textContent = jumlahDampingan;
    }

    // ============================================================
    //  UPDATE TABEL ABSENSI
    // ============================================================
    function updateTable(absensi) {
        const tbody = document.getElementById('petugasRecentAbsensi');
        if (!tbody) return;
        if (!absensi || absensi.length === 0) {
            tbody.innerHTML = '<p class="text-center py-3 text-muted">Belum ada data absensi</p>';
            return;
        }
        const user = Auth.getCurrentUser();
        const petugasNama = user.nama || '';
        const pesertaRes = getCache()?.peserta || [];
        const pesertaDampingan = getMuridDampingan(pesertaRes, petugasNama);
        const kodeSet = new Set(pesertaDampingan.map(p => String(p.Kode).trim()));
        const filteredAbsensi = absensi.filter(a => kodeSet.has(String(a.Kode).trim()));

        let rows = '';
        filteredAbsensi.slice(0, 6).forEach((a, i) => {
            const statusClass = a.Status === 'Hadir' ? 'hadir' : a.Status === 'Izin' ? 'izin' : a.Status === 'Sakit' ? 'sakit' : 'tidak';
            rows += `<tr>
                <td>${i+1}</td>
                <td>${a.Jam || '-'}</td>
                <td><code style="background:#f1f5f9;padding:2px 8px;border-radius:4px;">${(a.Kode||'').slice(-4)}</code></td>
                <td><strong>${a.Nama || '-'}</strong></td>
                <td class="small">${a.Sesi_Nama || '-'}</td>
                <td><span class="badge-status ${statusClass}">${a.Status || 'Hadir'}</span></td>
            </tr>`;
        });
        tbody.innerHTML = `<table class="table table-sm table-hover mb-0">
            <thead><tr><th>No</th><th>Jam</th><th>Kode</th><th>Nama</th><th>Sesi</th><th>Status</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
    }

    // ============================================================
    //  EXPOSE KE GLOBAL
    // ============================================================
    window.PetugasDashboard = {
        renderDashboardPetugas,
        refresh,
        loadDashboardStats,
        updateStats,
        updateTable
    };

    console.log('✅ Petugas Dashboard module loaded');
})();