import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { Anggota, Divisi, Sekolah } from '../types';
import { StorageService } from '../data/storage';
import { SignaturePad } from './SignaturePad';
import { ImportExcelModal } from './ImportExcelModal';
import { BatchQrPrintModal } from './BatchQrPrintModal';
import { MemberIdCard } from './MemberIdCard';
import { formatNamaKapital, formatKelasAngka } from '../utils/nameFormatter';
import { getLocalDateString } from '../utils/dateUtils';
import { askConfirm, showToast } from '../utils/uiDialogs';
import { 
  Users, 
  Plus, 
  QrCode as QrIcon, 
  Search, 
  Trash2, 
  Edit2, 
  Download, 
  Printer, 
  FileSpreadsheet, 
  CreditCard,
  ArrowUpDown,
  Wand2,
  CheckCircle2
} from 'lucide-react';

interface AnggotaManagerProps {
  currentPelatihId: string;
  selectedSekolahId: string;
  sekolahList: Sekolah[];
  divisiList: Divisi[];
  anggotaList: Anggota[];
  onDataChanged: () => void;
  onOpenScannerForStudent?: (student: Anggota) => void;
}

export const AnggotaManager: React.FC<AnggotaManagerProps> = ({
  currentPelatihId,
  selectedSekolahId,
  sekolahList,
  divisiList,
  anggotaList,
  onDataChanged
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBatchQrModalOpen, setIsBatchQrModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [nama, setNama] = useState('');
  const [sekolahId, setSekolahId] = useState(selectedSekolahId);
  const [kelas, setKelas] = useState('');
  const [divisiNama, setDivisiNama] = useState(divisiList[0]?.namaDivisi || 'Brass');
  const [signatureUrl, setSignatureUrl] = useState('');
  const [showSignaturePad, setShowSignaturePad] = useState(false);

  // Selected student QR Modal preview
  const [selectedStudentQr, setSelectedStudentQr] = useState<Anggota | null>(null);
  const [qrImageDataUrl, setQrImageDataUrl] = useState<string>('');

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDivisiFilter, setSelectedDivisiFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'nama_asc' | 'nama_desc' | 'kelas_asc' | 'kelas_desc' | 'divisi' | 'terbaru'>('nama_asc');
  const [formatSuccessMsg, setFormatSuccessMsg] = useState<string | null>(null);

  const activeSchool = sekolahList.find(s => s.id === selectedSekolahId);

  // Members belonging to currently selected school
  const currentSchoolMembers = useMemo(() => {
    return anggotaList.filter(a => a.sekolahId === selectedSekolahId);
  }, [anggotaList, selectedSekolahId]);

  // Unique divisions for the active school
  const availableDivisiList = useMemo(() => {
    const list = currentSchoolMembers.map(a => a.divisiNama).filter(Boolean);
    return Array.from(new Set(list));
  }, [currentSchoolMembers]);

  const signedMembersCount = useMemo(() => {
    return currentSchoolMembers.filter(a => !!a.signatureUrl).length;
  }, [currentSchoolMembers]);

  // Filtered and Sorted Anggota
  const filteredAnggota = useMemo(() => {
    const list = currentSchoolMembers
      .filter(a => {
        if (selectedDivisiFilter !== 'ALL' && a.divisiNama !== selectedDivisiFilter) return false;
        if (!searchTerm.trim()) return true;
        const query = searchTerm.toLowerCase();
        return (
          a.nama.toLowerCase().includes(query) ||
          a.divisiNama.toLowerCase().includes(query) ||
          formatKelasAngka(a.kelas).toLowerCase().includes(query)
        );
      });

    return [...list].sort((a, b) => {
      if (sortBy === 'nama_asc') {
        return a.nama.localeCompare(b.nama, 'id-ID');
      }
      if (sortBy === 'nama_desc') {
        return b.nama.localeCompare(a.nama, 'id-ID');
      }
      if (sortBy === 'kelas_asc') {
        const kA = formatKelasAngka(a.kelas);
        const kB = formatKelasAngka(b.kelas);
        return kA.localeCompare(kB, undefined, { numeric: true }) || a.nama.localeCompare(b.nama, 'id-ID');
      }
      if (sortBy === 'kelas_desc') {
        const kA = formatKelasAngka(a.kelas);
        const kB = formatKelasAngka(b.kelas);
        return kB.localeCompare(kA, undefined, { numeric: true }) || a.nama.localeCompare(b.nama, 'id-ID');
      }
      if (sortBy === 'divisi') {
        return a.divisiNama.localeCompare(b.divisiNama, 'id-ID') || a.nama.localeCompare(b.nama, 'id-ID');
      }
      if (sortBy === 'terbaru') {
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      }
      return 0;
    });
  }, [currentSchoolMembers, selectedDivisiFilter, searchTerm, sortBy]);

  // Batch format all classes and names to numbers with strip format
  const handleBatchFormatKelas = () => {
    const schoolMembers = anggotaList.filter(a => a.sekolahId === selectedSekolahId);
    let updatedCount = 0;

    schoolMembers.forEach(student => {
      const formattedKelas = formatKelasAngka(student.kelas);
      const formattedNama = formatNamaKapital(student.nama);
      if (formattedKelas !== student.kelas || formattedNama !== student.nama) {
        StorageService.saveAnggota({
          ...student,
          nama: formattedNama,
          kelas: formattedKelas
        });
        updatedCount++;
      }
    });

    onDataChanged();
    setFormatSuccessMsg(`Format kelas berhasil diubah: ${updatedCount} siswa telah disesuaikan (huruf → angka-strip).`);
    setTimeout(() => setFormatSuccessMsg(null), 4000);
  };

  // Auto-generate QR Data URL when viewing student QR
  useEffect(() => {
    if (selectedStudentQr) {
      QRCode.toDataURL(selectedStudentQr.qrCodeData, { width: 260, margin: 2 })
        .then(url => setQrImageDataUrl(url))
        .catch(err => console.error(err));
    }
  }, [selectedStudentQr]);

  const openAdd = () => {
    setEditingId(null);
    setNama('');
    setSekolahId(selectedSekolahId);
    setKelas('');
    setDivisiNama(divisiList[0]?.namaDivisi || 'Brass');
    setSignatureUrl('');
    setShowSignaturePad(false);
    setIsModalOpen(true);
  };

  const openEdit = (a: Anggota) => {
    setEditingId(a.id);
    setNama(a.nama);
    setSekolahId(a.sekolahId);
    setKelas(formatKelasAngka(a.kelas));
    setDivisiNama(a.divisiNama);
    setSignatureUrl(a.signatureUrl || '');
    setShowSignaturePad(false);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama || !kelas || !divisiNama) return;

    const formattedNama = formatNamaKapital(nama.trim());
    const formattedKelas = formatKelasAngka(kelas.trim());

    const id = editingId || `ang-${Date.now()}`;
    const qrCodeData = `FMB-${sekolahId}-${id}-${formattedNama.replace(/\s+/g, '').toUpperCase()}`;

    const newAnggota: Anggota = {
      id,
      pelatihId: currentPelatihId,
      sekolahId,
      nama: formattedNama,
      kelas: formattedKelas,
      divisiNama,
      qrCodeData,
      signatureUrl,
      createdAt: getLocalDateString()
    };

    StorageService.saveAnggota(newAnggota);
    setIsModalOpen(false);
    showToast(editingId ? 'Data anggota diperbarui.' : 'Anggota baru berhasil ditambahkan.', 'success');
    onDataChanged();
  };

  const handleDelete = async (id: string) => {
    const confirmed = await askConfirm({
      title: 'Hapus Data Anggota?',
      message: 'Hapus data anggota ini? Data absensi terkait juga akan dihapus.',
      confirmText: 'Hapus',
      variant: 'danger'
    });
    if (confirmed) {
      StorageService.deleteAnggota(id);
      showToast('Data anggota dihapus.', 'info');
      onDataChanged();
    }
  };

  const printQrCard = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
      {/* Header and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-base">Input & Data Anggota</h2>
            <p className="text-xs text-slate-500">
              {activeSchool?.namaSekolah || 'Sekolah'} • {currentSchoolMembers.length} Anggota Terdaftar
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleBatchFormatKelas}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
            title="Otomatis konversi semua kelas yang bertuliskan huruf (VII A, 8B, dsb) menjadi format angka bergaris strip (7-1, 8-2)"
          >
            <Wand2 className="w-4 h-4 text-slate-950" />
            <span>Format Kelas (Huruf → Angka Strip)</span>
          </button>
          <button
            onClick={() => setIsBatchQrModalOpen(true)}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
            title="Cetak Semua / Banyak QR Code Anggota dalam Satu File PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Banyak QR (PDF)</span>
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Import Excel</span>
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Anggota</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-3 gap-2.5 mb-3.5">
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-500 block">Total Siswa</span>
            <span className="text-lg font-black text-slate-900 tabular-nums">{currentSchoolMembers.length}</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-blue-100/60 text-blue-700 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-emerald-700 block">TTD Digital Siap</span>
            <span className="text-lg font-black text-emerald-800 tabular-nums">{signedMembersCount}</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-amber-700 block">Belum Ada TTD</span>
            <span className="text-lg font-black text-amber-800 tabular-nums">{currentSchoolMembers.length - signedMembersCount}</span>
          </div>
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <CreditCard className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Batch Format Notification */}
      {formatSuccessMsg && (
        <div className="mb-3 p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{formatSuccessMsg}</span>
        </div>
      )}

      {/* Filter and Sort Toolbar */}
      <div className="mb-3 space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama anggota, kelas (contoh: 7-1), atau divisi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-4 flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-[11px] font-bold text-slate-600 shrink-0">Urutkan:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="nama_asc">Nama (A - Z)</option>
              <option value="nama_desc">Nama (Z - A)</option>
              <option value="kelas_asc">Kelas (7-1, 7-2, 8-1...)</option>
              <option value="kelas_desc">Kelas (9-3, 9-2, 8-1...)</option>
              <option value="divisi">Divisi Musik</option>
              <option value="terbaru">Terbaru Ditambahkan</option>
            </select>
          </div>
        </div>

        {/* Quick Division Filter Chips for Effortless Operation */}
        {availableDivisiList.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-bold text-slate-400 shrink-0 mr-1">Filter Divisi:</span>
            <button
              type="button"
              onClick={() => setSelectedDivisiFilter('ALL')}
              className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer shrink-0 ${
                selectedDivisiFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              Semua ({currentSchoolMembers.length})
            </button>
            {availableDivisiList.map(divName => {
              const count = currentSchoolMembers.filter(a => a.divisiNama === divName).length;
              const isActive = selectedDivisiFilter === divName;
              return (
                <button
                  key={divName}
                  type="button"
                  onClick={() => setSelectedDivisiFilter(divName)}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {divName} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Student List Grid */}
      {filteredAnggota.length === 0 ? (
        <div className="text-center py-12 bg-slate-50/80 rounded-2xl border border-dashed border-slate-300">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-700">Tidak ada anggota yang sesuai pencarian atau filter</p>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto mb-3">
            Coba ubah kata kunci pencarian atau pilih filter divisi lain.
          </p>
          <button
            onClick={openAdd}
            className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl transition cursor-pointer"
          >
            + Tambah Anggota Baru
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAnggota.map((student, idx) => (
            <div
              key={student.id}
              className="p-3.5 bg-white hover:bg-blue-50/20 border border-slate-200 hover:border-blue-300 rounded-2xl transition shadow-2xs hover:shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-extrabold flex items-center justify-center text-xs shadow-xs shrink-0">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-slate-900 text-xs leading-tight truncate" title={student.nama}>
                        {student.nama}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                        Kelas: <span className="text-slate-800 font-bold">{formatKelasAngka(student.kelas)}</span>
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-lg shrink-0">
                    {student.divisiNama}
                  </span>
                </div>

                {/* Status Tanda Tangan Digital */}
                <div className="my-2 bg-slate-50 p-2 border border-slate-200/80 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {student.signatureUrl ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        TTD Siap
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded-md">
                        ⚠️ Belum TTD
                      </span>
                    )}
                  </div>
                  {student.signatureUrl ? (
                    <img src={student.signatureUrl} alt="TTD" className="h-6 max-w-[80px] object-contain" />
                  ) : (
                    <span className="text-[9.5px] text-slate-400 italic">Otomatis diisi saat scan</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setSelectedStudentQr(student)}
                  className="flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Lihat Kartu & QR</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(student)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                    title="Edit Data"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(student.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                    title="Hapus Data"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add/Edit Student */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-200 my-8">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                {editingId ? 'Edit Data Anggota' : 'Tambah Data Anggota'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSave} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sekolah Terdaftar</label>
                <select
                  value={sekolahId}
                  onChange={(e) => setSekolahId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {sekolahList.map(s => (
                    <option key={s.id} value={s.id}>{s.namaSekolah}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap Anggota <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Andi Pratama"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kelas <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 7-1, 8-2, 9-3"
                    value={kelas}
                    onChange={(e) => setKelas(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Gunakan angka & strip (huruf otomatis dikonversi).
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Divisi <span className="text-rose-500">*</span></label>
                  <select
                    value={divisiNama}
                    onChange={(e) => setDivisiNama(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {divisiList.length === 0 ? (
                      <option value="Brass">Brass</option>
                    ) : (
                      divisiList.map(d => (
                        <option key={d.id} value={d.namaDivisi}>{d.namaDivisi}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Digital Signature Canvas for Student */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Gambar Tanda Tangan Digital Anggota <span className="text-rose-500">*</span>
                </label>
                <p className="text-[10px] text-slate-400 mb-1.5">
                  Tanda tangan ini akan terinput otomatis ke kolom laporan absensi bulanan saat QR di-scan.
                </p>

                {showSignaturePad ? (
                  <SignaturePad
                    onSave={(url) => {
                      setSignatureUrl(url);
                      setShowSignaturePad(false);
                    }}
                    initialDataUrl={signatureUrl}
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    {signatureUrl ? (
                      <div className="border border-slate-300 rounded-xl p-2 bg-white flex-1 h-14 flex items-center justify-center shadow-inner">
                        <img src={signatureUrl} alt="TTD Anggota" className="max-h-12 object-contain" />
                      </div>
                    ) : (
                      <div className="border border-dashed border-slate-300 rounded-xl p-2 bg-slate-50 flex-1 h-14 flex items-center justify-center text-xs text-slate-400 italic">
                        Belum ada tanda tangan
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowSignaturePad(true)}
                      className="text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-xl border border-blue-200"
                    >
                      {signatureUrl ? 'Ubah TTD' : '+ Gambar TTD'}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow transition"
                >
                  Simpan Anggota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal ID Card QR View & Download */}
      {selectedStudentQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-auto animate-scale-up">
            {/* Header */}
            <div className="bg-linear-to-r from-slate-900 via-slate-800 to-blue-950 text-white p-4.5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500 text-slate-950 rounded-2xl font-black shadow-xs">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider text-white">Kartu Anggota & Barcode QR</h3>
                  <p className="text-[11px] text-amber-300 font-medium">Format Resmi Forum Ekstrakurikuler Marching Band</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentQr(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800/80 transition cursor-pointer text-sm font-bold"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            <div className="p-5 sm:p-6 text-center flex flex-col items-center bg-slate-50/70">
              {/* Official Member ID Card matching template (centered & proportional typography) */}
              <div className="w-full flex justify-center py-1">
                <MemberIdCard
                  member={selectedStudentQr}
                  schoolName={sekolahList.find(s => s.id === selectedStudentQr.sekolahId)?.namaSekolah || 'MARCHING BAND'}
                  qrDataUrl={qrImageDataUrl}
                  showActions={true}
                />
              </div>

              {/* Quick Profile Summary Badge Row */}
              <div className="mt-4 w-full bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2.5 text-left">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nama Lengkap</span>
                  <span className="text-xs font-black text-slate-800">{selectedStudentQr.nama}</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex flex-col text-right sm:text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Kelas</span>
                    <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200 inline-block">
                      {formatKelasAngka(selectedStudentQr.kelas)}
                    </span>
                  </div>

                  <div className="flex flex-col text-right sm:text-left">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Divisi</span>
                    <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200 inline-block">
                      {selectedStudentQr.divisiNama || 'Umum'}
                    </span>
                  </div>
                </div>

                {/* Digital Signature preview or prompt */}
                <div className="w-full pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[11px] font-semibold text-slate-500">Tanda Tangan:</span>
                    {selectedStudentQr.signatureUrl ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        ✓ Terdaftar
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                        Belum Ada TTD
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedStudentQr.signatureUrl && (
                      <div className="h-7 w-20 bg-slate-50 border border-slate-200 rounded-lg p-0.5 flex items-center justify-center">
                        <img src={selectedStudentQr.signatureUrl} alt="TTD" className="h-full object-contain" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedStudentQr;
                        setSelectedStudentQr(null);
                        openEdit(target);
                      }}
                      className="text-[11px] font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition cursor-pointer"
                    >
                      ✏️ Edit Data / TTD
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Excel Modal */}
      <ImportExcelModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        currentPelatihId={currentPelatihId}
        selectedSekolahId={selectedSekolahId}
        sekolahList={sekolahList}
        divisiList={divisiList}
        onDataImported={onDataChanged}
      />

      {/* Batch QR Print Modal */}
      <BatchQrPrintModal
        isOpen={isBatchQrModalOpen}
        onClose={() => setIsBatchQrModalOpen(false)}
        anggotaList={anggotaList}
        sekolahList={sekolahList}
        selectedSekolahId={selectedSekolahId}
      />
    </div>
  );
};
