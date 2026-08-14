import React, { useState } from 'react';
import { Sekolah } from '../types';
import { StorageService } from '../data/storage';
import { School, Plus, Edit2, Trash2, CheckCircle, GraduationCap } from 'lucide-react';

interface SekolahManagerProps {
  currentPelatihId: string;
  sekolahList: Sekolah[];
  onDataChanged: () => void;
}

export const SekolahManager: React.FC<SekolahManagerProps> = ({
  currentPelatihId,
  sekolahList,
  onDataChanged
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const tahunAjaranOptions = StorageService.getTahunAjaranList();
  const activeTahun = StorageService.getActiveTahunAjaran();

  const [namaSekolah, setNamaSekolah] = useState('');
  const [kepalaSekolah, setKepalaSekolah] = useState('');
  const [tahunAjaran, setTahunAjaran] = useState(activeTahun);
  const [alamat, setAlamat] = useState('');

  const openAddModal = () => {
    setEditingId(null);
    setNamaSekolah('');
    setKepalaSekolah('');
    setTahunAjaran(StorageService.getActiveTahunAjaran());
    setAlamat('');
    setIsModalOpen(true);
  };

  const openEditModal = (s: Sekolah) => {
    setEditingId(s.id);
    setNamaSekolah(s.namaSekolah);
    setKepalaSekolah(s.kepalaSekolah);
    setTahunAjaran(s.tahunAjaran);
    setAlamat(s.alamat || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaSekolah || !kepalaSekolah) return;

    const newSekolah: Sekolah = {
      id: editingId || `sch-${Date.now()}`,
      pelatihId: currentPelatihId,
      namaSekolah,
      kepalaSekolah,
      tahunAjaran,
      alamat
    };

    StorageService.saveSekolah(newSekolah);
    setIsModalOpen(false);
    onDataChanged();
  };

  const handleDelete = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus data sekolah ini?')) {
      StorageService.deleteSekolah(id);
      onDataChanged();
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
            <School className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-base">Kelola Data Sekolah Binaaan</h2>
            <p className="text-xs text-slate-500">Daftar sekolah tempat Anda mengajar ekstrakurikuler marching band</p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Sekolah</span>
        </button>
      </div>

      {sekolahList.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
          <School className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-600">Belum Ada Sekolah Ditambahkan</p>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto mb-3">
            Tambahkan sekolah tempat Anda mengajar marching band agar dapat mengatur jadwal dan absensi.
          </p>
          <button
            onClick={openAddModal}
            className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition"
          >
            + Tambah Sekolah Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sekolahList.map((s) => (
            <div key={s.id} className="p-3.5 bg-slate-50 hover:bg-blue-50/40 border border-slate-200 hover:border-blue-200 rounded-xl transition flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3 className="font-bold text-slate-900 text-sm leading-snug">{s.namaSekolah}</h3>
                  <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full shrink-0">
                    {s.tahunAjaran}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                    <span>Kepala Sekolah: <strong className="text-slate-800">{s.kepalaSekolah}</strong></span>
                  </div>
                  {s.alamat && (
                    <p className="text-[11px] text-slate-500 pl-5">{s.alamat}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-1 mt-3 pt-2 border-t border-slate-200/60">
                <button
                  onClick={() => openEditModal(s)}
                  className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-white rounded-lg transition"
                  title="Edit Sekolah"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="p-1.5 text-slate-600 hover:text-rose-600 hover:bg-white rounded-lg transition"
                  title="Hapus Sekolah"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add/Edit Sekolah */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <School className="w-4 h-4 text-blue-400" />
                {editingId ? 'Edit Data Sekolah' : 'Tambah Sekolah Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSave} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Sekolah <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: SMP Negeri 1 Surabaya"
                  value={namaSekolah}
                  onChange={(e) => setNamaSekolah(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Kepala Sekolah <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Drs. H. Ahmad Wijaya, M.Pd."
                  value={kepalaSekolah}
                  onChange={(e) => setKepalaSekolah(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">Digunakan pada kolom "MENGETAHUI KEPALA SEKOLAH" rekap PDF</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tahun Ajaran <span className="text-rose-500">*</span></label>
                <select
                  value={tahunAjaran}
                  onChange={(e) => setTahunAjaran(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  {tahunAjaranOptions.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Sekolah</label>
                <textarea
                  rows={2}
                  placeholder="Jl. Pemuda No. 45, Surabaya"
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
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
                  Simpan Sekolah
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
