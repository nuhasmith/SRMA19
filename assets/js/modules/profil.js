// ============================================================
//  PROFIL.JS – Halaman Profil (Admin, Petugas, Humas) - FINAL FIX
//  SRMA 19 Bantul
//  Fitur: Upload Foto, Edit Data, Ganti Password, Role Badge
// ============================================================

(function() {
    'use strict';

    // SafeStorage Fallback (Mengatasi Tracking Prevention)
    const SafeStorage = window.SafeStorage || (() => {
        const mem = {};
        return {
            getItem: (k) => mem[k] || null,
            setItem: (k, v) => mem[k] = v,
            removeItem: (k) => delete mem[k]
        };
    })();

    // Helper
    const getEl = (id) => document.getElementById(id);
    const user = Auth.getCurrentUser();
    const PROFILE_KEY = 'srma19_profile_data';

    // Role Badge Color
    function getRoleBadge(role) {
        const colors = {
            'admin': 'bg-danger',
            'petugas': 'bg-primary',
            'humas': 'bg-warning text-dark'
        };
        return colors[role] || 'bg-secondary';
    }

    // Render Main Profile
    function renderProfil(container) {
        // Ambil data tambahan dari localStorage (profile data)
        let profileData = {};
        try {
            const raw = SafeStorage.getItem(PROFILE_KEY);
            if (raw) profileData = JSON.parse(raw);
        } catch (e) { profileData = {}; }

        // Ambil user saat ini, pastikan tidak null
        const currentUser = Auth.getCurrentUser();
        if (!currentUser) {
            container.innerHTML = '<div class="text-center py-5 text-muted">Silakan login.</div>';
            return;
        }

        const userData = {
            nama: profileData.nama || currentUser.nama || '-',
            username: currentUser.username || '-',
            role: currentUser.role || '-',
            token: currentUser.token || '-',
            loginTime: currentUser.loginTime ? new Date(currentUser.loginTime).toLocaleString('id-ID') : '-',
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
                    <i class="fas fa-arrow-left me-1"></i> Kembali
                </button>
            </div>

            <div class="card-modern overflow-hidden">
                <!-- Banner Header Gradien -->
                <div class="p-4 text-white" style="background: linear-gradient(135deg, #0d6efd, #8b5cf6);">
                    <div class="row align-items-center">
                        <div class="col-md-8">
                            <h3 class="fw-bold mb-2">${userData.nama}</h3>
                            <div class="mb-2">
                                <span class="badge ${getRoleBadge(currentUser.role)} me-1">${userData.role.toUpperCase()}</span>
                                <span class="badge bg-light text-dark">@${userData.username}</span>
                            </div>
                            <div class="small opacity-75">
                                <i class="fas fa-clock me-1"></i> Login: ${userData.loginTime}
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
                        <!-- Kolom Kiri: Info & Keamanan -->
                        <div class="col-lg-5">
                            <div class="card bg-light border-0 rounded-4 mb-4">
                                <div class="card-body">
                                    <h6 class="fw-bold mb-3"><i class="fas fa-shield-alt me-2"></i>Keamanan</h6>
                                    <div class="mb-3">
                                        <label class="small text-muted">Token Sesi</label>
                                        <div class="input-group">
                                            <input type="text" class="form-control form-control-sm" value="${userData.token}" readonly>
                                            <button class="btn btn-outline-secondary btn-sm" onclick="navigator.clipboard.writeText('${userData.token}')" title="Salin"><i class="fas fa-copy"></i></button>
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

    // Upload Foto Profil
    function uploadPhoto(input) {
        if (input.files && input.files[0]) {
            const file = input.files[0];
            if (file.size > 50000) {
                alert('Ukuran gambar maksimal 50KB! (Karena disimpan di browser, kompres gambarnya)');
                return;
            }
            const reader = new FileReader();
            reader.onload = function(e) {
                const base64 = e.target.result;
                // Update preview avatar
                const av = getEl('avatarPreview');
                if (av) av.innerHTML = `<img src="${base64}" style="width:100%;height:100%;object-fit:cover;" alt="Foto">`;
                // Simpan ke localStorage sementara
                let current = {};
                try {
                    const raw = SafeStorage.getItem(PROFILE_KEY);
                    if (raw) current = JSON.parse(raw);
                } catch (e) { current = {}; }
                current.foto = base64;
                SafeStorage.setItem(PROFILE_KEY, JSON.stringify(current));
                
                // Update data user di auth
                Auth.updateUser({ foto: base64 });
                alert('✅ Foto berhasil diupload (sementara). Klik "Simpan Perubahan" untuk menyimpan ke server.');
            };
            reader.readAsDataURL(file);
        }
    }

    // Simpan Profil
    async function saveProfile() {
        const namaEl = getEl('profileNama');
        const emailEl = getEl('profileEmail');
        const phoneEl = getEl('profilePhone');
        const addressEl = getEl('profileAddress');
        const bioEl = getEl('profileBio');

        if (!namaEl || !emailEl || !phoneEl || !addressEl || !bioEl) return;

        const nama = namaEl.value.trim();
        const email = emailEl.value.trim();
        const phone = phoneEl.value.trim();
        const address = addressEl.value.trim();
        const bio = bioEl.value.trim();

        if (!nama) { alert('Nama tidak boleh kosong!'); return; }

        // Ambil foto dari temp data
        let current = {};
        try {
            const raw = SafeStorage.getItem(PROFILE_KEY);
            if (raw) current = JSON.parse(raw);
        } catch (e) { current = {}; }
        const foto = current.foto || '';

        const data = {
            username: user.username,
            nama: nama,
            email: email,
            phone: phone,
            address: address,
            bio: bio,
            foto: foto
        };

        // Simpan ke localStorage (Fast)
        SafeStorage.setItem(PROFILE_KEY, JSON.stringify(data));
        Auth.updateUser({ nama: nama, foto: foto });

        // Simpan ke Server (Background - tidak blocking)
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

    // Ganti Password
    async function changePassword() {
        const newPassEl = getEl('newPassword');
        const confirmPassEl = getEl('confirmPassword');

        if (!newPassEl || !confirmPassEl) return;

        const newPass = newPassEl.value;
        const confirmPass = confirmPassEl.value;

        if (!newPass || newPass.length < 4) { alert('Password baru minimal 4 digit!'); return; }
        if (newPass !== confirmPass) { alert('Konfirmasi password tidak cocok!'); return; }

        // Panggil API untuk update PIN
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

    // Expose to Global
    window.Profil = {
        renderProfil,
        uploadPhoto,
        saveProfile,
        changePassword
    };

    console.log('✅ Profil module loaded (Customized v3.0)');
})();