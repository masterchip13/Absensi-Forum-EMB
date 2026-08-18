import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Anggota, Divisi, Sekolah } from '../types';
import { StorageService } from '../data/storage';
import { SignaturePad } from './SignaturePad';
import { ImportExcelModal } from './ImportExcelModal';
import { BatchQrPrintModal } from './BatchQrPrintModal';
import { MemberIdCard } from './MemberIdCard';
import { Users, Plus, QrCode as QrIcon, Search, Trash2, Edit2, Download, Printer, FileSpreadsheet, CreditCard } from 'lucide-react';

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

  const activeSchool = sekolahList.find(s => s.id === selectedSekolahId);
  const filteredAnggota = anggotaList
    .filter(a => a.sekolahId === selectedSekolahId)
    .filter(a => a.nama.toLowerCase().includes(searchTerm.toLowerCase()) || a.divisiNama.toLowerCase().includes(searchTerm.toLowerCase()));

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
    setKelas(a.kelas);
    setDivisiNama(a.divisiNama);
    setSignatureUrl(a.signatureUrl || '');
    setShowSignaturePad(false);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama || !kelas || !divisiNama) return;

    const id = editingId || `ang-${Date.now()}`;
    const qrCodeData = `FMB-${sekolahId}-${id}-${nama.replace(/\s+/g, '').toUpperCase()}`;

    const newAnggota: Anggota = {
      id,
      pelatihId: currentPelatihId,
      sekolahId,
      nama,
      kelas,
      divisiNama,
      qrCodeData,
      signatureUrl,
      createdAt: new Date().toISOString().split('T')[0]
    };

    StorageService.saveAnggota(newAnggota);
    setIsModalOpen(false);
    onDataChanged();
  };

  const handleDelete = (id: string) => {
    if (confirm('Hapus data anggota ini? Data absensi terkait akan dihapus.')) {
      StorageService.deleteAnggota(id);
      onDataChanged();
    }
  };

  const printQrCard = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-base">Input & Data Anggota</h2>
            <p className="text-xs text-slate-500">
              Anggota {activeSchool?.namaSekolah || ''} • Maksimal 5 Kolom Absensi / Bulan
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsBatchQrModalOpen(true)}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition"
            title="Cetak Semua / Banyak QR Code Anggota dalam Satu File PDF"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Banyak QR</span>
          </button>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Import Excel</span>
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Anggota</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-3 relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <input
          type="text"
          placeholder="Cari nama anggota atau divisi..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* Student List */}
      {filteredAnggota.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-600">Belum Ada Anggota Terdaftar</p>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto mb-3">
            Tambahkan anggota untuk sekolah ini, buatkan QR Code dan tanda tangan digital mereka.
          </p>
          <button
            onClick={openAdd}
            className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl transition"
          >
            + Input Anggota Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAnggota.map((student, idx) => (
            <div
              key={student.id}
              className="p-3 bg-slate-50 hover:bg-blue-50/30 border border-slate-200 hover:border-blue-200 rounded-xl transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs leading-tight">{student.nama}</h4>
                      <p className="text-[10px] text-slate-500 font-medium">Kelas: {student.kelas}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                    {student.divisiNama}
                  </span>
                </div>

                {/* Tanda tangan thumbnail */}
                <div className="my-2 bg-white p-1.5 border border-slate-200 rounded-lg flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-medium">Tanda Tangan:</span>
                  {student.signatureUrl ? (
                    <img src={student.signatureUrl} alt="TTD" className="h-6 max-w-[100px] object-contain" />
                  ) : (
                    <span className="text-[10px] text-rose-500 italic">Belum digambar</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60">
                <button
                  onClick={() => setSelectedStudentQr(student)}
                  className="flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100/70 hover:bg-blue-200 px-2.5 py-1 rounded-lg transition"
                >
                  <QrIcon className="w-3.5 h-3.5" />
                  Lihat QR Code
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(student)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg"
                    title="Edit Data"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(student.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg"
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kelas <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="VIII A / X MIPA 1"
                    value={kelas}
                    onChange={(e) => setKelas(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-auto">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500 text-slate-950 rounded-xl font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm uppercase tracking-wider">KARTU ANGGOTA & BARCODE</h3>
                  <p className="text-[10px] text-slate-300 font-medium">Format Resmi Forum Ekstrakurikuler Marching Band</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudentQr(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 text-center flex flex-col items-center bg-slate-100/60">
              {/* Official Member ID Card matching template */}
              <MemberIdCard
                member={selectedStudentQr}
                schoolName={sekolahList.find(s => s.id === selectedStudentQr.sekolahId)?.namaSekolah || 'MARCHING BAND'}
                qrDataUrl={qrImageDataUrl}
                showActions={true}
              />

              {/* Tanda tangan preview if available */}
              {selectedStudentQr.signatureUrl && (
                <div className="mt-4 w-full max-w-sm bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between text-xs text-slate-600">
                  <span className="font-semibold text-[11px] text-slate-500">Tanda Tangan Terdaftar:</span>
                  <img src={selectedStudentQr.signatureUrl} alt="Signature" className="h-8 max-w-[100px] object-contain border-b border-slate-300" />
                </div>
              )}
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
