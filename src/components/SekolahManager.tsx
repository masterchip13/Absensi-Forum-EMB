import React, { useState } from 'react';
import { Sekolah, User } from '../types';
import { StorageService } from '../data/storage';
import { School, Plus, Edit2, Trash2, GraduationCap, UserCheck, MapPin } from 'lucide-react';

interface SekolahManagerProps {
  currentPelatihId: string;
  sekolahList: Sekolah[];
  usersList?: User[];
  isAdmin?: boolean;
  onDataChanged: () => void;
}

export const SekolahManager: React.FC<SekolahManagerProps> = ({
  currentPelatihId,
  sekolahList,
  usersList = [],
  isAdmin = false,
  onDataChanged
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const tahunAjaranOptions = StorageService.getTahunAjaranList();
  const activeTahun = StorageService.getActiveTahunAjaran();

  const [namaSekolah, setNamaSekolah] = useState('');
  const [kepalaSekolah, setKepalaSekolah] = useState('');
  const [nipKepalaSekolah, setNipKepalaSekolah] = useState('');
  const [tahunAjaran, setTahunAjaran] = useState(activeTahun);
  const [alamat, setAlamat] = useState('');
  const [assignedPelatihId, setAssignedPelatihId] = useState(currentPelatihId);

  // Available coaches for assignment
  const coachOptions = usersList.filter(u => u.role === 'pelatih');

  const openAddModal = () => {
    setEditingId(null);
    setNamaSekolah('');
    setKepalaSekolah('');
    setNipKepalaSekolah('');
    setTahunAjaran(StorageService.getActiveTahunAjaran());
    setAlamat('');
    setAssignedPelatihId(coachOptions.length > 0 ? coachOptions[0].id : currentPelatihId);
    setIsModalOpen(true);
  };

  const openEditModal = (s: Sekolah) => {
    setEditingId(s.id);
    setNamaSekolah(s.namaSekolah);
    setKepalaSekolah(s.kepalaSekolah);
    setNipKepalaSekolah(s.nipKepalaSekolah || '');
    setTahunAjaran(s.tahunAjaran);
    setAlamat(s.alamat || '');
    setAssignedPelatihId(s.pelatihId || (coachOptions.length > 0 ? coachOptions[0].id : currentPelatihId));
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaSekolah || !kepalaSekolah) return;

    const newSekolah: Sekolah = {
      id: editingId || `sch-${Date.now()}`,
      pelatihId: isAdmin ? (assignedPelatihId || currentPelatihId) : currentPelatihId,
      namaSekolah,
      kepalaSekolah,
      nipKepalaSekolah,
      tahunAjaran,
      alamat
    };

    StorageService.saveSekolah(newSekolah);
    setIsModalOpen(false);
    onDataChanged();
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data sekolah "${name}"? Seluruh data terkait sekolah ini akan terhapus.`)) {
      StorageService.deleteSekolah(id);
      onDataChanged();
    }
  };

  const getCoachName = (pelatihId: string) => {
    const coach = usersList.find(u => u.id === pelatihId);
    return coach ? coach.name : 'Pelatih Belum Ditugaskan';
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
      <div className="flex flex-wrap items-center justify-between mb-4 pb-3 border-b border-slate-100 gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
            <School className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-base">
              {isAdmin ? 'Kelola Data Sekolah & Penugasan Pelatih' : 'Data Sekolah Binaan'}
            </h2>
            <p className="text-xs text-slate-500">
              {isAdmin
                ? 'Tambah, edit, dan tentukan Pelatih Penanggung Jawab (Coach) untuk setiap sekolah binaan'
                : 'Daftar sekolah tempat Anda ditugaskan mengajar ekstrakurikuler marching band'}
            </p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Sekolah Baru</span>
          </button>
        )}
      </div>

      {sekolahList.length === 0 ? (
        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
          <School className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">Belum Ada Sekolah Terdaftar</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4 mt-1">
            {isAdmin
              ? 'Tambahkan sekolah dan tugaskan pelatih marching band agar dapat mengatur jadwal dan absensi.'
              : 'Anda belum memiliki sekolah binaan yang ditugaskan. Silakan hubungi Administrator.'}
          </p>
          {isAdmin && (
            <button
              onClick={openAddModal}
              className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl transition"
            >
              + Tambah Sekolah Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {sekolahList.map((s) => {
            const coachName = getCoachName(s.pelatihId);
            return (
              <div
                key={s.id}
                className="p-4 bg-slate-50/80 hover:bg-blue-50/30 border border-slate-200 hover:border-blue-300 rounded-2xl transition flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-extrabold text-slate-900 text-sm leading-snug">
                      {s.namaSekolah}
                    </h3>
                    <span className="text-[10px] font-black bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full shrink-0 border border-blue-200">
                      {s.tahunAjaran}
                    </span>
                  </div>

                  {/* Coach Assignment Badge */}
                  <div className="mb-2.5 p-2 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">
                        Pelatih / Coach:
                      </span>
                      <span className="text-xs font-bold text-indigo-950 truncate block">
                        {coachName}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        Kepala Sekolah: <strong className="text-slate-800">{s.kepalaSekolah}</strong>
                      </span>
                    </div>
                    {s.nipKepalaSekolah && (
                      <p className="text-[11px] text-slate-500 pl-5">NIP. {s.nipKepalaSekolah}</p>
                    )}
                    {s.alamat && (
                      <div className="flex items-start gap-1.5 text-[11px] text-slate-500 pt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{s.alamat}</span>
                      </div>
                    )}
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-center justify-end gap-1.5 mt-3.5 pt-2.5 border-t border-slate-200">
                    <button
                      onClick={() => openEditModal(s)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition"
                      title="Edit Sekolah & Pelatih"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(s.id, s.namaSekolah)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                      title="Hapus Sekolah"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add/Edit Sekolah */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <School className="w-4 h-4 text-blue-400" />
                {editingId ? 'Edit Data Sekolah & Penugasan Pelatih' : 'Tambah Sekolah Binaan Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSave} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Sekolah <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: SMP NEGERI 2 CIGOMBONG"
                  value={namaSekolah}
                  onChange={(e) => setNamaSekolah(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Coach Selector for Admin */}
              {isAdmin && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tugaskan Kepada Pelatih / Coach <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={assignedPelatihId}
                    onChange={(e) => setAssignedPelatihId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {coachOptions.length === 0 ? (
                      <option value="">(Belum ada akun pelatih terdaftar)</option>
                    ) : (
                      coachOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          🎺 {c.name} (@{c.username})
                        </option>
                      ))
                    )}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Pelatih yang dipilih hanya akan dapat mengelola absensi dan siswa pada sekolah ini.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Kepala Sekolah <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Drs. H. Ahmad Wijaya, M.Pd."
                  value={kepalaSekolah}
                  onChange={(e) => setKepalaSekolah(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NIP Kepala Sekolah (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 197310221996032002"
                  value={nipKepalaSekolah}
                  onChange={(e) => setNipKepalaSekolah(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Digunakan pada lembar pengesahan tanda tangan rekap laporan & raport nilai
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tahun Ajaran <span className="text-rose-500">*</span>
                </label>
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
                  placeholder="Jl. Raya Sukaharja No. 45, Kab. Bogor"
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition cursor-pointer"
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
