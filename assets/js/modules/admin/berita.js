// ============================================================
//  BERITA.JS – Manajemen Berita (Admin) - FINAL ROBUST VERSION
//  SRMA 19 Bantul
//  Versi: 2.1.0 - Semua Fungsi Global Tersedia + Fallback
// ============================================================

// ------------------------------------------------------------------
//  GLOBAL STUBS (didefinisikan sebelum modul agar tidak ReferenceError)
// ------------------------------------------------------------------
window.updateSlugFromTitle = function(title) {
    var slugInput = document.getElementById('bmSlug');
    if (slugInput && !slugInput.dataset.userEdited) {
        slugInput.value = title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
    }
};
window.previewThumbnail = function(input) {
    var preview = document.getElementById('thumbnailPreview');
    if (preview && input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function(e) {
            preview.innerHTML = '<img src="' + e.target.result + '" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">';
        };
        reader.readAsDataURL(input.files[0]);
    }
};
window.openMediaLibrary = function() { /* stub */ };
window.selectMediaFromLibrary = function(url) { document.getElementById('bmGambarUrl').value = url; };
window.uploadGambar = function() { /* stub */ };
window.hapusDraft = function() { /* stub */ };
window.toggleFullScreenEditor = function() { /* stub */ };
window.toggleLivePreviewPanel = function() { /* stub */ };
window.updateLivePreview = function() { /* stub */ };

