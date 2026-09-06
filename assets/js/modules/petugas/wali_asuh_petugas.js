// ============================================================
//  WALI_ASUH_PETUGAS.JS – Wali Asuh (Khusus Role Petugas)
//  SRMA 19 Bantul
//  Versi: 1.0.0 - SPA Ready
// ============================================================

(function() {
    'use strict';

    // Ambil fungsi bersama
    const { getCachedData: getCache, setCachedData: setCache, showToast: toast, closeModal } = window.Common;

    // ============================================================
    //  STATE
    // ============================================================
    let waliData = [];
    let waliFiltered = [];
    let selectedWaliIds = new Set();

    // ============================================================
    //  RENDER WALI ASUH (Petugas)
    // ============================================================
    function renderWaliAsuhPetugas(container) {
        // Ambil data dari cache jika belum ada
        if (waliData.length === 0) {
            const cached = getCache();
            if (cached?.waliAsuh) {
                waliData = cached.waliAsuh;
                waliFiltered = [...waliData];
            }
        }

        const statusOptions = ['Aktif', 'Nonaktif'];
        const tipeOptions = ['Wali Asuh', 'Wali Asrama'];

        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h4 class="fw-bold mb-0"><i class="fas fa-users-cog me-2" style="color:#0d6efd;"></i>Wali Asuh <span class="badge bg-secondary rounded-pill">${waliData.length}</span></h4>
                <div class="d-flex gap-2 flex-wrap">
                    <button class="btn btn-sm btn-outline-primary rounded-pill" onclick="PetugasWaliAsuh.syncCount()"><i class="fas fa-sync-alt me-1"></i> Sync Count</button>
                    <button class="btn btn-sm btn-danger rounded-pill" onclick="PetugasWaliAsuh.exportPDF()"><i class="fas fa-file-pdf me-1"></i> PDF</button>
                    <button class="btn btn-sm btn-success rounded-pill" onclick="PetugasWaliAsuh.exportCSV()"><i class="fas fa-download me-1"></i> CSV</button>
                    <button class="btn btn-sm btn-refresh rounded-pill" onclick="PetugasWaliAsuh.refresh(false)"><i class="fas fa-sync-alt me-1"></i> Refresh</button>
                </div>
            </div>

            <div class="card-modern mb-3">
                <div class="filter-group">
                    <input type="text" class="form-control form-control-sm" id="searchWaliPetugas" placeholder="🔍 Cari..." style="width:150px" oninput="PetugasWaliAsuh.applyFilter()">
                    <select class="form-select form-select-sm" id="filterStatusWaliPetugas" style="width:120px" onchange="PetugasWaliAsuh.applyFilter()">
                        <option value="">Semua Status</option>
                        ${statusOptions.map(s => `<option>${s}</option>`).join('')}
                    </select>
                    <select class="form-select form-select-sm" id="filterTipeWaliPetugas" style="width:120px" onchange="PetugasWaliAsuh.applyFilter()">
                        <option value="">Semua Tipe</option>
                        ${tipeOptions.map(t => `<option>${t}</option>`).join('')}
                    </select>
                    <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="PetugasWaliAsuh.resetFilter()">Reset</button>
                    <span class="small text-muted ms-2" id="infoCountWaliPetugas">Menampilkan ${waliFiltered.length} dari ${waliData.length} entri</span>
                </div>
            </div>

            <div class="card-modern p-0"><div id="waliTableContainerPetugas"></div></div>
        `;

        applyFilter();
    }

    // ============================================================
    //  REFRESH DATA
    // ============================================================
    async function refresh(silent = false) {
        if (!silent) toast('Memperbarui data wali asuh...', 'info');
        try {
            const res = await API.listWaliAsuh();
            if (res.status === 'success') {
                waliData = res.data;
                waliFiltered = [...waliData];
                const cached = getCache() || {};
                cached.waliAsuh = waliData;
                setCache(cached);
                applyFilter();
                if (!silent) toast(`✅ Data wali asuh diperbarui (${waliData.length} entri)`, 'success');
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
    function applyFilter() {
        const q = (document.getElementById('searchWaliPetugas')?.value || '').toLowerCase().trim();
        const status = document.getElementById('filterStatusWaliPetugas')?.value || '';
        const tipe = document.getElementById('filterTipeWaliPetugas')?.value || '';

        waliFiltered = waliData.filter(w =>
            (!q || (w.Nama||'').toLowerCase().includes(q) || (w.Nomor_HP||'').toLowerCase().includes(q) || (w.Alamat||'').toLowerCase().includes(q)) &&
            (!status || (w.Status||'Aktif') === status) &&
            (!tipe || (w.Tipe||'Wali Asuh') === tipe)
        );
        for (const id of selectedWaliIds) {
            if (!waliFiltered.some(w => String(w.ID) === id)) selectedWaliIds.delete(id);
        }
        renderTable();
        const info = document.getElementById('infoCountWaliPetugas');
        if (info) info.textContent = `Menampilkan ${waliFiltered.length} dari ${waliData.length} entri`;
    }

    function resetFilter() {
        document.getElementById('searchWaliPetugas').value = '';
        document.getElementById('filterStatusWaliPetugas').value = '';
        document.getElementById('filterTipeWaliPetugas').value = '';
        applyFilter();
    }

    // ============================================================
    //  RENDER TABLE
    // ============================================================
    function renderTable() {
        let rows = '';
        waliFiltered.forEach((w, i) => {
            const realIdx = waliData.indexOf(w);
            const statusBadge = (w.Status||'Aktif') === 'Aktif' ? 'bg-success' : 'bg-secondary';
            const tipeBadge = (w.Tipe||'Wali Asuh') === 'Wali Asrama' ?
                '<span class="badge bg-warning text-dark">Wali Asrama</span>' :
                '<span class="badge bg-info text-white">Wali Asuh</span>';
            rows += `<tr>
                <td>${i+1}</td>
                <td><strong>${w.Nama||'-'}</strong></td>
                <td>${w.Nomor_HP||'-'}</td>
                <td>${w.Alamat||'-'}</td>
                <td><span class="badge badge-count" style="background:#8b5cf6;color:#fff;border-radius:50px;padding:2px 10px;font-size:0.75rem;">${w.Jumlah_Murid_Asuh||0}</span></td>
                <td>${tipeBadge}</td>
                <td><span class="badge ${statusBadge}">${w.Status||'Aktif'}</span></td>
                <td>${w.Keterangan||'-'}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary p-1" onclick="PetugasWaliAsuh.showModal(${realIdx})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-danger p-1" onclick="PetugasWaliAsuh.hapus(${realIdx})"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>`;
        });
        if (!rows) rows = '<tr><td colspan="9" class="text-center py-3 text-muted">Tidak ada data wali asuh</td></tr>';

        document.getElementById('waliTableContainerPetugas').innerHTML = `
            <div class="table-responsive">
                <table class="table table-sm table-hover mb-0">
                    <thead class="table-light">
                        <tr><th>No</th><th>Nama</th><th>Nomor HP</th><th>Alamat</th><th>Jumlah Murid</th><th>Tipe</th><th>Status</th><th>Keterangan</th><th class="text-center">Aksi</th></tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
    }

    // ============================================================
    //  CRUD MODAL
    // ============================================================
    function showModal(index = null) {
        const existing = index !== null && index >= 0 ? waliData[index] : null;
        const title = existing ? '✏️ Edit Wali Asuh' : '➕ Tambah Wali Asuh';
        const tipeOptions = ['Wali Asuh', 'Wali Asrama'];
        const modalHtml = `
            <div class="modal-overlay" id="waliModalPetugas">
                <div class="modal-box">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="fw-bold mb-0">${title}</h5>
                        <button class="btn-close" onclick="Common.closeModal()"></button>
                    </div>
                    <div class="mb-3"><label>Nama Wali Asuh <span class="text-danger">*</span></label><input class="form-control" id="wmNamaPetugas" value="${existing?.Nama||''}" placeholder="Nama lengkap"></div>
                    <div class="mb-3"><label>Nomor HP</label><input class="form-control" id="wmNomorHPPetugas" value="${existing?.Nomor_HP||''}" placeholder="08xxxx"></div>
                    <div class="mb-3"><label>Alamat</label><input class="form-control" id="wmAlamatPetugas" value="${existing?.Alamat||''}" placeholder="Alamat lengkap"></div>
                    <div class="mb-3"><label>Jumlah Murid Asuh (Otomatis)</label><input type="number" class="form-control" id="wmJumlahPetugas" value="${existing?.Jumlah_Murid_Asuh||0}" readonly disabled style="background:#f8f9fa;"><small class="text-muted">Terhitung otomatis dari data peserta.</small></div>
                    <div class="mb-3"><label>Tipe</label><select class="form-select" id="wmTipePetugas">${tipeOptions.map(t => `<option value="${t}" ${(existing?.Tipe||'Wali Asuh')===t?'selected':''}>${t}</option>`).join('')}</select></div>
                    <div class="mb-3"><label>Status</label><select class="form-select" id="wmStatusPetugas"><option value="Aktif" ${(existing?.Status||'Aktif')==='Aktif'?'selected':''}>Aktif</option><option value="Nonaktif" ${existing?.Status==='Nonaktif'?'selected':''}>Nonaktif</option></select></div>
                    <div class="mb-3"><label>Keterangan</label><textarea class="form-control" id="wmKeteranganPetugas" rows="2" placeholder="Catatan tambahan">${existing?.Keterangan||''}</textarea></div>
                    <div class="d-flex gap-2 justify-content-end mt-3">
                        <button class="btn btn-secondary" onclick="Common.closeModal()">Batal</button>
                        <button class="btn btn-primary" onclick="PetugasWaliAsuh.save(${index})"><i class="fas fa-save me-1"></i> Simpan</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // ============================================================
    //  SAVE (ADD / UPDATE)
    // ============================================================
    async function save(index) {
        const nama = document.getElementById('wmNamaPetugas').value.trim();
        if (!nama) { toast('Nama wali asuh wajib diisi.', 'error'); return; }
        const data = {
            nama: nama,
            nomor_hp: document.getElementById('wmNomorHPPetugas').value.trim(),
            alamat: document.getElementById('wmAlamatPetugas').value.trim(),
            jumlah_murid: parseInt(document.getElementById('wmJumlahPetugas').value) || 0,
            tipe: document.getElementById('wmTipePetugas').value,
            status: document.getElementById('wmStatusPetugas').value,
            keterangan: document.getElementById('wmKeteranganPetugas').value.trim()
        };
        if (index !== null && index >= 0) data.id = waliData[index].ID;
        const btn = document.querySelector('#waliModalPetugas .btn-primary');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Menyimpan...';
        try {
            let res;
            if (index !== null && index >= 0) {
                res = await API.updateWaliAsuh(data);
            } else {
                res = await API.addWaliAsuh(data);
            }
            if (res.status === 'ok') {
                Common.closeModal();
                await refresh(true);
                toast(res.message, 'success');
            } else {
                toast(res.message, 'error');
            }
        } catch (e) {
            toast('Gagal menyimpan data.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save me-1"></i> Simpan';
        }
    }

    // ============================================================
    //  DELETE
    // ============================================================
    async function hapus(index) {
        const w = waliData[index];
        if (!w) return;
        if (!confirm(`Hapus wali asuh ${w.Nama}?`)) return;
        const res = await API.deleteWaliAsuh(w.ID);
        if (res.status === 'ok') {
            await refresh(true);
            toast('✅ Wali asuh dihapus.', 'success');
        } else {
            toast(res.message, 'error');
        }
    }

    // ============================================================
    //  SYNC COUNT
    // ============================================================
    async function syncCount() {
        if (!confirm('Sinkronkan jumlah murid dari data peserta?')) return;
        toast('🔄 Menghitung ulang jumlah murid...', 'info');
        try {
            const res = await API.syncWaliCount();
            if (res.status === 'ok') {
                await refresh(true);
                toast(`✅ ${res.message}`, 'success');
            } else {
                toast(res.message, 'error');
            }
        } catch (e) {
            toast('❌ Gagal sync.', 'error');
        }
    }

    // ============================================================
    //  EXPORT PDF & CSV
    // ============================================================
    function exportPDF() {
        if (!waliFiltered.length) { toast('Tidak ada data.', 'warning'); return; }
        const now = new Date();
        const tanggalCetak = now.toLocaleDateString('id-ID', { year:'numeric', month:'long', day:'numeric' });
        const html = `
            <div style="text-align:center;margin-bottom:20px;">
                <h3>SEKOLAH RAKYAT MENENGAH ATAS 19 BANTUL</h3>
                <p>Sentra Terpadu Prof. Dr. Soeharso, Sonosewu</p>
                <hr><h4>DATA WALI ASUH</h4>
                <p>Dicetak: ${tanggalCetak}</p>
            </div>
            <table border="1" cellpadding="5" style="width:100%;border-collapse:collapse;font-size:10px;">
                <thead><tr><th>No</th><th>Nama</th><th>Nomor HP</th><th>Alamat</th><th>Jumlah Murid</th><th>Tipe</th><th>Status</th><th>Keterangan</th></tr></thead>
                <tbody>${waliFiltered.map((w, i) => `<tr><td>${i+1}</td><td>${w.Nama||'-'}</td><td>${w.Nomor_HP||'-'}</td><td>${w.Alamat||'-'}</td><td>${w.Jumlah_Murid_Asuh||0}</td><td>${w.Tipe||'Wali Asuh'}</td><td>${w.Status||'Aktif'}</td><td>${w.Keterangan||'-'}</td></tr>`).join('')}</tbody>
            </table>`;
        html2pdf().set({
            filename: `wali_asuh_${now.toISOString().slice(0,10)}.pdf`,
            margin: 10,
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        }).from(html).save();
    }

    function exportCSV() {
        if (!waliFiltered.length) { toast('Tidak ada data.', 'warning'); return; }
        const rows = [['Nama','Nomor HP','Alamat','Jumlah Murid','Tipe','Status','Keterangan']];
        waliFiltered.forEach(w => rows.push([w.Nama||'', w.Nomor_HP||'', w.Alamat||'', w.Jumlah_Murid_Asuh||0, w.Tipe||'Wali Asuh', w.Status||'Aktif', w.Keterangan||'']));
        const csv = rows.map(r=>r.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `wali_asuh_${new Date().toISOString().slice(0,10)}.csv`; a.click();
        toast('✅ CSV berhasil diunduh.', 'success');
    }

    // ============================================================
    //  EXPOSE KE GLOBAL
    // ============================================================
    window.PetugasWaliAsuh = {
        renderWaliAsuhPetugas,
        refresh,
        applyFilter,
        resetFilter,
        showModal,
        save,
        hapus,
        syncCount,
        exportPDF,
        exportCSV
    };

    console.log('✅ Petugas Wali Asuh module loaded');
})();