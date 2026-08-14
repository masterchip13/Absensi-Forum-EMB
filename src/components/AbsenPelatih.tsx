import React, { useState } from 'react';
import { AbsenPelatihItem, Sekolah } from '../types';
import { StorageService } from '../data/storage';
import { SignaturePad } from './SignaturePad';
import { Camera, CheckCircle2, Image as ImageIcon, Plus, Calendar, Clock, Award, Trash2 } from 'lucide-react';

import { compressImageDataUrl } from '../utils/imageCompressor';

interface AbsenPelatihProps {
  currentPelatihId: string;
  currentPelatihName: string;
  selectedSekolahId: string;
  sekolahList: Sekolah[];
  absenPelatihList: AbsenPelatihItem[];
  onDataChanged: () => void;
}

export const AbsenPelatih: React.FC<AbsenPelatihProps> = ({
  currentPelatihId,
  currentPelatihName,
  selectedSekolahId,
  sekolahList,
  absenPelatihList,
  onDataChanged
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);

  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [jamMulai, setJamMulai] = useState('15:00');
  const [jamSelesai, setJamSelesai] = useState('17:30');
  const [materiPokok, setMateriPokok] = useState('');
  const [pencapaianPercent, setPencapaianPercent] = useState<number>(85);
  const [fotoDokumentasiUrl, setFotoDokumentasiUrl] = useState<string>('');
  const [parafPelatihUrl, setParafPelatihUrl] = useState<string>('');
  const [catatan, setCatatan] = useState('');
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  const activeSchool = sekolahList.find(s => s.id === selectedSekolahId);
  const schoolAbsenList = absenPelatihList.filter(a => a.sekolahId === selectedSekolahId);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const rawUrl = reader.result as string;
      const compressed = await compressImageDataUrl(rawUrl, 500, 0.65);
      setFotoDokumentasiUrl(compressed);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fotoDokumentasiUrl) {
      alert('Dokumentasi foto Wajib diunggah sebagai bukti rekap latihan pelatih!');
      return;
    }
    if (!materiPokok) {
      alert('Mohon isi Materi Pokok latihan!');
      return;
    }

    // Compress photo and signature if needed
    const compressedPhoto = await compressImageDataUrl(fotoDokumentasiUrl, 500, 0.65);
    const compressedParaf = parafPelatihUrl ? await compressImageDataUrl(parafPelatihUrl, 300, 0.7) : '';

    // Format Hari Tanggal
    const d = new Date(tanggal);
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const formatted = `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;

    const newRecord: AbsenPelatihItem = {
      id: `abp-${Date.now()}`,
      pelatihId: currentPelatihId,
      sekolahId: selectedSekolahId,
      tahunAjaran: StorageService.getActiveTahunAjaran(),
      tanggal,
      hariTanggalFormat: formatted,
      jamMulai,
      jamSelesai,
      materiPokok,
      pencapaianPercent,
      fotoDokumentasiUrl: compressedPhoto,
      parafPelatihUrl: compressedParaf,
      statusKepalaSekolah: 'Mengetahui',
      catatan
    };

    StorageService.saveAbsenPelatih(newRecord);
    setIsFormOpen(false);
    resetForm();
    onDataChanged();
  };

  const resetForm = () => {
    setMateriPokok('');
    setPencapaianPercent(85);
    setFotoDokumentasiUrl('');
    setParafPelatihUrl('');
    setCatatan('');
  };

  const handleDelete = (id: string) => {
    if (confirm('Hapus rekap absensi pelatih ini?')) {
      StorageService.deleteAbsenPelatih(id);
      onDataChanged();
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-base">Absen Pelatih & Foto Dokumentasi</h2>
            <p className="text-xs text-slate-500">
              Input bukti kehadiran melatih & dokumentasi kegiatan untuk sekolah {activeSchool?.namaSekolah}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Isi Absen Melatih</span>
        </button>
      </div>

      {/* List of logged training sessions with documentation */}
      {schoolAbsenList.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
          <Camera className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-600">Belum Ada Rekap Absen Melatih</p>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto mb-3">
            Setiap selesai melatih, wajib mengisi materi pokok, pencapaian %, dan melampirkan foto dokumentasi.
          </p>
          <button
            onClick={() => setIsFormOpen(true)}
            className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 rounded-xl transition"
          >
            + Input Rekap Latihan Pertama
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {schoolAbsenList.map((item) => (
            <div key={item.id} className="p-3.5 bg-slate-50 hover:bg-emerald-50/30 border border-slate-200 hover:border-emerald-200 rounded-xl transition">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Photo documentation preview */}
                <div className="sm:w-36 h-28 bg-slate-200 rounded-lg overflow-hidden shrink-0 border border-slate-300 relative group">
                  <img src={item.fotoDokumentasiUrl} alt="Dokumentasi" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 left-1 bg-slate-900/80 text-white text-[9px] px-1.5 py-0.5 rounded font-semibold">
                    Bukti Foto
                  </span>
                </div>

                <div className="flex-1 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                        {item.hariTanggalFormat} ({item.jamMulai} - {item.jamSelesai})
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">{item.materiPokok}</h4>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-black bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg">
                        {item.pencapaianPercent}%
                      </span>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {item.catatan && (
                    <p className="text-xs text-slate-600 italic bg-white p-2 rounded-lg border border-slate-200">
                      "{item.catatan}"
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    <span>Pelatih: <strong className="text-slate-700">{currentPelatihName}</strong></span>
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                      ✓ Status Laporan: {item.statusKepalaSekolah}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form Absen & Upload Foto */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 my-8">
            <div className="bg-emerald-800 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-300" />
                Form Absen Melatih & Dokumentasi Foto
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-300 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSave} className="p-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Latihan</label>
                  <input
                    type="date"
                    required
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Sekolah</label>
                  <input
                    type="text"
                    disabled
                    value={activeSchool?.namaSekolah || ''}
                    className="w-full px-3 py-2 bg-slate-100 text-slate-600 border border-slate-300 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    required
                    value={jamMulai}
                    onChange={(e) => setJamMulai(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    required
                    value={jamSelesai}
                    onChange={(e) => setJamSelesai(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Materi Pokok Latihan <span className="text-rose-500">*</span></label>
                <textarea
                  required
                  rows={2}
                  placeholder="Contoh: Warmup Long Tones, Drill Display 1-10, Visual Guard & Cadence Sync"
                  value={materiPokok}
                  onChange={(e) => setMateriPokok(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">Pencapaian % Target</label>
                  <span className="text-xs font-bold text-emerald-700">{pencapaianPercent}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={pencapaianPercent}
                  onChange={(e) => setPencapaianPercent(Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>

              {/* Photo Upload mandatory */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Foto Dokumentasi Kegiatan <span className="text-rose-500">* (Wajib)</span>
                </label>
                
                {fotoDokumentasiUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-300 h-36 bg-slate-900 group">
                    <img src={fotoDokumentasiUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFotoDokumentasiUrl('')}
                      className="absolute top-2 right-2 bg-rose-600 text-white text-xs px-2 py-1 rounded-lg shadow"
                    >
                      Ganti Foto
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-emerald-300 rounded-xl bg-emerald-50/50 p-4 text-center">
                    <Camera className="w-8 h-8 text-emerald-600 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-slate-700 mb-1">Ambil Foto Langsung / Pilih File Bukti</p>
                    <p className="text-[10px] text-slate-500 mb-3">Foto akan ditampilkan pada halaman laporan rekapitulasi PDF</p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      id="photo-doc-input"
                      className="hidden"
                    />
                    <label
                      htmlFor="photo-doc-input"
                      className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow transition inline-block"
                    >
                      Upload / Ambil Foto Latihan
                    </label>
                  </div>
                )}
              </div>

              {/* Paraf Pelatih Signature */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Paraf / Tanda Tangan Pelatih</label>
                {showSignaturePad ? (
                  <SignaturePad
                    onSave={(url) => {
                      setParafPelatihUrl(url);
                      setShowSignaturePad(false);
                    }}
                    initialDataUrl={parafPelatihUrl}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    {parafPelatihUrl ? (
                      <div className="border border-slate-300 rounded-xl p-2 bg-white flex-1 h-14 flex items-center justify-center">
                        <img src={parafPelatihUrl} alt="Paraf" className="max-h-12 object-contain" />
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Belum ada paraf</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowSignaturePad(true)}
                      className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl border border-slate-300"
                    >
                      {parafPelatihUrl ? 'Ubah Paraf' : '+ Buat Paraf'}
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
                <input
                  type="text"
                  placeholder="Catatan perkembangan barisan atau kendala alat..."
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition"
                >
                  Simpan Absen & Dokumentasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
