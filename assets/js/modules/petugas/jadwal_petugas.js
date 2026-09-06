// ============================================================
//  JADWAL_PETUGAS.JS – Jadwal Kegiatan (Khusus Role Petugas)
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
    let jadwalData = [];
    let jadwalFiltered = [];

    // ============================================================
    //  RENDER JADWAL PETUGAS (tanpa edit/hapus)
    // ============================================================
    function renderJadwalPetugas(container) {
        // Ambil data dari cache jika belum ada
        if (jadwalData.length === 0) {
            const cached = getCache();
            if (cached?.jadwal) {
                jadwalData = cached.jadwal.sort((a, b) => (parseInt(a.id) || 0) - (parseInt(b.id) || 0));
            }
        }
        jadwalFiltered = [...jadwalData];

        const agamaList = [...new Set(jadwalData.map(j => j.agama).filter(Boolean))].sort();

        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h4 class="fw-bold mb-0"><i class="fas fa-calendar-alt me-2" style="color:#0d6efd;"></i>Jadwal Kegiatan</h4>
                <button class="btn btn-sm btn-refresh rounded-pill" onclick="PetugasJadwal.refresh(false)"><i class="fas fa-sync-alt me-1"></i> Refresh</button>
            </div>
            <div class="card-modern mb-3">
                <div class="filter-group">
                    <label class="fw-bold me-2">Filter Agama:</label>
                    <select class="form-select form-select-sm" id="filterAgamaJadwalPetugas" onchange="PetugasJadwal.changeFilter(this.value)" style="width:150px;">
                        <option value="">Semua Agama</option>
                        ${agamaList.map(a => `<option value="${a}">${a}</option>`).join('')}
                    </select>
                    <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="PetugasJadwal.resetFilter()">Reset</button>
                </div>
            </div>
            <div id="jadwalSimpleContainer"></div>
        `;
        renderJadwalSimple();
    }

    // ============================================================
    //  RENDER JADWAL (gaya simple cards)
    // ============================================================
    function renderJadwalSimple() {
        const container = document.getElementById('jadwalSimpleContainer');
        if (!container) return;

        const filtered = jadwalFiltered;
        if (!filtered.length) {
            container.innerHTML = '<div class="text-center py-5 text-muted">Belum ada jadwal.</div>';
            return;
        }

        const sorted = [...filtered].sort((a, b) => a.mulai.localeCompare(b.mulai));

        const grouped = {};
        sorted.forEach(j => {
            if (!grouped[j.agama]) grouped[j.agama] = [];
            grouped[j.agama].push(j);
        });

        const badgeClass = {
            'Islam': 'badge-islam',
            'Kristen': 'badge-kristen',
            'Katolik': 'badge-katolik',
            'Hindu': 'badge-hindu',
            'Buddha': 'badge-buddha',
            'Penghayat': 'badge-penghayat'
        };

        let html = `<div class="schedule-container">`;
        for (const [agama, items] of Object.entries(grouped)) {
            html += `
                <div class="schedule-group" style="border-left-color: ${items[0].color || '#0d6efd'};">
                    <div class="schedule-group-title">
                        <i class="fas fa-users" style="color:${items[0].color || '#0d6efd'};"></i>
                        ${agama} <span class="badge bg-secondary rounded-pill ms-1">${items.length}</span>
                    </div>
                    ${items.map(j => `
                        <div class="schedule-item">
                            <span class="schedule-time">${j.mulai}</span>
                            <span class="schedule-name">${j.nama}</span>
                            <span class="schedule-duration">${j.mulai} - ${j.selesai}</span>
                            <span class="schedule-badge ${badgeClass[j.agama] || 'badge-islam'}">${j.agama}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        html += `</div>`;
        container.innerHTML = html;
    }

    // ============================================================
    //  FILTER & RESET
    // ============================================================
    function changeFilter(agama) {
        jadwalFiltered = agama ? jadwalData.filter(j => j.agama === agama) : jadwalData;
        renderJadwalSimple();
    }

    function resetFilter() {
        document.getElementById('filterAgamaJadwalPetugas').value = '';
        jadwalFiltered = jadwalData;
        renderJadwalSimple();
    }

    // ============================================================
    //  REFRESH DATA
    // ============================================================
    async function refresh(silent = false) {
        if (!silent) toast('Memperbarui jadwal...', 'info');
        try {
            const res = await API.getJadwal();
            if (res.status === 'success') {
                jadwalData = res.data.sort((a, b) => (parseInt(a.id) || 0) - (parseInt(b.id) || 0));
                jadwalFiltered = [...jadwalData];
                // Update cache
                const cached = getCache() || {};
                cached.jadwal = jadwalData;
                setCache(cached);
                renderJadwalSimple();
                if (!silent) toast('✅ Jadwal diperbarui.', 'success');
            } else {
                if (!silent) toast('❌ Gagal memuat jadwal.', 'error');
            }
        } catch (e) {
            if (!silent) toast('❌ Gagal terhubung ke server.', 'error');
        }
    }

    // Fungsi dummy edit/hapus (petugas tidak punya akses)
    function editJadwal(index) {
        toast('Anda tidak memiliki akses untuk mengedit jadwal.', 'warning');
    }

    function deleteJadwal(index) {
        toast('Anda tidak memiliki akses untuk menghapus jadwal.', 'warning');
    }

    // ============================================================
    //  EXPOSE KE GLOBAL
    // ============================================================
    window.PetugasJadwal = {
        renderJadwalPetugas,
        refresh,
        changeFilter,
        resetFilter,
        editJadwal,
        deleteJadwal
    };

    console.log('✅ Petugas Jadwal module loaded');
})();