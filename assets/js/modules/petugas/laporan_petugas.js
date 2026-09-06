// ============================================================
//  LAPORAN_PETUGAS.JS – Laporan Summary Siswa (Khusus Role Petugas)
//  SRMA 19 Bantul
//  Versi: 2.0.0 - SPA Ready
//  Fitur: Filter Tanggal, Status, Rombel; PDF Preview & Download
// ============================================================

(function() {
    'use strict';

    // ============================================================
    //  IMPORTS & HELPER
    // ============================================================
    const { getCachedData: getCache, setCachedData: setCache, showToast: toast } = window.Common;
    const { getMuridDampingan } = window.PetugasCommon || {};

    // ============================================================
    //  STATE
    // ============================================================
    let laporanPesertaData = [];
    let laporanAbsensiData = [];
    let laporanIzinData = [];
    let laporanJadwalData = [];
    let laporanSummaryData = [];
    let laporanFiltered = [];
    let laporanHtml = ''; // untuk preview PDF

    // ============================================================
    //  RENDER LAPORAN PETUGAS
    // ============================================================
    function renderLaporanPetugas(container) {
        const user = Auth.getCurrentUser();
        const petugasNama = user.nama || '';

        // Ambil data dari cache jika belum ada
        if (laporanPesertaData.length === 0) {
            const cached = getCache();
            if (cached?.peserta) {
                // Filter peserta berdasarkan dampingan jika fungsi tersedia
                if (typeof getMuridDampingan === 'function') {
                    const pesertaDampingan = getMuridDampingan(cached.peserta, petugasNama);
                    laporanPesertaData = pesertaDampingan.map(p => ({ ...p, Kode: String(p.Kode || '') }));
                } else {
                    laporanPesertaData = cached.peserta.map(p => ({ ...p, Kode: String(p.Kode || '') }));
                }
            } else {
                laporanPesertaData = [];
            }
            if (cached?.absensi) laporanAbsensiData = cached.absensi;
            if (cached?.izin) laporanIzinData = cached.izin;
            if (cached?.jadwal) laporanJadwalData = cached.jadwal;
        }

        const rombelList = [...new Set(laporanPesertaData.map(p => p.Rombel).filter(Boolean))];

        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h4 class="fw-bold mb-0"><i class="fas fa-chart-pie me-2" style="color:#0d6efd;"></i>Laporan Summary Siswa</h4>
                <div class="d-flex gap-2">
                    <button class="btn btn-sm btn-outline-primary rounded-pill" onclick="PetugasLaporan.load(); PetugasLaporan.applyFilter();">
                        <i class="fas fa-sync-alt me-1"></i> Refresh
                    </button>
                </div>
            </div>

            <!-- Filter Section -->
            <div class="card-modern mb-3">
                <div class="filter-group">
                    <label>Tanggal Mulai:</label>
                    <input type="date" class="form-control form-control-sm" id="tglMulaiLaporanPetugas" style="width:140px">
                    <label>Tanggal Selesai:</label>
                    <input type="date" class="form-control form-control-sm" id="tglSelesaiLaporanPetugas" style="width:140px">
                    <select class="form-select form-select-sm" id="filterStatusLaporanPetugas" style="width:120px">
                        <option value="">Semua Status</option>
                        <option>Hadir</option>
                        <option>Izin</option>
                        <option>Tidak Berangkat</option>
                        <option>Sakit</option>
                    </select>
                    <select class="form-select form-select-sm" id="filterRombelLaporanPetugas" style="width:130px">
                        <option value="">Semua Rombel</option>
                        ${rombelList.map(r => `<option>${r}</option>`).join('')}
                    </select>
                    <button class="btn btn-sm btn-primary rounded-pill" onclick="PetugasLaporan.applyFilter()"><i class="fas fa-search"></i> Tampilkan</button>
                    <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="PetugasLaporan.resetFilter()">Reset</button>
                    <button class="btn btn-sm btn-info rounded-pill" onclick="PetugasLaporan.previewPDF()"><i class="fas fa-eye"></i> Preview & Cetak PDF</button>
                </div>
            </div>

            <!-- Summary Cards -->
            <div class="summary-card" style="background:#fff;border-radius:12px;padding:16px;margin-bottom:15px;box-shadow:0 1px 3px rgba(0,0,0,0.05);display:flex;gap:20px;flex-wrap:wrap;">
                <div><strong>Total Siswa:</strong> <span id="totalSiswaLaporanPetugas">0</span></div>
                <div><strong>Total Hadir:</strong> <span id="totalHadirLaporanPetugas">0</span></div>
                <div><strong>Total Izin:</strong> <span id="totalIzinLaporanPetugas">0</span></div>
                <div><strong>Total Tidak Berangkat:</strong> <span id="totalTidakLaporanPetugas">0</span></div>
                <div><strong>Total Sakit:</strong> <span id="totalSakitLaporanPetugas">0</span></div>
            </div>

            <!-- Table Container -->
            <div class="card-modern p-0"><div id="laporanTableContainerPetugas"></div></div>
        `;

        // Jika belum ada data peserta, load dari server
        if (laporanPesertaData.length === 0) {
            load();
        }
    }

    // ============================================================
    //  LOAD DATA DARI SERVER
    // ============================================================
    async function load() {
        try {
            const user = Auth.getCurrentUser();
            const petugasNama = user.nama || '';

            const [p, a, i, j] = await Promise.all([
                API.listPeserta(),
                API.listAbsensi('', '', 1, 1000),
                API.listIzin(),
                API.getJadwal()
            ]);

            // Filter peserta berdasarkan dampingan jika fungsi tersedia
            if (p.status === 'success') {
                if (typeof getMuridDampingan === 'function' && petugasNama) {
                    const dampingan = getMuridDampingan(p.data, petugasNama);
                    laporanPesertaData = dampingan.map(ps => ({ ...ps, Kode: String(ps.Kode || '') }));
                } else {
                    laporanPesertaData = p.data.map(ps => ({ ...ps, Kode: String(ps.Kode || '') }));
                }
            } else {
                laporanPesertaData = [];
            }

            if (a.status === 'success') laporanAbsensiData = a.data;
            if (i.status === 'success') laporanIzinData = i.data;
            if (j.status === 'success') laporanJadwalData = j.data;

            // Simpan ke cache
            const cached = getCache() || {};
            cached.peserta = laporanPesertaData;
            cached.absensi = laporanAbsensiData;
            cached.izin = laporanIzinData;
            cached.jadwal = laporanJadwalData;
            setCache(cached);

            toast('Data laporan diperbarui', 'success');
        } catch (e) {
            toast('Gagal memuat data', 'error');
        }
    }

    // ============================================================
    //  BUILD SUMMARY & FILTER
    // ============================================================
    function applyFilter() {
        const tglMulai = document.getElementById('tglMulaiLaporanPetugas').value;
        const tglSelesai = document.getElementById('tglSelesaiLaporanPetugas').value;
        const status = document.getElementById('filterStatusLaporanPetugas')?.value || '';
        const rombel = document.getElementById('filterRombelLaporanPetugas')?.value || '';

        if (!tglMulai || !tglSelesai) {
            toast('Pilih rentang tanggal terlebih dahulu.', 'warning');
            return;
        }

        // Bangun summary
        const activePeserta = laporanPesertaData.filter(p => p.Keterangan === 'Aktif');
        const start = new Date(tglMulai);
        const end = new Date(tglSelesai);

        // Filter absensi berdasarkan rentang tanggal
        let filteredAbsensi = laporanAbsensiData.filter(a => {
            const d = new Date(a.Tanggal);
            return d >= start && d <= end;
        });

        // Kode peserta yang termasuk dampingan
        const kodeSet = new Set(activePeserta.map(p => String(p.Kode).trim()));
        filteredAbsensi = filteredAbsensi.filter(a => kodeSet.has(String(a.Kode).trim()));

        laporanSummaryData = activePeserta.map(p => {
            const kode = String(p.Kode);
            const absensiPeserta = filteredAbsensi.filter(a => String(a.Kode) === kode);
            const hadir = absensiPeserta.filter(a => a.Status === 'Hadir').length;
            const tidakBerangkat = absensiPeserta.filter(a => a.Status === 'Tidak Berangkat').length;
            const izinAbsensi = absensiPeserta.filter(a => a.Status === 'Izin').length;
            const izinManual = laporanIzinData.filter(iz => String(iz.Kode_Peserta) === kode).length;
            const totalIzin = izinAbsensi + izinManual;
            const sakit = absensiPeserta.filter(a => a.Status === 'Sakit').length;

            // Hitung total sesi berdasarkan jadwal agama
            let totalSesi = 0;
            if (tglMulai && tglSelesai) {
                const agama = p.Agama || 'Islam';
                const sesiAgama = laporanJadwalData.filter(j => j.agama === agama);
                const diffDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
                totalSesi = sesiAgama.length * diffDays;
            }
            const persenHadir = totalSesi > 0 ? Math.round((hadir / totalSesi) * 100) : 0;

            return {
                kode: kode,
                nama: p.Nama || '-',
                agama: p.Agama || '-',
                rombel: p.Rombel || '-',
                hadir: hadir,
                tidakBerangkat: tidakBerangkat,
                izin: totalIzin,
                sakit: sakit,
                totalSesi: totalSesi,
                persenHadir: persenHadir,
                waliAsuh1: p.Wali_Asuh_1 || '-',
                waliAsuh2: p.Wali_Asuh_2 || '-'
            };
        });

        // Filter berdasarkan status dan rombel
        laporanFiltered = laporanSummaryData.filter(s =>
            (!status || s.status === status) &&
            (!rombel || s.rombel === rombel)
        );

        renderSummary();
    }

    function resetFilter() {
        document.getElementById('tglMulaiLaporanPetugas').value = '';
        document.getElementById('tglSelesaiLaporanPetugas').value = '';
        document.getElementById('filterStatusLaporanPetugas').value = '';
        document.getElementById('filterRombelLaporanPetugas').value = '';
        laporanFiltered = [];
        renderSummary();
    }

    // ============================================================
    //  RENDER SUMMARY TABLE
    // ============================================================
    function renderSummary() {
        const totalHadir = laporanFiltered.reduce((sum, s) => sum + s.hadir, 0);
        const totalTidak = laporanFiltered.reduce((sum, s) => sum + s.tidakBerangkat, 0);
        const totalIzin = laporanFiltered.reduce((sum, s) => sum + s.izin, 0);
        const totalSakit = laporanFiltered.reduce((sum, s) => sum + s.sakit, 0);

        let rows = '';
        laporanFiltered.forEach((s, i) => {
            rows += `<tr>
                <td>${i+1}</td>
                <td><code>${s.kode.slice(-4)}</code></td>
                <td><strong>${s.nama}</strong></td>
                <td>${s.agama}</td>
                <td>${s.rombel}</td>
                <td><span class="badge-status hadir">${s.hadir}</span></td>
                <td><span class="badge-status izin">${s.izin}</span></td>
                <td><span class="badge-status tidak">${s.tidakBerangkat}</span></td>
                <td><span class="badge-status sakit">${s.sakit}</span></td>
                <td>${s.persenHadir}%</td>
                <td>${s.waliAsuh1}</td>
                <td>${s.waliAsuh2}</td>
            </tr>`;
        });

        if (laporanFiltered.length === 0) {
            rows = '<tr><td colspan="12" class="text-center py-3 text-muted">Tidak ada data untuk ditampilkan</td></tr>';
        }

        document.getElementById('laporanTableContainerPetugas').innerHTML = `
            <div class="table-responsive">
                <table class="table table-sm table-hover mb-0">
                    <thead class="table-light">
                        <tr>
                            <th>No</th><th>Kode</th><th>Nama</th><th>Agama</th><th>Rombel</th>
                            <th>Hadir</th><th>Izin</th><th>Tidak Berangkat</th><th>Sakit</th><th>% Hadir</th>
                            <th>Wali Asuh 1</th><th>Wali Asrama</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;

        // Update summary cards
        document.getElementById('totalSiswaLaporanPetugas').textContent = laporanFiltered.length;
        document.getElementById('totalHadirLaporanPetugas').textContent = totalHadir;
        document.getElementById('totalIzinLaporanPetugas').textContent = totalIzin;
        document.getElementById('totalTidakLaporanPetugas').textContent = totalTidak;
        document.getElementById('totalSakitLaporanPetugas').textContent = totalSakit;
    }

    // ============================================================
    //  PREVIEW & DOWNLOAD PDF
    // ============================================================
    function previewPDF() {
        if (laporanFiltered.length === 0) {
            toast('Tidak ada data untuk ditampilkan.', 'warning');
            return;
        }
        const tglMulai = document.getElementById('tglMulaiLaporanPetugas').value;
        const tglSelesai = document.getElementById('tglSelesaiLaporanPetugas').value;
        const now = new Date();
        const tanggalCetak = now.toLocaleDateString('id-ID', { year:'numeric', month:'long', day:'numeric' });

        laporanHtml = `
            <div style="font-family:Arial,sans-serif;padding:20px;">
                <div style="text-align:center;border-bottom:2px solid #0d6efd;padding-bottom:10px;margin-bottom:20px;">
                    <h2 style="margin:0;color:#0d6efd;">SRMA 19 BANTUL</h2>
                    <p style="margin:2px 0;font-size:12px;color:#475569;">Sentra Terpadu Prof. Dr. Soeharso, Sonosewu, Bantul</p>
                    <h4 style="margin:8px 0;">LAPORAN SUMMARY SISWA</h4>
                    <p style="font-size:12px;color:#6c757d;">Periode: ${tglMulai} s.d. ${tglSelesai} | Dicetak: ${tanggalCetak}</p>
                </div>
                <table border="1" cellpadding="5" style="width:100%;border-collapse:collapse;font-size:10px;">
                    <thead><tr>
                        <th>No</th><th>Kode</th><th>Nama</th><th>Agama</th><th>Rombel</th>
                        <th>Hadir</th><th>Izin</th><th>Tidak</th><th>Sakit</th><th>% Hadir</th>
                        <th>Wali 1</th><th>Wali Asrama</th>
                    </tr></thead>
                    <tbody>
                        ${laporanFiltered.map((s, i) => `
                            <tr>
                                <td>${i+1}</td>
                                <td>${s.kode.slice(-4)}</td>
                                <td>${s.nama}</td>
                                <td>${s.agama}</td>
                                <td>${s.rombel}</td>
                                <td>${s.hadir}</td>
                                <td>${s.izin}</td>
                                <td>${s.tidakBerangkat}</td>
                                <td>${s.sakit}</td>
                                <td>${s.persenHadir}%</td>
                                <td>${s.waliAsuh1}</td>
                                <td>${s.waliAsuh2}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div style="margin-top:20px;font-size:10px;color:#6c757d;text-align:center;">
                    Total Siswa: ${laporanFiltered.length} | Total Hadir: ${laporanFiltered.reduce((s, x) => s + x.hadir, 0)} | 
                    Total Izin: ${laporanFiltered.reduce((s, x) => s + x.izin, 0)} | 
                    Total Tidak Berangkat: ${laporanFiltered.reduce((s, x) => s + x.tidakBerangkat, 0)} | 
                    Total Sakit: ${laporanFiltered.reduce((s, x) => s + x.sakit, 0)}
                </div>
            </div>`;

        // Tampilkan preview modal
        const previewHtml = `
            <div class="preview-modal show" id="laporanPreviewModalPetugas">
                <div class="preview-content">
                    <div class="preview-header">
                        <h4>👁️ Preview Laporan Summary</h4>
                        <div class="preview-actions">
                            <button class="btn btn-sm btn-success" onclick="PetugasLaporan.downloadPDF()"><i class="fas fa-download me-1"></i> Download PDF</button>
                            <button class="btn btn-sm btn-secondary" onclick="PetugasLaporan.closePreview()"><i class="fas fa-times"></i> Tutup</button>
                        </div>
                    </div>
                    <div id="previewBodyLaporanPetugas">${laporanHtml}</div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', previewHtml);
    }

    function closePreview() {
        const modal = document.getElementById('laporanPreviewModalPetugas');
        if (modal) modal.remove();
        laporanHtml = '';
    }

    async function downloadPDF() {
        if (!laporanHtml) {
            toast('Tidak ada data preview.', 'error');
            return;
        }
        const tglMulai = document.getElementById('tglMulaiLaporanPetugas').value;
        const tglSelesai = document.getElementById('tglSelesaiLaporanPetugas').value;
        const filename = `laporan_summary_${tglMulai}_${tglSelesai}.pdf`;

        const element = document.createElement('div');
        element.innerHTML = laporanHtml;
        document.body.appendChild(element);

        try {
            await html2pdf().set({
                filename: filename,
                margin: 10,
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
            }).from(element).save();
            toast('✅ Laporan berhasil diunduh.', 'success');
            closePreview();
        } catch (e) {
            toast('❌ Gagal mengunduh: ' + e.message, 'error');
        } finally {
            document.body.removeChild(element);
        }
    }

    // ============================================================
    //  EXPOSE KE GLOBAL
    // ============================================================
    window.PetugasLaporan = {
        renderLaporanPetugas,
        load,
        applyFilter,
        resetFilter,
        previewPDF,
        downloadPDF,
        closePreview
    };

    console.log('✅ Petugas Laporan module loaded');
})();