import React, { useState } from 'react';
import { Divisi } from '../types';
import { StorageService } from '../data/storage';
import { Layers, Plus, Trash2, Edit2, ShieldAlert } from 'lucide-react';

interface DivisiManagerProps {
  currentPelatihId: string;
  divisiList: Divisi[];
  onDataChanged: () => void;
}

export const DivisiManager: React.FC<DivisiManagerProps> = ({
  currentPelatihId,
  divisiList,
  onDataChanged
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [namaDivisi, setNamaDivisi] = useState('');
  const [deskripsi, setDeskripsi] = useState('');

  const openAdd = () => {
    setEditingId(null);
    setNamaDivisi('');
    setDeskripsi('');
    setIsModalOpen(true);
  };

  const openEdit = (d: Divisi) => {
    setEditingId(d.id);
    setNamaDivisi(d.namaDivisi);
    setDeskripsi(d.deskripsi || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaDivisi) return;

    const newDiv: Divisi = {
      id: editingId || `div-${Date.now()}`,
      pelatihId: currentPelatihId,
      namaDivisi,
      deskripsi
    };

    StorageService.saveDivisi(newDiv);
    setIsModalOpen(false);
    onDataChanged();
  };

  const handleDelete = (id: string) => {
    if (confirm('Hapus divisi ini? Data anggota yang menggunakan divisi ini tetap tersimpan.')) {
      StorageService.deleteDivisi(id);
      onDataChanged();
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-base">Kelola Daftar Divisi</h2>
            <p className="text-xs text-slate-500">Isi daftar divisi marching band untuk mempermudah pengisian data anggota</p>
          </div>
        </div>

        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Divisi</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
        {divisiList.map((d) => (
          <div
            key={d.id}
            className="p-3 bg-slate-50 hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-200 rounded-xl transition flex items-center justify-between"
          >
            <div>
              <h4 className="font-bold text-slate-800 text-xs">{d.namaDivisi}</h4>
              {d.deskripsi && <p className="text-[11px] text-slate-500">{d.deskripsi}</p>}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => openEdit(d)}
                className="p-1 text-slate-500 hover:text-indigo-600 rounded"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(d.id)}
                className="p-1 text-slate-500 hover:text-rose-600 rounded"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            <div className="bg-indigo-900 text-white p-3.5 flex items-center justify-between">
              <h3 className="font-bold text-xs flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-300" />
                {editingId ? 'Edit Divisi' : 'Tambah Divisi Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>

            <form onSubmit={handleSave} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Divisi <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Brass, Color Guard, Battery Percussion"
                  value={namaDivisi}
                  onChange={(e) => setNamaDivisi(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan / Deskripsi</label>
                <input
                  type="text"
                  placeholder="Seksi instrumen tiup logam"
                  value={deskripsi}
                  onChange={(e) => setDeskripsi(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
