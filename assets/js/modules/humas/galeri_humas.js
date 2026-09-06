// ============================================================
//  GALERI_HUMAS.JS – Manajemen Galeri untuk Role Humas
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
    let galeriData = [];
    let galeriFiltered = [];

    // ============================================================
    //  HELPER: RESIZE GAMBAR (Kompresi ke 1200px)
    // ============================================================
    function resizeImage(file, maxW = 1200, maxH = 1200, quality = 0.7) {
        return new Promise((resolve, reject) => {
            if (!file) { reject(new Error('File tidak ditemukan')); return; }
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let w = img.width, h = img.height;
                    if (w > h) {
                        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
                    } else {
                        if (h > maxH) { w = Math.round(w * maxH / h); h = maxH; }
                    }
                    canvas.width = w; canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = () => { reject(new Error('Gagal memuat gambar ke DOM')); };
                img.src = e.target.result;
            };
            reader.onerror = () => { reject(new Error('Gagal membaca file asli.')); };
            reader.readAsDataURL(file);
        });
    }

    // ============================================================
    //  RENDER GALERI HUMAS
    // ============================================================
    function renderGaleriHumas(container) {
        if (galeriData.length === 0) {
            const cached = getCache();
            if (cached?.galeri) {
                galeriData = cached.galeri;
                galeriFiltered = [...galeriData];
            }
        }

        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h4 class="fw-bold mb-0"><i class="fas fa-images me-2" style="color:#0d6efd;"></i>Galeri Foto & Video <span class="badge bg-secondary rounded-pill">${galeriData.length}</span></h4>
                <div class="d-flex gap-2 flex-wrap">
                    <button class="btn btn-sm btn-success rounded-pill" onclick="HumasGaleri.showModal(null)"><i class="fas fa-plus me-1"></i> Tambah Konten</button>
                    <button class="btn btn-sm btn-refresh rounded-pill" onclick="HumasGaleri.refresh(false)"><i class="fas fa-sync-alt me-1"></i> Refresh</button>
                </div>
            </div>
            <div class="card-modern mb-3">
                <div class="filter-group">
                    <input type="text" id="searchGaleri" placeholder="🔍 Cari judul..." style="flex:1;min-width:150px;" oninput="HumasGaleri.applyFilter()">
                    <select id="filterStatusGaleri" onchange="HumasGaleri.applyFilter()">
                        <option value="">Semua Status</option>
                        <option value="Draft">Draft</option>
                        <option value="Publish">Publish</option>
                    </select>
                    <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="HumasGaleri.resetFilter()">Reset</button>
                    <span class="small text-muted ms-2" id="infoCountGaleri">Menampilkan ${galeriFiltered.length} dari ${galeriData.length} entri</span>
                </div>
            </div>
            <div class="card-modern p-0"><div id="galeriTableContainer"></div></div>
        `;

        applyFilter();
        if (galeriData.length === 0) refreshGaleriHumas(true);
    }

    // ============================================================
    //  FILTER
    // ============================================================
    function applyFilter() {
        const q = (document.getElementById('searchGaleri')?.value || '').toLowerCase().trim();
        const status = document.getElementById('filterStatusGaleri')?.value || '';
        galeriFiltered = galeriData.filter(g => (!q || (g.Judul || '').toLowerCase().includes(q)) && (!status || (g.Status || 'Draft') === status));
        renderTable();
        const info = document.getElementById('infoCountGaleri');
        if (info) info.textContent = `Menampilkan ${galeriFiltered.length} dari ${galeriData.length} entri`;
    }

    function resetFilter() {
        document.getElementById('searchGaleri').value = '';
        document.getElementById('filterStatusGaleri').value = '';
        applyFilter();
    }

    // ============================================================
    //  RENDER TABLE
    // ============================================================
    function renderTable() {
        let rows = '';
        galeriFiltered.forEach((g, i) => {
            const realIdx = galeriData.indexOf(g);
            const isVideo = g.Link_Video && g.Link_Video.trim() !== '';
            let thumbSrc = 'https://placehold.co/80x45/e2e8f0/64748b?text=No+Image';
            if (g.Gambar && (g.Gambar.startsWith('data:image') || g.Gambar.startsWith('http'))) thumbSrc = g.Gambar;
            else if (isVideo) {
                let videoId = '';
                const url = g.Link_Video;
                if (url.includes('v=')) videoId = url.split('v=')[1]?.split('&')[0];
                else if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1]?.split('?')[0];
                if (videoId) thumbSrc = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
            }
            rows += `<tr>
                <td>${i+1}</td>
                <td><img src="${thumbSrc}" style="width:80px;height:45px;object-fit:cover;border-radius:6px;background:#f1f5f9;" onerror="this.onerror=null;this.src='https://placehold.co/80x45/e2e8f0/64748b?text=Gagal';"></td>
                <td><strong>${g.Judul || '-'}</strong></td>
                <td>${g.Keterangan || '-'}</td>
                <td><span class="badge ${isVideo ? 'bg-info' : 'bg-primary'}"><i class="fas ${isVideo ? 'fa-video' : 'fa-image'} me-1"></i> ${isVideo ? 'Video' : 'Foto'}</span></td>
                <td><span class="badge ${g.Status === 'Publish' ? 'bg-success' : 'bg-secondary'}">${g.Status || 'Draft'}</span></td>
                <td>${new Date(g.Tanggal).toLocaleDateString('id-ID')}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary p-1" onclick="HumasGaleri.showModal(${realIdx})" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-danger p-1" onclick="HumasGaleri.hapus(${realIdx})" title="Hapus"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>`;
        });
        if (!rows) rows = '<tr><td colspan="8" class="text-center py-3 text-muted">Belum ada data galeri</td></tr>';

        document.getElementById('galeriTableContainer').innerHTML = `
            <div class="table-responsive">
                <table class="table table-sm table-hover mb-0">
                    <thead class="table-light">
                        <tr><th style="width:30px;">No</th><th style="width:80px;">Thumbnail</th><th>Judul</th><th>Keterangan</th><th>Jenis</th><th>Status</th><th>Tanggal</th><th class="text-center">Aksi</th></tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
    }

    // ============================================================
    //  MODAL GALERI (Tambah / Edit)
    // ============================================================
    function showModal(index = null) {
        const existing = index !== null ? galeriData[index] : null;
        const title = existing ? '✏️ Edit Galeri' : '➕ Tambah Galeri';
        const initialJenis = existing?.Link_Video ? 'video' : 'foto';

        const modalHtml = `
            <div class="modal-overlay" id="galeriModal">
                <div class="modal-box" style="max-width:600px;">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="fw-bold mb-0">${title}</h5>
                        <button class="btn-close" onclick="Common.closeModal()"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="mb-3"><label>Judul <span class="text-danger">*</span></label><input type="text" class="form-control" id="gmJudul" value="${existing?.Judul || ''}" placeholder="Judul konten"></div>
                    <div class="mb-3">
                        <label>Jenis Konten <span class="text-danger">*</span></label>
                        <select class="form-select" id="gmJenisKonten" onchange="HumasGaleri.toggleJenis()">
                            <option value="foto" ${initialJenis === 'foto' ? 'selected' : ''}>Foto</option>
                            <option value="video" ${initialJenis === 'video' ? 'selected' : ''}>Video</option>
                        </select>
                    </div>
                    <div class="mb-3" id="gmUploadGambarContainer">
                        <label>Thumbnail/Gambar <span class="text-danger" id="gmGambarWajib">*</span></label>
                        <div class="d-flex flex-column gap-2">
                            <div id="thumbnailPreviewGaleri" style="width:100%;height:120px;border:2px dashed #cbd5e1;border-radius:8px;display:flex;align-items:center;justify-content:center;background:#fff;overflow:hidden;">
                                ${existing?.Gambar ? `<img src="${existing.Gambar}" style="width:100%;height:100%;object-fit:cover;">` : '<i class="fas fa-image text-muted" style="font-size:1.5rem;"></i>'}
                            </div>
                            <div class="d-flex gap-2">
                                <input type="file" accept="image/*" class="form-control form-control-sm" id="gmGambarFile" onchange="HumasGaleri.previewThumbnail(this)">
                                <button class="btn btn-sm btn-success" id="btnUploadGambarGaleri" onclick="HumasGaleri.uploadGambar()"><i class="fas fa-upload me-1"></i>Upload</button>
                            </div>
                            <small class="text-muted">Klik Upload untuk mengunggah gambar. Maks 5MB.</small>
                        </div>
                    </div>
                    <input type="hidden" id="gmGambarUrl" value="${existing?.Gambar || ''}">
                    <div class="mb-3" id="gmLinkVideoContainer" style="display:${initialJenis === 'video' ? 'block' : 'none'};">
                        <label>Link Video (YouTube) <span class="text-danger" id="gmVideoWajib" style="display:${initialJenis === 'video' ? 'inline' : 'none'};">*</span></label>
                        <input type="url" class="form-control" id="gmLinkVideo" value="${existing?.Link_Video || ''}" placeholder="https://www.youtube.com/watch?v=xxxxx">
                        <small class="text-muted">Jika diisi, konten ini akan muncul di bagian Video Website.</small>
                    </div>
                    <div class="mb-3"><label>Keterangan</label><textarea class="form-control" id="gmKeterangan" rows="3" placeholder="Deskripsi singkat">${existing?.Keterangan || ''}</textarea></div>
                    <div class="mb-3"><label>Status</label><select class="form-select" id="gmStatus"><option value="Draft" ${(existing?.Status||'Draft')==='Draft'?'selected':''}>Draft</option><option value="Publish" ${existing?.Status==='Publish'?'selected':''}>Publish</option></select></div>
                    <div class="d-flex gap-2 justify-content-end mt-3">
                        <button class="btn btn-secondary rounded-pill px-4" onclick="Common.closeModal()">Batal</button>
                        <button class="btn btn-primary rounded-pill px-4" onclick="HumasGaleri.save(${index})"><i class="fas fa-save me-1"></i> Simpan</button>
                    </div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        setTimeout(toggleJenis, 100);
    }

    // ============================================================
    //  TOGGLE JENIS KONTEN
    // ============================================================
    function toggleJenis() {
        const jenis = document.getElementById('gmJenisKonten').value;
        const gambarContainer = document.getElementById('gmUploadGambarContainer');
        const videoContainer = document.getElementById('gmLinkVideoContainer');
        const labelGambarWajib = document.getElementById('gmGambarWajib');
        const labelVideoWajib = document.getElementById('gmVideoWajib');
        if (jenis === 'foto') {
            gambarContainer.style.display = 'block';
            labelGambarWajib.style.display = 'inline';
            videoContainer.style.display = 'none';
            document.getElementById('gmLinkVideo').value = '';
        } else {
            gambarContainer.style.display = 'block';
            labelGambarWajib.style.display = 'none';
            videoContainer.style.display = 'block';
            labelVideoWajib.style.display = 'inline';
        }
    }

    // ============================================================
    //  PREVIEW THUMBNAIL
    // ============================================================
    function previewThumbnail(input) {
        const preview = document.getElementById('thumbnailPreviewGaleri');
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
            };
            reader.readAsDataURL(input.files[0]);
        } else { preview.innerHTML = `<i class="fas fa-image text-muted"></i>`; }
    }

    // ============================================================
    //  UPLOAD GAMBAR
    // ============================================================
    async function uploadGambar() {
        const fileInput = document.getElementById('gmGambarFile');
        const file = fileInput.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert('Ukuran gambar maksimal 5 MB.'); fileInput.value = ''; return; }
        try {
            const resizedData = await resizeImage(file, 1200, 1200, 0.7);
            if (resizedData.length > 5 * 1024 * 1024) { alert('Gambar terlalu besar setelah kompresi. Maksimal 5 MB.'); return; }
            const uploadResult = await API.uploadFileData('upload_berita_image', resizedData, file.name, null);
            if (uploadResult.status === 'success') {
                document.getElementById('gmGambarUrl').value = uploadResult.url;
                const preview = document.getElementById('thumbnailPreviewGaleri');
                preview.innerHTML = `<img src="${uploadResult.url}" style="width:100%;height:100%;object-fit:cover;">`;
                toast('✅ Gambar berhasil diunggah.', 'success');
            } else { toast('❌ Gagal upload: ' + uploadResult.message, 'error'); }
        } catch (e) { toast('❌ Error: ' + e.message, 'error'); }
    }

    // ============================================================
    //  SAVE GALERI
    // ============================================================
    async function save(index) {
        const judul = document.getElementById('gmJudul').value.trim();
        if (!judul) { toast('Judul wajib diisi.', 'error'); return; }
        const jenis = document.getElementById('gmJenisKonten').value;
        const gambar = document.getElementById('gmGambarUrl').value;
        const link_video = document.getElementById('gmLinkVideo').value.trim();
        if (jenis === 'foto' && !gambar) { toast('Upload gambar terlebih dahulu.', 'error'); return; }
        if (jenis === 'video' && !link_video) { toast('Link Video wajib diisi.', 'error'); return; }

        const data = {
            judul: judul,
            gambar: gambar,
            link_video: (jenis === 'video') ? link_video : '',
            keterangan: document.getElementById('gmKeterangan').value.trim(),
            status: document.getElementById('gmStatus').value
        };
        if (index !== null) data.id = galeriData[index].ID;

        const res = index !== null ? await API.updateGaleri(data) : await API.addGaleri(data);
        if (res.status === 'ok') {
            Common.closeModal();
            if (index !== null) {
                galeriData[index] = { ...galeriData[index], ...data };
            } else {
                const newItem = { ...data, ID: res.id, Tanggal: new Date().toISOString() };
                galeriData.push(newItem);
            }
            applyFilter();
            toast(res.message, 'success');
            refreshGaleriHumas(true);
        } else {
            toast(res.message, 'error');
        }
    }

    // ============================================================
    //  HAPUS GALERI
    // ============================================================
    async function hapus(index) {
        const g = galeriData[index];
        if (!confirm(`Hapus konten "${g.Judul}"?`)) return;
        const res = await API.deleteGaleri(g.ID);
        if (res.status === 'ok') {
            galeriData.splice(index, 1);
            applyFilter();
            toast('Konten dihapus.', 'success');
            refreshGaleriHumas(true);
        } else {
            toast(res.message, 'error');
        }
    }

    // ============================================================
    //  REFRESH DATA
    // ============================================================
    async function refreshGaleriHumas(silent = false) {
        if (!silent) toast('Memperbarui data galeri...', 'info');
        try {
            const res = await API.listGaleri();
            if (res.status === 'success') {
                galeriData = res.data;
                const cached = getCache() || {};
                cached.galeri = galeriData;
                setCache(cached);
                applyFilter();
                if (!silent) toast(`✅ Data galeri diperbarui (${galeriData.length} entri)`, 'success');
            } else {
                if (!silent) toast('❌ Gagal memuat data: ' + (res.message || 'Unknown error'), 'error');
            }
        } catch (e) {
            if (!silent) toast('❌ Gagal terhubung ke server.', 'error');
        }
    }

    // ============================================================
    //  EXPOSE KE GLOBAL
    // ============================================================
    window.HumasGaleri = {
        renderGaleriHumas,
        applyFilter,
        resetFilter,
        showModal,
        save,
        hapus,
        refreshGaleriHumas,
        toggleJenis,
        uploadGambar,
        previewThumbnail
    };

    console.log('✅ Humas Galeri module loaded');
})();