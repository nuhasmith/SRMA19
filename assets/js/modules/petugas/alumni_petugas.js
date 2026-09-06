// ============================================================
//  ALUMNI_PETUGAS.JS – Data Alumni (Khusus Role Petugas)
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
    let alumniData = [];
    let alumniFiltered = [];

    // ============================================================
    //  RENDER DATA ALUMNI (Petugas)
    // ============================================================
    function renderAlumniPetugas(container) {
        // Ambil data dari cache jika belum ada
        if (alumniData.length === 0) {
            const cached = getCache();
            if (cached?.alumni) {
                alumniData = cached.alumni;
                alumniFiltered = [...alumniData];
            }
        }

        const angkatanList = [...new Set(alumniData.map(a => a.Angkatan).filter(Boolean))];

        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h4 class="fw-bold mb-0"><i class="fas fa-graduation-cap me-2" style="color:#0d6efd;"></i>Data Alumni <span class="badge bg-secondary rounded-pill">${alumniData.length}</span></h4>
                <div class="d-flex gap-2 flex-wrap">
                    <button class="btn btn-sm btn-danger rounded-pill" onclick="PetugasAlumni.exportPDF()"><i class="fas fa-file-pdf me-1"></i> PDF</button>
                    <button class="btn btn-sm btn-success rounded-pill" onclick="PetugasAlumni.exportCSV()"><i class="fas fa-download me-1"></i> CSV</button>
                    <button class="btn btn-sm btn-refresh rounded-pill" onclick="PetugasAlumni.refresh(false)"><i class="fas fa-sync-alt me-1"></i> Refresh</button>
                </div>
            </div>

            <div class="card-modern mb-3">
                <div class="filter-group">
                    <input type="text" class="form-control form-control-sm" id="searchAlumniPetugas" placeholder="🔍 Cari..." style="width:150px" oninput="PetugasAlumni.applyFilter()">
                    <select class="form-select form-select-sm" id="filterAngkatanAlumniPetugas" style="width:130px" onchange="PetugasAlumni.applyFilter()">
                        <option value="">Semua Angkatan</option>
                        ${angkatanList.map(a => `<option>${a}</option>`).join('')}
                    </select>
                    <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="PetugasAlumni.resetFilter()">Reset</button>
                    <span class="small text-muted ms-2" id="infoCountAlumniPetugas">Menampilkan ${alumniFiltered.length} dari ${alumniData.length} entri</span>
                </div>
            </div>

            <div class="card-modern p-0"><div id="alumniTableContainerPetugas"></div></div>
        `;

        applyFilter();
    }

    // ============================================================
    //  REFRESH DATA
    // ============================================================
    async function refresh(silent = false) {
        if (!silent) toast('Memperbarui data alumni...', 'info');
        try {
            const res = await API.listAlumni();
            if (res.status === 'success') {
                alumniData = res.data;
                alumniFiltered = [...alumniData];
                const cached = getCache() || {};
                cached.alumni = alumniData;
                setCache(cached);
                applyFilter();
                if (!silent) toast(`✅ Data alumni diperbarui (${alumniData.length} entri)`, 'success');
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
        const q = (document.getElementById('searchAlumniPetugas')?.value || '').toLowerCase().trim();
        const angkatan = document.getElementById('filterAngkatanAlumniPetugas')?.value || '';

        alumniFiltered = alumniData.filter(a =>
            (!q || (a.Nama||'').toLowerCase().includes(q) || (a.Kode||'').toLowerCase().includes(q)) &&
            (!angkatan || (a.Angkatan||'') === angkatan)
        );
        renderTable();
        const info = document.getElementById('infoCountAlumniPetugas');
        if (info) info.textContent = `Menampilkan ${alumniFiltered.length} dari ${alumniData.length} entri`;
    }

    function resetFilter() {
        document.getElementById('searchAlumniPetugas').value = '';
        document.getElementById('filterAngkatanAlumniPetugas').value = '';
        applyFilter();
    }

    // ============================================================
    //  RENDER TABLE
    // ============================================================
    function renderTable() {
        let rows = '';
        alumniFiltered.forEach((a, i) => {
            rows += `<tr>
                <td>${i+1}</td>
                <td><code>${String(a.Kode||'').slice(-4)}</code></td>
                <td><strong>${a.Nama||'-'}</strong></td>
                <td>${a.Jenis_Kelamin||a.jk||'-'}</td>
                <td>${a.Agama||'-'}</td>
                <td>${a.Asal||'-'}</td>
                <td>${a.Rombel||'-'}</td>
                <td>${a.Angkatan||'-'}</td>
                <td>${a.Tanggal_Lulus||'-'}</td>
            </tr>`;
        });
        if (!rows) rows = '<tr><td colspan="9" class="text-center py-3 text-muted">Tidak ada data alumni</td></tr>';

        document.getElementById('alumniTableContainerPetugas').innerHTML = `
            <div class="table-responsive">
                <table class="table table-sm table-hover mb-0">
                    <thead class="table-light">
                        <tr><th style="width:30px;">No</th><th>Kode</th><th>Nama</th><th>JK</th><th>Agama</th><th>Asal</th><th>Rombel</th><th>Angkatan</th><th>Tanggal Lulus</th></tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
    }

    // ============================================================
    //  EXPORT PDF
    // ============================================================
    function exportPDF() {
        if (!alumniFiltered.length) { toast('Tidak ada data.', 'warning'); return; }
        const now = new Date();
        const tanggalCetak = now.toLocaleDateString('id-ID', { year:'numeric', month:'long', day:'numeric' });
        const html = `
            <div style="text-align:center;margin-bottom:20px;">
                <h3>SEKOLAH RAKYAT MENENGAH ATAS 19 BANTUL</h3>
                <p>Sentra Terpadu Prof. Dr. Soeharso, Sonosewu</p>
                <hr><h4>DAFTAR ALUMNI</h4>
                <p>Dicetak: ${tanggalCetak}</p>
            </div>
            <table border="1" cellpadding="5" style="width:100%;border-collapse:collapse;font-size:10px;">
                <thead><tr><th>No</th><th>Kode</th><th>Nama</th><th>JK</th><th>Agama</th><th>Asal</th><th>Rombel</th><th>Angkatan</th><th>Tanggal Lulus</th></tr></thead>
                <tbody>${alumniFiltered.map((a, i) => `<tr><td>${i+1}</td><td>${a.Kode}</td><td>${a.Nama}</td><td>${a.Jenis_Kelamin||a.jk||''}</td><td>${a.Agama||''}</td><td>${a.Asal||''}</td><td>${a.Rombel||''}</td><td>${a.Angkatan||''}</td><td>${a.Tanggal_Lulus||''}</td></tr>`).join('')}</tbody>
            </table>`;
        html2pdf().set({
            filename: `alumni_${now.toISOString().slice(0,10)}.pdf`,
            margin: 10,
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        }).from(html).save();
    }

    // ============================================================
    //  EXPORT CSV
    // ============================================================
    function exportCSV() {
        if (!alumniFiltered.length) { toast('Tidak ada data.', 'warning'); return; }
        const rows = [['Kode','Nama','JK','Agama','Asal','Rombel','Angkatan','Tanggal Lulus']];
        alumniFiltered.forEach(a => rows.push([String(a.Kode||''), a.Nama||'', a.Jenis_Kelamin||a.jk||'', a.Agama||'', a.Asal||'', a.Rombel||'', a.Angkatan||'', a.Tanggal_Lulus||'']));
        const csv = rows.map(r=>r.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `alumni_${new Date().toISOString().slice(0,10)}.csv`; a.click();
        toast('✅ CSV berhasil diunduh.', 'success');
    }

    // ============================================================
    //  EXPOSE KE GLOBAL
    // ============================================================
    window.PetugasAlumni = {
        renderAlumniPetugas,
        refresh,
        applyFilter,
        resetFilter,
        exportPDF,
        exportCSV
    };

    console.log('✅ Petugas Alumni module loaded');
})();