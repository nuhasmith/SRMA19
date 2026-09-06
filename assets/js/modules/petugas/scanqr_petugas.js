// ============================================================
//  SCANQR_PETUGAS.JS – QR Scanner (Khusus Role Petugas)
//  SRMA 19 Bantul
//  Versi: 1.0.0 - SPA Ready
// ============================================================

(function() {
    'use strict';

    // Ambil fungsi bersama
    const { showToast: toast } = window.Common;

    // ============================================================
    //  STATE
    // ============================================================
    let html5QrCode = null;
    let isScanning = false;
    let currentScanData = null;
    let scanCooldown = false;
    let localLog = [];
    let sesiList = [];
    let soundEnabled = true;
    let beepAudio = null;
    let audioReady = false;
    const user = Auth.getCurrentUser();

    // ============================================================
    //  SOUND (BEEP)
    // ============================================================
    function initBeepAudio() {
        if (beepAudio) return;
        try {
            beepAudio = new Audio('beep.mp3');
            beepAudio.volume = 0.6;
            beepAudio.load();
            audioReady = true;
        } catch (e) {
            beepAudio = null;
            audioReady = false;
        }
    }

    function unlockAudio() {
        if (beepAudio) {
            try {
                const testAudio = new Audio('beep.mp3');
                testAudio.volume = 0;
                testAudio.play().then(() => {
                    testAudio.pause();
                    testAudio.currentTime = 0;
                    audioReady = true;
                }).catch(() => {});
            } catch (e) {}
        }
    }

    function playBeep() {
        if (!soundEnabled) return;
        initBeepAudio();
        unlockAudio();
        if (beepAudio) {
            try {
                beepAudio.currentTime = 0;
                beepAudio.play();
            } catch (e) {
                fallbackBeep();
            }
        } else {
            fallbackBeep();
        }
    }

    function fallbackBeep() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            if (ctx.state === 'suspended') ctx.resume();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = 880;
            gain.gain.value = 0.3;
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.2);
        } catch (e) {}
    }

    function toggleSound() {
        soundEnabled = !soundEnabled;
        localStorage.setItem('srma19_sound_enabled', soundEnabled);
        const icon = document.querySelector('#soundToggleBtn i');
        if (icon) {
            icon.className = soundEnabled ? 'fas fa-volume-up' : 'fas fa-volume-mute';
        }
    }

    // ============================================================
    //  FETCH JADWAL
    // ============================================================
    async function fetchJadwal() {
        try {
            const res = await API.getJadwal();
            if (res.status === 'success' && res.data.length > 0) {
                sesiList = res.data.map(j => ({
                    kode: String(j.id),
                    nama: j.nama,
                    agama: j.agama,
                    mulai: j.mulai,
                    selesai: j.selesai
                }));
            } else {
                // Fallback data dummy
                sesiList = [
                    { kode: '1', nama: 'Apel Pagi', agama: 'Islam', mulai: '06:00', selesai: '06:30' },
                    { kode: '2', nama: 'Makan Pagi', agama: 'Islam', mulai: '06:30', selesai: '07:15' },
                    { kode: '3', nama: 'Ibadah Sholat Dhuhur', agama: 'Islam', mulai: '12:00', selesai: '12:30' },
                    { kode: '4', nama: 'Apel Makan Siang', agama: 'Islam', mulai: '12:30', selesai: '12:45' },
                    { kode: '5', nama: 'Makan Siang', agama: 'Islam', mulai: '12:45', selesai: '13:30' },
                    { kode: '6', nama: 'Ibadah Sholat Ashar', agama: 'Islam', mulai: '15:00', selesai: '15:30' },
                    { kode: '7', nama: 'Ibadah Sholat Maghrib', agama: 'Islam', mulai: '17:45', selesai: '18:15' },
                    { kode: '8', nama: 'Apel Makan Malam', agama: 'Islam', mulai: '18:15', selesai: '18:30' },
                    { kode: '9', nama: 'Makan Malam', agama: 'Islam', mulai: '18:30', selesai: '19:15' },
                    { kode: '10', nama: 'Apel Malam', agama: 'Islam', mulai: '21:00', selesai: '21:30' }
                ];
            }
        } catch (e) {
            console.error('Gagal fetch jadwal:', e);
        }
    }

    // ============================================================
    //  RENDER UI SCANNER
    // ============================================================
    function renderScanQR(container) {
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h4 class="fw-bold mb-0"><i class="fas fa-qrcode me-2" style="color:#0d6efd;"></i>Scan QR Absensi</h4>
                <div>
                    <button class="btn btn-sm btn-outline-secondary rounded-pill" id="soundToggleBtn" onclick="PetugasScanQR.toggleSound()" title="Suara">
                        <i class="fas fa-volume-up"></i>
                    </button>
                </div>
            </div>

            <!-- Mode Selector -->
            <div class="mode-selector">
                <button class="mode-btn active" data-mode="absen" onclick="PetugasScanQR.switchMode('absen')"><i class="fas fa-clipboard-check"></i> Absensi</button>
                <button class="mode-btn" data-mode="hp" onclick="PetugasScanQR.switchMode('hp')"><i class="fas fa-mobile-alt"></i> HP</button>
                <button class="mode-btn" data-mode="pelanggaran" onclick="PetugasScanQR.switchMode('pelanggaran')"><i class="fas fa-exclamation-triangle"></i> Pelanggaran</button>
            </div>

            <!-- Sesi Info -->
            <div class="card-modern mb-3">
                <div class="d-flex justify-content-between align-items-center p-2">
                    <div>
                        <div class="small text-muted">Sesi Saat Ini</div>
                        <strong id="currentSessionName" class="text-dark">Memuat...</strong>
                    </div>
                    <div class="text-end">
                        <span class="badge-sesi badge-active" id="currentSessionBadge"><i class="fas fa-clock me-1"></i><span id="currentTime">--:--</span></span>
                    </div>
                </div>
            </div>

            <!-- Scanner -->
            <div class="card-modern p-3">
                <div id="reader" style="width:100%;border-radius:10px;overflow:hidden;border:2px dashed #d0d0d0;background:#f8f8f8;min-height:220px;"></div>
                <div class="mt-3 text-center">
                    <button class="btn btn-primary rounded-pill" id="btnStartScan" onclick="PetugasScanQR.startScan()"><i class="fas fa-camera me-2"></i>Mulai Scan</button>
                    <button class="btn btn-danger rounded-pill d-none" id="btnStopScan" onclick="PetugasScanQR.stopScan()"><i class="fas fa-stop me-2"></i>Hentikan</button>
                </div>
            </div>

            <!-- Input Manual -->
            <div class="card-modern mb-3">
                <div class="row g-2 align-items-center">
                    <div class="col-md-8">
                        <label class="fw-semibold small">Input Manual (Kode Peserta)</label>
                        <div class="input-group">
                            <input type="text" class="form-control form-control-sm" id="manualCodeInput" placeholder="Contoh: SRMA19-001" onkeypress="if(event.key==='Enter') PetugasScanQR.manualSearch()">
                            <button class="btn btn-primary btn-sm" onclick="PetugasScanQR.manualSearch()"><i class="fas fa-search me-1"></i>Cari</button>
                        </div>
                    </div>
                    <div class="col-md-4"><label class="fw-semibold small">&nbsp;</label><button class="btn btn-secondary btn-sm w-100" onclick="PetugasScanQR.resetScan()"><i class="fas fa-redo me-1"></i>Reset</button></div>
                </div>
            </div>

            <!-- Hasil Scan -->
            <div id="resultContainer" class="d-none mt-3">
                <div class="card-modern p-3" id="resultCard">
                    <h6 class="fw-bold mb-2"><i class="fas fa-info-circle me-2"></i>Data Peserta</h6>
                    <div class="text-center">
                        <div id="resultAvatar" style="width:60px;height:60px;border-radius:50%;background:#e0f2fe;display:inline-flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:800;color:var(--primary);">?</div>
                        <div class="mt-2">
                            <div class="fw-bold" id="resultNama">-</div>
                            <div class="text-muted small"><span id="resultKode">-</span> &bull; <span id="resultJK">-</span> &bull; <span id="resultAgama">-</span></div>
                            <div><span class="badge-sesi" id="resultSesi">-</span></div>
                        </div>
                        <div class="form-section mt-3" id="dynamicForm"></div>
                        <button class="btn btn-success btn-sm rounded-pill mt-3 w-100" id="btnConfirm" onclick="PetugasScanQR.confirmAction()"><i class="fas fa-check-circle me-1"></i> Konfirmasi</button>
                        <button class="btn btn-outline-secondary btn-sm rounded-pill mt-1 w-100" onclick="PetugasScanQR.resetScan()"><i class="fas fa-redo me-1"></i> Scan Ulang</button>
                    </div>
                </div>
            </div>

            <!-- Log -->
            <div class="card-modern p-3 mt-3">
                <div class="d-flex justify-content-between align-items-center">
                    <h6 class="fw-bold mb-0"><i class="fas fa-list-alt me-2" style="color:var(--warning);"></i>Log Transaksi</h6>
                    <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="PetugasScanQR.clearLocalLog()"><i class="fas fa-trash-alt"></i></button>
                </div>
                <div id="logContainer" style="max-height:200px;overflow-y:auto;margin-top:8px;"><p class="text-center text-muted py-2 small">Belum ada data</p></div>
            </div>

            <!-- Status -->
            <div class="text-center mt-2 small text-muted" id="connectionStatus">
                <span class="pulse-dot me-1"></span>Memeriksa koneksi...
            </div>
        `;

        // Inisialisasi
        fetchJadwal();
        loadLocalLog();
        updateSesiDisplay();
        testConnection();
        initBeepAudio();
        setInterval(updateSesiDisplay, 30000);
        switchMode('absen');
        setTimeout(() => { if (!isScanning) startScan(); }, 500);
    }

    // ============================================================
    //  SWITCH MODE & DYNAMIC FORM
    // ============================================================
    function switchMode(mode) {
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.mode-btn[data-mode="${mode}"]`).classList.add('active');
        if (currentScanData) displayResult();
        else document.getElementById('dynamicForm').innerHTML = '';
        const labels = { 'absen': 'Konfirmasi Absensi', 'hp': 'Konfirmasi HP', 'pelanggaran': 'Konfirmasi Pelanggaran' };
        document.getElementById('btnConfirm').innerHTML = `<i class="fas fa-check-circle me-1"></i> ${labels[mode]}`;
    }

    function renderDynamicForm() {
        const container = document.getElementById('dynamicForm');
        if (currentMode === 'absen') {
            container.innerHTML = `
                <div class="row g-2">
                    <div class="col-md-6"><label>Status</label><select class="form-select form-select-sm" id="statusKehadiranSelect"><option value="Hadir">Hadir</option><option value="Izin">Izin</option><option value="Tidak Berangkat">Tidak Berangkat</option><option value="Sakit">Sakit</option></select></div>
                    <div class="col-md-6"><label>Puasa</label><div class="d-flex gap-3"><div class="form-check"><input class="form-check-input" type="radio" name="puasa" id="puasaYa" value="Ya" checked><label class="form-check-label" for="puasaYa">Ya</label></div><div class="form-check"><input class="form-check-input" type="radio" name="puasa" id="puasaTidak" value="Tidak"><label class="form-check-label" for="puasaTidak">Tidak</label></div></div></div>
                </div>
                <div class="row g-2 mt-2">
                    <div class="col-md-6"><label>Pelanggaran</label><select class="form-select form-select-sm" id="pelanggaranSelect"><option value="Tidak Ada">Tidak Ada</option><option value="Ringan">Ringan</option><option value="Sedang">Sedang</option><option value="Berat">Berat</option></select><div id="pelanggaranKeteranganContainer" style="display:none;margin-top:4px;"><input type="text" class="form-control form-control-sm" id="pelanggaranKeterangan" placeholder="Keterangan..."></div></div>
                    <div class="col-md-6"><label>Kesehatan</label><div class="d-flex gap-3"><div class="form-check"><input class="form-check-input" type="radio" name="kesehatan" id="kesehatanSehat" value="Sehat" checked><label class="form-check-label" for="kesehatanSehat">Sehat</label></div><div class="form-check"><input class="form-check-input" type="radio" name="kesehatan" id="kesehatanSakit" value="Sakit"><label class="form-check-label" for="kesehatanSakit">Sakit</label></div></div><div id="kesehatanKeteranganContainer" style="display:none;margin-top:4px;"><input type="text" class="form-control form-control-sm" id="kesehatanKeterangan" placeholder="Keterangan..."></div></div>
                </div>
                <div class="mt-3"><label><i class="fas fa-sticky-note me-1"></i>Catatan</label><textarea class="form-control form-control-sm" id="catatanInput" rows="2" placeholder="Catatan tambahan..."></textarea></div>
            `;
            // Re-attach events
            document.getElementById('pelanggaranSelect').addEventListener('change', togglePelanggaranKeterangan);
            document.querySelectorAll('input[name="kesehatan"]').forEach(r => {
                r.addEventListener('change', function() {
                    const container = document.getElementById('kesehatanKeteranganContainer');
                    if (this.value === 'Sakit') container.style.display = 'block';
                    else container.style.display = 'none';
                });
            });
        } else if (currentMode === 'hp') {
            container.innerHTML = `<div class="mb-2"><label>Status HP</label><select class="form-select form-select-sm" id="hpStatusSelect"><option value="Meminjam">Pinjam HP</option><option value="Mengembalikan">Kembalikan HP</option></select></div><div class="mt-2"><label><i class="fas fa-sticky-note me-1"></i>Catatan</label><textarea class="form-control form-control-sm" id="catatanInput" rows="2" placeholder="Catatan (opsional)..."></textarea></div>`;
        } else if (currentMode === 'pelanggaran') {
            container.innerHTML = `<div class="mb-2"><label>Jenis Pelanggaran <span class="text-danger">*</span></label><select class="form-select form-select-sm" id="pelanggaranJenisSelect"><option value="">-- Pilih --</option><option value="Ringan">Ringan</option><option value="Sedang">Sedang</option><option value="Berat">Berat</option></select></div><div class="mb-2"><label>Keterangan <span class="text-danger">*</span></label><input type="text" class="form-control form-control-sm" id="pelanggaranKeteranganInput" placeholder="Deskripsi..."></div><div class="mb-2"><label>Sanksi</label><input type="text" class="form-control form-control-sm" id="pelanggaranSanksiInput" placeholder="Sanksi..."></div><div class="mt-2"><label><i class="fas fa-sticky-note me-1"></i>Catatan Tambahan</label><textarea class="form-control form-control-sm" id="catatanInput" rows="2" placeholder="Catatan..."></textarea></div>`;
        }
    }

    function togglePelanggaranKeterangan() {
        const val = document.getElementById('pelanggaranSelect').value;
        const container = document.getElementById('pelanggaranKeteranganContainer');
        if (val && val !== 'Tidak Ada') container.style.display = 'block';
        else container.style.display = 'none';
    }

    // ============================================================
    //  SESI DISPLAY
    // ============================================================
    function updateSesiDisplay() {
        const now = new Date();
        const currentTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        const timeEl = document.getElementById('currentTime');
        if (timeEl) timeEl.textContent = currentTime;
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        let found = null;
        for (const s of sesiList) {
            const start = parseInt(s.mulai.split(':')[0]) * 60 + parseInt(s.mulai.split(':')[1]);
            const end = parseInt(s.selesai.split(':')[0]) * 60 + parseInt(s.selesai.split(':')[1]);
            if (currentMinutes >= start && currentMinutes <= end) { found = s; break; }
        }
        if (found) {
            document.getElementById('currentSessionName').textContent = `[${found.agama}] ${found.nama}`;
            document.getElementById('currentSessionBadge').className = 'badge-sesi badge-active';
        } else {
            document.getElementById('currentSessionName').textContent = 'Di luar sesi';
            document.getElementById('currentSessionBadge').className = 'badge-sesi badge-outside';
        }
    }

    // ============================================================
    //  SCAN QR
    // ============================================================
    async function startScan() {
        if (isScanning) return;
        unlockAudio();
        if (soundEnabled) playBeep();
        const reader = document.getElementById('reader');
        reader.innerHTML = '';
        try {
            html5QrCode = new Html5Qrcode('reader');
            const config = { fps: 60, qrbox: { width: 500, height: 500 }, aspectRatio: 1.0 };
            await html5QrCode.start({ facingMode: 'environment' }, config, onScanSuccess, () => {});
            isScanning = true;
            document.getElementById('btnStartScan').classList.add('d-none');
            document.getElementById('btnStopScan').classList.remove('d-none');
            toast('Kamera siap. Arahkan ke QR Code.', 'success');
        } catch (err) {
            toast('Gagal mengakses kamera.', 'error');
        }
    }

    async function stopScan() {
        if (!isScanning || !html5QrCode) return;
        await html5QrCode.stop();
        isScanning = false;
        document.getElementById('btnStartScan').classList.remove('d-none');
        document.getElementById('btnStopScan').classList.add('d-none');
        html5QrCode.clear();
        html5QrCode = null;
        document.getElementById('reader').innerHTML = '<div class="text-muted text-center">Klik "Mulai Scan" untuk mengaktifkan kamera</div>';
    }

    function onScanSuccess(decodedText) {
        if (scanCooldown) return;
        scanCooldown = true;
        if (soundEnabled) playBeep();
        const code = decodedText.trim();
        API.searchPeserta(code).then(data => {
            if (data.status === 'success') {
                currentScanData = {
                    code: data.code,
                    nama: data.nama,
                    jk: data.jk,
                    agama: data.agama,
                    sesi: data.sesi,
                    sesi_nama: data.sesi_nama,
                    dalam_sesi: data.dalam_sesi,
                    timestamp: new Date().toISOString()
                };
                displayResult();
                setTimeout(() => { scanCooldown = false; }, 800);
            } else {
                toast(data.message || 'Peserta tidak ditemukan.', 'error');
                resetScan();
                setTimeout(() => { scanCooldown = false; }, 800);
            }
        }).catch(() => {
            toast('Gagal menghubungi server.', 'error');
            resetScan();
            setTimeout(() => { scanCooldown = false; }, 800);
        });
    }

    function displayResult() {
        const d = currentScanData;
        document.getElementById('resultNama').textContent = d.nama;
        document.getElementById('resultKode').textContent = d.code;
        document.getElementById('resultJK').textContent = d.jk || '-';
        document.getElementById('resultAgama').textContent = d.agama || '-';
        document.getElementById('resultSesi').textContent = d.sesi_nama;
        document.getElementById('resultAvatar').textContent = d.nama.charAt(0).toUpperCase();
        document.getElementById('resultSesi').className = 'badge-sesi ' + (d.dalam_sesi ? 'badge-active' : 'badge-outside');
        document.getElementById('resultContainer').classList.remove('d-none');
        document.getElementById('resultContainer').scrollIntoView({ behavior: 'smooth', block: 'center' });
        renderDynamicForm();
    }

    function resetScan() {
        currentScanData = null;
        document.getElementById('resultContainer').classList.add('d-none');
        document.getElementById('dynamicForm').innerHTML = '';
        document.getElementById('manualCodeInput').value = '';
    }

    async function manualSearch() {
        const code = document.getElementById('manualCodeInput').value.trim();
        if (!code) { toast('Masukkan kode peserta.', 'warning'); return; }
        await onScanSuccess(code);
    }

    // ============================================================
    //  KONFIRMASI AKSI
    // ============================================================
    async function confirmAction() {
        if (!currentScanData) return;
        const btn = document.getElementById('btnConfirm');
        btn.disabled = true;
        btn.innerHTML = 'Memproses...';
        const catatan = document.getElementById('catatanInput')?.value.trim() || '';

        try {
            let result;
            if (currentMode === 'absen') {
                const status = document.getElementById('statusKehadiranSelect').value;
                const puasa = document.querySelector('input[name="puasa"]:checked')?.value || 'Tidak';
                const pelanggaran = document.getElementById('pelanggaranSelect').value;
                const pelanggaranKet = document.getElementById('pelanggaranKeteranganContainer').style.display === 'block' ? document.getElementById('pelanggaranKeterangan').value.trim() : '';
                const kesehatan = document.querySelector('input[name="kesehatan"]:checked')?.value || 'Sehat';
                const kesehatanKet = document.getElementById('kesehatanKeteranganContainer').style.display === 'block' ? document.getElementById('kesehatanKeterangan').value.trim() : '';

                let buktiSurat = '';
                if (status === 'Izin') {
                    const fileInput = document.getElementById('izinBuktiSurat');
                    if (fileInput.files && fileInput.files[0]) {
                        if (fileInput.files[0].size > 50000) { toast('Ukuran file maksimal 50KB.', 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-check-circle me-1"></i> Konfirmasi'; return; }
                        buktiSurat = await new Promise(r => {
                            const reader = new FileReader();
                            reader.onload = e => r(e.target.result);
                            reader.readAsDataURL(fileInput.files[0]);
                        });
                    }
                }

                result = await API.recordAbsensi(currentScanData.code, currentScanData.nama, currentScanData.sesi, currentScanData.sesi_nama, user?.nama || 'Unknown', currentScanData.agama, puasa, pelanggaran, pelanggaranKet, kesehatan, kesehatanKet, status);
                if (result.status === 'recorded') {
                    if (status === 'Izin' && buktiSurat) {
                        await API.addIzin({ kode_peserta: currentScanData.code, nama_peserta: currentScanData.nama, tanggal: new Date().toISOString().split('T')[0], keterangan: 'Izin via scan QR', petugas: user?.nama || 'Unknown', bukti_surat: buktiSurat });
                    }
                    addLocalLog('recorded', catatan);
                    resetScan();
                    toast('✅ Absensi tercatat.', 'success');
                } else if (result.status === 'already_recorded') {
                    addLocalLog('duplicate', catatan);
                    resetScan();
                    toast('⚠️ Sudah tercatat sebelumnya.', 'warning');
                } else {
                    toast(result.message || 'Gagal mencatat.', 'error');
                }
            } else if (currentMode === 'hp') {
                const hpStatus = document.getElementById('hpStatusSelect').value;
                result = await API.recordHP({ kode: currentScanData.code, nama: currentScanData.nama, sesi: currentScanData.sesi, sesi_nama: currentScanData.sesi_nama, status: hpStatus, petugas: user?.nama || 'Unknown', catatan: catatan });
                if (result.status === 'success') {
                    addLocalLog('hp_' + hpStatus, catatan);
                    resetScan();
                    toast(`✅ HP ${hpStatus} tercatat.`, 'success');
                } else toast(result.message || 'Gagal mencatat HP.', 'error');
            } else if (currentMode === 'pelanggaran') {
                const jenis = document.getElementById('pelanggaranJenisSelect').value;
                const keterangan = document.getElementById('pelanggaranKeteranganInput').value.trim();
                const sanksi = document.getElementById('pelanggaranSanksiInput').value.trim();
                if (!jenis || !keterangan) { toast('Jenis dan keterangan pelanggaran wajib diisi.', 'error'); btn.disabled = false; btn.innerHTML = '<i class="fas fa-check-circle me-1"></i> Konfirmasi'; return; }
                result = await API.recordAbsensi(currentScanData.code, currentScanData.nama, currentScanData.sesi, currentScanData.sesi_nama, user?.nama || 'Unknown', currentScanData.agama, 'Tidak', jenis, keterangan, 'Sehat', '', 'Pelanggaran');
                if (result.status === 'recorded') {
                    addLocalLog('pelanggaran', catatan + (sanksi ? ' | Sanksi: ' + sanksi : ''));
                    resetScan();
                    toast('✅ Pelanggaran tercatat.', 'success');
                } else toast(result.message || 'Gagal mencatat pelanggaran.', 'error');
            }
        } catch (e) {
            toast('Gagal server.', 'error');
        }
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check-circle me-1"></i> Konfirmasi';
    }

    // ============================================================
    //  LOG
    // ============================================================
    function addLocalLog(status, catatan = '') {
        localLog.unshift({ nama: currentScanData.nama, kode: currentScanData.code, sesi: currentScanData.sesi_nama, jam: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), status, catatan });
        if (localLog.length > 30) localLog.pop();
        localStorage.setItem('srma19_absensi_log', JSON.stringify(localLog));
        renderLog();
    }

    function loadLocalLog() {
        const saved = localStorage.getItem('srma19_absensi_log');
        if (saved) try { localLog = JSON.parse(saved); } catch (e) {}
        renderLog();
    }

    function clearLocalLog() {
        if (confirm('Hapus log?')) {
            localLog = [];
            localStorage.removeItem('srma19_absensi_log');
            renderLog();
        }
    }

    function renderLog() {
        const container = document.getElementById('logContainer');
        if (localLog.length) {
            container.innerHTML = localLog.map(l => {
                let iconClass = 'fa-check-circle text-success';
                if (l.status === 'duplicate') iconClass = 'fa-exclamation-triangle text-warning';
                else if (l.status.startsWith('hp_')) iconClass = 'fa-mobile-alt text-primary';
                else if (l.status === 'pelanggaran') iconClass = 'fa-exclamation-circle text-danger';
                return `<div class="log-item"><span><i class="fas ${iconClass}"></i> ${l.nama}</span><span class="small text-muted">${l.sesi} | ${l.jam}</span>${l.catatan ? `<span class="badge bg-light text-dark">📝 ${l.catatan}</span>` : ''}</div>`;
            }).join('');
        } else {
            container.innerHTML = '<p class="text-center text-muted py-2 small">Belum ada data</p>';
        }
    }

    // ============================================================
    //  TEST KONEKSI
    // ============================================================
    async function testConnection() {
        try {
            const r = await API.ping();
            document.getElementById('connectionStatus').innerHTML = r.status === 'ok' ? '<span class="pulse-dot me-1"></span><span class="text-success">Terhubung</span>' : '<i class="fas fa-exclamation-triangle text-warning me-1"></i>Respons tidak dikenal';
        } catch (e) {
            document.getElementById('connectionStatus').innerHTML = '<i class="fas fa-times-circle text-danger me-1"></i>Gagal';
        }
    }

    // ============================================================
    //  EXPOSE KE GLOBAL
    // ============================================================
    window.PetugasScanQR = {
        renderScanQR,
        switchMode,
        startScan,
        stopScan,
        toggleSound,
        confirmAction,
        resetScan,
        manualSearch,
        clearLocalLog,
        updateSesiDisplay,
        fetchJadwal,
        testConnection
    };

    console.log('✅ Petugas ScanQR module loaded');
})();