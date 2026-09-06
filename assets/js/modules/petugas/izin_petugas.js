// ============================================================
//  IZIN_PETUGAS.JS – Data Izin (Khusus Role Petugas)
//  SRMA 19 Bantul
//  Versi: 1.0.0 - SPA Ready
// ============================================================

(function() {
    'use strict';

    // Ambil fungsi bersama
    const { getCachedData: getCache, setCachedData: setCache, showToast: toast, closeModal } = window.Common;
    const { getMuridDampingan, filterIzinByDampingan } = window.PetugasCommon;

    // ============================================================
    //  STATE
    // ============================================================
    let izinData = [];
    let izinFiltered = [];
    let selectedIzinIds = new Set();
    let pesertaData = [];

    // ============================================================
    //  RENDER DATA IZIN (Petugas)
    // ============================================================
    function renderIzinPetugas(container) {
        const user = Auth.getCurrentUser();
        const petugasNama = user.nama || '';

        // Ambil data dari cache jika belum ada
        if (izinData.length === 0) {
            const cached = getCache();
            if (cached?.peserta && cached?.izin) {
                pesertaData = cached.peserta;
                const pesertaDampingan = getMuridDampingan(pesertaData, petugasNama);
                izinData = filterIzinByDampingan(cached.izin, pesertaDampingan);
                izinFiltered = [...izinData];
            }
        }

        const filterId = 'collapseFilterIzinPetugas';

        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h4 class="fw-bold mb-0"><i class="fas fa-file-medical-alt me-2" style="color:#0d6efd;"></i>Data Izin <span class="badge bg-secondary rounded-pill">${izinData.length}</span></h4>
                <button class="btn btn-sm btn-refresh rounded-pill" onclick="PetugasIzin.refresh(false)"><i class="fas fa-sync-alt me-1"></i> Refresh</button>
            </div>
            <div class="card-modern mb-3">
                <div class="d-flex justify-content-between align-items-center" style="cursor:pointer;" data-bs-toggle="collapse" data-bs-target="#${filterId}" aria-expanded="true">
                    <span class="fw-bold"><i class="fas fa-filter me-2"></i>Filter</span>
                    <i class="fas fa-chevron-down collapse-toggle" id="icon${filterId}"></i>
                </div>
                <div class="collapse show" id="${filterId}">
                    <div class="filter-group pt-2">
                        <input type="text" class="form-control form-control-sm" id="searchIzinPetugas" placeholder="🔍 Cari..." style="width:150px" oninput="PetugasIzin.applyFilter()">
                        <input type="date" class="form-control form-control-sm" id="fTglIzinPetugas" style="width:140px" onchange="PetugasIzin.applyFilter()">
                        <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="PetugasIzin.resetFilter()">Reset</button>
                        <span class="small text-muted ms-2" id="infoCountIzinPetugas">Menampilkan ${izinFiltered.length} dari ${izinData.length} entri</span>
                    </div>
                </div>
            </div>
            <div class="card-modern p-0"><div id="izinTableContainerPetugas"></div></div>
        `;
        applyFilter();
    }

    // ============================================================
    //  REFRESH DATA IZIN
    // ============================================================
    async function refresh(silent = false) {
        if (!silent) toast('Memperbarui data izin...', 'info');
        try {
            const user = Auth.getCurrentUser();
            const petugasNama = user.nama || '';
            const [izinRes, pesertaRes] = await Promise.all([
                API.listIzin(),
                API.listPeserta()
            ]);
            if (izinRes.status === 'success') {
                // Ambil daftar murid dampingan
                const pesertaDampingan = getMuridDampingan(pesertaRes.data || [], petugasNama);
                izinData = filterIzinByDampingan(izinRes.data, pesertaDampingan);
                pesertaData = pesertaRes.data || [];

                const cached = getCache() || {};
                cached.izin = izinData;
                cached.peserta = pesertaData;
                setCache(cached);

                applyFilter();
                if (!silent) toast(`✅ Data izin diperbarui (${izinData.length} entri)`, 'success');
            } else {
                if (!silent) toast('❌ Gagal memuat data: ' + (izinRes.message || 'Unknown error'), 'error');
            }
        } catch (e) {
            if (!silent) toast('❌ Gagal terhubung ke server.', 'error');
        }
    }

    // ============================================================
    //  FILTER DATA IZIN
    // ============================================================
    function applyFilter() {
        const q = (document.getElementById('searchIzinPetugas')?.value || '').toLowerCase().trim();
        const tgl = document.getElementById('fTglIzinPetugas')?.value || '';
        izinFiltered = izinData.filter(izin =>
            (!q || (izin.Nama_Peserta || '').toLowerCase().includes(q) || (izin.Kode_Peserta || '').toLowerCase().includes(q)) &&
            (!tgl || izin.Tanggal === tgl)
        );
        for (const id of selectedIzinIds) {
            if (!izinFiltered.some(i => String(i.ID) === id)) selectedIzinIds.delete(id);
        }
        renderTable();
        const info = document.getElementById('infoCountIzinPetugas');
        if (info) info.textContent = `Menampilkan ${izinFiltered.length} dari ${izinData.length} entri`;
    }

    function resetFilter() {
        document.getElementById('searchIzinPetugas').value = '';
        document.getElementById('fTglIzinPetugas').value = '';
        applyFilter();
    }

    // ============================================================
    //  RENDER TABEL IZIN
    // ============================================================
    function renderTable() {
        const allChecked = izinFiltered.length > 0 && izinFiltered.every(iz => selectedIzinIds.has(String(iz.ID)));
        let rows = '';
        izinFiltered.forEach((iz, idx) => {
            const realIdx = izinData.indexOf(iz);
            rows += `<tr>
                <td><input type="checkbox" ${selectedIzinIds.has(String(iz.ID))?'checked':''} onchange="PetugasIzin.toggleSelect('${String(iz.ID)}', this.checked)"></td>
                <td>${iz.Tanggal || '-'}</td>
                <td><code>${String(iz.Kode_Peserta || '').slice(-4)}</code></td>
                <td>${iz.Nama_Peserta || '-'}</td>
                <td>${iz.Keterangan || '-'}</td>
                <td>${iz.Bukti_Surat ? '<a href="#" onclick="PetugasIzin.lihatBukti(' + realIdx + ')"><i class="fas fa-paperclip"></i> Lihat</a>' : '-'}</td>
                <td>${iz.Petugas || '-'}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary p-1" onclick="PetugasIzin.showModal(${realIdx})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-danger p-1" onclick="PetugasIzin.hapus(${realIdx})"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>`;
        });
        if (!rows) rows = '<tr><td colspan="8" class="text-center py-3 text-muted">Belum ada data izin</td></tr>';

        document.getElementById('izinTableContainerPetugas').innerHTML = `
            <div class="table-responsive">
                <table class="table table-sm table-hover mb-0">
                    <thead class="table-light">
                        <tr>
                            <th style="width:30px;"><input type="checkbox" ${allChecked?'checked':''} onchange="PetugasIzin.toggleSelectAll(this.checked)"></th>
                            <th>Tanggal</th><th>Kode</th><th>Nama</th><th>Keterangan</th><th>Bukti</th><th>Petugas</th><th class="text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
    }

    // ============================================================
    //  SELECTION & DELETE
    // ============================================================
    function toggleSelectAll(checked) {
        if (checked) izinFiltered.forEach(iz => selectedIzinIds.add(String(iz.ID)));
        else selectedIzinIds.clear();
        renderTable();
    }

    function toggleSelect(id, checked) {
        if (checked) selectedIzinIds.add(id);
        else selectedIzinIds.delete(id);
        renderTable();
    }

    async function deleteSelected() {
        if (selectedIzinIds.size === 0) return;
        if (!confirm(`Hapus ${selectedIzinIds.size} izin terpilih?`)) return;
        let deleted = 0;
        for (const id of selectedIzinIds) {
            const res = await API.deleteIzin(id);
            if (res.status === 'ok') deleted++;
        }
        selectedIzinIds.clear();
        await refresh(true);
        toast(`✅ ${deleted} izin dihapus.`, 'success');
    }

    // ============================================================
    //  CRUD MODAL (Tambah/Edit)
    // ============================================================
    function showModal(index = null) {
        const existing = index !== null && index >= 0 ? izinData[index] : null;
        const title = existing ? '✏️ Edit Izin' : '➕ Tambah Izin';
        const modalHtml = `
            <div class="modal-overlay" id="izinModalPetugas">
                <div class="modal-box">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="fw-bold mb-0">${title}</h5>
                        <button class="btn-close" onclick="Common.closeModal()"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="mb-3"><label>Kode Peserta <span class="text-danger">*</span></label><input type="text" class="form-control" id="imKodePetugas" value="${existing?.Kode_Peserta || ''}" placeholder="SRMA19-XXX" required></div>
                    <div class="mb-3"><label>Nama Peserta <span class="text-danger">*</span></label><input type="text" class="form-control" id="imNamaPetugas" value="${existing?.Nama_Peserta || ''}" required></div>
                    <div class="mb-3"><label>Tanggal <span class="text-danger">*</span></label><input type="date" class="form-control" id="imTanggalPetugas" value="${existing?.Tanggal || ''}" required></div>
                    <div class="mb-3"><label>Keterangan <span class="text-danger">*</span></label><input type="text" class="form-control" id="imKeteranganPetugas" value="${existing?.Keterangan || ''}" placeholder="Sakit, izin keluarga, dll." required></div>
                    <div class="mb-3"><label>Bukti Surat (foto/scan, max 49KB)</label><input type="file" accept="image/*" class="form-control" id="imBuktiPetugas"></div>
                    <div class="d-flex gap-2 justify-content-end mt-3">
                        <button class="btn btn-secondary rounded-pill px-4" onclick="Common.closeModal()">Batal</button>
                        <button class="btn btn-primary rounded-pill px-4" onclick="PetugasIzin.save(${index})"><i class="fas fa-save me-1"></i> Simpan</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    async function save(index) {
        const kode = document.getElementById('imKodePetugas').value.trim().toUpperCase();
        const nama = document.getElementById('imNamaPetugas').value.trim();
        const tgl = document.getElementById('imTanggalPetugas').value;
        const keterangan = document.getElementById('imKeteranganPetugas').value.trim();
        if (!kode || !nama || !tgl || !keterangan) { toast('Semua field wajib diisi.', 'error'); return; }

        let bukti = '';
        const fileInput = document.getElementById('imBuktiPetugas');
        if (fileInput.files && fileInput.files[0]) {
            if (fileInput.files[0].size > 50000) { toast('Ukuran file maksimal 50KB.', 'error'); return; }
            bukti = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(fileInput.files[0]);
            });
        } else if (index !== null && izinData[index]?.Bukti_Surat) {
            bukti = izinData[index].Bukti_Surat;
        }

        const data = {
            kode_peserta: kode,
            nama_peserta: nama,
            tanggal: tgl,
            keterangan: keterangan,
            petugas: Auth.getCurrentUser()?.nama || 'Unknown',
            bukti_surat: bukti
        };
        if (index !== null) data.id = izinData[index].ID;

        const btn = document.querySelector('#izinModalPetugas .btn-primary');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Menyimpan...';
        try {
            let res;
            if (index !== null) {
                res = await API.updateIzin(data);
            } else {
                res = await API.addIzin(data);
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

    async function hapus(index) {
        if (!confirm('Hapus izin ini?')) return;
        const res = await API.deleteIzin(izinData[index].ID);
        if (res.status === 'ok') {
            await refresh(true);
            toast('Izin dihapus.', 'success');
        } else {
            toast(res.message, 'error');
        }
    }

    // ============================================================
    //  LIHAT BUKTI
    // ============================================================
    function lihatBukti(index) {
        const izin = izinData[index];
        if (!izin?.Bukti_Surat) { toast('Tidak ada bukti surat.', 'warning'); return; }
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(`<html><head><title>Bukti Izin</title></head><body><img src="${izin.Bukti_Surat}" style="max-width:100%;height:auto;display:block;margin:auto;"></body></html>`);
        } else {
            toast('Pop-up diblokir. Izinkan pop-up untuk melihat bukti.', 'warning');
        }
    }

    // ============================================================
    //  EXPOSE KE GLOBAL
    // ============================================================
    window.PetugasIzin = {
        renderIzinPetugas,
        refresh,
        applyFilter,
        resetFilter,
        toggleSelectAll,
        toggleSelect,
        deleteSelected,
        showModal,
        save,
        hapus,
        lihatBukti
    };

    console.log('✅ Petugas Izin module loaded');
})();