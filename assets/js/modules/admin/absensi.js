// ============================================================
//  ABSENSI.JS – Data Absensi + Input Manual (Admin & Petugas) - FULL FIX
//  SRMA 19 Bantul
//  Versi: 2.0.0 - Fix Non-String Values, Anti Error, Robust
// ============================================================

(function() {
    'use strict';

    // Ambil fungsi bersama
    const { getCachedData: getCache, setCachedData: setCache, showToast: toast, closeModal } = window.Common;
    const { getMuridDampingan, filterAbsensiByDampingan } = window.PetugasCommon || {};

    // ============================================================
    //  STATE
    // ============================================================
    let absensiData = [];
    let absensiFiltered = [];
    let selectedTimestamps = new Set();
    let currentPage = 1;
    let totalEntries = 0;
    const pageSize = 100;

    // Untuk input manual
    let jadwalData = [];
    let pesertaData = [];
    let sesiList = [];

    // ============================================================
    //  HELPER FUNCTIONS (Safe String)
    // ============================================================
    function safeStr(val, fallback = '') {
        return (val === null || val === undefined) ? fallback : String(val);
    }

    function safeLowerCase(val) {
        return safeStr(val).toLowerCase();
    }

    function safeSlice(val, start, end) {
        return safeStr(val).slice(start, end);
    }

    // ============================================================
    //  RENDER ABSENSI
    // ============================================================
    function renderAbsensi(container) {
        const user = Auth.getCurrentUser();
        const isPetugas = user?.role === 'petugas';
        const petugasNama = user?.nama || '';

        // Ambil data dari cache jika belum ada
        if (absensiData.length === 0) {
            const cached = getCache();
            if (cached?.absensi) {
                absensiData = cached.absensi;
                totalEntries = cached.totalAbsensi || absensiData.length;
            }
            if (cached?.peserta) {
                pesertaData = cached.peserta;
            }
            if (cached?.jadwal) {
                jadwalData = cached.jadwal;
                sesiList = [...new Set(jadwalData.map(j => safeStr(j.nama)).filter(Boolean))];
            }
        }

        // Jika Petugas, filter data berdasarkan murid dampingan
        if (isPetugas && absensiData.length > 0) {
            const dampingan = getMuridDampingan(pesertaData, petugasNama);
            absensiData = filterAbsensiByDampingan(absensiData, dampingan);
            totalEntries = absensiData.length;
        }

        absensiFiltered = [...absensiData];

        const sesiFilterList = [...new Set(absensiData.map(a => safeStr(a.Sesi_Nama)).filter(Boolean))];

        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h4 class="fw-bold mb-0"><i class="fas fa-clipboard-list me-2" style="color:#0d6efd;"></i>Data Absensi <span class="badge bg-secondary rounded-pill">${totalEntries}</span></h4>
                <div class="d-flex gap-2 flex-wrap">
                    ${!isPetugas ? `
                        <button class="btn btn-sm btn-success rounded-pill" onclick="Absensi.showInputModal()">
                            <i class="fas fa-edit me-1"></i> Tambah Manual
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-danger rounded-pill" onclick="Absensi.exportPDF()"><i class="fas fa-file-pdf"></i> PDF</button>
                    <button class="btn btn-sm btn-success rounded-pill" onclick="Absensi.exportCSV()"><i class="fas fa-download"></i> CSV</button>
                    ${!isPetugas ? `
                        <button class="btn btn-sm btn-warning rounded-pill" onclick="Absensi.generateAbsence()"><i class="fas fa-robot"></i> Generate</button>
                        <button class="btn btn-sm btn-outline-danger rounded-pill" id="btnDeleteAbsensi" onclick="Absensi.deleteSelected()" disabled><i class="fas fa-trash-alt me-1"></i> Hapus (<span id="absensiSelectedCount">0</span>)</button>
                    ` : ''}
                    <button class="btn btn-sm btn-refresh rounded-pill" onclick="Absensi.refresh(false)"><i class="fas fa-sync-alt me-1"></i> Refresh</button>
                </div>
            </div>
            <div class="card-modern mb-3">
                <div class="filter-group">
                    <input type="text" class="form-control form-control-sm" id="searchAbsensi" placeholder="🔍 Cari..." style="width:150px" oninput="Absensi.applyFilter()">
                    <input type="date" class="form-control form-control-sm" id="fTglAbsensi" style="width:140px" onchange="Absensi.applyFilter()">
                    <select class="form-select form-select-sm" id="fSesiAbsensi" style="width:150px" onchange="Absensi.applyFilter()">
                        <option value="">Semua Sesi</option>
                        ${sesiFilterList.map(s => `<option>${s}</option>`).join('')}
                    </select>
                    <select class="form-select form-select-sm" id="fModeAbsensi" style="width:140px" onchange="Absensi.applyFilter()">
                        <option value="">Semua Mode</option>
                        <option value="absen">Absensi</option>
                        <option value="hp">Peminjaman HP</option>
                        <option value="pelanggaran">Pelanggaran</option>
                    </select>
                    <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="Absensi.resetFilter()">Reset</button>
                    <span class="small text-muted ms-2" id="lastUpdateAbsensi"></span>
                </div>
            </div>
            <div class="card-modern p-0"><div id="absensiTableContainer"></div></div>
            <div id="paginationContainerAbsensi"></div>
        `;

        applyFilter();
        updateDeleteButton();
        const lastUpdateEl = document.getElementById('lastUpdateAbsensi');
        if (lastUpdateEl) lastUpdateEl.textContent = `Terakhir: ${new Date().toLocaleTimeString()}`;
    }

    // ============================================================
    //  REFRESH DATA
    // ============================================================
    async function refresh(silent = false) {
        if (!silent) toast('Memperbarui data absensi...', 'info');
        const tgl = document.getElementById('fTglAbsensi')?.value || '';
        const sesi = document.getElementById('fSesiAbsensi')?.value || '';
        try {
            const res = await API.listAbsensi(tgl, sesi, currentPage, pageSize);
            if (res.status === 'success') {
                absensiData = res.data;
                totalEntries = res.total;
                const cached = getCache() || {};
                cached.absensi = absensiData;
                cached.totalAbsensi = totalEntries;
                setCache(cached);
                applyFilter(true);
                if (!silent) toast(`✅ Data diperbarui (${absensiData.length} entri)`, 'success');
            } else {
                if (!silent) toast('❌ Gagal memuat data: ' + (res.message || 'Unknown error'), 'error');
            }
        } catch (e) {
            if (!silent) toast('❌ Gagal terhubung ke server.', 'error');
        }
    }

    // ============================================================
    //  FILTER (Dengan Safe String)
    // ============================================================
    function applyFilter(silent = false) {
        const q = (document.getElementById('searchAbsensi')?.value || '').toLowerCase().trim();
        const t = document.getElementById('fTglAbsensi')?.value || '';
        const s = document.getElementById('fSesiAbsensi')?.value || '';
        const mode = document.getElementById('fModeAbsensi')?.value || '';

        absensiFiltered = absensiData.filter(a => {
            if (q && !safeLowerCase(a.Nama).includes(q) && !safeLowerCase(a.Kode).includes(q) && !safeLowerCase(a.Petugas).includes(q)) return false;
            if (t && safeStr(a.Tanggal) !== t) return false;
            if (s && safeStr(a.Sesi_Nama) !== s) return false;
            if (mode === 'absen' && !['Hadir', 'Izin', 'Sakit', 'Tidak Berangkat'].includes(safeStr(a.Status))) return false;
            if (mode === 'hp' && !safeStr(a.Status).startsWith('HP: ')) return false;
            if (mode === 'pelanggaran' && safeStr(a.Status) !== 'Pelanggaran') return false;
            return true;
        });

        for (const ts of selectedTimestamps) {
            if (!absensiFiltered.some(a => safeStr(a.Timestamp) === ts)) selectedTimestamps.delete(ts);
        }
        renderTable();
        renderPagination();
        updateDeleteButton();
        if (!silent) {
            const info = document.getElementById('infoCountAbsensi');
            if (info) info.textContent = `Menampilkan ${absensiFiltered.length} dari ${totalEntries} entri`;
        }
    }

    function resetFilter() {
        const searchInput = document.getElementById('searchAbsensi');
        const dateInput = document.getElementById('fTglAbsensi');
        const sesiSelect = document.getElementById('fSesiAbsensi');
        const modeSelect = document.getElementById('fModeAbsensi');
        if (searchInput) searchInput.value = '';
        if (dateInput) dateInput.value = '';
        if (sesiSelect) sesiSelect.value = '';
        if (modeSelect) modeSelect.value = '';
        currentPage = 1;
        applyFilter();
    }

    // ============================================================
    //  PAGINATION
    // ============================================================
    async function changePage(page) {
        currentPage = page;
        const container = document.getElementById('absensiTableContainer');
        if (container) container.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary"></div></div>';
        await refresh(true);
    }

    // ============================================================
    //  RENDER TABLE (FULL FIX: String() wrapper)
    // ============================================================
    function renderTable() {
        const allChecked = absensiFiltered.length > 0 && absensiFiltered.every(a => selectedTimestamps.has(safeStr(a.Timestamp)));
        let rows = '';
        absensiFiltered.forEach(a => {
            let statusDisplay = '';
            let statusClass = '';
            const st = safeStr(a.Status);
            if (st.startsWith('HP: ')) {
                statusClass = 'bg-info text-white';
                statusDisplay = st;
            } else if (st === 'Pelanggaran') {
                statusClass = 'bg-danger text-white';
                statusDisplay = `Pelanggaran: ${safeStr(a.Pelanggaran, '-')}`;
            } else {
                statusClass = st === 'Hadir' ? 'hadir' : st === 'Izin' ? 'izin' : st === 'Sakit' ? 'sakit' : 'tidak';
                statusDisplay = safeStr(a.Status, 'Hadir');
            }

            rows += `<tr>
                <td><input type="checkbox" ${selectedTimestamps.has(safeStr(a.Timestamp)) ? 'checked' : ''} onchange="Absensi.toggleSelect('${safeStr(a.Timestamp)}', this.checked)"></td>
                <td>${safeStr(a.Tanggal, '-')}</td>
                <td>${safeStr(a.Jam, '-')}</td>
                <td><code>${safeSlice(a.Kode, -4)}</code></td>
                <td><strong>${safeStr(a.Nama, '-')}</strong></td>
                <td class="small">${safeStr(a.Sesi_Nama, '-')}</td>
                <td><span class="badge-status ${statusClass}">${statusDisplay}</span></td>
                <td class="small">${safeStr(a.Petugas, '-')}</td>
            </tr>`;
        });
        if (!rows) rows = '<tr><td colspan="8" class="text-center py-3 text-muted">Tidak ada data absensi</td></tr>';

        const container = document.getElementById('absensiTableContainer');
        if (!container) return;
        container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-sm table-hover mb-0">
                    <thead class="table-light">
                        <tr>
                            <th style="width:30px;"><input type="checkbox" ${allChecked?'checked':''} onchange="Absensi.toggleSelectAll(this.checked)"></th>
                            <th>Tgl</th><th>Jam</th><th>Kode</th><th>Nama</th><th>Sesi</th><th>Status / Mode</th><th>Petugas</th>
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
        const container = document.getElementById('paginationContainerAbsensi');
        if (!container) return;
        let html = `
            <div class="d-flex justify-content-between align-items-center mt-3">
                <small class="text-muted" id="infoCountAbsensi">Menampilkan ${absensiFiltered.length} dari ${totalEntries} entri</small>
                <div>`;
        if (currentPage > 1) html += `<button class="btn btn-sm btn-outline-primary" onclick="Absensi.changePage(${currentPage - 1})">← Sebelumnya</button> `;
        if (currentPage < totalPages) html += `<button class="btn btn-sm btn-outline-primary" onclick="Absensi.changePage(${currentPage + 1})">Berikutnya →</button>`;
        html += `</div></div>`;
        container.innerHTML = html;
    }

    // ============================================================
    //  SELECTION
    // ============================================================
    function toggleSelectAll(checked) {
        if (checked) absensiFiltered.forEach(a => selectedTimestamps.add(safeStr(a.Timestamp)));
        else selectedTimestamps.clear();
        renderTable();
        updateDeleteButton();
    }

    function toggleSelect(ts, checked) {
        if (checked) selectedTimestamps.add(ts);
        else selectedTimestamps.delete(ts);
        updateDeleteButton();
    }

    function updateDeleteButton() {
        const btn = document.getElementById('btnDeleteAbsensi');
        const cnt = document.getElementById('absensiSelectedCount');
        if (btn) btn.disabled = selectedTimestamps.size === 0;
        if (cnt) cnt.textContent = selectedTimestamps.size;
    }

    // ============================================================
    //  DELETE SELECTED
    // ============================================================
    async function deleteSelected() {
        if (selectedTimestamps.size === 0) return;
        if (!confirm(`Hapus ${selectedTimestamps.size} data absensi terpilih?`)) return;
        const timestamps = Array.from(selectedTimestamps);
        const btn = document.getElementById('btnDeleteAbsensi');
        if (!btn) return;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Menghapus...';
        try {
            const res = await API.deleteAbsensi(timestamps);
            if (res.status === 'ok') {
                selectedTimestamps.clear();
                await refresh(true);
                toast(`✅ ${res.message}`, 'success');
            } else {
                toast(`❌ ${res.message}`, 'error');
            }
        } catch (e) {
            toast('❌ Gagal menghapus data.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-trash-alt me-1"></i> Hapus Terpilih';
            updateDeleteButton();
        }
    }

    // ============================================================
    //  GENERATE ABSENCE (Admin Only)
    // ============================================================
    async function generateAbsence() {
        const tgl = document.getElementById('fTglAbsensi')?.value;
        if (!tgl) { toast('Pilih tanggal terlebih dahulu.', 'warning'); return; }
        if (!confirm(`Catat "Tidak Berangkat" dan "Izin" untuk tanggal ${tgl}?`)) return;
        const btn = document.querySelector('button[onclick*="generateAbsence"]');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Memproses...';
        }
        try {
            const res = await API.generateAbsence(tgl);
            if (res.status === 'ok') {
                toast(`✅ ${res.message}`, 'success');
                await refresh(true);
            } else {
                toast(`❌ ${res.message}`, 'error');
            }
        } catch (e) {
            toast('❌ Gagal generate.', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-robot me-1"></i> Generate Tidak Berangkat';
            }
        }
    }

    // ============================================================
    //  EXPORT PDF
    // ============================================================
    function exportPDF() {
        if (!absensiFiltered.length) { toast('Tidak ada data.', 'warning'); return; }
        const tgl = document.getElementById('fTglAbsensi')?.value || 'Semua';
        const sesi = document.getElementById('fSesiAbsensi')?.value || 'Semua';
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
                <thead><tr><th>No</th><th>Tgl</th><th>Jam</th><th>Kode</th><th>Nama</th><th>Sesi</th><th>Status / Mode</th><th>Petugas</th></tr></thead>
                <tbody>${absensiFiltered.map((a, i) => `<tr><td>${i+1}</td><td>${safeStr(a.Tanggal)}</td><td>${safeStr(a.Jam)}</td><td>${safeSlice(a.Kode, -4)}</td><td>${safeStr(a.Nama)}</td><td>${safeStr(a.Sesi_Nama)}</td><td>${safeStr(a.Status)}</td><td>${safeStr(a.Petugas)}</td></tr>`).join('')}</tbody>
            </table>`;
        html2pdf().set({
            filename: `Laporan_Absensi_${tgl}_${now.toISOString().slice(0,10)}.pdf`,
            margin: 10,
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        }).from(html).save();
    }

    // ============================================================
    //  EXPORT CSV
    // ============================================================
    function exportCSV() {
        if (!absensiFiltered.length) { toast('Tidak ada data.', 'warning'); return; }
        const rows = [['"Tanggal"','"Jam"','"Kode"','"Nama"','"Sesi"','"Status"','"Petugas"']];
        absensiFiltered.forEach(a => rows.push([`"${safeStr(a.Tanggal)}"`,`"${safeStr(a.Jam)}"`,`"${safeStr(a.Kode)}"`,`"${safeStr(a.Nama)}"`,`"${safeStr(a.Sesi_Nama)}"`,`"${safeStr(a.Status)}"`,`"${safeStr(a.Petugas)}"`]));
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `absensi_${new Date().toISOString().slice(0,10)}.csv`; a.click();
        toast('✅ CSV berhasil diunduh.', 'success');
    }

    // ============================================================
    //  INPUT MANUAL ABSENSI (Admin Only)
    // ============================================================
    function showInputModal() {
        if (jadwalData.length === 0) {
            // Load jadwal jika belum ada
            API.getJadwal().then(res => {
                if (res.status === 'success') {
                    jadwalData = res.data;
                    sesiList = [...new Set(jadwalData.map(j => safeStr(j.nama)).filter(Boolean))];
                }
                buildModal();
            }).catch(() => buildModal());
        } else {
            buildModal();
        }

        function buildModal() {
            const modalHtml = `
                <div class="modal-overlay" id="manualAbsensiModal">
                    <div class="modal-box" style="max-width: 650px;">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h5 class="fw-bold mb-0"><i class="fas fa-edit me-2" style="color:#0d6efd;"></i>Input Manual Absensi</h5>
                            <button class="btn-close" onclick="Common.closeModal()"><i class="fas fa-times"></i></button>
                        </div>
                        <div class="row g-2 mb-3">
                            <div class="col-8">
                                <label>Kode Peserta <span class="text-danger">*</span></label>
                                <div class="input-group">
                                    <input type="text" class="form-control form-control-sm" id="manualKode" placeholder="Contoh: SRMA19-001" oninput="Absensi.searchPeserta(this.value, 'manualKode', 'manualNama', 'manualKodeRecommendations')">
                                    <button class="btn btn-primary btn-sm" onclick="Absensi.cariPesertaManual()"><i class="fas fa-search"></i></button>
                                </div>
                                <div id="manualKodeRecommendations" class="list-group position-absolute" style="z-index:1000; max-height:200px; overflow-y:auto; display:none; width:100%;"></div>
                            </div>
                            <div class="col-4">
                                <label>Tanggal <span class="text-danger">*</span></label>
                                <input type="date" class="form-control form-control-sm" id="manualTanggal" value="${new Date().toISOString().split('T')[0]}">
                            </div>
                            <div class="col-12">
                                <label>Sesi <span class="text-danger">*</span></label>
                                <select class="form-select form-select-sm" id="manualSesi">
                                    <option value="">-- Pilih Sesi --</option>
                                    ${sesiList.map(s => `<option value="${s}">${s}</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="alert alert-info py-2 small" id="manualInfoPeserta" style="display:none;">
                            <strong>Nama:</strong> <span id="manualNama">-</span> &bull; <strong>JK:</strong> <span id="manualJK">-</span> &bull; <strong>Agama:</strong> <span id="manualAgama">-</span>
                        </div>
                        <div id="manualDynamicForm"></div>
                        <div class="d-flex gap-2 justify-content-end mt-3">
                            <button class="btn btn-secondary rounded-pill px-4" onclick="Common.closeModal()">Batal</button>
                            <button class="btn btn-primary rounded-pill px-4" onclick="Absensi.saveManual()"><i class="fas fa-save me-1"></i> Simpan</button>
                        </div>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            renderManualForm();
        }
    }

    // ============================================================
    //  RENDER FORM MANUAL (Dynamic)
    // ============================================================
    function renderManualForm() {
        const container = document.getElementById('manualDynamicForm');
        if (!container) return;
        let html = `
            <div class="mb-2">
                <label>Tipe Pencatatan <span class="text-danger">*</span></label>
                <select class="form-select form-select-sm" id="manualTipe" onchange="Absensi.toggleManualFormType()">
                    <option value="absen">Absensi</option>
                    <option value="hp">Peminjaman HP</option>
                    <option value="pelanggaran">Pelanggaran</option>
                </select>
            </div>
            <div id="manualAbsenForm">
                <div class="row g-2 mt-2">
                    <div class="col-md-6">
                        <label>Status</label>
                        <select class="form-select form-select-sm" id="manualStatus">
                            <option value="Hadir">Hadir</option>
                            <option value="Izin">Izin</option>
                            <option value="Tidak Berangkat">Tidak Berangkat</option>
                            <option value="Sakit">Sakit</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label>Puasa</label>
                        <div class="d-flex gap-3">
                            <div class="form-check"><input class="form-check-input" type="radio" name="manualPuasa" id="manualPuasaYa" value="Ya" checked><label class="form-check-label" for="manualPuasaYa">Ya</label></div>
                            <div class="form-check"><input class="form-check-input" type="radio" name="manualPuasa" id="manualPuasaTidak" value="Tidak"><label class="form-check-label" for="manualPuasaTidak">Tidak</label></div>
                        </div>
                    </div>
                </div>
                <div class="row g-2 mt-2">
                    <div class="col-md-6">
                        <label>Pelanggaran</label>
                        <select class="form-select form-select-sm" id="manualPelanggaran" onchange="Absensi.togglePelanggaranKet()">
                            <option value="Tidak Ada">Tidak Ada</option>
                            <option value="Ringan">Ringan</option>
                            <option value="Sedang">Sedang</option>
                            <option value="Berat">Berat</option>
                        </select>
                        <div id="manualPelanggaranKetContainer" style="display:none;margin-top:4px;">
                            <input type="text" class="form-control form-control-sm" id="manualPelanggaranKet" placeholder="Keterangan...">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <label>Kesehatan</label>
                        <div class="d-flex gap-3">
                            <div class="form-check"><input class="form-check-input" type="radio" name="manualKesehatan" id="manualKesehatanSehat" value="Sehat" checked><label class="form-check-label" for="manualKesehatanSehat">Sehat</label></div>
                            <div class="form-check"><input class="form-check-input" type="radio" name="manualKesehatan" id="manualKesehatanSakit" value="Sakit"><label class="form-check-label" for="manualKesehatanSakit">Sakit</label></div>
                        </div>
                        <div id="manualKesehatanKetContainer" style="display:none;margin-top:4px;">
                            <input type="text" class="form-control form-control-sm" id="manualKesehatanKet" placeholder="Keterangan...">
                        </div>
                    </div>
                </div>
                <div id="manualIzinUploadContainer" style="display:none;margin-top:8px;">
                    <label>Upload Bukti Surat (max 50KB)</label>
                    <input type="file" accept="image/*" class="form-control form-control-sm" id="manualBuktiSurat">
                    <small class="text-muted">Format JPG/PNG. Maksimal 50KB.</small>
                </div>
            </div>
            <div id="manualHPForm" style="display:none;">
                <div class="mb-2 mt-2">
                    <label>Status HP</label>
                    <select class="form-select form-select-sm" id="manualHPStatus">
                        <option value="Meminjam">Pinjam HP</option>
                        <option value="Mengembalikan">Kembalikan HP</option>
                    </select>
                </div>
            </div>
            <div id="manualPelanggaranForm" style="display:none;">
                <div class="mb-2 mt-2">
                    <label>Jenis Pelanggaran <span class="text-danger">*</span></label>
                    <select class="form-select form-select-sm" id="manualPelanggaranJenis">
                        <option value="">-- Pilih --</option>
                        <option value="Ringan">Ringan</option>
                        <option value="Sedang">Sedang</option>
                        <option value="Berat">Berat</option>
                    </select>
                </div>
                <div class="mb-2">
                    <label>Keterangan Pelanggaran <span class="text-danger">*</span></label>
                    <input type="text" class="form-control form-control-sm" id="manualPelanggaranKetInput" placeholder="Deskripsi pelanggaran...">
                </div>
                <div class="mb-2">
                    <label>Sanksi</label>
                    <input type="text" class="form-control form-control-sm" id="manualPelanggaranSanksi" placeholder="Sanksi yang diberikan...">
                </div>
            </div>
            <div class="mt-3">
                <label><i class="fas fa-sticky-note me-1"></i>Catatan</label>
                <textarea class="form-control form-control-sm" id="manualCatatan" rows="2" placeholder="Tambahkan catatan (opsional)..."></textarea>
            </div>
        `;
        container.innerHTML = html;

        // Event listener untuk kesehatan
        document.querySelectorAll('input[name="manualKesehatan"]').forEach(r => {
            r.addEventListener('change', function() {
                const c = document.getElementById('manualKesehatanKetContainer');
                if (c) {
                    if (this.value === 'Sakit') c.style.display = 'block';
                    else c.style.display = 'none';
                }
            });
        });

        // Event listener untuk status izin
        const statusSelect = document.getElementById('manualStatus');
        if (statusSelect) {
            statusSelect.addEventListener('change', function() {
                const c = document.getElementById('manualIzinUploadContainer');
                if (c) {
                    if (this.value === 'Izin') c.style.display = 'block';
                    else c.style.display = 'none';
                }
            });
        }
    }

    // ============================================================
    //  FUNGSI AUTOCOMPLETE & PENCARIAN (Safe String)
    // ============================================================
    function searchPeserta(query, kodeInputId, namaInputId, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        if (query.length < 2) { container.style.display = 'none'; return; }
        const filtered = pesertaData.filter(p =>
            safeLowerCase(p.Kode).includes(query.toLowerCase()) ||
            safeLowerCase(p.Nama).includes(query.toLowerCase())
        ).slice(0, 5);
        if (filtered.length === 0) { container.style.display = 'none'; return; }
        container.style.display = 'block';
        container.innerHTML = filtered.map(p =>
            `<button type="button" class="list-group-item list-group-item-action" onclick="Absensi.selectPeserta('${safeStr(p.Kode)}', '${safeStr(p.Nama)}', '${kodeInputId}', '${namaInputId}', '${containerId}')">
                <strong>${safeStr(p.Kode)}</strong> - ${safeStr(p.Nama)}
            </button>`
        ).join('');
    }

    function selectPeserta(kode, nama, kodeInputId, namaInputId, containerId) {
        const kodeEl = document.getElementById(kodeInputId);
        const namaEl = namaInputId ? document.getElementById(namaInputId) : null;
        const container = document.getElementById(containerId);
        if (kodeEl) kodeEl.value = kode;
        if (namaEl) namaEl.value = nama;
        if (container) container.style.display = 'none';
        if (typeof cariPesertaManual === 'function') cariPesertaManual();
    }

    async function cariPesertaManual() {
        const kodeEl = document.getElementById('manualKode');
        if (!kodeEl) return;
        const kode = kodeEl.value.trim();
        if (!kode) { toast('Masukkan kode peserta.', 'warning'); return; }
        const res = await API.searchPeserta(kode);
        const infoBox = document.getElementById('manualInfoPeserta');
        const namaEl = document.getElementById('manualNama');
        const jkEl = document.getElementById('manualJK');
        const agamaEl = document.getElementById('manualAgama');
        if (res.status === 'success') {
            if (namaEl) namaEl.textContent = res.nama || '-';
            if (jkEl) jkEl.textContent = res.jk || '-';
            if (agamaEl) agamaEl.textContent = res.agama || '-';
            if (infoBox) infoBox.style.display = 'block';
        } else {
            if (namaEl) namaEl.textContent = '-';
            if (jkEl) jkEl.textContent = '-';
            if (agamaEl) agamaEl.textContent = '-';
            if (infoBox) infoBox.style.display = 'none';
            toast(res.message || 'Peserta tidak ditemukan.', 'error');
        }
    }

    // ============================================================
    //  TOGGLE FORM MANUAL
    // ============================================================
    function toggleManualFormType() {
        const tipeSelect = document.getElementById('manualTipe');
        if (!tipeSelect) return;
        const tipe = tipeSelect.value;
        const absenForm = document.getElementById('manualAbsenForm');
        const hpForm = document.getElementById('manualHPForm');
        const pelanggaranForm = document.getElementById('manualPelanggaranForm');
        if (absenForm) absenForm.style.display = tipe === 'absen' ? 'block' : 'none';
        if (hpForm) hpForm.style.display = tipe === 'hp' ? 'block' : 'none';
        if (pelanggaranForm) pelanggaranForm.style.display = tipe === 'pelanggaran' ? 'block' : 'none';
    }

    function togglePelanggaranKet() {
        const selectEl = document.getElementById('manualPelanggaran');
        const container = document.getElementById('manualPelanggaranKetContainer');
        if (selectEl && container) {
            const val = selectEl.value;
            if (val && val !== 'Tidak Ada') container.style.display = 'block';
            else container.style.display = 'none';
        }
    }

    // ============================================================
    //  SAVE MANUAL ABSENSI
    // ============================================================
    async function saveManual() {
        const btn = document.querySelector('#manualAbsensiModal .btn-primary');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Menyimpan...';
        }

        const kodeEl = document.getElementById('manualKode');
        const tanggalEl = document.getElementById('manualTanggal');
        const sesiEl = document.getElementById('manualSesi');
        const tipeEl = document.getElementById('manualTipe');
        const catatanEl = document.getElementById('manualCatatan');

        const kode = kodeEl ? kodeEl.value.trim().toUpperCase() : '';
        const tanggal = tanggalEl ? tanggalEl.value : '';
        const sesiNama = sesiEl ? sesiEl.value : '';
        const tipe = tipeEl ? tipeEl.value : 'absen';
        const catatan = catatanEl ? catatanEl.value.trim() : '';

        if (!kode || !tanggal || !sesiNama) {
            toast('Kode, tanggal, dan sesi wajib diisi.', 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save me-1"></i> Simpan';
            }
            return;
        }

        const res = await API.searchPeserta(kode);
        if (res.status !== 'success') {
            toast('Peserta tidak ditemukan.', 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save me-1"></i> Simpan';
            }
            return;
        }
        const nama = res.nama;
        const agama = res.agama || 'Islam';

        // Tentukan sesi ID
        const matchedJadwal = jadwalData.find(j => safeStr(j.nama) === sesiNama);
        const sesiId = matchedJadwal ? safeStr(matchedJadwal.id) : 'manual_' + Date.now();

        try {
            let result;
            if (tipe === 'absen') {
                const statusEl = document.getElementById('manualStatus');
                const puasaEl = document.querySelector('input[name="manualPuasa"]:checked');
                const pelanggaranEl = document.getElementById('manualPelanggaran');
                const pelanggaranKetContainer = document.getElementById('manualPelanggaranKetContainer');
                const kesehatanEl = document.querySelector('input[name="manualKesehatan"]:checked');
                const kesehatanKetContainer = document.getElementById('manualKesehatanKetContainer');

                const status = statusEl ? statusEl.value : 'Hadir';
                const puasa = puasaEl ? puasaEl.value : 'Tidak';
                const pelanggaran = pelanggaranEl ? pelanggaranEl.value : 'Tidak Ada';
                const pelanggaranKet = (pelanggaranKetContainer && pelanggaranKetContainer.style.display === 'block') ? (document.getElementById('manualPelanggaranKet')?.value.trim() || '') : '';
                const kesehatan = kesehatanEl ? kesehatanEl.value : 'Sehat';
                const kesehatanKet = (kesehatanKetContainer && kesehatanKetContainer.style.display === 'block') ? (document.getElementById('manualKesehatanKet')?.value.trim() || '') : '';

                let buktiSurat = '';
                if (status === 'Izin') {
                    const fileInput = document.getElementById('manualBuktiSurat');
                    if (fileInput?.files && fileInput.files[0]) {
                        if (fileInput.files[0].size > 50000) {
                            toast('Ukuran file maksimal 50KB.', 'error');
                            if (btn) {
                                btn.disabled = false;
                                btn.innerHTML = '<i class="fas fa-save me-1"></i> Simpan';
                            }
                            return;
                        }
                        buktiSurat = await new Promise(resolve => {
                            const reader = new FileReader();
                            reader.onload = e => resolve(e.target.result);
                            reader.readAsDataURL(fileInput.files[0]);
                        });
                    }
                }

                const checkResult = await API.recordAbsensi(kode, nama, sesiId, sesiNama, Auth.getCurrentUser()?.nama || 'Admin', agama, 'Tidak', 'Tidak Ada', '', 'Sehat', '', 'Hadir');
                if (checkResult.status === 'duplicate') {
                    if (!confirm('Data sudah ada untuk sesi ini. Apakah Anda ingin menimpa data lama?')) {
                        toast('Penyimpanan dibatalkan.', 'info');
                        if (btn) {
                            btn.disabled = false;
                            btn.innerHTML = '<i class="fas fa-save me-1"></i> Simpan';
                        }
                        return;
                    }
                    result = await API.updateAbsensi({
                        code: kode,
                        nama: nama,
                        sesi: sesiId,
                        sesi_nama: sesiNama,
                        tanggal: tanggal,
                        status: status,
                        puasa: puasa,
                        pelanggaran: pelanggaran,
                        pelanggaran_keterangan: pelanggaranKet,
                        kondisi_kesehatan: kesehatan,
                        keterangan_kesehatan: kesehatanKet,
                        catatan: catatan,
                        petugas: Auth.getCurrentUser()?.nama || 'Admin'
                    });
                    if (result.status === 'updated') {
                        closeModal();
                        await refresh(true);
                        toast('✅ Data absensi diperbarui.', 'success');
                    } else {
                        toast(result.message || 'Gagal memperbarui.', 'error');
                    }
                } else {
                    result = await API.recordAbsensi(kode, nama, sesiId, sesiNama, Auth.getCurrentUser()?.nama || 'Admin', agama, puasa, pelanggaran, pelanggaranKet, kesehatan, kesehatanKet, status);
                    if (result.status === 'recorded') {
                        if (status === 'Izin' && buktiSurat) {
                            await API.addIzin({
                                kode_peserta: kode,
                                nama_peserta: nama,
                                tanggal: tanggal,
                                keterangan: 'Izin via input manual',
                                petugas: Auth.getCurrentUser()?.nama || 'Admin',
                                bukti_surat: buktiSurat
                            });
                        }
                        closeModal();
                        await refresh(true);
                        toast('✅ Absensi tercatat.', 'success');
                    } else {
                        toast(result.message || 'Gagal mencatat.', 'error');
                    }
                }
            } else if (tipe === 'hp') {
                const hpStatusEl = document.getElementById('manualHPStatus');
                const hpStatus = hpStatusEl ? hpStatusEl.value : 'Meminjam';
                result = await API.recordHP({
                    kode: kode,
                    nama: nama,
                    sesi: sesiId,
                    sesi_nama: sesiNama,
                    status: hpStatus,
                    petugas: Auth.getCurrentUser()?.nama || 'Admin',
                    catatan: catatan
                });
                if (result.status === 'success') {
                    closeModal();
                    await refresh(true);
                    toast(`✅ HP ${hpStatus} tercatat.`, 'success');
                } else {
                    toast(result.message || 'Gagal mencatat HP.', 'error');
                }
            } else if (tipe === 'pelanggaran') {
                const jenisEl = document.getElementById('manualPelanggaranJenis');
                const ketEl = document.getElementById('manualPelanggaranKetInput');
                const sanksiEl = document.getElementById('manualPelanggaranSanksi');
                const jenis = jenisEl ? jenisEl.value : '';
                const keterangan = ketEl ? ketEl.value.trim() : '';
                const sanksi = sanksiEl ? sanksiEl.value.trim() : '';
                if (!jenis || !keterangan) {
                    toast('Jenis dan keterangan pelanggaran wajib diisi.', 'error');
                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = '<i class="fas fa-save me-1"></i> Simpan';
                    }
                    return;
                }
                const catatanFinal = catatan ? catatan + ' | Sanksi: ' + sanksi : 'Sanksi: ' + sanksi;
                result = await API.recordAbsensi(kode, nama, sesiId, sesiNama, Auth.getCurrentUser()?.nama || 'Admin', agama, 'Tidak', jenis, keterangan, 'Sehat', '', 'Pelanggaran');
                if (result.status === 'recorded') {
                    closeModal();
                    await refresh(true);
                    toast('✅ Pelanggaran tercatat.', 'success');
                } else {
                    toast(result.message || 'Gagal mencatat pelanggaran.', 'error');
                }
            }
        } catch (e) {
            toast('Gagal server: ' + e.message, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save me-1"></i> Simpan';
            }
        }
    }

    // ============================================================
    //  EXPOSE KE GLOBAL
    // ============================================================
    window.Absensi = {
        renderAbsensi,
        refresh,
        applyFilter,
        resetFilter,
        changePage,
        toggleSelectAll,
        toggleSelect,
        deleteSelected,
        generateAbsence,
        exportPDF,
        exportCSV,
        showInputModal,
        searchPeserta,
        selectPeserta,
        cariPesertaManual,
        renderManualForm,
        toggleManualFormType,
        togglePelanggaranKet,
        saveManual
    };

    console.log('✅ Absensi module loaded (Full Fix Anti Error)');
})();