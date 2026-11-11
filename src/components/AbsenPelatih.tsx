import React, { useState } from 'react';
import { AbsenPelatihItem, Sekolah } from '../types';
import { StorageService } from '../data/storage';
import { SignaturePad } from './SignaturePad';
import { Camera, CheckCircle2, Image as ImageIcon, Plus, Calendar, Clock, Award, Trash2, Edit2, AlertCircle, ShieldCheck, Users, PenTool } from 'lucide-react';

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingAuthorId, setEditingAuthorId] = useState<string | null>(null);

  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [jamMulai, setJamMulai] = useState('15:00');
  const [jamSelesai, setJamSelesai] = useState('17:30');
  const [materiPokok, setMateriPokok] = useState('');
  const [pencapaianPercent, setPencapaianPercent] = useState<number>(85);
  const [fotoDokumentasiUrl, setFotoDokumentasiUrl] = useState<string>('');
  const [parafPelatihUrl, setParafPelatihUrl] = useState<string>('');
  const [catatan, setCatatan] = useState('');
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  // Second Coach Signature States
  const [includePelatih2, setIncludePelatih2] = useState<boolean>(false);
  const [pelatih2Id, setPelatih2Id] = useState<string>('');
  const [parafPelatih2Url, setParafPelatih2Url] = useState<string>('');
  const [showSignaturePad2, setShowSignaturePad2] = useState<boolean>(false);

  const allUsers = StorageService.getUsers();
  const activeSchool = sekolahList.find(s => s.id === selectedSekolahId);
  const schoolAbsenList = absenPelatihList.filter(a => a.sekolahId === selectedSekolahId);
  const allCoaches = allUsers.filter(u => u.role === 'pelatih');

  // Load saved coach account signature
  const getCoachAccountSignature = (coachId: string): string => {
    if (!coachId) return '';
    // 1. Direct cache for coach
    const accountSig = localStorage.getItem(`coach_sig_${coachId}`);
    if (accountSig) return accountSig;
    // 2. Look for any previously saved session signed by this coach
    const sessionWithSig = absenPelatihList.find(a => 
      (a.pelatihId === coachId && a.parafPelatihUrl) || 
      (a.pelatih2Id === coachId && a.parafPelatih2Url)
    );
    if (sessionWithSig) {
      if (sessionWithSig.pelatihId === coachId && sessionWithSig.parafPelatihUrl) return sessionWithSig.parafPelatihUrl;
      if (sessionWithSig.pelatih2Id === coachId && sessionWithSig.parafPelatih2Url) return sessionWithSig.parafPelatih2Url;
    }
    // 3. Global wet signature backup if current user
    if (coachId === currentPelatihId) {
      return localStorage.getItem('coach_wet_signature_data') || '';
    }
    return '';
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setEditingAuthorId(currentPelatihId);
    resetForm();
    // Auto-populate signature from logged-in coach account if available
    const savedSig = getCoachAccountSignature(currentPelatihId);
    if (savedSig) {
      setParafPelatihUrl(savedSig);
    }

    // Auto-detect if school has collaborating partner coach
    const schoolCollabs = (activeSchool?.pelatihIds || []).filter(id => id && id !== currentPelatihId);
    if (schoolCollabs.length > 0) {
      const partnerId = schoolCollabs[0];
      setIncludePelatih2(true);
      setPelatih2Id(partnerId);
      const savedSig2 = getCoachAccountSignature(partnerId);
      if (savedSig2) {
        setParafPelatih2Url(savedSig2);
      }
    } else {
      setIncludePelatih2(false);
      setPelatih2Id('');
      setParafPelatih2Url('');
    }

    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: AbsenPelatihItem) => {
    setEditingId(item.id);
    setEditingAuthorId(item.pelatihId);
    setTanggal(item.tanggal);
    setJamMulai(item.jamMulai || '15:00');
    setJamSelesai(item.jamSelesai || '17:30');
    setMateriPokok(item.materiPokok || '');
    setPencapaianPercent(item.pencapaianPercent ?? 85);
    setFotoDokumentasiUrl(item.fotoDokumentasiUrl || '');
    setParafPelatihUrl(item.parafPelatihUrl || getCoachAccountSignature(item.pelatihId));
    setCatatan(item.catatan || '');
    setShowSignaturePad(false);

    if (item.pelatih2Id || item.parafPelatih2Url) {
      setIncludePelatih2(true);
      setPelatih2Id(item.pelatih2Id || '');
      setParafPelatih2Url(item.parafPelatih2Url || (item.pelatih2Id ? getCoachAccountSignature(item.pelatih2Id) : ''));
    } else {
      setIncludePelatih2(false);
      setPelatih2Id('');
      setParafPelatih2Url('');
    }
    setShowSignaturePad2(false);

    setIsFormOpen(true);
  };

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
    const compressedParaf2 = (includePelatih2 && parafPelatih2Url) ? await compressImageDataUrl(parafPelatih2Url, 300, 0.7) : '';

    // Format Hari Tanggal
    const d = new Date(tanggal);
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
    const formatted = `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;

    const targetId = editingId || `abp-${Date.now()}`;
    const targetAuthorId = editingAuthorId || currentPelatihId;
    const authorUser = allUsers.find(u => u.id === targetAuthorId);
    const pelatih2User = includePelatih2 && pelatih2Id ? allUsers.find(u => u.id === pelatih2Id) : undefined;

    // Save author's signature to their coach account cache & global wet signature data
    if (compressedParaf) {
      localStorage.setItem(`coach_sig_${targetAuthorId}`, compressedParaf);
      localStorage.setItem('coach_wet_signature_data', compressedParaf);
    }
    // Save second coach signature to cache & global coach 2 wet signature data if provided
    if (compressedParaf2 && pelatih2Id) {
      localStorage.setItem(`coach_sig_${pelatih2Id}`, compressedParaf2);
      localStorage.setItem('coach2_wet_signature_data', compressedParaf2);
    }

    const record: AbsenPelatihItem = {
      id: targetId,
      pelatihId: targetAuthorId,
      pelatihNama: authorUser?.name || currentPelatihName,
      pelatih2Id: includePelatih2 && pelatih2Id ? pelatih2Id : undefined,
      pelatih2Nama: includePelatih2 ? (pelatih2User?.name || undefined) : undefined,
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
      parafPelatih2Url: includePelatih2 && compressedParaf2 ? compressedParaf2 : undefined,
      statusKepalaSekolah: 'Mengetahui',
      catatan,
      // Status verifikasi admin: menunggu verifikasi jika baru atau telah diedit
      statusVerifikasiAdmin: 'menunggu',
      diverifikasiOleh: undefined,
      diverifikasiPada: undefined,
      catatanAdmin: undefined
    };

    StorageService.saveAbsenPelatih(record);
    setIsFormOpen(false);
    setEditingId(null);
    setEditingAuthorId(null);
    resetForm();
    onDataChanged();
  };

  const resetForm = () => {
    setEditingId(null);
    setEditingAuthorId(null);
    setTanggal(new Date().toISOString().split('T')[0]);
    setJamMulai('15:00');
    setJamSelesai('17:30');
    setMateriPokok('');
    setPencapaianPercent(85);
    setFotoDokumentasiUrl('');
    setParafPelatihUrl('');
    setIncludePelatih2(false);
    setPelatih2Id('');
    setParafPelatih2Url('');
    setShowSignaturePad(false);
    setShowSignaturePad2(false);
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
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition cursor-pointer"
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
            onClick={handleOpenAdd}
            className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 rounded-xl transition cursor-pointer"
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
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-black bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg">
                        {item.pencapaianPercent}%
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition border border-blue-200 cursor-pointer"
                        title="Edit Absen Melatih"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Hapus Absen"
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

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    {(() => {
                      const coach1 = allUsers.find(u => u.id === item.pelatihId);
                      const coach1Name = coach1 ? coach1.name : (item.pelatihId === currentPelatihId ? currentPelatihName : (item.pelatihNama || 'Pelatih 1'));
                      const isCoach1Me = item.pelatihId === currentPelatihId;

                      const coach2 = item.pelatih2Id ? allUsers.find(u => u.id === item.pelatih2Id) : undefined;
                      const coach2Name = coach2 ? coach2.name : (item.pelatih2Nama || (item.pelatih2Id ? 'Pelatih 2' : ''));
                      const isCoach2Me = item.pelatih2Id === currentPelatihId;

                      return (
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span>Pelatih 1: <strong className="text-slate-800 font-bold">{coach1Name}</strong></span>
                            {isCoach1Me ? (
                              <span className="text-[9px] font-extrabold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                Akun Anda
                              </span>
                            ) : (
                              <span className="text-[9px] font-extrabold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                Rekan
                              </span>
                            )}
                          </div>

                          {coach2Name && (
                            <div className="flex items-center gap-1 border-l border-slate-300 pl-2">
                              <span>Pelatih 2: <strong className="text-indigo-900 font-bold">{coach2Name}</strong></span>
                              {isCoach2Me ? (
                                <span className="text-[9px] font-extrabold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                  Akun Anda
                                </span>
                              ) : (
                                <span className="text-[9px] font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                  🤝 Mitra
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Both Coaches Signature Preview */}
                    <div className="flex items-center gap-2">
                      {item.parafPelatihUrl && (
                        <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200 text-[10px]">
                          <span className="text-slate-400">TTD 1:</span>
                          <img src={item.parafPelatihUrl} alt="TTD Pelatih 1" className="h-5 max-w-[45px] object-contain" />
                        </div>
                      )}
                      {item.parafPelatih2Url && (
                        <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-indigo-200 text-[10px]">
                          <span className="text-indigo-500 font-semibold">TTD 2:</span>
                          <img src={item.parafPelatih2Url} alt="TTD Pelatih 2" className="h-5 max-w-[45px] object-contain" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Admin Verification Status Alert / Badge */}
                  <div className="pt-1">
                    {item.statusVerifikasiAdmin === 'diverifikasi' ? (
                      <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Diverifikasi oleh Admin</span>
                        {item.diverifikasiPada && (
                          <span className="text-[10px] font-normal text-emerald-700">
                            • {new Date(item.diverifikasiPada).toLocaleDateString('id-ID')}
                          </span>
                        )}
                      </div>
                    ) : item.statusVerifikasiAdmin === 'ditolak' ? (
                      <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-rose-800">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Perlu Revisi dari Admin:</span>
                        </div>
                        <p className="text-rose-700 italic pl-5 text-[11px]">
                          "{item.catatanAdmin || 'Mohon lengkapi foto dokumentasi atau materi pokok.'}"
                        </p>
                        <p className="text-[10px] text-rose-600 pl-5 font-semibold">
                          ➔ Klik tombol "Edit" di kanan atas untuk merevisi laporan ini dan mengirimkan ulang ke Admin.
                        </p>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-300">
                        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Menunggu Verifikasi Admin</span>
                      </div>
                    )}
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
            <div className={`p-4 flex items-center justify-between text-white ${editingId ? 'bg-blue-800' : 'bg-emerald-800'}`}>
              <h3 className="font-bold text-sm flex items-center gap-2">
                {editingId ? <Edit2 className="w-4 h-4 text-blue-300" /> : <Camera className="w-4 h-4 text-emerald-300" />}
                {editingId ? 'Edit Jurnal & Absensi Melatih' : 'Form Absen Melatih & Dokumentasi Foto'}
              </h3>
              <button 
                onClick={() => { setIsFormOpen(false); resetForm(); }} 
                className="text-slate-300 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 space-y-3.5">
              {/* Account Signature Association Banner */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-500 block">Tanda tangan dari akun pelatih:</span>
                    <span className="font-bold text-slate-900">
                      {editingAuthorId ? (allUsers.find(u => u.id === editingAuthorId)?.name || currentPelatihName) : currentPelatihName}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
                  Resmi Terverifikasi
                </span>
              </div>

              {editingId && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
                  <div className="flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <span className="font-bold block">Mode Edit Absensi Pelatih</span>
                      <span className="text-[11px] text-blue-700">Mengubah sesi tanggal {tanggal} (Akan diajukan kembali ke Admin)</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setEditingAuthorId(null);
                      resetForm();
                    }}
                    className="text-[10px] font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded-lg transition cursor-pointer"
                  >
                    Batal Edit (Baru)
                  </button>
                </div>
              )}

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

              {/* Tanda Tangan Pelatih 1 */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-blue-600" />
                    <span>Tanda Tangan Pelatih 1 (Utama):</span>
                  </label>
                  <span className="text-[11px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded">
                    {editingAuthorId ? (allUsers.find(u => u.id === editingAuthorId)?.name || currentPelatihName) : currentPelatihName}
                  </span>
                </div>

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
                        <img src={parafPelatihUrl} alt="Paraf Pelatih 1" className="max-h-12 object-contain" />
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Belum ada tanda tangan Pelatih 1</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowSignaturePad(true)}
                      className="text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 px-3 py-2 rounded-xl border border-slate-300 cursor-pointer"
                    >
                      {parafPelatihUrl ? 'Ubah TTD' : '+ Buat TTD'}
                    </button>
                  </div>
                )}
              </div>

              {/* Tanda Tangan Pelatih 2 (Kolaborator / Pendamping) */}
              <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includePelatih2}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIncludePelatih2(checked);
                        if (checked && !pelatih2Id) {
                          const schoolCollabs = (activeSchool?.pelatihIds || []).filter(id => id && id !== (editingAuthorId || currentPelatihId));
                          const otherCoaches = allCoaches.filter(u => u.id !== (editingAuthorId || currentPelatihId));
                          const defaultP2 = schoolCollabs[0] || otherCoaches[0]?.id || '';
                          setPelatih2Id(defaultP2);
                          if (defaultP2) {
                            setParafPelatih2Url(getCoachAccountSignature(defaultP2));
                          }
                        }
                      }}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      Input Tanda Tangan Pelatih 2 (Kolaborasi / Pendamping)
                    </span>
                  </label>
                  {includePelatih2 && (
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                      2 Pelatih Aktif
                    </span>
                  )}
                </div>

                {includePelatih2 && (
                  <div className="space-y-2 pt-1 border-t border-indigo-100 animate-in fade-in">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Pilih Pelatih Ke-2:
                      </label>
                      <select
                        value={pelatih2Id}
                        onChange={(e) => {
                          const newId = e.target.value;
                          setPelatih2Id(newId);
                          const sig = getCoachAccountSignature(newId);
                          setParafPelatih2Url(sig);
                        }}
                        className="w-full px-3 py-1.5 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="">-- Pilih Akun Pelatih Ke-2 --</option>
                        {allCoaches
                          .filter(c => c.id !== (editingAuthorId || currentPelatihId))
                          .map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} {activeSchool?.pelatihIds?.includes(c.id) ? '★ (Mitra Sekolah)' : ''}
                            </option>
                          ))}
                      </select>
                    </div>

                    {/* Signature Pad for Pelatih 2 */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Paraf / Tanda Tangan Pelatih 2:
                      </label>
                      {showSignaturePad2 ? (
                        <SignaturePad
                          onSave={(url) => {
                            setParafPelatih2Url(url);
                            setShowSignaturePad2(false);
                          }}
                          initialDataUrl={parafPelatih2Url}
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          {parafPelatih2Url ? (
                            <div className="border border-indigo-200 rounded-xl p-2 bg-white flex-1 h-14 flex items-center justify-center">
                              <img src={parafPelatih2Url} alt="Paraf Pelatih 2" className="max-h-12 object-contain" />
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Belum ada tanda tangan Pelatih 2</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowSignaturePad2(true)}
                            className="text-xs font-semibold bg-white hover:bg-slate-100 text-indigo-700 px-3 py-2 rounded-xl border border-indigo-200 cursor-pointer"
                          >
                            {parafPelatih2Url ? 'Ubah TTD Pelatih 2' : '+ Buat TTD Pelatih 2'}
                          </button>
                        </div>
                      )}
                    </div>
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
                  className={`flex-1 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition cursor-pointer ${
                    editingId 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {editingId ? 'Simpan Perubahan Absen' : 'Simpan Absen & Dokumentasi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
