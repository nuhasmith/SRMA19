// ============================================================
//  SCHEDULE_OVERRIDE.JS – Penimpaan Jadwal (Override)
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
    let overrideData = [];
    let jadwalData = [];

    // ============================================================
    //  RENDER HALAMAN OVERRIDE (dipanggil dari router)
    // ============================================================
    function renderScheduleOverride(container) {
        // Ambil data jadwal dari cache untuk dropdown
        if (jadwalData.length === 0) {
            const cached = getCache();
            if (cached?.jadwal) {
                jadwalData = cached.jadwal;
            }
        }

        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h4 class="fw-bold mb-0"><i class="fas fa-calendar-times me-2" style="color:#0d6efd;"></i>Penimpaan Jadwal (Override)</h4>
                <div class="d-flex gap-2 flex-wrap">
                    <button class="btn btn-sm btn-success rounded-pill" onclick="ScheduleOverride.showModal()">
                        <i class="fas fa-plus me-1"></i> Tambah Override
                    </button>
                    <button class="btn btn-sm btn-secondary rounded-pill" onclick="App.navigate('jadwal')">
                        <i class="fas fa-arrow-left me-1"></i> Kembali
                    </button>
                </div>
            </div>
            <div class="card-modern p-0">
                <div class="table-responsive">
                    <table class="table table-sm table-hover mb-0">
                        <thead class="table-light">
                            <tr><th style="width:30px;">No</th><th>Tanggal</th><th>Sesi ID</th><th>Status</th><th class="text-center">Aksi</th></tr>
                        </thead>
                        <tbody id="overrideTableBody">
                            <tr><td colspan="5" class="text-center py-3 text-muted">Memuat data...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        loadOverrideList();
    }

    // ============================================================
    //  LOAD DAFTAR OVERRIDE
    // ============================================================
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

    // ============================================================
    //  RENDER TABEL OVERRIDE
    // ============================================================
    function renderOverrideTable() {
        const tbody = document.getElementById('overrideTableBody');
        if (!tbody) return;
        if (!overrideData.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-muted">Belum ada override.</td></tr>';
            return;
        }
        let rows = '';
        overrideData.forEach((ov, i) => {
            const statusClass = ov.Status === 'Ditiadakan' ? 'bg-danger' : 'bg-success';
            rows += `<tr>
                <td>${i+1}</td>
                <td>${ov.Tanggal}</td>
                <td><code>${ov.Sesi_ID}</code></td>
                <td><span class="badge ${statusClass}">${ov.Status}</span></td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-danger p-1" onclick="ScheduleOverride.deleteOverride('${ov.ID}')">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>`;
        });
        tbody.innerHTML = rows;
    }

    // ============================================================
    //  MODAL TAMBAH OVERRIDE
    // ============================================================
    function showModal() {
        // Pastikan jadwal sudah dimuat
        if (jadwalData.length === 0) {
            // Muat jadwal terlebih dahulu
            API.getJadwal().then(res => {
                if (res.status === 'success') {
                    jadwalData = res.data;
                    // Update cache
                    const cached = getCache() || {};
                    cached.jadwal = jadwalData;
                    setCache(cached);
                    buildModal();
                } else {
                    toast('Gagal memuat data jadwal: ' + res.message, 'error');
                }
            }).catch(() => {
                toast('Gagal terhubung ke server', 'error');
            });
        } else {
            buildModal();
        }

        function buildModal() {
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
                                ${jadwalData.map(j => `<option value="${j.id}">${j.agama} - ${j.nama} (${j.mulai}-${j.selesai})</option>`).join('')}
                            </select>
                        </div>
                        <div class="mb-3"><label>Status</label>
                            <select class="form-select" id="ovStatus">
                                <option value="Ditiadakan">Ditiadakan</option>
                                <option value="Aktif">Aktif</option>
                            </select>
                        </div>
                        <div class="d-flex gap-2 justify-content-end mt-3">
                            <button class="btn btn-secondary rounded-pill px-4" onclick="Common.closeModal()">Batal</button>
                            <button class="btn btn-primary rounded-pill px-4" onclick="ScheduleOverride.saveOverride()"><i class="fas fa-save me-1"></i> Simpan</button>
                        </div>
                    </div>
                </div>`;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }
    }

    // ============================================================
    //  SAVE OVERRIDE
    // ============================================================
    async function saveOverride() {
        const tanggal = document.getElementById('ovTanggal').value;
        const sesiId = document.getElementById('ovSesiId').value;
        const status = document.getElementById('ovStatus').value;
        if (!tanggal || !sesiId) {
            toast('Tanggal dan Sesi ID wajib diisi.', 'error');
            return;
        }
        const btn = document.querySelector('#overrideModal .btn-primary');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Menyimpan...';
        try {
            const res = await API.addScheduleOverride({ tanggal, sesi_id: sesiId, status });
            if (res.status === 'ok') {
                Common.closeModal();
                await loadOverrideList();
                toast('Override berhasil disimpan.', 'success');
            } else {
                toast(res.message, 'error');
            }
        } catch (e) {
            toast('Gagal menyimpan override.', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-save me-1"></i> Simpan';
        }
    }

    // ============================================================
    //  DELETE OVERRIDE
    // ============================================================
    async function deleteOverride(id) {
        if (!confirm('Hapus override ini?')) return;
        try {
            const res = await API.deleteScheduleOverride(id);
            if (res.status === 'ok') {
                await loadOverrideList();
                toast('Override dihapus.', 'success');
            } else {
                toast(res.message, 'error');
            }
        } catch (e) {
            toast('Gagal terhubung ke server', 'error');
        }
    }

    // ============================================================
    //  EXPOSE KE GLOBAL
    // ============================================================
    window.ScheduleOverride = {
        renderScheduleOverride,
        loadOverrideList,
        showModal,
        saveOverride,
        deleteOverride
    };

    console.log('✅ Schedule Override module loaded');
})();