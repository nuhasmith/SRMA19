// ============================================================
//  PROFIL.JS – Halaman Profil Pengguna (Admin, Petugas, Humas)
//  SRMA 19 Bantul
//  Versi: 2.0.0 - Final, Full Fix, Robust
// ============================================================

(function() {
    'use strict';

    // ============================================================
    //  SAFE STORAGE (Fallback jika belum ada)
    // ============================================================
    const SafeStorage = window.SafeStorage || (() => {
        const mem = {};
        return {
            getItem: (k) => mem[k] || null,
            setItem: (k, v) => mem[k] = v,
            removeItem: (k) => delete mem[k]
        };
    })();

    // ============================================================
    //  STATE
    // ============================================================
    const user = Auth.getCurrentUser();
    const PROFILE_KEY = 'srma19_profile_data';

    // ============================================================
    //  HELPER FUNCTIONS
    // ============================================================
    function getRoleBadge(role) {
        const colors = {
            'admin': 'bg-danger',
            'petugas': 'bg-primary',
            'humas': 'bg-warning text-dark'
        };
        return colors[role] || 'bg-secondary';
    }

    function getRoleLabel(role) {
        const labels = {
            'admin': 'Administrator',
            'petugas': 'Petugas',
            'humas': 'Humas'
        };
        return labels[role] || role;
    }

    // Ambil data profil dari SafeStorage (localStorage)
    function getLocalProfile() {
        try {
            const raw = SafeStorage.getItem(PROFILE_KEY);
            return raw ? JSON.parse(raw) : {};
        } catch (e) {
            return {};
        }
    }

    function saveLocalProfile(data) {
        try {
            SafeStorage.setItem(PROFILE_KEY, JSON.stringify(data));
        } catch (e) {
            console.warn('Gagal menyimpan profil lokal:', e);
        }
    }

    // ============================================================
    //  RENDER PROFIL
    // ============================================================
    function renderProfil(container) {
        const profileData = getLocalProfile();

        const userData = {
            nama: profileData.nama || user.nama || '-',
            username: user.username || '-',
            role: user.role || '-',
            token: user.token || '-',
            loginTime: user.loginTime ? new Date(user.loginTime).toLocaleString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : '-',
            email: profileData.email || '',
            phone: profileData.phone || '',
            address: profileData.address || '',
            bio: profileData.bio || '',
            foto: profileData.foto || ''
        };

        container.innerHTML = `
            <div class="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                <h4 class="fw-bold mb-0"><i class="fas fa-user-circle me-2" style="color:#0d6efd;"></i>Profil Saya</h4>
                <button class="btn btn-outline-secondary rounded-pill btn-sm" onclick="App.navigate('dashboard')">
                    <i class="fas fa-arrow-left me-1"></i> Kembali ke Dashboard
                </button>
            </div>

            <div class="card-modern overflow-hidden">
                <!-- Banner Header Gradien -->
                <div class="p-4 text-white" style="background: linear-gradient(135deg, #0d6efd, #8b5cf6);">
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <h3 class="fw-bold mb-2">${userData.nama}</h3>
                            <div class="mb-2">
                                <span class="badge ${getRoleBadge(user.role)} me-1">${getRoleLabel(user.role)}</span>
                                <span class="badge bg-light text-dark">@${userData.username}</span>
                            </div>
                            <div class="small opacity-75">
                                <i class="fas fa-clock me-1"></i> Login terakhir: ${userData.loginTime}
                            </div>
                        </div>
                        <div class="col-md-4 text-md-end text-center mt-3 mt-md-0">
                            <div class="position-relative d-inline-block">
                                <div id="avatarPreview" class="rounded-circle border border-3 border-white shadow" style="width:100px;height:100px;overflow:hidden;margin:0 auto;background:#e2e8f0;display:flex;align-items:center;justify-content:center;">
                                    ${userData.foto ? `<img src="${userData.foto}" style="width:100%;height:100%;object-fit:cover;" alt="Foto">` : `<i class="fas fa-user fa-3x text-muted"></i>`}
                                </div>
                                <button class="btn btn-sm btn-primary rounded-circle position-absolute" style="bottom:0;right:0;" title="Upload Foto" onclick="document.getElementById('profilePhotoInput').click()">
                                    <i class="fas fa-camera"></i>
                                </button>
                                <input type="file" id="profilePhotoInput" accept="image/*" class="d-none" onchange="Profil.uploadPhoto(this)">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="p-4">
                    <div class="row g-4">
                        <!-- Kolom Kiri: Keamanan & Info Sesi -->
                        <div class="col-lg-5">
                            <div class="card bg-light border-0 rounded-4 mb-4">
                                <div class="card-body">
                                    <h6 class="fw-bold mb-3"><i class="fas fa-shield-alt me-2"></i>Keamanan</h6>
                                    <div class="mb-3">
                                        <label class="small text-muted">Token Sesi</label>
                                        <div class="input-group">
                                            <input type="text" class="form-control form-control-sm" value="${userData.token}" readonly>
                                            <button class="btn btn-outline-secondary btn-sm" onclick="navigator.clipboard.writeText('${userData.token}')" title="Salin Token"><i class="fas fa-copy"></i></button>
                                        </div>
                                    </div>
                                    <hr>
                                    <h6 class="fw-bold mb-3"><i class="fas fa-key me-2"></i>Ganti Password</h6>
                                    <div class="mb-2">
                                        <label class="small text-muted">Password Baru</label>
                                        <input type="password" class="form-control form-control-sm" id="newPassword" placeholder="Minimal 4 digit">
                                    </div>
                                    <div class="mb-2">
                                        <label class="small text-muted">Konfirmasi Password</label>
                                        <input type="password" class="form-control form-control-sm" id="confirmPassword" placeholder="Ulangi password">
                                    </div>
                                    <button class="btn btn-dark btn-sm w-100 rounded-pill" onclick="Profil.changePassword()">
                                        <i class="fas fa-save me-1"></i> Update Password
                                    </button>
                                </div>
                            </div>

                            <div class="card bg-light border-0 rounded-4">
                                <div class="card-body">
                                    <h6 class="fw-bold mb-3"><i class="fas fa-info-circle me-2"></i>Info Akun</h6>
                                    <p class="small text-muted mb-1">Role: <strong>${getRoleLabel(user.role)}</strong></p>
                                    <p class="small text-muted mb-1">Username: <strong>${userData.username}</strong></p>
                                    <p class="small text-muted mb-0">Login: <strong>${userData.loginTime}</strong></p>
                                </div>
                            </div>
                        </div>

                        <!-- Kolom Kanan: Informasi Pribadi -->
                        <div class="col-lg-7">
                            <div class="card border-0 rounded-4 mb-4">
                                <div class="card-body">
                                    <h6 class="fw-bold mb-3"><i class="fas fa-id-card me-2"></i>Informasi Pribadi</h6>
                                    <div class="row g-3">
                                        <div class="col-md-6">
                                            <label class="small text-muted">Nama Lengkap</label>
                                            <input type="text" class="form-control form-control-sm" id="profileNama" value="${userData.nama}">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="small text-muted">Email</label>
                                            <input type="email" class="form-control form-control-sm" id="profileEmail" value="${userData.email}" placeholder="email@contoh.com">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="small text-muted">Nomor HP</label>
                                            <input type="text" class="form-control form-control-sm" id="profilePhone" value="${userData.phone}" placeholder="08xxxx">
                                        </div>
                                        <div class="col-md-6">
                                            <label class="small text-muted">Alamat</label>
                                            <input type="text" class="form-control form-control-sm" id="profileAddress" value="${userData.address}" placeholder="Alamat domisili">
                                        </div>
                                        <div class="col-12">
                                            <label class="small text-muted">Bio / Deskripsi Diri</label>
                                            <textarea class="form-control form-control-sm" id="profileBio" rows="3" placeholder="Ceritakan sedikit tentang Anda...">${userData.bio}</textarea>
                                        </div>
                                    </div>
                                    <div class="mt-4 text-end">
                                        <button class="btn btn-primary rounded-pill px-4" onclick="Profil.saveProfile()">
                                            <i class="fas fa-save me-1"></i> Simpan Perubahan
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // ============================================================
    //  UPLOAD FOTO PROFIL
    // ============================================================
    function uploadPhoto(input) {
        if (!input.files || !input.files[0]) return;
        const file = input.files[0];

        // Batas ukuran 50KB (karena disimpan sebagai base64 di localStorage)
        if (file.size > 50000) {
            alert('Ukuran gambar maksimal 50KB! Kompres gambar Anda terlebih dahulu.');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const base64 = e.target.result;
            const avatar = document.getElementById('avatarPreview');
            if (avatar) {
                avatar.innerHTML = `<img src="${base64}" style="width:100%;height:100%;object-fit:cover;" alt="Foto">`;
            }

            // Simpan ke localStorage sementara
            const current = getLocalProfile();
            current.foto = base64;
            saveLocalProfile(current);

            // Update user di Auth
            Auth.updateUser({ foto: base64 });

            alert('✅ Foto berhasil diupload (sementara). Klik "Simpan Perubahan" untuk menyimpan ke server.');
        };
        reader.readAsDataURL(file);
    }

    // ============================================================
    //  SIMPAN PROFIL (Kirim ke Server)
    // ============================================================
    async function saveProfile() {
        const namaEl = document.getElementById('profileNama');
        const emailEl = document.getElementById('profileEmail');
        const phoneEl = document.getElementById('profilePhone');
        const addressEl = document.getElementById('profileAddress');
        const bioEl = document.getElementById('profileBio');

        if (!namaEl || !emailEl || !phoneEl || !addressEl || !bioEl) {
            console.error('Form profil tidak ditemukan');
            return;
        }

        const nama = namaEl.value.trim();
        const email = emailEl.value.trim();
        const phone = phoneEl.value.trim();
        const address = addressEl.value.trim();
        const bio = bioEl.value.trim();

        if (!nama) {
            alert('Nama tidak boleh kosong!');
            return;
        }

        const current = getLocalProfile();
        const foto = current.foto || '';

        const data = {
            username: user.username,
            nama,
            email,
            phone,
            address,
            bio,
            foto
        };

        // Simpan lokal dulu
        saveLocalProfile(data);
        Auth.updateUser({ nama, foto });

        // Kirim ke server
        try {
            const res = await API.updateProfile(data);
            if (res.status === 'ok') {
                alert('✅ Profil berhasil disimpan di server!');
            } else {
                alert('⚠️ Profil tersimpan di browser, namun gagal sinkron ke server: ' + res.message);
            }
        } catch (e) {
            alert('⚠️ Profil tersimpan di browser, namun gagal terhubung ke server saat sinkronisasi.');
        }
    }

    // ============================================================
    //  GANTI PASSWORD
    // ============================================================
    async function changePassword() {
        const newPassEl = document.getElementById('newPassword');
        const confirmPassEl = document.getElementById('confirmPassword');

        if (!newPassEl || !confirmPassEl) return;

        const newPass = newPassEl.value;
        const confirmPass = confirmPassEl.value;

        if (!newPass || newPass.length < 4) {
            alert('Password baru minimal 4 digit!');
            return;
        }
        if (newPass !== confirmPass) {
            alert('Konfirmasi password tidak cocok!');
            return;
        }

        try {
            const res = await API.updateProfile({ username: user.username, pin: newPass });
            if (res.status === 'ok') {
                alert('✅ Password berhasil diubah!');
                newPassEl.value = '';
                confirmPassEl.value = '';
            } else {
                alert('❌ Gagal mengubah: ' + res.message);
            }
        } catch (e) {
            alert('❌ Gagal terhubung ke server saat update password.');
        }
    }

    // ============================================================
    //  EXPOSE KE GLOBAL
    // ============================================================
    window.Profil = {
        renderProfil,
        uploadPhoto,
        saveProfile,
        changePassword
    };

    console.log('✅ Profil module loaded (v2.0.0 - Final, Full Fix)');
})();