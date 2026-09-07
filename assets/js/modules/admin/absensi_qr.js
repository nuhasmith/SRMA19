// ============================================================
//  ABSENSI_QR.JS – QR Scanner (Admin) - ULTIMATE PREMIUM FIX
//  SRMA 19 Bantul
//  Fitur: UI Premium, Tidak Auto Start, Tombol Mulai/Hentikan
//  Versi: 6.0.0
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
    let isManualMode = false;
    let manualSesi = null;
    let currentMode = 'absen';
    let currentVideoTrack = null;
    let isTorchOn = false;
    const user = Auth.getCurrentUser();
    const isAdmin = user?.role === 'admin';
    const SOUND_KEY = 'srma19_sound_enabled';

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
        localStorage.setItem(SOUND_KEY, soundEnabled);
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
    //  RENDER UI SCANNER (TANPA AUTO START)
    // ============================================================
    function renderAbsensiQR(container) {
        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h4 class="fw-bold mb-0"><i class="fas fa-qrcode me-2" style="color:#0d6efd;"></i>Scan QR Absensi</h4>
                <div>
                    <button class="btn btn-sm btn-outline-secondary rounded-pill" id="soundToggleBtn" onclick="AbsensiQR.toggleSound()" title="Suara">
                        <i class="fas fa-volume-up"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-secondary rounded-pill" id="flashToggleBtn" onclick="AbsensiQR.toggleFlash()" title="Lampu Senter" style="display:none;">
                        <i class="fas fa-bolt"></i>
                    </button>
                </div>
            </div>

            <!-- Mode Selector -->
            <div class="mode-selector mb-3">
                <button class="mode-btn active" data-mode="absen" onclick="AbsensiQR.switchMode('absen')"><i class="fas fa-clipboard-check"></i> Absensi</button>
                <button class="mode-btn" data-mode="hp" onclick="AbsensiQR.switchMode('hp')"><i class="fas fa-mobile-alt"></i> HP</button>
                <button class="mode-btn" data-mode="pelanggaran" onclick="AbsensiQR.switchMode('pelanggaran')"><i class="fas fa-exclamation-triangle"></i> Pelanggaran</button>
            </div>

            <!-- Sesi Info -->
            <div class="card-modern mb-3 p-3">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <div class="small text-muted">Sesi Saat Ini</div>
                        <strong id="currentSessionName" class="text-dark">Memuat...</strong>
                    </div>
                    <div class="text-end">
                        <span class="badge-sesi badge-active" id="currentSessionBadge"><i class="fas fa-clock me-1"></i><span id="currentTime">--:--</span></span>
                    </div>
                </div>
                ${isAdmin ? `
                <!-- Mode Manual (Admin Only) -->
                <div class="mt-2 pt-2 border-top">
                    <div class="d-flex align-items-center gap-2 mb-2">
                        <label class="toggle-switch">
                            <input type="checkbox" id="manualModeSwitch" onchange="AbsensiQR.toggleManualMode()">
                            <span class="toggle-slider"></span>
                        </label>
                        <span class="small fw-semibold"><i class="fas fa-user-shield me-1"></i>Mode Manual</span>
                    </div>
                    <div id="manualSessionSelector" style="display:none;">
                        <div class="d-flex flex-wrap gap-2 align-items-center">
                            <select class="form-select form-select-sm rounded-pill flex-grow-1" id="manualSessionSelect" onchange="AbsensiQR.onManualSessionChange()">
                                <option value="">-- Pilih Sesi --</option>
                            </select>
                            <button class="btn btn-sm btn-outline-success rounded-pill" onclick="AbsensiQR.showCustomSessionForm()">
                                <i class="fas fa-plus-circle me-1"></i>Sesi Baru
                            </button>
                        </div>
                    </div>
                    <div id="customSessionForm" class="custom-session-form" style="display:none;margin-top:10px;background:#f8fafc;padding:12px;border-radius:10px;border:1px solid #e2e8f0;">
                        <div class="row g-2">
                            <div class="col-12"><input type="text" class="form-control form-control-sm" id="customSesiNama" placeholder="Nama Sesi"></div>
                            <div class="col-6"><input type="time" class="form-control form-control-sm" id="customSesiMulai"></div>
                            <div class="col-6"><input type="time" class="form-control form-control-sm" id="customSesiSelesai"></div>
                            <div class="col-12">
                                <div class="d-flex gap-2">
                                    <button class="btn btn-sm btn-success w-50" onclick="AbsensiQR.applyCustomSession()">Gunakan</button>
                                    <button class="btn btn-sm btn-outline-secondary w-50" onclick="AbsensiQR.cancelCustomSession()">Batal</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>

            <!-- Scanner Area Premium -->
            <div class="scanner-premium-container position-relative mb-3">
                <div id="reader" class="scanner-preview">
                    <div class="scanner-placeholder">
                        <i class="fas fa-qrcode fa-3x text-muted mb-2"></i>
                        <p class="text-muted mb-0">Kamera belum aktif. Klik tombol di bawah untuk mulai.</p>
                    </div>
                </div>
                <div class="scanner-glow"></div>
                <div class="scanner-guide">
                    <span class="guide-corner tl"></span>
                    <span class="guide-corner tr"></span>
                    <span class="guide-corner bl"></span>
                    <span class="guide-corner br"></span>
                </div>
            </div>

            <div class="mt-3 text-center">
                <button class="btn btn-primary btn-lg rounded-pill px-5 shadow" id="btnStartScan" onclick="AbsensiQR.startScan()">
                    <i class="fas fa-camera me-2"></i>Mulai Scan
                </button>
                <button class="btn btn-danger btn-lg rounded-pill px-5 shadow d-none" id="btnStopScan" onclick="AbsensiQR.stopScan()">
                    <i class="fas fa-stop me-2"></i>Hentikan
                </button>
            </div>

            <!-- Input Manual -->
            <div class="card-modern mb-3 mt-3">
                <div class="row g-2 align-items-center">
                    <div class="col-md-8">
                        <label class="fw-semibold small">Input Manual (Kode Peserta)</label>
                        <div class="input-group">
                            <input type="text" class="form-control form-control-sm" id="manualCodeInput" placeholder="Contoh: SRMA19-001" onkeypress="if(event.key==='Enter') AbsensiQR.manualSearch()">
                            <button class="btn btn-primary btn-sm" onclick="AbsensiQR.manualSearch()"><i class="fas fa-search me-1"></i>Cari</button>
                        </div>
                    </div>
                    <div class="col-md-4"><label class="fw-semibold small">&nbsp;</label><button class="btn btn-secondary btn-sm w-100" onclick="AbsensiQR.resetScan()"><i class="fas fa-redo me-1"></i>Reset</button></div>
                </div>
            </div>

            <!-- Hasil Scan -->
            <div id="resultContainer" class="d-none mt-3">
                <div class="card-modern p-3" id="resultCard">
                    <h6 class="fw-bold mb-2"><i class="fas fa-info-circle me-2"></i>Data Peserta</h6>
                    <div class="text-center">
                        <div id="resultAvatar" style="width:70px;height:70px;border-radius:50%;background:#e0f2fe;display:inline-flex;align-items:center;justify-content:center;font-size:2rem;font-weight:800;color:var(--primary);">?</div>
                        <div class="mt-2">
                            <div class="fw-bold fs-5" id="resultNama">-</div>
                            <div class="text-muted small"><span id="resultKode">-</span> &bull; <span id="resultJK">-</span> &bull; <span id="resultAgama">-</span></div>
                            <div><span class="badge-sesi" id="resultSesi">-</span></div>
                        </div>
                        <div class="form-section mt-3" id="dynamicForm"></div>
                        <button class="btn btn-success btn-lg rounded-pill mt-3 w-100" id="btnConfirm" onclick="AbsensiQR.confirmAction()"><i class="fas fa-check-circle me-1"></i> Konfirmasi</button>
                        <button class="btn btn-outline-secondary btn-sm rounded-pill mt-2 w-100" onclick="AbsensiQR.resetScan()"><i class="fas fa-redo me-1"></i> Scan Ulang</button>
                    </div>
                </div>
            </div>

            <!-- Log -->
            <div class="card-modern p-3 mt-3">
                <div class="d-flex justify-content-between align-items-center">
                    <h6 class="fw-bold mb-0"><i class="fas fa-list-alt me-2" style="color:var(--warning);"></i>Log Transaksi</h6>
                    <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="AbsensiQR.clearLocalLog()"><i class="fas fa-trash-alt"></i></button>
                </div>
                <div id="logContainer" style="max-height:200px;overflow-y:auto;margin-top:8px;"><p class="text-center text-muted py-2 small">Belum ada data</p></div>
            </div>

            <!-- Status -->
            <div class="text-center mt-2 small text-muted" id="connectionStatus">
                <span class="pulse-dot me-1"></span>Memeriksa koneksi...
            </div>
        `;

        // Tambahkan CSS Animasi Scanner
        if (!document.getElementById('qr-scanner-style')) {
            const style = document.createElement('style');
            style.id = 'qr-scanner-style';
            style.textContent = `
                .scanner-premium-container {
                    background: #0f172a;
                    border-radius: 16px;
                    padding: 20px;
                    overflow: hidden;
                }
                .scanner-preview {
                    min-height: 280px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 12px;
                    background: rgba(0,0,0,0.3);
                }
                .scanner-placeholder {
                    text-align: center;
                    padding: 40px 20px;
                    color: #94a3b8;
                }
                .scanner-glow {
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    pointer-events: none;
                    box-shadow: inset 0 0 40px rgba(255,255,255,0.05);
                }
                .scanner-guide {
                    position: absolute;
                    top: 40%; left: 50%;
                    transform: translate(-50%, -50%);
                    width: 200px;
                    height: 200px;
                    pointer-events: none;
                }
                .guide-corner {
                    position: absolute;
                    width: 30px;
                    height: 30px;
                    border-color: #0d6efd !important;
                    border-style: solid;
                    border-width: 0;
                }
                .guide-corner.tl { top: 0; left: 0; border-top-width: 3px; border-left-width: 3px; }
                .guide-corner.tr { top: 0; right: 0; border-top-width: 3px; border-right-width: 3px; }
                .guide-corner.bl { bottom: 0; left: 0; border-bottom-width: 3px; border-left-width: 3px; }
                .guide-corner.br { bottom: 0; right: 0; border-bottom-width: 3px; border-right-width: 3px; }
                #reader video {
                    border-radius: 12px;
                }
            `;
            document.head.appendChild(style);
        }

        // Inisialisasi tanpa auto start
        setTimeout(() => {
            fetchJadwal();
            loadLocalLog();
            updateSesiDisplay();
            testConnection();
            initBeepAudio();
            restoreManualState();
            switchMode('absen');
            setInterval(updateSesiDisplay, 30000);
            // HAPUS BARIS "if (!isScanning) startScan();" DI SINI
        }, 200);
    }

    // ============================================================
    //  SWITCH MODE & DYNAMIC FORM
    // ============================================================
    function switchMode(mode) {
        currentMode = mode;
        const btns = document.querySelectorAll('.mode-btn');
        btns.forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`.mode-btn[data-mode="${mode}"]`);
        if (activeBtn) activeBtn.classList.add('active');
        if (currentScanData) displayResult();
        else {
            const container = document.getElementById('dynamicForm');
            if (container) container.innerHTML = '';
        }
        const confirmBtn = document.getElementById('btnConfirm');
        if (confirmBtn) {
            const labels = { 'absen': 'Konfirmasi Absensi', 'hp': 'Konfirmasi HP', 'pelanggaran': 'Konfirmasi Pelanggaran' };
            confirmBtn.innerHTML = `<i class="fas fa-check-circle me-1"></i> ${labels[mode]}`;
        }
    }

    function renderDynamicForm() {
        const container = document.getElementById('dynamicForm');
        if (!container) return;
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
                <div id="izinUploadContainer" style="display:none;margin-top:8px;"><label>Upload Bukti Surat (max 50KB)</label><input type="file" accept="image/*" class="form-control form-control-sm" id="izinBuktiSurat"><small class="text-muted">Format JPG/PNG. Maksimal 50KB.</small></div>
                <div class="mt-3"><label><i class="fas fa-sticky-note me-1"></i>Catatan</label><textarea class="form-control form-control-sm" id="catatanInput" rows="2" placeholder="Catatan tambahan..."></textarea></div>
            `;
            document.getElementById('pelanggaranSelect').addEventListener('change', togglePelanggaranKeterangan);
            document.querySelectorAll('input[name="kesehatan"]').forEach(r => {
                r.addEventListener('change', function() {
                    const container = document.getElementById('kesehatanKeteranganContainer');
                    if (this.value === 'Sakit') container.style.display = 'block';
                    else container.style.display = 'none';
                });
            });
            document.getElementById('statusKehadiranSelect').addEventListener('change', toggleIzinUpload);
        } else if (currentMode === 'hp') {
            container.innerHTML = `<div class="mb-2"><label>Status HP</label><select class="form-select form-select-sm" id="hpStatusSelect"><option value="Meminjam">Pinjam HP</option><option value="Mengembalikan">Kembalikan HP</option></select></div><div class="mt-2"><label><i class="fas fa-sticky-note me-1"></i>Catatan</label><textarea class="form-control form-control-sm" id="catatanInput" rows="2" placeholder="Catatan (opsional)..."></textarea></div>`;
        } else if (currentMode === 'pelanggaran') {
            container.innerHTML = `<div class="mb-2"><label>Jenis Pelanggaran <span class="text-danger">*</span></label><select class="form-select form-select-sm" id="pelanggaranJenisSelect"><option value="">-- Pilih --</option><option value="Ringan">Ringan</option><option value="Sedang">Sedang</option><option value="Berat">Berat</option></select></div><div class="mb-2"><label>Keterangan <span class="text-danger">*</span></label><input type="text" class="form-control form-control-sm" id="pelanggaranKeteranganInput" placeholder="Deskripsi..."></div><div class="mb-2"><label>Sanksi</label><input type="text" class="form-control form-control-sm" id="pelanggaranSanksiInput" placeholder="Sanksi..."></div><div class="mt-2"><label><i class="fas fa-sticky-note me-1"></i>Catatan Tambahan</label><textarea class="form-control form-control-sm" id="catatanInput" rows="2" placeholder="Catatan..."></textarea></div>`;
        }
    }

    function toggleIzinUpload() {
        const status = document.getElementById('statusKehadiranSelect')?.value;
        const container = document.getElementById('izinUploadContainer');
        if (status === 'Izin') container.style.display = 'block';
        else container.style.display = 'none';
    }

    function togglePelanggaranKeterangan() {
        const val = document.getElementById('pelanggaranSelect')?.value;
        const container = document.getElementById('pelanggaranKeteranganContainer');
        if (val && val !== 'Tidak Ada') container.style.display = 'block';
        else container.style.display = 'none';
    }

    // ============================================================
    //  SESI DISPLAY & MANUAL MODE
    // ============================================================
    function updateSesiDisplay() {
        const now = new Date();
        const currentTime = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        const timeEl = document.getElementById('currentTime');
        if (timeEl) timeEl.textContent = currentTime;

        const sessionNameEl = document.getElementById('currentSessionName');
        const sessionBadgeEl = document.getElementById('currentSessionBadge');
        if (!sessionNameEl || !sessionBadgeEl) return;

        if (isManualMode && manualSesi) {
            sessionNameEl.textContent = manualSesi.nama;
            sessionBadgeEl.className = 'badge-sesi badge-manual';
        } else {
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            let found = null;
            for (const s of sesiList) {
                const start = parseInt(s.mulai.split(':')[0]) * 60 + parseInt(s.mulai.split(':')[1]);
                const end = parseInt(s.selesai.split(':')[0]) * 60 + parseInt(s.selesai.split(':')[1]);
                if (currentMinutes >= start && currentMinutes <= end) { found = s; break; }
            }
            if (found) {
                sessionNameEl.textContent = `[${found.agama}] ${found.nama}`;
                sessionBadgeEl.className = 'badge-sesi badge-active';
            } else {
                sessionNameEl.textContent = 'Di luar sesi';
                sessionBadgeEl.className = 'badge-sesi badge-outside';
            }
        }
    }

    function toggleManualMode() {
        const switchEl = document.getElementById('manualModeSwitch');
        if (!switchEl) return;
        isManualMode = switchEl.checked;
        const selector = document.getElementById('manualSessionSelector');
        if (selector) selector.style.display = isManualMode ? 'block' : 'none';
        if (!isManualMode) {
            manualSesi = null;
            const sessionNameEl = document.getElementById('currentSessionName');
            const sessionBadgeEl = document.getElementById('currentSessionBadge');
            if (sessionNameEl) sessionNameEl.textContent = 'Menunggu scan...';
            if (sessionBadgeEl) sessionBadgeEl.className = 'badge-sesi badge-active';
            cancelCustomSession();
        }
        saveManualState();
    }

    function onManualSessionChange() {
        const select = document.getElementById('manualSessionSelect');
        if (!select) return;
        const kode = select.value;
        if (kode) {
            const sesiObj = sesiList.find(s => s.kode === kode);
            if (sesiObj) {
                manualSesi = { kode: sesiObj.kode, nama: sesiObj.nama, agama: sesiObj.agama };
                const sessionNameEl = document.getElementById('currentSessionName');
                const sessionBadgeEl = document.getElementById('currentSessionBadge');
                if (sessionNameEl) sessionNameEl.textContent = `[${sesiObj.agama}] ${sesiObj.nama} (Manual)`;
                if (sessionBadgeEl) sessionBadgeEl.className = 'badge-sesi badge-manual';
                cancelCustomSession();
            }
        } else {
            manualSesi = null;
            updateSesiDisplay();
        }
        saveManualState();
    }

    function saveManualState() {
        sessionStorage.setItem('srma19_absensi_state', JSON.stringify({ manualMode: isManualMode, manualSesi }));
    }

    function restoreManualState() {
        const saved = sessionStorage.getItem('srma19_absensi_state');
        if (!saved) return;
        try {
            const state = JSON.parse(saved);
            if (state.manualMode) {
                isManualMode = true;
                const switchEl = document.getElementById('manualModeSwitch');
                if (switchEl) switchEl.checked = true;
                const selector = document.getElementById('manualSessionSelector');
                if (selector) selector.style.display = 'block';
                if (state.manualSesi) {
                    setTimeout(() => {
                        const select = document.getElementById('manualSessionSelect');
                        const found = sesiList.find(s => s.kode === state.manualSesi.kode);
                        if (found) {
                            select.value = state.manualSesi.kode;
                            onManualSessionChange();
                        } else if (state.manualSesi.kode && state.manualSesi.kode.startsWith('custom_')) {
                            manualSesi = state.manualSesi;
                            const sessionNameEl = document.getElementById('currentSessionName');
                            const sessionBadgeEl = document.getElementById('currentSessionBadge');
                            if (sessionNameEl) sessionNameEl.textContent = `[Custom] ${manualSesi.nama} (Manual)`;
                            if (sessionBadgeEl) sessionBadgeEl.className = 'badge-sesi badge-manual';
                        }
                    }, 100);
                }
            }
        } catch (e) {}
    }

    function showCustomSessionForm() {
        const form = document.getElementById('customSessionForm');
        const select = document.getElementById('manualSessionSelect');
        if (form) form.style.display = 'block';
        if (select) select.disabled = true;
        const now = new Date();
        const mulaiEl = document.getElementById('customSesiMulai');
        const selesaiEl = document.getElementById('customSesiSelesai');
        if (mulaiEl) mulaiEl.value = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
        if (selesaiEl) selesaiEl.value = '';
    }

    function cancelCustomSession() {
        const form = document.getElementById('customSessionForm');
        const select = document.getElementById('manualSessionSelect');
        if (form) form.style.display = 'none';
        if (select) select.disabled = false;
        const namaEl = document.getElementById('customSesiNama');
        const mulaiEl = document.getElementById('customSesiMulai');
        const selesaiEl = document.getElementById('customSesiSelesai');
        if (namaEl) namaEl.value = '';
        if (mulaiEl) mulaiEl.value = '';
        if (selesaiEl) selesaiEl.value = '';
    }

    function applyCustomSession() {
        const nama = document.getElementById('customSesiNama').value.trim();
        const mulai = document.getElementById('customSesiMulai').value;
        const selesai = document.getElementById('customSesiSelesai').value;
        if (!nama || !mulai) { toast('Nama sesi dan waktu mulai wajib diisi.', 'error'); return; }
        manualSesi = { kode: 'custom_' + Date.now(), nama: nama, agama: 'Custom', mulai: mulai, selesai: selesai || '23:59' };
        const sessionNameEl = document.getElementById('currentSessionName');
        const sessionBadgeEl = document.getElementById('currentSessionBadge');
        if (sessionNameEl) sessionNameEl.textContent = `[Custom] ${nama}`;
        if (sessionBadgeEl) sessionBadgeEl.className = 'badge-sesi badge-manual';
        const select = document.getElementById('manualSessionSelect');
        if (select) select.value = '';
        cancelCustomSession();
        saveManualState();
        toast('✅ Sesi kustom "' + nama + '" dipilih.', 'success');
    }

    // ============================================================
    //  SCAN QR & KONFIRMASI (Hanya Mulai Saat Diklik)
    // ============================================================
    async function startScan() {
        if (isScanning) return;
        unlockAudio();
        if (soundEnabled) playBeep();
        const reader = document.getElementById('reader');
        if (!reader) return;
        reader.innerHTML = '';
        try {
            html5QrCode = new Html5Qrcode('reader');
            const config = {
                fps: 10,
                qrbox: (viewfinderWidth, viewfinderHeight) => {
                    const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.7;
                    return { width: size, height: size };
                },
                aspectRatio: 1.0,
                disableFlip: false
            };
            await html5QrCode.start({ facingMode: 'environment' }, config, onScanSuccess, () => {});
            isScanning = true;
            const btnStart = document.getElementById('btnStartScan');
            const btnStop = document.getElementById('btnStopScan');
            if (btnStart) btnStart.classList.add('d-none');
            if (btnStop) btnStop.classList.remove('d-none');
            const videoElem = document.getElementById('reader').querySelector('video');
            if (videoElem && videoElem.srcObject) currentVideoTrack = videoElem.srcObject.getVideoTracks()[0];
            const flashBtn = document.getElementById('flashToggleBtn');
            if (flashBtn) flashBtn.style.display = 'inline-block';
            toast('Kamera aktif. Arahkan ke QR Code.', 'success');
        } catch (err) {
            toast('Gagal mengakses kamera.', 'error');
        }
    }

    async function stopScan() {
        if (!isScanning || !html5QrCode) return;
        try {
            await html5QrCode.stop();
            if (currentVideoTrack) {
                currentVideoTrack.stop();
                currentVideoTrack = null;
            }
            const reader = document.getElementById('reader');
            if (reader) {
                reader.innerHTML = '<div class="scanner-placeholder"><i class="fas fa-qrcode fa-3x text-muted mb-2"></i><p class="text-muted mb-0">Kamera dimatikan. Klik "Mulai Scan" untuk mengaktifkan.</p></div>';
            }
        } catch (e) {
            console.error('Error stop scan:', e);
        }
        isScanning = false;
        const btnStart = document.getElementById('btnStartScan');
        const btnStop = document.getElementById('btnStopScan');
        if (btnStart) btnStart.classList.remove('d-none');
        if (btnStop) btnStop.classList.add('d-none');
        const flashBtn = document.getElementById('flashToggleBtn');
        if (flashBtn) flashBtn.style.display = 'none';
        isTorchOn = false;
        html5QrCode = null;
    }

    function onScanSuccess(decodedText) {
        if (scanCooldown) return;
        scanCooldown = true;
        if (soundEnabled) playBeep();
        const code = decodedText.trim();
        API.searchPeserta(code).then(data => {
            if (data.status === 'success') {
                let finalSesi, finalSesiNama, dalamSesi, manual;
                if (isManualMode && manualSesi) {
                    finalSesi = manualSesi.kode;
                    finalSesiNama = manualSesi.nama;
                    dalamSesi = true;
                    manual = true;
                } else {
                    finalSesi = data.sesi;
                    finalSesiNama = data.sesi_nama;
                    dalamSesi = data.dalam_sesi;
                    manual = false;
                }
                currentScanData = {
                    code: data.code,
                    nama: data.nama,
                    jk: data.jk,
                    agama: data.agama,
                    sesi: finalSesi,
                    sesi_nama: finalSesiNama,
                    dalam_sesi: dalamSesi,
                    manual: manual,
                    timestamp: new Date().toISOString()
                };
                displayResult();
                setTimeout(() => { scanCooldown = false; }, 600);
            } else {
                toast(data.message || 'Peserta tidak ditemukan.', 'error');
                resetScan();
                setTimeout(() => { scanCooldown = false; }, 600);
            }
        }).catch(() => {
            toast('Gagal menghubungi server.', 'error');
            resetScan();
            setTimeout(() => { scanCooldown = false; }, 600);
        });
    }

    function displayResult() {
        const d = currentScanData;
        const nameEl = document.getElementById('resultNama');
        const kodeEl = document.getElementById('resultKode');
        const jkEl = document.getElementById('resultJK');
        const agamaEl = document.getElementById('resultAgama');
        const sesiEl = document.getElementById('resultSesi');
        const avatarEl = document.getElementById('resultAvatar');
        if (nameEl) nameEl.textContent = d.nama;
        if (kodeEl) kodeEl.textContent = d.code;
        if (jkEl) jkEl.textContent = d.jk || '-';
        if (agamaEl) agamaEl.textContent = d.agama || '-';
        if (sesiEl) sesiEl.textContent = d.sesi_nama + (d.manual ? ' (Manual)' : '');
        if (avatarEl) avatarEl.textContent = d.nama.charAt(0).toUpperCase();
        if (sesiEl) sesiEl.className = 'badge-sesi ' + (d.manual ? 'badge-manual' : (d.dalam_sesi ? 'badge-active' : 'badge-outside'));
        const container = document.getElementById('resultContainer');
        if (container) {
            container.classList.remove('d-none');
            container.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        renderDynamicForm();
    }

    function resetScan() {
        currentScanData = null;
        const container = document.getElementById('resultContainer');
        if (container) container.classList.add('d-none');
        const dynamic = document.getElementById('dynamicForm');
        if (dynamic) dynamic.innerHTML = '';
        const manualInput = document.getElementById('manualCodeInput');
        if (manualInput) manualInput.value = '';
    }

    async function manualSearch() {
        const code = document.getElementById('manualCodeInput').value.trim();
        if (!code) { toast('Masukkan kode peserta.', 'warning'); return; }
        await onScanSuccess(code);
    }

    async function confirmAction() {
        if (!currentScanData) return;
        const btn = document.getElementById('btnConfirm');
        if (!btn) return;
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
        if (!container) return;
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
    //  FLASH / SENTER
    // ============================================================
    async function toggleFlash() {
        if (!currentVideoTrack) { toast('Fitur flash tidak didukung.', 'warning'); return; }
        try {
            const capabilities = currentVideoTrack.getCapabilities();
            if (!capabilities.torch) { toast('Perangkat tidak memiliki lampu flash.', 'warning'); return; }
            isTorchOn = !isTorchOn;
            await currentVideoTrack.applyConstraints({ advanced: [{ torch: isTorchOn }] });
            const icon = document.getElementById('flashToggleBtn').querySelector('i');
            if (icon) icon.className = isTorchOn ? 'fas fa-sun' : 'fas fa-bolt';
        } catch (e) { toast('Gagal mengaktifkan flash.', 'error'); }
    }

    // ============================================================
    //  TEST KONEKSI
    // ============================================================
    async function testConnection() {
        const el = document.getElementById('connectionStatus');
        if (!el) return;
        try {
            const r = await API.ping();
            el.innerHTML = r.status === 'ok'
                ? '<span class="pulse-dot me-1"></span><span class="text-success">Terhubung</span>'
                : '<i class="fas fa-exclamation-triangle text-warning me-1"></i>Respons tidak dikenal';
        } catch (e) {
            el.innerHTML = '<i class="fas fa-times-circle text-danger me-1"></i>Gagal';
        }
    }

    // ============================================================
    //  EXPOSE KE GLOBAL
    // ============================================================
    window.AbsensiQR = {
        renderAbsensiQR,
        switchMode,
        startScan,
        stopScan,
        toggleSound,
        toggleManualMode,
        onManualSessionChange,
        showCustomSessionForm,
        cancelCustomSession,
        applyCustomSession,
        confirmAction,
        resetScan,
        manualSearch,
        clearLocalLog,
        toggleFlash,
        updateSesiDisplay,
        fetchJadwal,
        testConnection
    };

    console.log('✅ AbsensiQR module loaded (v6.0.0 - No Auto Start, Premium UI)');
})();