// ============================================================
//  PENGATURAN_WEBSITE.JS – Pengaturan Tampilan Website Publik
//  SRMA 19 Bantul
//  Versi: 3.0.0 - Final Fix, Tambah Deskripsi Lokasi, Anti Error
//  Fungsi: Mengaktifkan/menonaktifkan bagian website + edit konten
// ============================================================

(function() {
    'use strict';

    // Ambil fungsi bersama dari Common
    const Common = window.Common || {};
    const getCachedData = Common.getCachedData || function() { return null; };
    const setCachedData = Common.setCachedData || function() {};
    const showToast = Common.showToast || function() {};

    // ============================================================
    //  STATE
    // ============================================================
    let settingsData = {};
    const CACHE_KEY = 'srma19_settings';

    // ============================================================
    //  RENDER PENGATURAN
    // ============================================================
    function renderPengaturanWebsite(container) {
        if (!container) return;

        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h4 class="fw-bold mb-0"><i class="fas fa-cog me-2" style="color:#0d6efd;"></i>Pengaturan Tampilan Website</h4>
                <button class="btn btn-sm btn-outline-primary rounded-pill" onclick="PengaturanWebsite.loadSettings(true)">
                    <i class="fas fa-sync-alt me-1"></i> Refresh
                </button>
            </div>
            <div class="card-modern">
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i> Atur tampilan menu di halaman utama (<strong>index.html</strong>). 
                    Perubahan akan berlaku setelah refresh halaman website.
                </div>
                <div id="settingsForm"></div>
            </div>
        `;
        loadSettings();
    }

    // ============================================================
    //  LOAD SETTINGS (dari server atau cache)
    // ============================================================
    async function loadSettings(forceRefresh = false) {
        const container = document.getElementById('settingsForm');
        if (!container) return;

        container.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary"></div><p class="text-muted mt-2">Memuat pengaturan...</p></div>';

        // Gunakan cache jika tersedia dan tidak force refresh
        let localData = null;
        if (!forceRefresh) {
            try {
                const raw = localStorage.getItem(CACHE_KEY);
                if (raw) localData = JSON.parse(raw);
            } catch (e) {}
        }

        if (localData && Object.keys(localData).length > 0) {
            settingsData = localData;
            renderSettingsForm();
        }

        try {
            const res = await API.getSettings();
            if (res.status === 'success') {
                settingsData = res.data;
                localStorage.setItem(CACHE_KEY, JSON.stringify(res.data));
                renderSettingsForm();
                if (!forceRefresh) showToast('Pengaturan tersinkronisasi', 'success');
            } else {
                if (!localData) {
                    container.innerHTML = `<div class="alert alert-danger">Gagal memuat pengaturan: ${res.message}</div>`;
                }
            }
        } catch (e) {
            if (!localData) {
                container.innerHTML = `<div class="alert alert-danger">Gagal terhubung ke server.</div>`;
            }
        }
    }

    // ============================================================
    //  RENDER SETTINGS FORM (toggle switch + konten)
    // ============================================================
    function renderSettingsForm() {
        const container = document.getElementById('settingsForm');
        if (!container) return;

        const labels = {
            show_berita: 'Tampilkan Berita',
            show_video: 'Tampilkan Video',
            show_jadwal: 'Tampilkan Jadwal',
            show_statistik: 'Tampilkan Statistik',
            show_fasilitas: 'Tampilkan Fasilitas',
            show_tentang: 'Tampilkan Tentang'
        };

        let html = `<div class="row g-3 mb-4">`;
        for (const [key, label] of Object.entries(labels)) {
            const value = settingsData[key] !== undefined ? settingsData[key] : 'true';
            const checked = value === 'true' ? 'checked' : '';
            html += `
                <div class="col-md-6 col-lg-4">
                    <div class="card p-3 border-0 shadow-sm">
                        <div class="form-check form-switch d-flex justify-content-between align-items-center">
                            <label class="form-check-label fw-semibold" for="switch_${key}">${label}</label>
                            <input class="form-check-input" type="checkbox" id="switch_${key}" ${checked} onchange="PengaturanWebsite.updateSetting('${key}', this.checked)">
                        </div>
                    </div>
                </div>`;
        }
        html += `</div>`;

        // ===== KONTEN TENTANG KAMI =====
        html += `
            <hr>
            <h5 class="fw-bold mt-4"><i class="fas fa-info-circle me-2"></i>Konten Tentang Kami</h5>
            <div class="mb-3">
                <label>Judul Tentang</label>
                <input type="text" class="form-control" id="tentang_judul" value="${settingsData['tentang_judul'] || 'Sekolah Rakyat 19 Bantul'}">
            </div>
            <div class="mb-3">
                <label>Deskripsi Tentang</label>
                <textarea class="form-control" id="tentang_deskripsi" rows="4">${settingsData['tentang_deskripsi'] || ''}</textarea>
            </div>
            <div class="mb-3">
                <label>URL Gambar Tentang</label>
                <input type="url" class="form-control" id="tentang_gambar" value="${settingsData['tentang_gambar'] || ''}">
                <div class="mt-2"><img id="previewTentangGambar" src="${settingsData['tentang_gambar'] || ''}" style="max-height:120px;border-radius:8px;" onerror="this.style.display='none'"></div>
            </div>
        `;

        // ===== KONTEN LOKASI =====
        html += `
            <hr>
            <h5 class="fw-bold mt-4"><i class="fas fa-map-marker-alt me-2"></i>Konten Lokasi</h5>
            <div class="mb-3">
                <label>Alamat Lokasi</label>
                <textarea class="form-control" id="lokasi_alamat" rows="3">${settingsData['lokasi_alamat'] || ''}</textarea>
            </div>
            <div class="mb-3">
                <label>Deskripsi Lokasi</label>
                <textarea class="form-control" id="lokasi_deskripsi" rows="2">${settingsData['lokasi_deskripsi'] || ''}</textarea>
            </div>
            <div class="mb-3">
                <label>Embed Link Google Maps</label>
                <textarea class="form-control" id="lokasi_maps" rows="3">${settingsData['lokasi_maps'] || ''}</textarea>
            </div>
            <div class="d-flex justify-content-end mt-4">
                <button class="btn btn-primary rounded-pill px-4" onclick="PengaturanWebsite.simpanKonten()"><i class="fas fa-save me-1"></i>Simpan Konten</button>
            </div>
        `;

        container.innerHTML = html;

        // Preview gambar saat URL berubah
        const inputGambar = document.getElementById('tentang_gambar');
        if (inputGambar) {
            inputGambar.addEventListener('input', function() {
                const preview = document.getElementById('previewTentangGambar');
                if (preview) {
                    preview.src = this.value;
                    preview.style.display = this.value ? '' : 'none';
                }
            });
        }
    }

    // ============================================================
    //  UPDATE SETTING (toggle ON/OFF)
    // ============================================================
    async function updateSetting(key, checked) {
        const value = checked ? 'true' : 'false';
        try {
            const res = await API.updateSettings(key, value);
            if (res.status === 'ok') {
                settingsData[key] = value;
                localStorage.setItem(CACHE_KEY, JSON.stringify(settingsData));
                const sw = document.getElementById(`switch_${key}`);
                if (sw) sw.checked = checked;
                showToast(`Pengaturan "${key}" diperbarui.`, 'success');
            } else {
                showToast('Gagal memperbarui pengaturan.', 'error');
                const sw = document.getElementById(`switch_${key}`);
                if (sw) sw.checked = !checked; // rollback
            }
        } catch (e) {
            showToast('Gagal terhubung ke server.', 'error');
            const sw = document.getElementById(`switch_${key}`);
            if (sw) sw.checked = !checked;
        }
    }

    // ============================================================
    //  SIMPAN KONTEN TENTANG & LOKASI
    // ============================================================
    async function simpanKonten() {
        const data = {
            tentang_judul: document.getElementById('tentang_judul').value,
            tentang_deskripsi: document.getElementById('tentang_deskripsi').value,
            tentang_gambar: document.getElementById('tentang_gambar').value,
            lokasi_alamat: document.getElementById('lokasi_alamat').value,
            lokasi_deskripsi: document.getElementById('lokasi_deskripsi').value,
            lokasi_maps: document.getElementById('lokasi_maps').value
        };

        // Validasi sederhana
        if (!data.tentang_judul || !data.tentang_deskripsi) {
            showToast('Judul dan deskripsi tentang wajib diisi.', 'error');
            return;
        }

        try {
            // Simpan satu per satu ke server
            for (const [key, value] of Object.entries(data)) {
                const res = await API.updateSettings(key, value);
                if (res.status !== 'ok') {
                    throw new Error(`Gagal simpan ${key}: ${res.message}`);
                }
                // Update cache lokal
                settingsData[key] = value;
            }
            localStorage.setItem(CACHE_KEY, JSON.stringify(settingsData));
            showToast('✅ Konten Tentang & Lokasi berhasil disimpan.', 'success');
        } catch (e) {
            showToast('❌ Gagal menyimpan konten: ' + e.message, 'error');
        }
    }

    // ============================================================
    //  EXPOSE KE GLOBAL
    // ============================================================
    window.PengaturanWebsite = {
        renderPengaturanWebsite,
        loadSettings,
        renderSettingsForm,
        updateSetting,
        simpanKonten
    };

    console.log('✅ Pengaturan Website module loaded (v3.0.0 - Final Fix)');
})();