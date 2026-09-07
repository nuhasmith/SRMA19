// ============================================================
//  JADWAL_PETUGAS.JS – Jadwal Kegiatan (Khusus Role Petugas)
//  SRMA 19 Bantul
//  Versi: 2.0.0 - Full Fix, Tanpa Konflik dengan Admin, Robust
// ============================================================

(function() {
    'use strict';

    // Ambil fungsi bersama
    const { getCachedData: getCache, setCachedData: setCache, showToast: toast } = window.Common;

    // ============================================================
    //  STATE (Hanya untuk Petugas)
    // ============================================================
    let jadwalData = [];
    let jadwalFiltered = [];
    let filterAgama = '';

    // ============================================================
    //  SAFE DOM HELPERS
    // ============================================================
    function getEl(id) { return document.getElementById(id); }

    function setHTML(id, html) {
        const el = getEl(id);
        if (el) el.innerHTML = html;
        else console.warn('Elemen tidak ditemukan:', id);
    }

    // ============================================================
    //  RENDER JADWAL PETUGAS (TANPA EDIT/DELETE)
    // ============================================================
    function renderJadwalPetugas(container) {
        if (!container) return;

        // Ambil data dari cache jika belum ada
        if (jadwalData.length === 0) {
            const cached = getCache();
            if (cached?.jadwal) {
                jadwalData = cached.jadwal.sort((a, b) => (parseInt(a.id) || 0) - (parseInt(b.id) || 0));
            } else {
                // Jika belum ada di cache, fetch dari server
                refresh(true);
                return;
            }
        }

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
                        ${agamaList.map(a => `<option value="${a}" ${filterAgama === a ? 'selected' : ''}>${a}</option>`).join('')}
                    </select>
                    <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="PetugasJadwal.resetFilter()">Reset</button>
                </div>
            </div>
            <div id="jadwalSimpleContainer"></div>
        `;

        // Render list jadwal (simple cards)
        renderJadwalSimple();
    }

    // ============================================================
    //  RENDER JADWAL SIMPLE (Gaya cards)
    // ============================================================
    function renderJadwalSimple() {
        const container = getEl('jadwalSimpleContainer');
        if (!container) return;

        const filtered = filterAgama ? jadwalData.filter(j => j.agama === filterAgama) : jadwalData;
        if (!filtered.length) {
            container.innerHTML = '<div class="text-center py-5 text-muted">Tidak ada jadwal.</div>';
            return;
        }

        // Kelompokkan berdasarkan agama
        const grouped = {};
        filtered.forEach(j => {
            const agama = j.agama || 'Lainnya';
            if (!grouped[agama]) grouped[agama] = [];
            grouped[agama].push(j);
        });

        const badgeClass = {
            'Islam': 'badge-islam',
            'Kristen': 'badge-kristen',
            'Katolik': 'badge-katolik',
            'Hindu': 'badge-hindu',
            'Buddha': 'badge-buddha',
            'Penghayat': 'badge-penghayat'
        };

        let html = '<div class="schedule-container">';
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
        html += '</div>';
        container.innerHTML = html;
    }

    // ============================================================
    //  FILTER & RESET
    // ============================================================
    function changeFilter(agama) {
        filterAgama = agama;
        renderJadwalSimple();
    }

    function resetFilter() {
        const select = getEl('filterAgamaJadwalPetugas');
        if (select) select.value = '';
        filterAgama = '';
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

    // ============================================================
    //  EXPOSE KE GLOBAL (Hanya PetugasJadwal, TIDAK menimpa Jadwal)
    // ============================================================
    window.PetugasJadwal = {
        renderJadwalPetugas,
        refresh,
        changeFilter,
        resetFilter
    };

    console.log('✅ Petugas Jadwal module loaded (v2.0.0 - Full Fix, No Conflict)');
})();