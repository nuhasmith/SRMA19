// ============================================================
//  IZIN.JS – Data Izin (CRUD Lengkap) - FULL FIX FINAL
//  SRMA 19 Bantul
//  Versi: 3.0.0 - Anti Error, SafeDOM, Auto Load, Robust
// ============================================================

(function() {
    'use strict';

    // Ambil fungsi bersama
    const { getCachedData: getCache, setCachedData: setCache, showToast: toast, closeModal } = window.Common;
    const { getMuridDampingan, filterIzinByDampingan } = window.PetugasCommon || {};

    // ============================================================
    //  STATE
    // ============================================================
    let izinData = [];
    let izinFiltered = [];
    let selectedIzinIds = new Set();
    let pesertaData = [];
    let isPetugas = false;
    let petugasNama = '';

    // ============================================================
    //  SAFE DOM HELPERS (PENTING: Mencegah Error Null)
    // ============================================================
    function getEl(id) { return document.getElementById(id); }

    function setHTML(id, html) {
        const el = getEl(id);
        if (el) {
            el.innerHTML = html;
        } else {
            console.warn('Elemen tidak ditemukan:', id);
        }
    }

    // ============================================================
    //  RENDER IZIN
    // ============================================================
    function renderIzin(container) {
        const user = Auth.getCurrentUser();
        isPetugas = user?.role === 'petugas';
        petugasNama = user?.nama || '';

        // Ambil data dari cache jika belum ada
        if (izinData.length === 0) {
            const cached = getCache();
            if (cached?.izin) {
                izinData = cached.izin;
                izinFiltered = [...izinData];
            }
            if (cached?.peserta) {
                pesertaData = cached.peserta;
            }
        }

        // Jika Petugas, filter data berdasarkan murid dampingan
        if (isPetugas && izinData.length > 0 && pesertaData.length > 0) {
            const dampingan = getMuridDampingan(pesertaData, petugasNama);
            izinData = filterIzinByDampingan(izinData, dampingan);
            izinFiltered = [...izinData];
        }

        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h4 class="fw-bold mb-0"><i class="fas fa-file-medical-alt me-2" style="color:#0d6efd;"></i>Data Izin <span class="badge bg-secondary rounded-pill">${izinData.length}</span></h4>
                <div class="d-flex gap-2 flex-wrap">
                    ${!isPetugas ? `
                        <button class="btn btn-sm btn-success rounded-pill" onclick="Izin.showModal(null)"><i class="fas fa-plus"></i> Tambah</button>
                        <button class="btn btn-sm btn-outline-danger rounded-pill" id="btnDeleteSelectedIzin" onclick="Izin.deleteSelected()" disabled><i class="fas fa-trash-alt me-1"></i> Hapus (<span id="selectedCountIzin">0</span>)</button>
                    ` : ''}
                    <button class="btn btn-sm btn-refresh rounded-pill" onclick="Izin.refresh(false)"><i class="fas fa-sync-alt me-1"></i> Refresh</button>
                </div>
            </div>
            <div class="card-modern mb-3">
                <div class="filter-group">
                    <input type="text" class="form-control form-control-sm" id="searchIzin" placeholder="🔍 Cari..." style="width:150px" oninput="Izin.applyFilter()">
                    <input type="date" class="form-control form-control-sm" id="fTglIzin" style="width:140px" onchange="Izin.applyFilter()">
                    <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="Izin.resetFilter()">Reset</button>
                    <span class="small text-muted ms-2" id="infoCountIzin">Menampilkan ${izinFiltered.length} dari ${izinData.length} entri</span>
                </div>
            </div>
            <div class="card-modern p-0"><div id="izinTableContainer"></div></div>
        `;

        // PENTING: Beri jeda agar DOM selesai dirender sebelum filter dijalankan
        setTimeout(() => {
            applyFilter();
            updateDeleteButton();
        }, 50);
    }

    // ============================================================
    //  REFRESH DATA (Otomatis saat render jika data kosong)
    // ============================================================
    async function refresh(silent = false) {
        if (!silent) toast('Memperbarui data izin...', 'info');
        try {
            const [izinRes, pesertaRes] = await Promise.all([API.listIzin(), API.listPeserta()]);
            if (izinRes.status === 'success') {
                izinData = izinRes.data;
                pesertaData = pesertaRes.data || [];

                // Filter jika petugas
                const user = Auth.getCurrentUser();
                if (user?.role === 'petugas' && pesertaData.length > 0) {
                    const dampingan = getMuridDampingan(pesertaData, user.nama || '');
                    izinData = filterIzinByDampingan(izinData, dampingan);
                }

                const cached = getCache() || {};
                cached.izin = izinData;
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
    //  FILTER
    // ============================================================
    function applyFilter() {
        const searchEl = getEl('searchIzin');
        const tglEl = getEl('fTglIzin');
        
        const q = (searchEl?.value || '').toLowerCase().trim();
        const tgl = (tglEl?.value || '');

        izinFiltered = izinData.filter(izin =>
            (!q || (String(izin.Nama_Peserta || '').toLowerCase().includes(q) || String(izin.Kode_Peserta || '').toLowerCase().includes(q))) &&
            (!tgl || String(izin.Tanggal || '') === tgl)
        );
        
        for (const id of selectedIzinIds) {
            if (!izinFiltered.some(i => String(i.ID) === id)) selectedIzinIds.delete(id);
        }
        
        renderTable();
        updateDeleteButton();
        
        const infoEl = getEl('infoCountIzin');
        if (infoEl) infoEl.textContent = `Menampilkan ${izinFiltered.length} dari ${izinData.length} entri`;
    }

    function resetFilter() {
        const searchEl = getEl('searchIzin');
        const tglEl = getEl('fTglIzin');
        if (searchEl) searchEl.value = '';
        if (tglEl) tglEl.value = '';
        applyFilter();
    }

    // ============================================================
    //  RENDER TABLE (FIX: Guard Elemen)
    // ============================================================
    function renderTable() {
        const container = getEl('izinTableContainer');
        if (!container) return; // GUARD: Jika belum ada, jangan error

        const allChecked = izinFiltered.length > 0 && izinFiltered.every(iz => selectedIzinIds.has(String(iz.ID)));
        let rows = '';
        izinFiltered.forEach((iz, idx) => {
            const realIdx = izinData.indexOf(iz);
            rows += `<tr>
                <td><input type="checkbox" ${selectedIzinIds.has(String(iz.ID))?'checked':''} onchange="Izin.toggleSelect('${String(iz.ID)}', this.checked)"></td>
                <td>${String(iz.Tanggal || '-')}</td>
                <td><code>${String(iz.Kode_Peserta || '').slice(-4)}</code></td>
                <td>${String(iz.Nama_Peserta || '-')}</td>
                <td>${String(iz.Keterangan || '-')}</td>
                <td>${iz.Bukti_Surat ? '<a href="#" onclick="Izin.lihatBukti(' + realIdx + ')"><i class="fas fa-paperclip"></i> Lihat</a>' : '-'}</td>
                <td>${String(iz.Petugas || '-')}</td>
                <td class="text-center">
                    ${!isPetugas ? `
                        <button class="btn btn-sm btn-outline-primary p-1" onclick="Izin.showModal(${realIdx})"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-outline-danger p-1" onclick="Izin.hapus(${realIdx})"><i class="fas fa-trash-alt"></i></button>
                    ` : '-'}
                </td>
            </tr>`;
        });
        if (!rows) rows = '<tr><td colspan="8" class="text-center py-3 text-muted">Belum ada data izin</td></tr>';

        container.innerHTML = `
            <div class="table-responsive">
                <table class="table table-sm table-hover mb-0">
                    <thead class="table-light">
                        <tr>
                            <th style="width:30px;"><input type="checkbox" ${allChecked?'checked':''} onchange="Izin.toggleSelectAll(this.checked)"></th>
                            <th>Tanggal</th><th>Kode</th><th>Nama</th><th>Keterangan</th><th>Bukti</th><th>Petugas</th><th class="text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
    }

    // ============================================================
    //  SELECTION
    // ============================================================
    function toggleSelectAll(checked) {
        if (checked) izinFiltered.forEach(iz => selectedIzinIds.add(String(iz.ID)));
        else selectedIzinIds.clear();
        renderTable();
        updateDeleteButton();
    }

    function toggleSelect(id, checked) {
        if (checked) selectedIzinIds.add(id);
        else selectedIzinIds.delete(id);
        updateDeleteButton();
    }

    function updateDeleteButton() {
        const btn = getEl('btnDeleteSelectedIzin');
        const cnt = getEl('selectedCountIzin');
        if (btn) btn.disabled = selectedIzinIds.size === 0;
        if (cnt) cnt.textContent = selectedIzinIds.size;
    }

    // ============================================================
    //  CRUD MODAL
    // ============================================================
    function showModal(index = null) {
        const existing = index !== null ? izinData[index] : null;
        const title = existing ? '✏️ Edit Izin' : '➕ Tambah Izin';
        const modalHtml = `
            <div class="modal-overlay" id="izinModal">
                <div class="modal-box">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="fw-bold mb-0">${title}</h5>
                        <button class="btn-close" onclick="Common.closeModal()"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="mb-3"><label>Kode Peserta <span class="text-danger">*</span></label><input type="text" class="form-control" id="imKode" value="${existing?.Kode_Peserta || ''}" placeholder="SRMA19-XXX" required></div>
                    <div class="mb-3"><label>Nama Peserta <span class="text-danger">*</span></label><input type="text" class="form-control" id="imNama" value="${existing?.Nama_Peserta || ''}" required></div>
                    <div class="mb-3"><label>Tanggal <span class="text-danger">*</span></label><input type="date" class="form-control" id="imTanggal" value="${existing?.Tanggal || ''}" required></div>
                    <div class="mb-3"><label>Keterangan <span class="text-danger">*</span></label><input type="text" class="form-control" id="imKeterangan" value="${existing?.Keterangan || ''}" placeholder="Sakit, izin keluarga, dll." required></div>
                    <div class="mb-3"><label>Bukti Surat (foto/scan, max 49KB)</label><input type="file" accept="image/*" class="form-control" id="imBukti">${existing?.Bukti_Surat ? '<small class="text-muted">Sudah ada bukti sebelumnya. Upload baru untuk mengganti.</small>' : ''}</div>
                    <div class="d-flex gap-2 justify-content-end mt-3">
                        <button class="btn btn-secondary rounded-pill px-4" onclick="Common.closeModal()">Batal</button>
                        <button class="btn btn-primary rounded-pill px-4" onclick="Izin.save(${index})"><i class="fas fa-save me-1"></i> Simpan</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // ============================================================
    //  SAVE (ADD / UPDATE)
    // ============================================================
    async function save(index) {
        const kodeEl = getEl('imKode');
        const namaEl = getEl('imNama');
        const tglEl = getEl('imTanggal');
        const ketEl = getEl('imKeterangan');
        const fileEl = getEl('imBukti');

        const kode = kodeEl ? kodeEl.value.trim().toUpperCase() : '';
        const nama = namaEl ? namaEl.value.trim() : '';
        const tgl = tglEl ? tglEl.value : '';
        const keterangan = ketEl ? ketEl.value.trim() : '';
        
        if (!kode || !nama || !tgl || !keterangan) {
            toast('Semua field wajib diisi.', 'error');
            return;
        }

        let bukti = '';
        if (fileEl && fileEl.files && fileEl.files[0]) {
            if (fileEl.files[0].size > 50000) {
                toast('Ukuran file maksimal 50KB.', 'error');
                return;
            }
            bukti = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(fileEl.files[0]);
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

        const btn = document.querySelector('#izinModal .btn-primary');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Menyimpan...';
        }

        try {
            let res;
            if (index !== null) {
                data.id = izinData[index].ID;
                res = await API.updateIzin(data);
            } else {
                res = await API.addIzin(data);
            }
            if (res.status === 'ok') {
                closeModal();
                await refresh(true);
                toast(res.message, 'success');
            } else {
                toast(res.message, 'error');
            }
        } catch (e) {
            toast('Gagal menyimpan data.', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save me-1"></i> Simpan';
            }
        }
    }

    // ============================================================
    //  DELETE
    // ============================================================
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
    //  LIHAT BUKTI
    // ============================================================
    function lihatBukti(index) {
        const izin = izinData[index];
        if (!izin?.Bukti_Surat) {
            toast('Tidak ada bukti surat.', 'warning');
            return;
        }
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
    window.Izin = {
        renderIzin,
        refresh,
        applyFilter,
        resetFilter,
        toggleSelectAll,
        toggleSelect,
        showModal,
        save,
        hapus,
        deleteSelected,
        lihatBukti
    };

    console.log('✅ Izin module loaded (v3.0.0 - Full Fix Final)');
})();