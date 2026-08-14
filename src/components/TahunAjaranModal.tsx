import React, { useState } from 'react';
import { Sekolah, AbsenSiswaEntry, AbsenPelatihItem } from '../types';
import { StorageService } from '../data/storage';
import { Calendar, CheckCircle2, Plus, Trash2, X, Settings, Sparkles, School, FileText, Check } from 'lucide-react';

interface TahunAjaranModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTahunAjaran: string;
  tahunAjaranList: string[];
  sekolahList?: Sekolah[];
  absenSiswaList?: AbsenSiswaEntry[];
  absenPelatihList?: AbsenPelatihItem[];
  onSelectActive: (tahun: string) => void;
  onDataChanged: () => void;
}

export const TahunAjaranModal: React.FC<TahunAjaranModalProps> = ({
  isOpen,
  onClose,
  activeTahunAjaran,
  tahunAjaranList,
  sekolahList = [],
  absenSiswaList = [],
  absenPelatihList = [],
  onSelectActive,
  onDataChanged
}) => {
  const [newTahun, setNewTahun] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // Calculate next default suggestion year (e.g. 2025/2026)
  const getSuggestedYear = () => {
    if (tahunAjaranList.length === 0) return '2025/2026';
    const lastYear = tahunAjaranList[tahunAjaranList.length - 1];
    const parts = lastYear.split('/');
    if (parts.length === 2) {
      const start = parseInt(parts[0], 10);
      const end = parseInt(parts[1], 10);
      if (!isNaN(start) && !isNaN(end)) {
        return `${start + 1}/${end + 1}`;
      }
    }
    return '2025/2026';
  };

  const handleAddYear = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const value = newTahun.trim() || getSuggestedYear();

    // Regex check YYYY/YYYY
    const regex = /^\d{4}\/\d{4}$/;
    if (!regex.test(value)) {
      setErrorMsg('Format harus YYYY/YYYY (contoh: 2025/2026)');
      return;
    }

    if (tahunAjaranList.includes(value)) {
      setErrorMsg('Tahun ajaran tersebut sudah ada dalam daftar.');
      return;
    }

    StorageService.addTahunAjaran(value);
    setNewTahun('');
    onDataChanged();
  };

  const handleDeleteYear = (tahun: string) => {
    if (tahun === activeTahunAjaran) {
      alert('Tahun ajaran yang sedang aktif tidak dapat dihapus!');
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menghapus Tahun Ajaran "${tahun}" dari daftar opsi?`)) {
      StorageService.deleteTahunAjaran(tahun);
      onDataChanged();
    }
  };

  const handleQuickAdd = (tahun: string) => {
    if (!tahunAjaranList.includes(tahun)) {
      StorageService.addTahunAjaran(tahun);
      onDataChanged();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 border border-blue-500/40 text-blue-400 rounded-2xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white leading-tight">
                Kelola & Pilih Tahun Ajaran Aktif
              </h3>
              <p className="text-xs text-slate-400">
                Data presensi, rekap laporan, dan jurnal latihan dikelompokkan secara otomatis
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Active Banner */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 rounded-2xl shadow-sm border border-blue-700/40 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300 block mb-0.5">
                Tahun Ajaran Aktif Sekarang
              </span>
              <p className="text-xl font-black text-white">{activeTahunAjaran}</p>
            </div>

            <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-extrabold px-3 py-1.5 rounded-xl">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Status: AKTIF</span>
            </div>
          </div>

          {/* List of Academic Years Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Daftar Tahun Ajaran
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {tahunAjaranList.map((tahun) => {
                const isActive = tahun === activeTahunAjaran;

                // Count items associated
                const schoolCount = sekolahList.filter(s => s.tahunAjaran === tahun).length;
                const studentAbsenCount = absenSiswaList.filter(a => a.tahunAjaran === tahun).length;

                return (
                  <div
                    key={tahun}
                    onClick={() => {
                      onSelectActive(tahun);
                      StorageService.setActiveTahunAjaran(tahun);
                      onDataChanged();
                    }}
                    className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-center justify-between group ${
                      isActive
                        ? 'bg-blue-50/80 border-blue-500 shadow-xs ring-2 ring-blue-500/20'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-black ${isActive ? 'text-blue-900' : 'text-slate-800'}`}>
                          {tahun}
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-extrabold bg-blue-600 text-white px-2 py-0.5 rounded-md">
                            AKTIF
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <School className="w-3 h-3 text-slate-400" />
                          {schoolCount} Sekolah
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3 text-slate-400" />
                          {studentAbsenCount} Absen
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {isActive ? (
                        <div className="w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-xs">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteYear(tahun);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                          title="Hapus Tahun Ajaran"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Suggestions */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <span className="text-[11px] font-bold text-slate-600 block">⚡ Usulan Tambah Cepat:</span>
            <div className="flex flex-wrap gap-2">
              {['2025/2026', '2026/2027', '2027/2028'].map((t) => {
                const exists = tahunAjaranList.includes(t);
                return (
                  <button
                    key={t}
                    disabled={exists}
                    onClick={() => handleQuickAdd(t)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition flex items-center gap-1 ${
                      exists
                        ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                        : 'bg-white text-blue-700 border-blue-200 hover:bg-blue-600 hover:text-white shadow-2xs'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t} {exists && '(Sudah Ada)'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Manual Add */}
          <form onSubmit={handleAddYear} className="space-y-2 pt-2 border-t border-slate-200">
            <label className="block text-xs font-extrabold text-slate-800">
              Tambah Tahun Ajaran Kustom
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Contoh: 2025/2026"
                value={newTahun}
                onChange={(e) => setNewTahun(e.target.value)}
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Simpan</span>
              </button>
            </div>
            {errorMsg && (
              <p className="text-xs text-rose-600 font-semibold">{errorMsg}</p>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
