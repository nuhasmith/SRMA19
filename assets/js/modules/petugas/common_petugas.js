// ============================================================
//  COMMON_PETUGAS.JS – Helper Khusus untuk Role Petugas
//  SRMA 19 Bantul
//  Versi: 1.0.0 - SPA Ready
// ============================================================

(function() {
    'use strict';

    /**
     * Ambil daftar murid dampingan berdasarkan nama petugas
     * @param {Array} pesertaData - Data seluruh peserta
     * @param {string} petugasNama - Nama petugas yang login
     * @returns {Array} - Array peserta yang menjadi murid dampingan
     */
    function getMuridDampingan(pesertaData, petugasNama) {
        if (!pesertaData || !petugasNama) return [];
        return pesertaData.filter(p =>
            (p.Wali_Asuh_1 && p.Wali_Asuh_1.trim() === petugasNama) ||
            (p.Wali_Asuh_2 && p.Wali_Asuh_2.trim() === petugasNama)
        );
    }

    /**
     * Filter data absensi hanya untuk murid dampingan
     * @param {Array} absensiData - Data absensi lengkap
     * @param {Array} pesertaDampingan - Daftar murid dampingan
     * @returns {Array} - Absensi yang hanya milik murid dampingan
     */
    function filterAbsensiByDampingan(absensiData, pesertaDampingan) {
        if (!absensiData || !pesertaDampingan) return [];
        const kodeSet = new Set(pesertaDampingan.map(p => String(p.Kode).trim()));
        return absensiData.filter(a => kodeSet.has(String(a.Kode).trim()));
    }

    /**
     * Filter data izin hanya untuk murid dampingan
     * @param {Array} izinData - Data izin lengkap
     * @param {Array} pesertaDampingan - Daftar murid dampingan
     * @returns {Array} - Izin yang hanya milik murid dampingan
     */
    function filterIzinByDampingan(izinData, pesertaDampingan) {
        if (!izinData || !pesertaDampingan) return [];
        const kodeSet = new Set(pesertaDampingan.map(p => String(p.Kode).trim()));
        return izinData.filter(i => kodeSet.has(String(i.Kode_Peserta).trim()));
    }

    // Ekspos ke global
    window.PetugasCommon = {
        getMuridDampingan,
        filterAbsensiByDampingan,
        filterIzinByDampingan
    };

    console.log('✅ Common Petugas module loaded');
})();