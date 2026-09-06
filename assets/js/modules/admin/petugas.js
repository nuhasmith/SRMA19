// ============================================================
//  PETUGAS.JS – Data Petugas (CRUD Lengkap)
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
    let petugasData = [];
    let petugasFiltered = [];
    let selectedPetugasUsernames = new Set();

    // ============================================================
    //  RENDER PETUGAS
    // ============================================================
    function renderPetugas(container) {
        if (petugasData.length === 0) {
            const cached = getCache();
            if (cached?.petugas) {
                petugasData = cached.petugas;
                petugasFiltered = [...petugasData];
            }
        }

        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h4 class="fw-bold mb-0"><i class="fas fa-user-shield me-2" style="color:#0d6efd;"></i>Data Petugas <span class="badge bg-secondary rounded-pill">${petugasData.length}</span></h4>
                <div class="d-flex gap-2 flex-wrap">
                    <button class="btn btn-sm btn-success rounded-pill" onclick="Petugas.showModal(null)"><i class="fas fa-plus me-1"></i> Tambah</button>
                    <button class="btn btn-sm btn-danger rounded-pill" onclick="Petugas.exportCSV()"><i class="fas fa-file-csv me-1"></i> CSV</button>
                    <button class="btn btn-sm btn-danger rounded-pill" onclick="Petugas.exportPDF()"><i class="fas fa-file-pdf me-1"></i> PDF</button>
                    <button class="btn btn-sm btn-refresh rounded-pill" onclick="Petugas.refresh(false)"><i class="fas fa-sync-alt me-1"></i> Refresh</button>
                </div>
            </div>
            <div class="card-modern mb-3">
                <div class="filter-group">
                    <input type="text" class="form-control form-control-sm" id="searchPetugas" placeholder="🔍 Cari nama / username..." style="width:200px" oninput="Petugas.applyFilter()">
                    <select class="form-select form-select-sm" id="filterRolePetugas" style="width:120px" onchange="Petugas.applyFilter()">
                        <option value="">Semua Role</option>
                        <option value="admin">Admin</option>
                        <option value="petugas">Petugas</option>
                        <option value="humas">Humas</option>
                    </select>
                    <select class="form-select form-select-sm" id="filterStatusPetugas" style="width:120px" onchange="Petugas.applyFilter()">
                        <option value="">Semua Status</option>
                        <option value="Aktif">Aktif</option>
                        <option value="Nonaktif">Nonaktif</option>
                    </select>
                    <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="Petugas.resetFilter()">Reset</button>
                    <span class="small text-muted ms-2" id="infoCountPetugas">Menampilkan ${petugasFiltered.length} dari ${petugasData.length} entri</span>
                </div>
            </div>
            <div class="card-modern p-0"><div id="petugasTableContainer"></div></div>
        `;

        applyFilter();
    }

    // ============================================================
    //  FILTER
    // ============================================================
    function applyFilter() {
        const q = (document.getElementById('searchPetugas')?.value || '').toLowerCase().trim();
        const role = document.getElementById('filterRolePetugas')?.value || '';
        const status = document.getElementById('filterStatusPetugas')?.value || '';

        petugasFiltered = petugasData.filter(p =>
            (!q || (p.Nama||'').toLowerCase().includes(q) || (p.Username||'').toLowerCase().includes(q)) &&
            (!role || (p.Role||'') === role) &&
            (!status || (p.Status||'Aktif') === status)
        );
        renderTable();
        const info = document.getElementById('infoCountPetugas');
        if (info) info.textContent = `Menampilkan ${petugasFiltered.length} dari ${petugasData.length} entri`;
    }

    function resetFilter() {
        document.getElementById('searchPetugas').value = '';
        document.getElementById('filterRolePetugas').value = '';
        document.getElementById('filterStatusPetugas').value = '';
        applyFilter();
    }

    // ============================================================
    //  RENDER TABLE
    // ============================================================
    function renderTable() {
        const allChecked = petugasFiltered.length > 0 && petugasFiltered.every(p => selectedPetugasUsernames.has(p.Username));
        let rows = '';
        petugasFiltered.forEach((p, i) => {
            const realIdx = petugasData.indexOf(p);
            const statusClass = (p.Status === 'Aktif') ? 'bg-success' : 'bg-secondary';
            rows += `<tr>
                <td>${i+1}</td>
                <td><input type="checkbox" ${selectedPetugasUsernames.has(p.Username) ? 'checked' : ''} onchange="Petugas.toggleSelect('${p.Username}', this.checked)"></td>
                <td><strong>${p.Nama || '-'}</strong></td>
                <td><code style="background:#f1f5f9;padding:2px 8px;border-radius:4px;">${p.Username || '-'}</code></td>
                <td>${p.Role || '-'}</td>
                <td><span class="badge ${statusClass}">${p.Status || 'Aktif'}</span></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary p-1" onclick="Petugas.showModal(${realIdx})" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-warning p-1" onclick="Petugas.toggleStatus(${realIdx})" title="Toggle Status"><i class="fas fa-toggle-on"></i></button>
                    <button class="btn btn-sm btn-outline-danger p-1" onclick="Petugas.deleteOne(${realIdx})" title="Hapus"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>`;
        });
        if (!rows) rows = '<tr><td colspan="7" class="text-center py-3 text-muted">Belum ada data petugas</td></tr>';

        document.getElementById('petugasTableContainer').innerHTML = `
            <div class="table-responsive">
                <table class="table table-sm table-hover mb-0">
                    <thead class="table-light">
                        <tr>
                            <th style="width:30px;">No</th>
                            <th style="width:30px;"><input type="checkbox" ${allChecked ? 'checked' : ''} onchange="Petugas.toggleSelectAll(this.checked)"></th>
                            <th>Nama</th><th>Username</th><th>Role</th><th>Status</th><th class="text-center">Aksi</th>
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
        if (checked) petugasFiltered.forEach(p => selectedPetugasUsernames.add(p.Username));
        else selectedPetugasUsernames.clear();
        renderTable();
    }

    function toggleSelect(username, checked) {
        if (checked) selectedPetugasUsernames.add(username);
        else selectedPetugasUsernames.delete(username);
        renderTable();
    }

    // ============================================================
    //  REFRESH DATA
    // ============================================================
    async function refresh(silent = false) {
        if (!silent) toast('Memperbarui data petugas...', 'info');
        try {
            const res = await API.listPetugas();
            if (res.status === 'success') {
                petugasData = res.data;
                petugasFiltered = [...petugasData];
                selectedPetugasUsernames.clear();
                const cached = getCache() || {};
                cached.petugas = petugasData;
                setCache(cached);
                applyFilter();
                if (!silent) toast(`✅ Data petugas diperbarui (${petugasData.length} entri)`, 'success');
            } else {
                if (!silent) toast('❌ Gagal memuat data: ' + (res.message || 'Unknown error'), 'error');
            }
        } catch (e) {
            if (!silent) toast('❌ Gagal terhubung ke server.', 'error');
        }
    }

    // ============================================================
    //  CRUD MODAL
    // ============================================================
    function showModal(index = null) {
        const existing = index !== null && index >= 0 ? petugasData[index] : null;
        const title = existing ? '✏️ Edit Petugas' : '➕ Tambah Petugas';
        const modalHtml = `
            <div class="modal-overlay" id="petugasModal">
                <div class="modal-box">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="fw-bold mb-0">${title}</h5>
                        <button class="btn-close" onclick="Common.closeModal()"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="mb-3"><label>Username <span class="text-danger">*</span></label><input class="form-control" id="ptUsername" value="${existing?.Username || ''}" ${existing ? 'disabled' : ''} placeholder="Username"></div>
                    <div class="mb-3"><label>Nama <span class="text-danger">*</span></label><input class="form-control" id="ptNama" value="${existing?.Nama || ''}" placeholder="Nama lengkap"></div>
                    <div class="mb-3"><label>PIN ${existing ? '(kosongkan jika tidak berubah)' : '<span class="text-danger">*</span>'}</label><input type="password" class="form-control" id="ptPin" placeholder="${existing ? 'Min 4 digit' : 'Min 4 digit'}" minlength="4" maxlength="6"></div>
                    <div class="mb-3"><label>Role</label><select class="form-select" id="ptRole"><option value="admin" ${existing?.Role === 'admin' ? 'selected' : ''}>Admin</option><option value="petugas" ${existing?.Role === 'petugas' ? 'selected' : ''}>Petugas</option><option value="humas" ${existing?.Role === 'humas' ? 'selected' : ''}>Humas</option></select></div>
                    <div class="mb-3"><label>Status</label><select class="form-select" id="ptStatus"><option value="Aktif" ${(existing?.Status || 'Aktif') === 'Aktif' ? 'selected' : ''}>Aktif</option><option value="Nonaktif" ${existing?.Status === 'Nonaktif' ? 'selected' : ''}>Nonaktif</option></select></div>
                    <div class="mb-3"><label>Foto (opsional)</label><input type="file" accept="image/*" class="form-control" id="ptFoto"></div>
                    <div class="d-flex gap-2 justify-content-end mt-3">
                        <button class="btn btn-secondary rounded-pill px-4" onclick="Common.closeModal()">Batal</button>
                        <button class="btn btn-primary rounded-pill px-4" onclick="Petugas.save(${index})"><i class="fas fa-save me-1"></i> Simpan</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // ============================================================
    //  SAVE (ADD / UPDATE)
    // ============================================================
    async function save(index) {
        const username = document.getElementById('ptUsername').value.trim();
        const nama = document.getElementById('ptNama').value.trim();
        const pin = document.getElementById('ptPin').value;
        const role = document.getElementById('ptRole').value;
        const status = document.getElementById('ptStatus').value;
        const fotoInput = document.getElementById('ptFoto');

        if (!username || !nama) {
            toast('Username dan Nama wajib diisi.', 'error');
            return;
        }
        if (index === null && !pin) {
            toast('PIN wajib diisi untuk petugas baru.', 'error');
            return;
        }

        let foto = '';
        if (fotoInput.files && fotoInput.files[0]) {
            if (fotoInput.files[0].size > 500000) {
                toast('Ukuran foto maksimal 500KB.', 'error');
                return;
            }
            foto = await new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(fotoInput.files[0]);
            });
        } else if (index !== null && petugasData[index]?.Foto) {
            foto = petugasData[index].Foto;
        }

        const data = { username, nama, role, status };
        if (pin) data.pin = pin;
        if (foto) data.foto = foto;

        const btn = document.querySelector('#petugasModal .btn-primary');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Menyimpan...';

        try {
            let res;
            if (index !== null && index >= 0) {
                res = await API.updatePetugas(data);
            } else {
                res = await API.addPetugas(data);
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
    async function deleteOne(index) {
        const p = petugasData[index];
        if (!p) return;
        if (!confirm(`Hapus petugas ${p.Nama} (@${p.Username})?`)) return;
        const res = await API.deletePetugas(p.Username);
        if (res.status === 'ok') {
            await refresh(true);
            toast('Petugas dihapus.', 'success');
        } else {
            toast(res.message, 'error');
        }
    }

    // ============================================================
    //  TOGGLE STATUS
    // ============================================================
    async function toggleStatus(index) {
        const p = petugasData[index];
        if (!p) return;
        const newStatus = (p.Status === 'Aktif' || !p.Status) ? 'Nonaktif' : 'Aktif';
        if (!confirm(`Ubah status ${p.Nama} menjadi ${newStatus}?`)) return;
        const res = await API.updatePetugas({ username: p.Username, status: newStatus });
        if (res.status === 'ok') {
            await refresh(true);
            toast(`Status ${p.Nama} diubah menjadi ${newStatus}`, 'success');
        } else {
            toast(res.message, 'error');
        }
    }

    // ============================================================
    //  EXPORT CSV
    // ============================================================
    function exportCSV() {
        const data = petugasFiltered.length ? petugasFiltered : petugasData;
        if (!data.length) { toast('Tidak ada data.', 'warning'); return; }
        const rows = [['Username','Nama','Role','Status']];
        data.forEach(p => rows.push([p.Username || '', p.Nama || '', p.Role || '', p.Status || 'Aktif']));
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `petugas_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        toast('✅ CSV berhasil diunduh.', 'success');
    }

    // ============================================================
    //  EXPORT PDF
    // ============================================================
    function exportPDF() {
        const data = petugasFiltered.length ? petugasFiltered : petugasData;
        if (!data.length) { toast('Tidak ada data.', 'warning'); return; }
        const now = new Date();
        const tanggalCetak = now.toLocaleDateString('id-ID', { year:'numeric', month:'long', day:'numeric' });
        const html = `
            <div style="text-align:center;margin-bottom:20px;">
                <h3>SEKOLAH RAKYAT MENENGAH ATAS 19 BANTUL</h3>
                <p>Sentra Terpadu Prof. Dr. Soeharso, Sonosewu</p>
                <hr><h4>DAFTAR PETUGAS</h4>
                <p>Dicetak: ${tanggalCetak}</p>
            </div>
            <table border="1" cellpadding="5" style="width:100%;border-collapse:collapse;font-size:10px;">
                <thead><tr><th>No</th><th>Username</th><th>Nama</th><th>Role</th><th>Status</th></tr></thead>
                <tbody>${data.map((p, i) => `<tr><td>${i+1}</td><td>${p.Username||''}</td><td>${p.Nama||''}</td><td>${p.Role||''}</td><td>${p.Status||'Aktif'}</td></tr>`).join('')}</tbody>
            </table>`;
        html2pdf().set({
            filename: `petugas_${now.toISOString().slice(0,10)}.pdf`,
            margin: 10,
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        }).from(html).save();
    }

    // ============================================================
    //  EXPOSE KE GLOBAL
    // ============================================================
    window.Petugas = {
        renderPetugas,
        applyFilter,
        resetFilter,
        toggleSelectAll,
        toggleSelect,
        refresh,
        showModal,
        save,
        deleteOne,
        toggleStatus,
        exportCSV,
        exportPDF
    };

    console.log('✅ Petugas module loaded');
})();