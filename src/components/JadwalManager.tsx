import React, { useState } from 'react';
import { JadwalLatihan, Sekolah } from '../types';
import { StorageService } from '../data/storage';
import { Calendar, Clock, Bell, Plus, Trash2, Edit2, CheckCircle2 } from 'lucide-react';

interface JadwalManagerProps {
  currentPelatihId: string;
  selectedSekolahId: string;
  sekolahList: Sekolah[];
  jadwalList: JadwalLatihan[];
  onDataChanged: () => void;
}

export const JadwalManager: React.FC<JadwalManagerProps> = ({
  currentPelatihId,
  selectedSekolahId,
  sekolahList,
  jadwalList,
  onDataChanged
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [targetSekolahId, setTargetSekolahId] = useState(selectedSekolahId);
  const [hari, setHari] = useState('Senin');
  const [jamMulai, setJamMulai] = useState('15:00');
  const [jamSelesai, setJamSelesai] = useState('17:30');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState(60);

  const activeSchool = sekolahList.find(s => s.id === selectedSekolahId);
  const activeSchoolJadwal = jadwalList.filter(j => j.sekolahId === selectedSekolahId);

  const openAdd = () => {
    setEditingId(null);
    setTargetSekolahId(selectedSekolahId || (sekolahList[0]?.id || ''));
    setHari('Senin');
    setJamMulai('15:00');
    setJamSelesai('17:30');
    setReminderEnabled(true);
    setReminderMinutesBefore(60);
    setIsModalOpen(true);
  };

  const openEdit = (j: JadwalLatihan) => {
    setEditingId(j.id);
    setTargetSekolahId(j.sekolahId);
    setHari(j.hari);
    setJamMulai(j.jamMulai);
    setJamSelesai(j.jamSelesai);
    setReminderEnabled(j.reminderEnabled);
    setReminderMinutesBefore(j.reminderMinutesBefore);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSekolahId) return;

    const newJadwal: JadwalLatihan = {
      id: editingId || `jdw-${Date.now()}`,
      pelatihId: currentPelatihId,
      sekolahId: targetSekolahId,
      hari,
      jamMulai,
      jamSelesai,
      reminderEnabled,
      reminderMinutesBefore
    };

    StorageService.saveJadwal(newJadwal);
    setIsModalOpen(false);
    onDataChanged();

    if (reminderEnabled) {
      alert(`Pengingat latihan berhasil diatur! Anda akan menerima notifikasi ${reminderMinutesBefore} menit sebelum jam ${jamMulai} pada hari ${hari}.`);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Hapus jadwal latihan ini?')) {
      StorageService.deleteJadwal(id);
      onDataChanged();
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-base">Jadwal & Pengingat Latihan</h2>
            <p className="text-xs text-slate-500">
              {activeSchool ? `Atur jam dan pengingat latihan untuk ${activeSchool.namaSekolah}` : 'Pilih sekolah untuk mengatur jadwal'}
            </p>
          </div>
        </div>

        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Atur Jadwal</span>
        </button>
      </div>

      {activeSchoolJadwal.length === 0 ? (
        <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
          <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-600">Belum Ada Jadwal Latihan Terdaftar</p>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto mb-2">
            Tentukan hari dan jam latihan regular untuk sekolah ini.
          </p>
          <button
            onClick={openAdd}
            className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition"
          >
            + Tambah Jadwal Baru
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {activeSchoolJadwal.map((j) => (
            <div key={j.id} className="p-3.5 bg-slate-50 hover:bg-amber-50/40 border border-slate-200 hover:border-amber-200 rounded-xl transition flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-extrabold text-xs bg-slate-900 text-amber-300 px-2.5 py-0.5 rounded-md">
                    {j.hari}
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {j.jamMulai} S/D {j.jamSelesai}
                  </span>
                </div>

                {j.reminderEnabled && (
                  <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                    <Bell className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Pengingat aktif ({j.reminderMinutesBefore} menit sebelum)</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(j)}
                  className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-white rounded-lg transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(j.id)}
                  className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-white rounded-lg transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add/Edit Jadwal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                {editingId ? 'Edit Jadwal Latihan' : 'Atur Jadwal Latihan Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSave} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sekolah Target</label>
                <select
                  value={targetSekolahId}
                  onChange={(e) => setTargetSekolahId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {sekolahList.map(s => (
                    <option key={s.id} value={s.id}>{s.namaSekolah}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Hari Latihan</label>
                <select
                  value={hari}
                  onChange={(e) => setHari(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    required
                    value={jamMulai}
                    onChange={(e) => setJamMulai(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    required
                    value={jamSelesai}
                    onChange={(e) => setJamSelesai(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Pengingat Option */}
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-amber-600" />
                    Aktifkan Pengingat Otomatis
                  </span>
                  <input
                    type="checkbox"
                    checked={reminderEnabled}
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500"
                  />
                </label>

                {reminderEnabled && (
                  <div>
                    <span className="text-[11px] text-amber-800 font-medium block mb-1">Ingatkan Pelatih Sebelum:</span>
                    <select
                      value={reminderMinutesBefore}
                      onChange={(e) => setReminderMinutesBefore(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs"
                    >
                      <option value={15}>15 Menit Sebelum Latihan</option>
                      <option value={30}>30 Menit Sebelum Latihan</option>
                      <option value={60}>1 Jam Sebelum Latihan</option>
                      <option value={120}>2 Jam Sebelum Latihan</option>
                    </select>
                  </div>
                )}
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
                  className="flex-1 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow"
                >
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