// ------------------------------------------------------------------
//  MODUL BERITA
// ------------------------------------------------------------------
(function() {
    'use strict';

    // Ambil fungsi bersama
    const { getCachedData: getCache, setCachedData: setCache, showToast: toast, closeModal } = window.Common;

    // ============================================================
    //  STATE
    // ============================================================
    let beritaData = [];
    let beritaFiltered = [];
    let driveImagesCache = [];
    let draftInterval = null;
    let draftRestored = false;
    let beritaViewMode = 'list';
    let selectedBeritaIds = new Set();

    // ============================================================
    //  HELPER FUNCTIONS
    // ============================================================
    function generateSlug(text) {
        return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
    }

    function previewThumbnail(input) {
        const preview = document.getElementById('thumbnailPreview');
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`;
            };
            reader.readAsDataURL(input.files[0]);
        } else { preview.innerHTML = `<i class="fas fa-image text-muted"></i>`; }
    }

    async function openMediaLibrary() {
        const existing = document.getElementById('mediaLibraryModal');
        if (existing) existing.remove();
        if (driveImagesCache.length === 0) {
            const res = await API.listDriveImages();
            if (res.status === 'success') driveImagesCache = res.data;
        }
        let html = `<div class="modal-overlay" id="mediaLibraryModal" onclick="if(event.target===this) Common.closeModal()"><div class="modal-box" style="max-width: 900px;"><div class="d-flex justify-content-between align-items-center mb-3"><h5 class="fw-bold"><i class="fas fa-images me-2"></i>Media Library</h5><button class="btn-close" onclick="Common.closeModal()"><i class="fas fa-times"></i></button></div><div class="row g-2" style="max-height:60vh;overflow-y:auto;">`;
        if (driveImagesCache.length === 0) {
            html += `<div class="col-12 text-center text-muted py-4">Belum ada gambar di Media Library. Upload gambar melalui editor berita.</div>`;
        } else {
            driveImagesCache.forEach(img => {
                html += `<div class="col-3 col-md-2"><div class="card h-100 cursor-pointer" onclick="Berita.selectMediaFromLibrary('${img.url}')" style="cursor:pointer;transition:0.2s;"><img src="${img.url}" class="card-img-top" style="height:100px;object-fit:cover;"><div class="card-body p-1 text-center small text-truncate" title="${img.name}">${img.name}</div></div></div>`;
            });
        }
        html += `</div></div></div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    }

    function selectMediaFromLibrary(url) {
        const preview = document.getElementById('thumbnailPreview');
        if (preview) preview.innerHTML = `<img src="${url}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`;
        document.getElementById('bmGambarUrl').value = url;
        closeModal();
    }

    function switchViewMode(mode) {
        beritaViewMode = mode;
        if (mode === 'list') {
            if (window.quillEditor && typeof window.quillEditor.destroy === 'function') {
                window.quillEditor.destroy();
                window.quillEditor = null;
            }
            document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
            applyFilter();
        } else if (mode === 'write') {
            setTimeout(() => { showBeritaModal(null); }, 300);
        }
    }

    // ============================================================
    //  RENDER MANAJEMEN BERITA
    // ============================================================
    function renderBerita(container) {
        if (beritaData.length === 0) {
            const cached = getCache();
            if (cached?.berita) {
                beritaData = cached.berita;
                beritaFiltered = [...beritaData];
            }
        }

        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                <h4 class="fw-bold mb-0"><i class="fas fa-newspaper me-2" style="color:#0d6efd;"></i>Manajemen Berita <span class="badge bg-secondary rounded-pill">${beritaData.length}</span></h4>
                <div class="d-flex gap-2 flex-wrap">
                    <button class="btn btn-sm btn-outline-primary rounded-pill ${beritaViewMode === 'list' ? 'active' : ''}" onclick="Berita.switchViewMode('list')">
                        <i class="fas fa-list me-1"></i> Mode Daftar
                    </button>
                    <button class="btn btn-sm btn-success rounded-pill ${beritaViewMode === 'write' ? 'active' : ''}" onclick="Berita.switchViewMode('write')">
                        <i class="fas fa-pen-fancy me-1"></i> Mode Tulis Cepat
                    </button>
                    <button class="btn btn-sm btn-refresh rounded-pill" onclick="Berita.refresh(false)"><i class="fas fa-sync-alt me-1"></i> Refresh</button>
                </div>
            </div>
            <div class="card-modern mb-3">
                <div class="filter-group">
                    <input type="text" id="searchBerita" placeholder="🔍 Cari judul..." style="flex:1;min-width:150px;" oninput="Berita.applyFilter()">
                    <select id="filterStatusBerita" onchange="Berita.applyFilter()">
                        <option value="">Semua Status</option>
                        <option value="Draft">Draft</option>
                        <option value="Publish">Publish</option>
                        <option value="Scheduled">Jadwal</option>
                    </select>
                    <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="Berita.resetFilter()">Reset</button>
                    <span class="small text-muted ms-2" id="infoCountBerita">Menampilkan ${beritaFiltered.length} dari ${beritaData.length} entri</span>
                </div>
            </div>
            <div class="card-modern p-0"><div id="beritaTableContainer"></div></div>
        `;

        applyFilter();
        if (beritaData.length === 0) {
            refresh(true);
        }
        if (beritaViewMode === 'write') {
            setTimeout(() => { showBeritaModal(null); }, 500);
        }
    }

    // ============================================================
    //  FILTER & TABEL
    // ============================================================
    function applyFilter() {
        const q = (document.getElementById('searchBerita')?.value || '').toLowerCase().trim();
        const status = document.getElementById('filterStatusBerita')?.value || '';
        beritaFiltered = beritaData.filter(b => (!q || (b.Judul || '').toLowerCase().includes(q)) && (!status || (b.Status || 'Draft') === status));
        selectedBeritaIds.clear();
        renderTable();
        const info = document.getElementById('infoCountBerita');
        if (info) info.textContent = `Menampilkan ${beritaFiltered.length} dari ${beritaData.length} entri`;
    }

    function resetFilter() {
        document.getElementById('searchBerita').value = '';
        document.getElementById('filterStatusBerita').value = '';
        applyFilter();
    }

    function renderTable() {
        const allChecked = beritaFiltered.length > 0 && beritaFiltered.every(b => selectedBeritaIds.has(b.ID));
        let rows = '';
        beritaFiltered.forEach((b, i) => {
            const realIdx = beritaData.indexOf(b);
            const statusClass = b.Status === 'Publish' ? 'bg-success' : b.Status === 'Scheduled' ? 'bg-warning' : 'bg-secondary';
            const summary = (b.Isi || '').replace(/<[^>]*>/g, '').substring(0, 60) + '...';
            const pubDate = b.Tanggal_Publikasi ? new Date(b.Tanggal_Publikasi).toLocaleString('id-ID') : '-';
            rows += `<tr>
                <td>${i+1}</td>
                <td><input type="checkbox" class="berita-checkbox" data-id="${b.ID}" ${selectedBeritaIds.has(b.ID)?'checked':''} onchange="Berita.toggleSelect(${b.ID}, this.checked)"></td>
                <td><strong>${b.Judul || '-'}</strong></td>
                <td>${summary}</td>
                <td><span class="badge ${statusClass}">${b.Status || 'Draft'}</span></td>
                <td>${b.Kategori || '-'}</td>
                <td>${pubDate}</td>
                <td>${b.Penulis || '-'}</td>
                <td class="text-center">
                    <button class="btn btn-sm btn-outline-primary p-1" onclick="Berita.showEdit(${realIdx})" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-outline-info p-1" onclick="Berita.lihatRiwayat(${realIdx})" title="Riwayat"><i class="fas fa-history"></i></button>
                    <button class="btn btn-sm btn-outline-danger p-1" onclick="Berita.hapus(${realIdx})" title="Hapus"><i class="fas fa-trash-alt"></i></button>
                </td>
            </tr>`;
        });
        if (!rows) rows = '<tr><td colspan="9" class="text-center py-3 text-muted">Belum ada data berita</td></tr>';

        document.getElementById('beritaTableContainer').innerHTML = `
            <div class="p-3 border-bottom bg-light d-flex align-items-center gap-2 flex-wrap">
                <span class="fw-bold small">Aksi Massal:</span>
                <select class="form-select form-select-sm" style="width:150px;" id="bulkActionBerita">
                    <option value="">-- Pilih Aksi --</option>
                    <option value="publish">Publish</option>
                    <option value="draft">Draft</option>
                    <option value="delete">Hapus</option>
                </select>
                <button class="btn btn-sm btn-primary rounded-pill" onclick="Berita.executeBulkAction()">Terapkan</button>
                <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="Berita.toggleSelectAll()">Pilih Semua</button>
                <span class="small text-muted" id="selectedBeritaCount">0 terpilih</span>
            </div>
            <div class="table-responsive">
                <table class="table table-sm table-hover mb-0">
                    <thead class="table-light">
                        <tr>
                            <th style="width:30px;"><input type="checkbox" ${allChecked?'checked':''} onchange="Berita.toggleSelectAll(this.checked)"></th>
                            <th style="width:40px;">No</th>
                            <th>Judul</th><th>Ringkasan</th><th>Status</th><th>Kategori</th><th>Tanggal Terbit</th><th>Penulis</th><th class="text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
    }

    // ============================================================
    //  BULK ACTION
    // ============================================================
    function toggleSelectAll(checked) {
        if (checked) {
            beritaFiltered.forEach(b => selectedBeritaIds.add(b.ID));
        } else {
            selectedBeritaIds.clear();
        }
        renderTable();
        document.getElementById('selectedBeritaCount').textContent = selectedBeritaIds.size;
    }

    function toggleSelect(id, checked) {
        if (checked) selectedBeritaIds.add(id);
        else selectedBeritaIds.delete(id);
        document.getElementById('selectedBeritaCount').textContent = selectedBeritaIds.size;
    }

    async function executeBulkAction() {
        const action = document.getElementById('bulkActionBerita').value;
        if (!action || selectedBeritaIds.size === 0) {
            toast('Pilih aksi dan minimal 1 berita.', 'warning');
            return;
        }
        if (action === 'delete') {
            if (!confirm(`Hapus ${selectedBeritaIds.size} berita terpilih?`)) return;
        }
        toast('Memproses aksi massal...', 'info');
        let success = 0;
        const ids = Array.from(selectedBeritaIds);
        const promises = ids.map(id => {
            const berita = beritaData.find(b => b.ID === id);
            if (!berita) return Promise.resolve({ status: 'error' });
            if (action === 'delete') {
                return API.deleteBerita(id);
            } else if (action === 'publish' || action === 'draft') {
                berita.Status = action;
                return API.updateBerita({ id: id, status: action });
            }
        });
        const results = await Promise.all(promises);
        success = results.filter(r => r && r.status === 'ok').length;
        selectedBeritaIds.clear();
        await refresh(true);
        toast(`${success} berita berhasil diproses.`, 'success');
    }

    // ============================================================
    //  MODAL & EDITOR
    // ============================================================
    function showEdit(index) {
        showBeritaModal(index);
    }

    function showBeritaModal(index = null) {
        const existing = index !== null && index >= 0 ? beritaData[index] : null;
        const title = existing ? '✏️ Edit Berita' : '➕ Tambah Berita';
        if (window.quillEditor) { window.quillEditor.destroy(); window.quillEditor = null; }
        if (window.livePreviewTimeout) clearTimeout(window.livePreviewTimeout);
        if (window.beritaDraftStatus) window.beritaDraftStatus = false;

        const hasImage = existing?.Gambar && existing.Gambar.startsWith('data:image');
        const defaultDate = existing?.Tanggal_Publikasi || new Date().toISOString().slice(0,16);
        const initialSlug = existing?.Slug || (existing?.Judul ? generateSlug(existing.Judul) : '');

        const modalHtml = `
            <div class="modal-overlay" id="beritaModal">
                <div class="modal-box" style="max-width: 1200px; width: 95%; padding: 0;">
                    <div class="modal-header-area">
                        <div>
                            <h5 class="fw-bold mb-0" style="font-size:1.2rem;">${title}</h5>
                            <small id="draftStatusText" class="text-muted ms-2 fw-normal" style="font-size:0.75rem;">Menunggu perubahan...</small>
                        </div>
                        <div class="d-flex gap-2 flex-wrap">
                            <button class="btn btn-sm btn-outline-secondary rounded-pill" id="fsToggleBtn" onclick="Berita.toggleFullScreenEditor()" title="Mode Layar Penuh">
                                <i class="fas fa-expand"></i>
                            </button>
                            <button class="btn-close" onclick="Common.closeModal()" style="opacity:0.8;"></button>
                        </div>
                    </div>
                    <div class="modal-body-content">
                        <div class="row g-4" id="beritaEditorLayout">
                            <div class="col-md-7" id="editorColumn">
                                <div class="mb-3">
                                    <label class="fw-semibold small text-dark">Judul <span class="text-danger">*</span></label>
                                    <input type="text" class="form-control" id="bmJudul" value="${existing?.Judul || ''}" placeholder="Masukkan judul berita" oninput="window.updateSlugFromTitle(this.value)">
                                </div>
                                <div class="mb-2">
                                    <label class="fw-semibold small text-dark">Isi Berita <span class="text-danger">*</span></label>
                                    <div class="editor-area-wrap">
                                        <div id="bmIsi" style="min-height:250px; background:#fff;">${existing?.Isi || ''}</div>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-5" id="sidebarColumn">
                                <!-- Featured Image -->
                                <div class="wp-meta-box">
                                    <div class="wp-meta-box-header"><i class="fas fa-image me-2 text-primary"></i>Gambar Unggulan</div>
                                    <div class="wp-meta-box-body">
                                        <div id="thumbnailPreview" style="width:100%;height:160px;border:2px dashed #cbd5e1;border-radius:8px;display:flex;align-items:center;justify-content:center;background:#fff;overflow:hidden;margin-bottom:10px;">
                                            ${hasImage ? `<img src="${existing.Gambar}" style="width:100%;height:100%;object-fit:cover;">` : '<i class="fas fa-image text-muted" style="font-size:2rem;"></i>'}
                                        </div>
                                        <input type="file" id="bmGambarFile" accept="image/*" class="form-control form-control-sm mb-2" onchange="window.previewThumbnail(this)">
                                        <div class="d-flex gap-2">
                                            <button type="button" class="btn btn-sm btn-primary flex-fill" id="btnUploadGambar" onclick="window.uploadGambar()"><i class="fas fa-upload me-1"></i>Upload</button>
                                            <button type="button" class="btn btn-sm btn-outline-primary flex-fill" onclick="window.openMediaLibrary()"><i class="fas fa-folder-open me-1"></i>Media</button>
                                        </div>
                                        <input type="hidden" id="bmGambarUrl" value="${existing?.Gambar || ''}">
                                    </div>
                                </div>
                                <!-- Publikasi -->
                                <div class="wp-meta-box">
                                    <div class="wp-meta-box-header"><i class="fas fa-calendar-alt me-2 text-primary"></i>Publikasi</div>
                                    <div class="wp-meta-box-body">
                                        <div class="mb-2">
                                            <label class="fw-semibold small">Tanggal Publikasi</label>
                                            <input type="datetime-local" class="form-control form-control-sm" id="bmTanggalPublikasi" value="${defaultDate}">
                                        </div>
                                        <div>
                                            <label class="fw-semibold small">Status</label>
                                            <select class="form-select form-select-sm" id="bmStatus">
                                                <option value="Draft" ${(existing?.Status||'Draft')==='Draft'?'selected':''}>Draft</option>
                                                <option value="Publish" ${existing?.Status==='Publish'?'selected':''}>Publish</option>
                                                <option value="Scheduled" ${existing?.Status==='Scheduled'?'selected':''}>Terjadwal</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <!-- Kategori & Tag -->
                                <div class="wp-meta-box">
                                    <div class="wp-meta-box-header"><i class="fas fa-tags me-2 text-primary"></i>Kategori & Tag</div>
                                    <div class="wp-meta-box-body">
                                        <div class="mb-2">
                                            <label class="fw-semibold small">Kategori</label>
                                            <select class="form-select form-select-sm" id="bmKategori">
                                                <option value="Umum" ${existing?.Kategori==='Umum'?'selected':''}>Umum</option>
                                                <option value="Pengumuman" ${existing?.Kategori==='Pengumuman'?'selected':''}>Pengumuman</option>
                                                <option value="Kegiatan" ${existing?.Kategori==='Kegiatan'?'selected':''}>Kegiatan</option>
                                                <option value="Prestasi" ${existing?.Kategori==='Prestasi'?'selected':''}>Prestasi</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label class="fw-semibold small">Tag (pisahkan koma)</label>
                                            <input type="text" class="form-control form-control-sm" id="bmTag" value="${existing?.Tag || ''}">
                                        </div>
                                    </div>
                                </div>
                                <!-- SEO & Penulis -->
                                <div class="wp-meta-box">
                                    <div class="wp-meta-box-header"><i class="fas fa-search me-2 text-primary"></i>SEO & Penulis</div>
                                    <div class="wp-meta-box-body">
                                        <div class="mb-2">
                                            <label class="fw-semibold small">Slug (URL)</label>
                                            <input type="text" class="form-control form-control-sm" id="bmSlug" value="${initialSlug}" placeholder="url-friendly-slug" oninput="this.dataset.userEdited='true'">
                                        </div>
                                        <div class="mb-2">
                                            <label class="fw-semibold small">Meta Deskripsi</label>
                                            <textarea class="form-control form-control-sm" id="bmMeta" rows="2">${existing?.Meta_Deskripsi || ''}</textarea>
                                        </div>
                                        <div>
                                            <label class="fw-semibold small">Penulis</label>
                                            <input type="text" class="form-control form-control-sm" id="bmPenulis" value="${existing?.Penulis || window.currentUser?.nama || 'Admin'}">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer-area">
                        <div class="d-flex align-items-center gap-3 flex-wrap flex-fill">
                            <button type="button" class="btn btn-sm btn-outline-danger rounded-pill" onclick="window.hapusDraft()" title="Hapus draft yang tersimpan">
                                <i class="fas fa-trash-alt me-1"></i> Hapus Draft
                            </button>
                            <span class="small text-muted ms-auto" id="wordTimeBerita">
                                <i class="fas fa-font me-1"></i><span id="charCountBerita">0</span> karakter
                            </span>
                            <span class="small text-muted ms-2" id="readTimeBerita">
                                <i class="fas fa-clock me-1"></i><span id="readingTimeBerita">0</span> mnt baca
                            </span>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-cancel-wp" onclick="Common.closeModal()">Batal</button>
                            <button class="btn btn-save-wp" onclick="Berita.save(${index})"><i class="fas fa-save me-1"></i> Simpan</button>
                        </div>
                    </div>
                    <button type="button" id="previewCornerBtn" class="btn btn-primary rounded-circle shadow" style="position:fixed;bottom:24px;right:24px;width:52px;height:52px;z-index:2100;" onclick="window.toggleLivePreviewPanel()" title="Pratinjau Berita">
                        <i class="fas fa-eye"></i>
                    </button>
                    <div id="livePreviewContainer" style="display:none;position:fixed;bottom:88px;right:24px;width:340px;max-height:60vh;overflow-y:auto;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:16px;box-shadow:0 10px 40px rgba(0,0,0,0.2);z-index:2100;">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <div class="text-muted small fw-semibold"><i class="fas fa-eye me-1"></i>Pratinjau Langsung</div>
                            <button type="button" class="btn-close" style="font-size:0.7rem;" onclick="window.toggleLivePreviewPanel()"></button>
                        </div>
                        <h3 class="fw-bold text-dark mb-2" id="previewJudul" style="font-size:1.1rem;">${existing?.Judul || 'Judul Berita'}</h3>
                        <div class="ck-content" id="previewIsi" style="font-size:0.85rem;">${existing?.Isi || '<em>Isi berita akan muncul di sini...</em>'}</div>
                    </div>
                </div>
            </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Override fungsi global dengan implementasi yang benar setelah modal dibuat
        window.updateSlugFromTitle = function(title) {
            const slugInput = document.getElementById('bmSlug');
            if (slugInput && !slugInput.dataset.userEdited) {
                slugInput.value = generateSlug(title);
            }
        };
        window.previewThumbnail = function(input) { previewThumbnail(input); };
        window.openMediaLibrary = function() { openMediaLibrary(); };
        window.selectMediaFromLibrary = function(url) { selectMediaFromLibrary(url); };
        window.uploadGambar = function() { uploadGambar(); };
        window.hapusDraft = function() { hapusDraft(); };
        window.toggleFullScreenEditor = function() { toggleFullScreenEditor(); };
        window.toggleLivePreviewPanel = function() { toggleLivePreviewPanel(); };
        window.updateLivePreview = function() { updateLivePreview(); };

        // Inisialisasi Quill
        setTimeout(() => {
            const editorContainer = document.getElementById('bmIsi');
            if (!editorContainer) return;
            if (editorContainer.children.length > 0) {
                editorContainer.innerHTML = existing?.Isi || '';
            }
            try {
                if (typeof Quill !== 'undefined') {
                    var Font = Quill.import('attributors/class/font');
                    Font.whitelist = ['sans-serif', 'serif', 'monospace', 'arial', 'times-new-roman', 'georgia', 'verdana', 'helvetica', 'courier-new'];
                    Quill.register(Font, true);
                }
                const quill = new Quill('#bmIsi', {
                    theme: 'snow',
                    modules: {
                        toolbar: {
                            container: [
                                [{ 'font': ['sans-serif', 'serif', 'monospace', 'arial', 'times-new-roman', 'georgia', 'verdana', 'helvetica', 'courier-new'] }],
                                [{ 'size': ['small', false, 'large', 'huge'] }],
                                ['bold', 'italic', 'underline', 'strike'],
                                [{ 'color': [] }, { 'background': [] }],
                                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                                [{ 'indent': '-1'}, { 'indent': '+1' }],
                                [{ 'align': [] }],
                                ['blockquote', 'code-block'],
                                ['link', 'image', 'video'],
                                ['clean'],
                                ['chart', 'html']
                            ],
                            handlers: {
                                'video': function() {
                                    const range = quill.getSelection(true);
                                    const url = prompt('Masukkan link YouTube (https://www.youtube.com/watch?v=xxxx):');
                                    if (url) {
                                        const embedUrl = url.replace('watch?v=', 'embed/').split('&')[0];
                                        quill.insertEmbed(range.index, 'video', embedUrl);
                                    }
                                },
                                'chart': function() {
                                    insertChart(quill);
                                },
                                'html': function() {
                                    const range = quill.getSelection(true);
                                    const html = prompt('Masukkan kode HTML yang ingin disisipkan (iframe, div, dll.):');
                                    if (html) {
                                        quill.insertText(range.index, ' ');
                                        quill.setSelection(range.index, 0);
                                        const clipboard = quill.getModule('clipboard');
                                        const delta = clipboard.convert(html);
                                        quill.insertContents(delta);
                                    }
                                }
                            }
                        },
                        imageResize: {
                            modules: ['Resize', 'DisplaySize', 'Toolbar']
                        }
                    }
                });
                if (existing?.Isi) {
                    const delta = quill.clipboard.convert(existing.Isi);
                    quill.setContents(delta, 'silent');
                }
                window.quillEditor = quill;
                function updateStats() {
                    const text = quill.getText().trim();
                    const wordCount = text.length > 0 ? text.split(/\s+/).length : 0;
                    const charCount = text.length;
                    const readingTime = Math.ceil(wordCount / 200);
                    document.getElementById('charCountBerita').textContent = charCount;
                    document.getElementById('readingTimeBerita').textContent = readingTime;
                }
                updateStats();
                quill.on('text-change', updateStats);
                // Auto-save indicator
                if (draftInterval) clearInterval(draftInterval);
                draftInterval = setInterval(() => {
                    const judul = document.getElementById('bmJudul').value;
                    const isi = quill.root.innerHTML;
                    if (judul || isi) {
                        localStorage.setItem('srma19_berita_draft', JSON.stringify({
                            judul, isi,
                            status: document.getElementById('bmStatus').value,
                            kategori: document.getElementById('bmKategori').value,
                            timestamp: Date.now()
                        }));
                        const statusEl = document.getElementById('draftStatusText');
                        if (statusEl) {
                            statusEl.innerHTML = `<span style="color:#10b981;">✓ Tersimpan ${new Date().toLocaleTimeString('id-ID')}</span>`;
                            setTimeout(() => { statusEl.innerHTML = 'Draft disimpan otomatis'; }, 3000);
                        }
                    }
                }, 25000);
                // RESTORE DRAFT
                if (!draftRestored && index === null) {
                    const savedDraft = localStorage.getItem('srma19_berita_draft');
                    if (savedDraft) {
                        try {
                            const draftData = JSON.parse(savedDraft);
                            if (Date.now() - draftData.timestamp < 12 * 60 * 60 * 1000) {
                                if (confirm('⚠️ Terdeteksi draft berita yang belum disimpan. Lanjutkan?')) {
                                    document.getElementById('bmJudul').value = draftData.judul;
                                    document.getElementById('bmStatus').value = draftData.status || 'Draft';
                                    document.getElementById('bmKategori').value = draftData.kategori || 'Umum';
                                    const delta = quill.clipboard.convert(draftData.isi);
                                    quill.setContents(delta, 'silent');
                                    draftRestored = true;
                                    window.updateLivePreview();
                                } else {
                                    localStorage.removeItem('srma19_berita_draft');
                                }
                            }
                        } catch (e) {}
                    }
                }
                // Handler upload gambar (Quill)
                const toolbar = quill.getModule('toolbar');
                toolbar.addHandler('image', function() {
                    const input = document.createElement('input');
                    input.setAttribute('type', 'file');
                    input.setAttribute('accept', 'image/*');
                    input.click();
                    input.onchange = async () => {
                        const file = input.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = async (e) => {
                            try {
                                const res = await API.uploadBeritaImage(e.target.result, file.name);
                                if (res.status === 'success') {
                                    const range = quill.getSelection(true);
                                    quill.insertEmbed(range.index, 'image', res.url);
                                    quill.setSelection(range.index + 1);
                                } else {
                                    console.error('Gagal upload gambar:', res.message);
                                }
                            } catch (err) { console.error('Error upload gambar:', err); }
                        };
                        reader.readAsDataURL(file);
                    };
                });
                quill.on('text-change', () => { window.updateLivePreview(); });
            } catch (e) {
                console.error('Gagal menginisialisasi Quill Editor:', e);
                window.quillEditor = null;
            }
        }, 300);
    }

    // ============================================================
    //  FUNGSI CHART
    // ============================================================
    function insertChart(quill) {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-box" style="max-width:600px;">
                <h5 class="fw-bold mb-3"><i class="fas fa-chart-pie me-2"></i>Buat Grafik</h5>
                <div class="mb-3">
                    <label>Jenis Grafik</label>
                    <select id="chartType" class="form-select">
                        <option value="bar">Bar</option>
                        <option value="line">Line</option>
                        <option value="pie">Pie</option>
                        <option value="doughnut">Doughnut</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label>Label (pisahkan koma)</label>
                    <input type="text" id="chartLabels" class="form-control" placeholder="Januari, Februari, Maret">
                </div>
                <div class="mb-3">
                    <label>Data (pisahkan koma)</label>
                    <input type="text" id="chartData" class="form-control" placeholder="10, 20, 15">
                </div>
                <div class="mb-3">
                    <label>Warna (opsional, hex code pisahkan koma)</label>
                    <input type="text" id="chartColors" class="form-control" placeholder="#ff6384, #36a2eb, #ffce56">
                </div>
                <div class="d-flex justify-content-end gap-2 mt-3">
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Batal</button>
                    <button class="btn btn-primary" onclick="generateChart(quill)">Sisipkan Grafik</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
    }

    function generateChart(quill) {
        const type = document.getElementById('chartType').value;
        const labels = document.getElementById('chartLabels').value.split(',').map(s => s.trim());
        const data = document.getElementById('chartData').value.split(',').map(s => parseFloat(s.trim()));
        const colors = document.getElementById('chartColors').value.split(',').map(s => s.trim());
        if (labels.length === 0 || data.length === 0) { toast('Label dan Data wajib diisi.', 'error'); return; }
        const canvas = document.createElement('canvas');
        canvas.width = 600; canvas.height = 400;
        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: type,
            data: {
                labels: labels,
                datasets: [{
                    label: 'Data',
                    data: data,
                    backgroundColor: colors.length ? colors : ['#ff6384','#36a2eb','#ffce56','#4bc0c0','#9966ff','#ff9f40'],
                    borderColor: colors.length ? colors : ['#ff6384','#36a2eb','#ffce56','#4bc0c0','#9966ff','#ff9f40'],
                    borderWidth: 1
                }]
            },
            options: { responsive: false, plugins: { legend: { display: true } } }
        });
        setTimeout(() => {
            const dataUrl = canvas.toDataURL('image/png');
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, 'image', dataUrl);
            quill.setSelection(range.index + 1);
            document.querySelector('.modal-overlay').remove();
            toast('Grafik berhasil disisipkan.', 'success');
        }, 300);
    }

    // ============================================================
    //  UPLOAD GAMBAR BERITA
    // ============================================================
    async function uploadGambar() {
        const fileInput = document.getElementById('bmGambarFile');
        const file = fileInput.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert('Ukuran gambar maksimal 5 MB.'); fileInput.value = ''; return; }
        try {
            const resizedData = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target.result);
                reader.readAsDataURL(file);
            });
            const uploadResult = await API.uploadFileData('upload_berita_image', resizedData, file.name, null);
            if (uploadResult.status === 'success') {
                document.getElementById('bmGambarUrl').value = uploadResult.url;
                const preview = document.getElementById('thumbnailPreview');
                preview.innerHTML = `<img src="${uploadResult.url}" style="width:100%;height:100%;object-fit:cover;">`;
            } else { console.error('Gagal upload:', uploadResult.message); }
        } catch (e) { console.error('Error:', e); }
    }

    // ============================================================
    //  SAVE BERITA
    // ============================================================
    async function save(index) {
        const btnSave = document.querySelector('#beritaModal .btn-save-wp');
        btnSave.disabled = true;
        btnSave.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Menyimpan...';
        try {
            const judul = document.getElementById('bmJudul').value.trim();
            let isi = '';
            if (window.quillEditor) {
                isi = window.quillEditor.root.innerHTML;
            }
            if (!judul || !isi) { toast('Judul dan Isi wajib diisi.', 'error'); btnSave.disabled = false; btnSave.innerHTML = '<i class="fas fa-save me-1"></i> Simpan'; return; }
            let gambar = document.getElementById('bmGambarUrl').value;
            if (!gambar && window.quillEditor) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = window.quillEditor.root.innerHTML;
                const firstImg = tempDiv.querySelector('img');
                if (firstImg && firstImg.src) gambar = firstImg.src;
            }
            const data = {
                judul: judul,
                isi: isi,
                kategori: document.getElementById('bmKategori').value,
                tag: document.getElementById('bmTag').value.trim(),
                status: document.getElementById('bmStatus').value,
                tanggal_publikasi: document.getElementById('bmTanggalPublikasi').value,
                slug: document.getElementById('bmSlug').value,
                meta_deskripsi: document.getElementById('bmMeta').value.trim(),
                penulis: document.getElementById('bmPenulis').value.trim() || window.currentUser?.nama || 'Admin',
                gambar: gambar
            };
            let res;
            if (index !== null && index >= 0) {
                data.id = beritaData[index].ID;
                res = await API.updateBerita(data);
            } else {
                res = await API.addBerita(data);
            }
            if (res.status === 'ok') {
                localStorage.removeItem('srma19_berita_draft');
                window.unsavedChanges = false;
                window.onbeforeunload = null;
                Common.closeModal();
                if (index !== null && index >= 0) {
                    beritaData[index] = { ...beritaData[index], ...data };
                } else {
                    beritaData.push({ ...data, ID: res.id || Date.now() });
                }
                applyFilter();
                toast(res.message, 'success');
                refresh(true);
            } else {
                toast(res.message, 'error');
            }
        } catch (e) {
            toast('Gagal menyimpan data: ' + e.message, 'error');
        } finally {
            btnSave.disabled = false;
            btnSave.innerHTML = '<i class="fas fa-save me-1"></i> Simpan';
        }
    }

    // ============================================================
    //  HAPUS DRAFT, HAPUS BERITA, REFRESH, RIWAYAT
    // ============================================================
    function hapusDraft() {
        if (confirm('Hapus draft yang tersimpan di browser?')) {
            localStorage.removeItem('srma19_berita_draft');
            const statusText = document.getElementById('draftStatusText');
            if (statusText) statusText.textContent = 'Draft dihapus.';
            toast('Draft berhasil dihapus.', 'warning');
            if (window.quillEditor) window.quillEditor.setContents([]);
        }
    }

    async function hapus(index) {
        const b = beritaData[index];
        if (!confirm(`Hapus berita "${b.Judul}"?`)) return;
        const res = await API.deleteBerita(b.ID);
        if (res.status === 'ok') {
            beritaData.splice(index, 1);
            applyFilter();
            toast('Berita dihapus.', 'success');
            refresh(true);
        } else { toast(res.message, 'error'); }
    }

    async function refresh(silent = false) {
        if (!silent) toast('Memperbarui data berita...', 'info');
        try {
            const res = await API.listBerita();
            if (res.status === 'success') {
                beritaData = res.data;
                const cached = getCache() || {};
                cached.berita = beritaData;
                setCache(cached);
                applyFilter();
                if (!silent) toast(`✅ Data berita diperbarui (${beritaData.length} entri)`, 'success');
            } else { if (!silent) toast('❌ Gagal memuat data.', 'error'); }
        } catch (e) { if (!silent) toast('❌ Gagal terhubung ke server.', 'error'); }
    }

    function lihatRiwayat(index) {
        const b = beritaData[index];
        if (!b) return;
        const log = (b.Edit_Log || '').replace(/\n/g, '<br>');
        const modalHtml = `
            <div class="modal-overlay" onclick="if(event.target===this) Common.closeModal()">
                <div class="modal-box" style="max-width:600px;">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="fw-bold"><i class="fas fa-history me-2"></i>Riwayat Revisi: ${b.Judul}</h5>
                        <button class="btn-close" onclick="Common.closeModal()"><i class="fas fa-times"></i></button>
                    </div>
                    <div style="max-height:400px;overflow-y:auto;background:#f8f9fa;padding:15px;border-radius:8px;font-size:0.9rem;white-space:pre-wrap;">${log || 'Belum ada riwayat perubahan.'}</div>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    // ============================================================
    //  EXPOSE KE GLOBAL
    // ============================================================
    window.Berita = {
        renderBerita,
        applyFilter,
        resetFilter,
        switchViewMode,
        showEdit,
        showBeritaModal,
        save,
        hapus,
        refresh,
        toggleSelectAll,
        toggleSelect,
        executeBulkAction,
        lihatRiwayat,
        hapusDraft,
        uploadGambar,
        openMediaLibrary,
        selectMediaFromLibrary,
        previewThumbnail,
        updateSlugFromTitle,
        generateChart,
        insertChart,
        toggleFullScreenEditor,
        toggleLivePreviewPanel,
        updateLivePreview
    };

    // Override global stubs dengan fungsi sebenarnya (agar inline handler bekerja)
    window.updateSlugFromTitle = window.Berita.updateSlugFromTitle;
    window.previewThumbnail = window.Berita.previewThumbnail;
    window.openMediaLibrary = window.Berita.openMediaLibrary;
    window.selectMediaFromLibrary = window.Berita.selectMediaFromLibrary;
    window.uploadGambar = window.Berita.uploadGambar;
    window.hapusDraft = window.Berita.hapusDraft;
    window.toggleFullScreenEditor = window.Berita.toggleFullScreenEditor;
    window.toggleLivePreviewPanel = window.Berita.toggleLivePreviewPanel;
    window.updateLivePreview = window.Berita.updateLivePreview;

    console.log('✅ Berita module loaded (robust final)');
})();