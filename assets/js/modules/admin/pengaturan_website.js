// ============================================================
//  PENGATURAN_WEBSITE.JS – Pengaturan Tampilan Website Publik
//  SRMA 19 Bantul
//  Versi: 1.0.0 - SPA Ready
//  Fungsi: Mengaktifkan/menonaktifkan bagian website secara real-time
// ============================================================

(function() {
    'use strict';

    // Ambil fungsi bersama
    const { getCachedData: getCache, setCachedData: setCache, showToast: toast } = window.Common;

    // ============================================================
    //  STATE
    // ============================================================
    let settingsData = {};
    const CACHE_KEY = 'srma19_settings';

    // ============================================================
    //  RENDER PENGATURAN
    // ============================================================
    function renderPengaturanWebsite(container) {
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
    //  LOAD SETTINGS
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
                if (!forceRefresh) toast('Pengaturan tersinkronisasi', 'success');
            } else {
                if (!localData) container.innerHTML = `<div class="alert alert-danger">Gagal memuat pengaturan: ${res.message}</div>`;
            }
        } catch (e) {
            if (!localData) container.innerHTML = `<div class="alert alert-danger">Gagal terhubung ke server.</div>`;
        }
    }

    // ============================================================
    //  RENDER SETTINGS FORM (toggle switch)
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
        let html = `<div class="row g-3">`;
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
                </div>
            `;
        }
        html += `</div>`;
        container.innerHTML = html;
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
                toast(`Pengaturan "${key}" diperbarui.`, 'success');
            } else {
                toast('Gagal memperbarui pengaturan.', 'error');
                const sw = document.getElementById(`switch_${key}`);
                if (sw) sw.checked = !checked; // rollback
            }
        } catch (e) {
            toast('Gagal terhubung ke server.', 'error');
            const sw = document.getElementById(`switch_${key}`);
            if (sw) sw.checked = !checked;
        }
    }

    // ============================================================
    //  EXPOSE KE GLOBAL
    // ============================================================
    window.PengaturanWebsite = {
        renderPengaturanWebsite,
        loadSettings,
        renderSettingsForm,
        updateSetting
    };

    console.log('✅ Pengaturan Website module loaded');
})();