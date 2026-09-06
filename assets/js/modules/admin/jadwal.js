// ============================================================
//  JADWAL.JS – Jadwal Kegiatan + Schedule Override + Update Sholat
//  SRMA 19 Bantul
//  Versi: 9.0.0 - FULL FIX, Anti Error, Semua Fungsi Lengkap
// ============================================================

(function() {
    'use strict';

    // --- SafeStorage Internal (Mengatasi Tracking Prevention) ---
    const SafeStorage = window.SafeStorage || (() => {
        const mem = { local: {}, session: {} };
        return {
            getItem: (k, t = 'local') => mem[t][k] || null,
            setItem: (k, v, t = 'local') => mem[t][k] = v,
            removeItem: (k, t = 'local') => delete mem[t][k]
        };
    })();

    // --- Ambil fungsi bersama dari Common ---
    const { getCachedData: getCache, setCachedData: setCache, showToast: toast, closeModal } = window.Common || {};

    // ============================================================
    //  STATE
    // ============================================================
    let jadwalData = [];
    let filterAgamaJadwal = '';
    let overrideData = [];

    // ============================================================
    //  SAFE DOM HELPERS (PENTING: Mencegah Error Null)
    // ============================================================
    function getEl(id) {
        return document.getElementById(id);
    }

    function setHTML(id, html) {
        const el = getEl(id);
        if (el) {
            el.innerHTML = html;
        } else {
            console.warn('Elemen tidak ditemukan:', id);
        }
    }

    function safeStr(val, fallback = '') {
        return (val === null || val === undefined) ? fallback : String(val);
    }

    // ============================================================
    //  RENDER JADWAL (ADMIN) - AUTO LOAD & ANTI RACE
    // ============================================================
    function renderJadwal(container) {
        if (!container) return;
        // Buat wadah utama
        container.innerHTML = `<div id="jadwalContent"></div>`;

        // Beri jeda agar DOM benar-benar siap, lalu render
        setTimeout(() => {
            renderJadwalContent();
        }, 100);
    }

    // ============================================================
    //  RENDER JADWAL CONTENT (ADMIN) - SAFE DOM
    // ============================================================
    function renderJadwalContent() {
        const container = getEl('jadwalContent');
        if (!container) {
            // Jika elemen belum ada, coba lagi sebentar lagi (race condition)
            setTimeout(renderJadwalContent, 100);
            return;
        }

        // Ambil data dari cache / fetch jika kosong
        if (jadwalData.length === 0) {
            const cached = getCache();
            if (cached && cached.jadwal) {
                jadwalData = cached.jadwal.sort((a, b) => (parseInt(a.id) || 0) - (parseInt(b.id) || 0));
            } else {
                // Belum ada di cache, panggil refresh untuk ambil dari server
                refresh(true);
                return;
            }
        }

        const agamaList = [...new Set(jadwalData.map(j => safeStr(j.agama)).filter(Boolean))].sort();
        const filtered = filterAgamaJadwal ? jadwalData.filter(j => safeStr(j.agama) === filterAgamaJadwal) : jadwalData;

        let html = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h4 class="fw-bold mb-0"><i class="fas fa-calendar-alt me-2" style="color:#0d6efd;"></i>Jadwal Kegiatan</h4>
                <div class="d-flex gap-2 flex-wrap">
                    <button class="btn btn-sm btn-warning rounded-pill" onclick="Jadwal.updatePrayerTimes()"><i class="fas fa-cloud-sun me-1"></i>Perbarui Sholat</button>
                    <button class="btn btn-sm btn-success rounded-pill" onclick="Jadwal.showModal()"><i class="fas fa-plus"></i> Tambah</button>
                    <button class="btn btn-sm btn-info rounded-pill" onclick="Jadwal.renderOverride()"><i class="fas fa-calendar-times me-1"></i> Override</button>
                    <button class="btn btn-sm btn-refresh rounded-pill" onclick="Jadwal.refresh(false)"><i class="fas fa-sync-alt me-1"></i> Refresh</button>
                </div>
            </div>
            <div class="card-modern mb-3">
                <div class="filter-group">
                    <label class="fw-bold me-2">Filter Agama:</label>
                    <select class="form-select form-select-sm" id="filterAgamaJadwal" onchange="Jadwal.changeFilter(this.value)" style="width:150px;">
                        <option value="">Semua Agama</option>
                        ${agamaList.map(a => `<option value="${a}" ${filterAgamaJadwal === a ? 'selected' : ''}>${a}</option>`).join('')}
                    </select>
                    <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="Jadwal.resetFilter()">Reset</button>
                </div>
            </div>
            <div id="jadwalListContainer"></div>
        `;

        container.innerHTML = html;

        // Render list jadwal
        if (!jadwalData.length) {
            setHTML('jadwalListContainer', '<div class="text-center py-5 text-muted">Belum ada jadwal. Klik "Tambah" untuk membuat baru.</div>');
            return;
        }
        if (!filtered.length) {
            setHTML('jadwalListContainer', '<div class="text-center py-5 text-muted">Tidak ada jadwal untuk agama yang dipilih.</div>');
            return;
        }

        const grouped = {};
        filtered.forEach(j => {
            const agama = safeStr(j.agama, 'Lainnya');
            if (!grouped[agama]) grouped[agama] = [];
            grouped[agama].push(j);
        });

        let listHtml = '';
        for (const [agama, items] of Object.entries(grouped)) {
            listHtml += `<div class="mb-4"><h5 class="fw-bold mb-2"><i class="fas fa-users me-2" style="color:#0d6efd;"></i>${agama} <span class="badge bg-secondary rounded-pill">${items.length}</span></h5><div class="row g-2">`;
            items.forEach(j => {
                listHtml += `
                    <div class="col-md-6 col-lg-4">
                        <div class="card-modern p-3" style="border-left:4px solid ${safeStr(j.color, '#0d6efd')};">
                            <div class="d-flex align-items-center gap-3">
                                <div style="width:40px;height:40px;border-radius:10px;background:${safeStr(j.bg, '#f0f0f0')};color:${safeStr(j.color, '#333')};display:flex;align-items:center;justify-content:center;font-size:1.1rem;"><i class="fas ${safeStr(j.icon, 'fa-circle')}"></i></div>
                                <div class="flex-grow-1"><strong class="small">${safeStr(j.nama)}</strong><div><small class="text-muted">${safeStr(j.mulai)} - ${safeStr(j.selesai)}</small></div></div>
                                <div class="d-flex gap-1 flex-shrink-0">
                                    <button class="btn btn-sm btn-outline-warning p-1" onclick="Jadwal.editById('${safeStr(j.id)}')" title="Edit"><i class="fas fa-edit"></i></button>
                                    <button class="btn btn-sm btn-outline-danger p-1" onclick="Jadwal.deleteById('${safeStr(j.id)}')" title="Hapus"><i class="fas fa-trash-alt"></i></button>
                                </div>
                            </div>
                        </div>
                    </div>`;
            });
            listHtml += `</div></div>`;
        }
        setHTML('jadwalListContainer', listHtml);
    }

    // ============================================================
    //  REFRESH DATA
    // ============================================================
    async function refresh(silent = false) {
        try {
            const res = await API.getJadwal();
            if (res.status === 'success') {
                jadwalData = res.data.sort((a, b) => (parseInt(a.id) || 0) - (parseInt(b.id) || 0));
                if (setCache) setCache({ ...getCache(), jadwal: jadwalData });
                renderJadwalContent();
                if (!silent && toast) toast('✅ Jadwal diperbarui.', 'success');
            } else {
                if (!silent && toast) toast('❌ Gagal memuat jadwal.', 'error');
            }
        } catch (e) {
            if (!silent && toast) toast('❌ Gagal terhubung ke server.', 'error');
        }
    }

    // ============================================================
    //  CRUD JADWAL (Modal Tambah/Edit)
    // ============================================================
    function showModal(index = null) {
        const existing = index !== null && index >= 0 ? jadwalData[index] : null;
        const icons = ['fa-sun','fa-coffee','fa-mosque','fa-church','fa-om','fa-dharmachakra','fa-spa','fa-users','fa-utensil-spoon','fa-moon','fa-cross'];
        const agamaOptions = ['Islam','Kristen','Katolik','Hindu','Buddha','Penghayat','Lainnya'];
        const modalHtml = `
            <div class="modal-overlay" id="jadwalModal">
                <div class="modal-box">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="fw-bold mb-0">${existing ? '✏️ Edit Jadwal' : '➕ Tambah Jadwal'}</h5>
                        <button class="btn-close" onclick="Common.closeModal()"></button>
                    </div>
                    <div class="mb-3"><label>Agama</label><select class="form-select" id="jmAgama">${agamaOptions.map(a => `<option ${(existing?.agama||'Islam')===a?'selected':''}>${a}</option>`).join('')}</select></div>
                    <div class="mb-3"><label>Nama Kegiatan</label><input class="form-control" id="jmNama" value="${existing?.nama||''}" placeholder="Contoh: Apel Pagi"></div>
                    <div class="row mb-3">
                        <div class="col"><label>Mulai</label><input type="time" class="form-control" id="jmMulai" value="${existing?.mulai||''}"></div>
                        <div class="col"><label>Selesai</label><input type="time" class="form-control" id="jmSelesai" value="${existing?.selesai||''}"></div>
                    </div>
                    <div class="mb-3"><label>Icon</label><select class="form-select" id="jmIcon">${icons.map(i => `<option value="${i}" ${existing?.icon===i?'selected':''}>${i}</option>`).join('')}</select></div>
                    <div class="mb-3"><label>Warna</label><input type="color" class="form-control" id="jmColor" value="${existing?.color||'#0d6efd'}"></div>
                    <div class="d-flex gap-2 justify-content-end mt-3">
                        <button class="btn btn-secondary" onclick="Common.closeModal()">Batal</button>
                        <button class="btn btn-primary" onclick="Jadwal.save(${index})"><i class="fas fa-save me-1"></i>Simpan</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    async function save(index) {
        const agama = getEl('jmAgama')?.value;
        const nama = getEl('jmNama')?.value.trim();
        const mulai = getEl('jmMulai')?.value;
        const selesai = getEl('jmSelesai')?.value;
        const icon = getEl('jmIcon')?.value;
        const color = getEl('jmColor')?.value;
        if (!nama || !mulai || !selesai) { toast('Nama, Mulai, Selesai wajib diisi.', 'error'); return; }
        const newEntry = { id: (index !== null && jadwalData[index]?.id) ? jadwalData[index].id : Date.now(), agama, nama, mulai, selesai, icon, color, bg: color + '1a' };
        let updatedJadwal = [...jadwalData];
        if (index !== null && index >= 0) {
            if (index < updatedJadwal.length) updatedJadwal[index] = newEntry;
            else { toast('Index tidak valid.', 'error'); return; }
        } else {
            updatedJadwal.push(newEntry);
        }
        const btn = document.querySelector('#jadwalModal .btn-primary');
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Menyimpan...'; }
        try {
            const res = await API.saveJadwal(updatedJadwal);
            if (res.status === 'ok') {
                jadwalData = updatedJadwal.sort((a,b) => (parseInt(a.id)||0) - (parseInt(b.id)||0));
                setCache({ ...getCache(), jadwal: jadwalData });
                closeModal();
                renderJadwalContent();
                toast('✅ Jadwal disimpan.', 'success');
            } else {
                toast(res.message, 'error');
            }
        } catch (e) {
            toast('Gagal menyimpan jadwal.', 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save me-1"></i>Simpan'; }
        }
    }

    function editById(id) {
        const idx = jadwalData.findIndex(j => String(j.id) === String(id));
        if (idx === -1) { toast('Jadwal tidak ditemukan.', 'error'); return; }
        showModal(idx);
    }

    async function deleteById(id) {
        const idx = jadwalData.findIndex(j => String(j.id) === String(id));
        if (idx === -1) { toast('Jadwal tidak ditemukan.', 'error'); return; }
        if (!confirm('Hapus jadwal ini?')) return;
        const deleted = jadwalData.splice(idx, 1);
        try {
            const res = await API.saveJadwal(jadwalData);
            if (res.status === 'ok') {
                setCache({ ...getCache(), jadwal: jadwalData });
                renderJadwalContent();
                toast('✅ Jadwal dihapus.', 'success');
            } else {
                jadwalData.splice(idx, 0, deleted[0]);
                toast(res.message, 'error');
            }
        } catch (e) {
            jadwalData.splice(idx, 0, deleted[0]);
            toast('Gagal menghapus jadwal.', 'error');
        }
    }

    // ============================================================
    //  FILTER & RESET
    // ============================================================
    function changeFilter(agama) {
        filterAgamaJadwal = agama;
        renderJadwalContent();
        SafeStorage.setItem('srma19_jadwal_filter', agama);
    }

    function resetFilter() {
        filterAgamaJadwal = '';
        SafeStorage.removeItem('srma19_jadwal_filter');
        renderJadwalContent();
        const select = getEl('filterAgamaJadwal');
        if (select) select.value = '';
    }

    // ============================================================
    //  UPDATE PRAYER TIMES
    // ============================================================
    async function updatePrayerTimes() {
        const date = getEl('prayerDate')?.value;
        if (!date) { toast('Pilih tanggal terlebih dahulu.', 'warning'); return; }
        const btn = document.querySelector('button[onclick*="updatePrayerTimes"]');
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Memperbarui...'; }
        try {
            const res = await API.updatePrayerTimes(date);
            if (res.status === 'ok') {
                toast(res.message, 'success');
                await refresh(true);
            } else {
                toast(res.message, 'error');
            }
        } catch (e) {
            toast('Gagal terhubung ke server.', 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-cloud-sun me-1"></i>Perbarui Sholat'; }
        }
    }

    // ============================================================
    //  SCHEDULE OVERRIDE
    // ============================================================
    function renderOverride() {
        const container = getEl('mainContent');
        if (!container) return;
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h4 class="fw-bold mb-0"><i class="fas fa-calendar-times me-2" style="color:#0d6efd;"></i>Penimpaan Jadwal (Override)</h4>
                <div class="d-flex gap-2 flex-wrap">
                    <button class="btn btn-sm btn-success rounded-pill" onclick="Jadwal.showOverrideModal()"><i class="fas fa-plus me-1"></i> Tambah Override</button>
                    <button class="btn btn-sm btn-secondary rounded-pill" onclick="App.navigate('jadwal')"><i class="fas fa-arrow-left me-1"></i> Kembali</button>
                </div>
            </div>
            <div class="card-modern p-0"><div class="table-responsive"><table class="table table-sm table-hover mb-0"><thead class="table-light"><tr><th style="width:30px;">No</th><th>Tanggal</th><th>Sesi ID</th><th>Status</th><th class="text-center">Aksi</th></tr></thead><tbody id="overrideTableBody"><tr><td colspan="5" class="text-center py-3 text-muted">Memuat data...</td></tr></tbody></table></div></div>
        `;
        loadOverrideList();
    }

    async function loadOverrideList() {
        try {
            const res = await API.listScheduleOverrides();
            if (res.status === 'success') {
                overrideData = res.data;
                renderOverrideTable();
            } else {
                toast('Gagal memuat override: ' + res.message, 'error');
            }
        } catch (e) {
            toast('Gagal terhubung ke server', 'error');
        }
    }

    function renderOverrideTable() {
        const tbody = getEl('overrideTableBody');
        if (!tbody) return;
        if (!overrideData.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-muted">Belum ada override.</td></tr>';
            return;
        }
        let rows = '';
        overrideData.forEach((ov, i) => {
            const statusClass = ov.Status === 'Ditiadakan' ? 'bg-danger' : 'bg-success';
            rows += `<tr><td>${i+1}</td><td>${safeStr(ov.Tanggal)}</td><td><code>${safeStr(ov.Sesi_ID)}</code></td><td><span class="badge ${statusClass}">${safeStr(ov.Status)}</span></td><td class="text-center"><button class="btn btn-sm btn-outline-danger p-1" onclick="Jadwal.deleteOverride('${safeStr(ov.ID)}')"><i class="fas fa-trash-alt"></i></button></td></tr>`;
        });
        tbody.innerHTML = rows;
    }

    function showOverrideModal() {
        const modalHtml = `
            <div class="modal-overlay" id="overrideModal">
                <div class="modal-box" style="max-width: 500px;">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="fw-bold mb-0">➕ Tambah Override</h5>
                        <button class="btn-close" onclick="Common.closeModal()"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="mb-3"><label>Tanggal <span class="text-danger">*</span></label><input type="date" class="form-control" id="ovTanggal"></div>
                    <div class="mb-3"><label>Sesi ID <span class="text-danger">*</span></label>
                        <select class="form-select" id="ovSesiId">
                            <option value="">-- Pilih Sesi --</option>
                            ${jadwalData.map(j => `<option value="${safeStr(j.id)}">${safeStr(j.agama)} - ${safeStr(j.nama)} (${safeStr(j.mulai)}-${safeStr(j.selesai)})</option>`).join('')}
                        </select>
                    </div>
                    <div class="mb-3"><label>Status</label><select class="form-select" id="ovStatus"><option value="Ditiadakan">Ditiadakan</option><option value="Aktif">Aktif</option></select></div>
                    <div class="d-flex gap-2 justify-content-end mt-3">
                        <button class="btn btn-secondary rounded-pill px-4" onclick="Common.closeModal()">Batal</button>
                        <button class="btn btn-primary rounded-pill px-4" onclick="Jadwal.saveOverride()"><i class="fas fa-save me-1"></i> Simpan</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    async function saveOverride() {
        const tanggal = getEl('ovTanggal')?.value;
        const sesiId = getEl('ovSesiId')?.value;
        const status = getEl('ovStatus')?.value;
        if (!tanggal || !sesiId) { toast('Tanggal dan Sesi ID wajib diisi.', 'error'); return; }
        const btn = document.querySelector('#overrideModal .btn-primary');
        if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Menyimpan...'; }
        try {
            const res = await API.addScheduleOverride({ tanggal, sesi_id: sesiId, status });
            if (res.status === 'ok') {
                closeModal();
                await loadOverrideList();
                toast('Override berhasil disimpan.', 'success');
            } else {
                toast(res.message, 'error');
            }
        } catch (e) {
            toast('Gagal menyimpan override.', 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save me-1"></i> Simpan'; }
        }
    }

    async function deleteOverride(id) {
        if (!confirm('Hapus override ini?')) return;
        const res = await API.deleteScheduleOverride(id);
        if (res.status === 'ok') {
            await loadOverrideList();
            toast('Override dihapus.', 'success');
        } else {
            toast(res.message, 'error');
        }
    }

    // ============================================================
    //  RENDER JADWAL UNTUK PETUGAS
    // ============================================================
    function renderJadwalPetugas(container) {
        if (!container) return;
        if (jadwalData.length === 0) {
            const cached = getCache();
            if (cached?.jadwal) jadwalData = cached.jadwal.sort((a, b) => (parseInt(a.id) || 0) - (parseInt(b.id) || 0));
            else { refresh(true); return; }
        }
        const agamaList = [...new Set(jadwalData.map(j => safeStr(j.agama)).filter(Boolean))].sort();
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h4 class="fw-bold mb-0"><i class="fas fa-calendar-alt me-2" style="color:#0d6efd;"></i>Jadwal Kegiatan</h4>
                <button class="btn btn-sm btn-refresh rounded-pill" onclick="Jadwal.refresh(false)"><i class="fas fa-sync-alt me-1"></i> Refresh</button>
            </div>
            <div class="card-modern mb-3">
                <div class="filter-group">
                    <label class="fw-bold me-2">Filter Agama:</label>
                    <select class="form-select form-select-sm" id="filterAgamaJadwalPetugas" onchange="Jadwal.changeFilter(this.value)" style="width:150px;">
                        <option value="">Semua Agama</option>
                        ${agamaList.map(a => `<option value="${a}">${a}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div id="jadwalListContainerPetugas"></div>
        `;
        setTimeout(renderJadwalSimple, 100);
    }

    function renderJadwalSimple() {
        const container = getEl('jadwalListContainerPetugas');
        if (!container) return;
        const filtered = filterAgamaJadwal ? jadwalData.filter(j => safeStr(j.agama) === filterAgamaJadwal) : jadwalData;
        if (!filtered.length) {
            container.innerHTML = '<div class="text-center py-5 text-muted">Tidak ada jadwal.</div>';
            return;
        }
        const grouped = {};
        filtered.forEach(j => { const agama = safeStr(j.agama, 'Lainnya'); if (!grouped[agama]) grouped[agama] = []; grouped[agama].push(j); });
        let html = '<div class="schedule-container">';
        for (const [agama, items] of Object.entries(grouped)) {
            html += `<div class="schedule-group" style="border-left-color: ${safeStr(items[0].color, '#0d6efd')};">`;
            items.forEach(j => { html += `<div class="schedule-item"><span class="schedule-time">${safeStr(j.mulai)}</span><span class="schedule-name">${safeStr(j.nama)}</span><span class="schedule-duration">${safeStr(j.mulai)} - ${safeStr(j.selesai)}</span></div>`; });
            html += '</div>';
        }
        html += '</div>';
        container.innerHTML = html;
    }

    // ============================================================
    //  EXPOSE KE GLOBAL
    // ============================================================
    window.Jadwal = {
        renderJadwal,
        renderJadwalContent,
        renderJadwalPetugas,
        refresh,
        showModal,
        save,
        editById,
        deleteById,
        changeFilter,
        resetFilter,
        updatePrayerTimes,
        renderOverride,
        showOverrideModal,
        saveOverride,
        deleteOverride,
        loadOverrideList
    };

    console.log('✅ Jadwal module loaded (v9.0.0 - Final Fix, Anti Error)');
})();