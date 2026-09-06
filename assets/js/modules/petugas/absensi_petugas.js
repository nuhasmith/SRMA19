// ============================================================
//  ABSENSI_PETUGAS.JS – Data Absensi untuk Role Petugas
//  SRMA 19 Bantul
//  Versi: 1.0.0 - SPA Ready
// ============================================================

(function() {
    'use strict';

    // Ambil fungsi bersama
    const { getCachedData: getCache, setCachedData: setCache, showToast: toast } = window.Common;
    const { getMuridDampingan, filterAbsensiByDampingan } = window.PetugasCommon;

    // ============================================================
    //  STATE
    // ============================================================
    let absensiData = [];
    let absensiFiltered = [];
    let selectedTimestamps = new Set();
    let currentPage = 1;
    let totalEntries = 0;
    const pageSize = 100;

    // ============================================================
    //  RENDER ABSENSI PETUGAS
    // ============================================================
    function renderAbsensiPetugas(container) {
        const user = Auth.getCurrentUser();
        const petugasNama = user.nama || '';

        // Ambil data dari cache jika belum ada
        if (absensiData.length === 0) {
            const cached = getCache();
            if (cached?.peserta && cached?.absensi) {
                const pesertaDampingan = getMuridDampingan(cached.peserta, petugasNama);
                absensiData = filterAbsensiByDampingan(cached.absensi, pesertaDampingan);
                totalEntries = absensiData.length;
            }
        }
        absensiFiltered = [...absensiData];

        const sesiList = [...new Set(absensiData.map(a => a.Sesi_Nama).filter(Boolean))];
        const filterId = 'collapseFilterAbsensiPetugas';

        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h4 class="fw-bold mb-0"><i class="fas fa-clipboard-list me-2" style="color:#0d6efd;"></i>Data Absensi <span class="badge bg-secondary rounded-pill">${totalEntries}</span></h4>
                <div class="d-flex gap-2 flex-wrap">
                    <button class="btn btn-sm btn-danger rounded-pill" onclick="PetugasAbsensi.exportPDF()"><i class="fas fa-file-pdf"></i> PDF</button>
                    <button class="btn btn-sm btn-success rounded-pill" onclick="PetugasAbsensi.exportCSV()"><i class="fas fa-download"></i> CSV</button>
                    <button class="btn btn-sm btn-refresh rounded-pill" onclick="PetugasAbsensi.refresh(false)"><i class="fas fa-sync-alt me-1"></i> Refresh</button>
                </div>
            </div>
            <div class="card-modern mb-3">
                <div class="d-flex justify-content-between align-items-center" style="cursor:pointer;" data-bs-toggle="collapse" data-bs-target="#${filterId}" aria-expanded="true">
                    <span class="fw-bold"><i class="fas fa-filter me-2"></i>Filter</span>
                    <i class="fas fa-chevron-down collapse-toggle" id="icon${filterId}"></i>
                </div>
                <div class="collapse show" id="${filterId}">
                    <div class="filter-group pt-2">
                        <input type="text" class="form-control form-control-sm" id="searchAbsensiPetugas" placeholder="🔍 Cari..." style="width:150px" oninput="PetugasAbsensi.applyFilter()">
                        <input type="date" class="form-control form-control-sm" id="fTglAbsensiPetugas" style="width:140px" onchange="PetugasAbsensi.applyFilter()">
                        <select class="form-select form-select-sm" id="fSesiAbsensiPetugas" style="width:150px" onchange="PetugasAbsensi.applyFilter()">
                            <option value="">Semua Sesi</option>
                            ${sesiList.map(s => `<option>${s}</option>`).join('')}
                        </select>
                        <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="PetugasAbsensi.resetFilter()">Reset</button>
                        <span class="small text-muted ms-2" id="lastUpdate"></span>
                    </div>
                </div>
            </div>
            <div class="card-modern p-0"><div id="absensiTableContainerPetugas"></div></div>
            <div id="paginationContainerPetugas"></div>
        `;

        applyFilter();
        document.getElementById('lastUpdate').textContent = `Terakhir: ${new Date().toLocaleTimeString()}`;
    }

    // ============================================================
    //  REFRESH DATA
    // ============================================================
    async function refresh(silent = false) {
        if (!silent) toast('Memperbarui data absensi...', 'info');
        const tgl = document.getElementById('fTglAbsensiPetugas')?.value || '';
        const sesi = document.getElementById('fSesiAbsensiPetugas')?.value || '';
        try {
            const res = await API.listAbsensi(tgl, sesi, currentPage, pageSize);
            if (res.status === 'success') {
                const user = Auth.getCurrentUser();
                const petugasNama = user.nama || '';
                const pesertaRes = await API.listPeserta();
                const pesertaDampingan = getMuridDampingan(pesertaRes.data || [], petugasNama);
                absensiData = filterAbsensiByDampingan(res.data, pesertaDampingan);
                totalEntries = absensiData.length;
                const cached = getCache() || {};
                cached.absensi = absensiData;
                cached.totalAbsensi = totalEntries;
                setCache(cached);
                applyFilter();
                if (!silent) toast(`✅ Data diperbarui (${absensiData.length} entri)`, 'success');
            } else {
                if (!silent) toast('❌ Gagal memuat data: ' + (res.message || 'Unknown error'), 'error');
            }
        } catch (e) {
            if (!silent) toast('❌ Gagal terhubung ke server.', 'error');
        }
    }

    // ============================================================
    //  FILTER
    // ============================================================
    function applyFilter(silent = false) {
        const q = (document.getElementById('searchAbsensiPetugas')?.value || '').toLowerCase().trim();
        const t = document.getElementById('fTglAbsensiPetugas')?.value || '';
        const s = document.getElementById('fSesiAbsensiPetugas')?.value || '';

        absensiFiltered = absensiData.filter(a => {
            if (q && !(a.Nama||'').toLowerCase().includes(q) && !(a.Kode||'').toLowerCase().includes(q) && !(a.Petugas||'').toLowerCase().includes(q)) return false;
            if (t && a.Tanggal !== t) return false;
            if (s && a.Sesi_Nama !== s) return false;
            return true;
        });

        for (const ts of selectedTimestamps) {
            if (!absensiFiltered.some(a => a.Timestamp === ts)) selectedTimestamps.delete(ts);
        }
        renderTable();
        renderPagination();
        if (!silent) {
            const info = document.getElementById('infoCountAbsensiPetugas');
            if (info) info.textContent = `Menampilkan ${absensiFiltered.length} dari ${totalEntries} entri`;
        }
    }

    function resetFilter() {
        document.getElementById('searchAbsensiPetugas').value = '';
        document.getElementById('fTglAbsensiPetugas').value = '';
        document.getElementById('fSesiAbsensiPetugas').value = '';
        currentPage = 1;
        applyFilter();
    }

    // ============================================================
    //  PAGINATION
    // ============================================================
    async function changePage(page) {
        currentPage = page;
        const container = document.getElementById('absensiTableContainerPetugas');
        if (container) container.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary"></div></div>';
        await refresh(true);
    }

    // ============================================================
    //  RENDER TABLE
    // ============================================================
    function renderTable() {
        const allChecked = absensiFiltered.length > 0 && absensiFiltered.every(a => selectedTimestamps.has(a.Timestamp));
        let rows = '';
        absensiFiltered.forEach(a => {
            const statusClass = a.Status === 'Hadir' ? 'hadir' : a.Status === 'Izin' ? 'izin' : a.Status === 'Sakit' ? 'sakit' : 'tidak';
            rows += `<tr>
                <td><input type="checkbox" ${selectedTimestamps.has(a.Timestamp) ? 'checked' : ''} onchange="PetugasAbsensi.toggleSelect('${a.Timestamp}', this.checked)"></td>
                <td>${a.Tanggal || '-'}</td>
                <td>${a.Jam || '-'}</td>
                <td><code>${(a.Kode || '').slice(-4)}</code></td>
                <td><strong>${a.Nama || '-'}</strong></td>
                <td class="small">${a.Sesi_Nama || '-'}</td>
                <td><span class="badge-status ${statusClass}">${a.Status || 'Hadir'}</span></td>
                <td class="small">${a.Petugas || '-'}</td>
            </tr>`;
        });
        if (!rows) rows = '<tr><td colspan="8" class="text-center py-3 text-muted">Tidak ada data absensi</td></tr>';

        const container = document.getElementById('absensiTableContainerPetugas');
        if (!container) return;
        container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-sm table-hover mb-0">
                    <thead class="table-light">
                        <tr>
                            <th style="width:30px;"><input type="checkbox" ${allChecked?'checked':''} onchange="PetugasAbsensi.toggleSelectAll(this.checked)"></th>
                            <th>Tgl</th><th>Jam</th><th>Kode</th><th>Nama</th><th>Sesi</th><th>Status</th><th>Petugas</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
    }

    // ============================================================
    //  PAGINATION UI
    // ============================================================
    function renderPagination() {
        const totalPages = Math.ceil(totalEntries / pageSize) || 1;
        const container = document.getElementById('paginationContainerPetugas');
        if (!container) return;
        let html = `
            <div class="d-flex justify-content-between align-items-center mt-3">
                <small class="text-muted" id="infoCountAbsensiPetugas">Menampilkan ${absensiFiltered.length} dari ${totalEntries} entri</small>
                <div>`;
        if (currentPage > 1) html += `<button class="btn btn-sm btn-outline-primary" onclick="PetugasAbsensi.changePage(${currentPage - 1})">← Sebelumnya</button> `;
        if (currentPage < totalPages) html += `<button class="btn btn-sm btn-outline-primary" onclick="PetugasAbsensi.changePage(${currentPage + 1})">Berikutnya →</button>`;
        html += `</div></div>`;
        container.innerHTML = html;
    }

    // ============================================================
    //  SELECTION
    // ============================================================
    function toggleSelectAll(checked) {
        if (checked) absensiFiltered.forEach(a => selectedTimestamps.add(a.Timestamp));
        else selectedTimestamps.clear();
        renderTable();
    }

    function toggleSelect(ts, checked) {
        if (checked) selectedTimestamps.add(ts);
        else selectedTimestamps.delete(ts);
        renderTable();
    }

    // ============================================================
    //  EXPORT PDF & CSV
    // ============================================================
    function exportPDF() {
        if (!absensiFiltered.length) { toast('Tidak ada data.', 'warning'); return; }
        const tgl = document.getElementById('fTglAbsensiPetugas')?.value || 'Semua';
        const sesi = document.getElementById('fSesiAbsensiPetugas')?.value || 'Semua';
        const now = new Date();
        const tanggalCetak = now.toLocaleDateString('id-ID', { year:'numeric', month:'long', day:'numeric' });
        const html = `
            <div style="text-align:center;margin-bottom:20px;">
                <h3>SEKOLAH RAKYAT MENENGAH ATAS 19 BANTUL</h3>
                <p>Sentra Terpadu Prof. Dr. Soeharso, Sonosewu</p>
                <hr><h4>LAPORAN ABSENSI</h4>
                <p>Filter: ${tgl} | Sesi: ${sesi}</p>
                <p>Dicetak: ${tanggalCetak}</p>
            </div>
            <table border="1" cellpadding="5" style="width:100%;border-collapse:collapse;font-size:11px;">
                <thead><tr><th>No</th><th>Tgl</th><th>Jam</th><th>Kode</th><th>Nama</th><th>Sesi</th><th>Status</th><th>Petugas</th></tr></thead>
                <tbody>${absensiFiltered.map((a, i) => `<tr><td>${i+1}</td><td>${a.Tanggal}</td><td>${a.Jam}</td><td>${(a.Kode||'').slice(-4)}</td><td>${a.Nama}</td><td>${a.Sesi_Nama}</td><td>${a.Status}</td><td>${a.Petugas}</td></tr>`).join('')}</tbody>
            </table>`;
        html2pdf().set({
            filename: `Laporan_Absensi_${tgl}_${now.toISOString().slice(0,10)}.pdf`,
            margin: 10,
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        }).from(html).save();
    }

    function exportCSV() {
        if (!absensiFiltered.length) { toast('Tidak ada data.', 'warning'); return; }
        const rows = [['"Tanggal"','"Jam"','"Kode"','"Nama"','"Sesi"','"Status"','"Petugas"']];
        absensiFiltered.forEach(a => rows.push([`"${a.Tanggal}"`,`"${a.Jam}"`,`"${a.Kode}"`,`"${a.Nama}"`,`"${a.Sesi_Nama}"`,`"${a.Status}"`,`"${a.Petugas}"`]));
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `absensi_${new Date().toISOString().slice(0,10)}.csv`; a.click();
        toast('✅ CSV berhasil diunduh.', 'success');
    }

    // ============================================================
    //  EXPOSE KE GLOBAL
    // ============================================================
    window.PetugasAbsensi = {
        renderAbsensiPetugas,
        refresh,
        applyFilter,
        resetFilter,
        changePage,
        toggleSelectAll,
        toggleSelect,
        exportPDF,
        exportCSV
    };

    console.log('✅ Petugas Absensi module loaded');
})();