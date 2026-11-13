import React, { useMemo, useState } from 'react';
import { JadwalLatihan, Sekolah, AbsenSiswaEntry, AbsenPelatihItem } from '../types';
import { StorageService } from '../data/storage';
import { getLocalDateString, formatIndonesianDate, parseLocalDate } from '../utils/dateUtils';
import { getIndonesianDayName } from '../utils/scheduleNotifications';
import { askConfirm, showToast } from '../utils/uiDialogs';
import { Calendar, Clock, Bell, Plus, Trash2, Edit2, QrCode, CheckCircle2, Users } from 'lucide-react';

interface JadwalManagerProps {
  currentPelatihId: string;
  selectedSekolahId: string;
  sekolahList: Sekolah[];
  jadwalList: JadwalLatihan[];
  absenSiswaList?: AbsenSiswaEntry[];
  absenPelatihList?: AbsenPelatihItem[];
  onOpenQrScanner?: (jadwalId?: string) => void;
  onDataChanged: () => void;
}

export const JadwalManager: React.FC<JadwalManagerProps> = ({
  currentPelatihId,
  selectedSekolahId,
  sekolahList,
  jadwalList,
  absenSiswaList = [],
  absenPelatihList = [],
  onOpenQrScanner,
  onDataChanged
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const [targetSekolahId, setTargetSekolahId] = useState(selectedSekolahId);
  const [tanggal, setTanggal] = useState(getLocalDateString());
  const [jamMulai, setJamMulai] = useState('15:00');
  const [jamSelesai, setJamSelesai] = useState('17:30');
  const [catatan, setCatatan] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState(60);

  const activeSchool = sekolahList.find(s => s.id === selectedSekolahId);
  const todayStr = getLocalDateString();

  const sortedSchoolJadwal = useMemo(() => {
    const list = jadwalList.filter(j => j.sekolahId === selectedSekolahId);
    return [...list].sort((a, b) => {
      const aDate = a.tanggal || '';
      const bDate = b.tanggal || '';
      const aPast = aDate ? aDate < todayStr : false;
      const bPast = bDate ? bDate < todayStr : false;
      if (aPast !== bPast) return aPast ? 1 : -1;
      if (aDate && bDate) {
        if (aPast) return bDate.localeCompare(aDate) || a.jamMulai.localeCompare(b.jamMulai);
        return aDate.localeCompare(bDate) || a.jamMulai.localeCompare(b.jamMulai);
      }
      if (aDate && !bDate) return -1;
      if (!aDate && bDate) return 1;
      return a.jamMulai.localeCompare(b.jamMulai);
    });
  }, [jadwalList, selectedSekolahId, todayStr]);

  const openAdd = () => {
    setEditingId(null);
    setTargetSekolahId(selectedSekolahId || (sekolahList[0]?.id || ''));
    setTanggal(getLocalDateString());
    setJamMulai('15:00');
    setJamSelesai('17:30');
    setCatatan('');
    setReminderEnabled(true);
    setReminderMinutesBefore(60);
    setIsModalOpen(true);
  };

  const openEdit = (j: JadwalLatihan) => {
    setEditingId(j.id);
    setTargetSekolahId(j.sekolahId);
    setTanggal(j.tanggal || getLocalDateString());
    setJamMulai(j.jamMulai);
    setJamSelesai(j.jamSelesai);
    setCatatan(j.catatan || '');
    setReminderEnabled(j.reminderEnabled);
    setReminderMinutesBefore(j.reminderMinutesBefore || 60);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSekolahId || !tanggal) return;

    const derivedHari = getIndonesianDayName(parseLocalDate(tanggal));
    const newJadwal: JadwalLatihan = {
      id: editingId || `jdw-${Date.now()}`,
      pelatihId: currentPelatihId,
      sekolahId: targetSekolahId,
      hari: derivedHari,
      tanggal,
      jamMulai,
      jamSelesai,
      catatan: catatan.trim() || undefined,
      reminderEnabled,
      reminderMinutesBefore
    };

    StorageService.saveJadwal(newJadwal);
    setIsModalOpen(false);
    onDataChanged();

    setFeedbackMsg(
      reminderEnabled
        ? `Jadwal ${formatIndonesianDate(tanggal)} (${jamMulai} - ${jamSelesai}) disimpan. Pengingat aktif ${reminderMinutesBefore} menit sebelum mulai.`
        : `Jadwal ${formatIndonesianDate(tanggal)} (${jamMulai} - ${jamSelesai}) berhasil disimpan.`
    );
    setTimeout(() => setFeedbackMsg(null), 5000);
  };

  const handleDelete = async (id: string) => {
    const confirmed = await askConfirm({
      title: 'Hapus Sesi Latihan?',
      message: 'Hapus jadwal sesi latihan ini?',
      confirmText: 'Hapus',
      variant: 'danger'
    });
    if (confirmed) {
      StorageService.deleteJadwal(id);
      showToast('Jadwal sesi latihan dihapus.', 'info');
      onDataChanged();
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-base">Jadwal Sesi Latihan</h2>
            <p className="text-xs text-slate-500">
              {activeSchool ? activeSchool.namaSekolah : 'Pilih sekolah'} — atur tanggal, jam, pengingat, dan presensi sesi
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Sesi Latihan</span>
        </button>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {sortedSchoolJadwal.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
          <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-700">Belum Ada Sesi Latihan Terjadwal</p>
          <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-1 mb-3">
            Tambahkan tanggal dan jam latihan untuk menerima pengingat otomatis dan menautkan presensi siswa.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3.5 py-1.5 rounded-lg transition cursor-pointer"
          >
            + Buat Jadwal Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sortedSchoolJadwal.map((j) => {
            const isToday = j.tanggal === todayStr;
            const isPast = Boolean(j.tanggal && j.tanggal < todayStr);

            // Count linked student attendance (either directly via jadwalId or matching school + date)
            const linkedPresentIds = new Set(
              absenSiswaList
                .filter(
                  (a) =>
                    a.sekolahId === j.sekolahId &&
                    a.status === 'Hadir' &&
                    (a.jadwalId === j.id || (j.tanggal && a.tanggal === j.tanggal))
                )
                .map((a) => a.anggotaId)
            );
            const hasCoachJournal = absenPelatihList.some(
              (ap) =>
                ap.sekolahId === j.sekolahId &&
                (ap.jadwalId === j.id || (j.tanggal && ap.tanggal === j.tanggal))
            );

            return (
              <div
                key={j.id}
                className={`p-3.5 rounded-xl border transition flex flex-col justify-between gap-3 ${
                  isToday
                    ? 'bg-amber-50/50 border-amber-300'
                    : isPast
                    ? 'bg-slate-50/70 border-slate-200 opacity-85'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-slate-900">
                        {j.tanggal ? formatIndonesianDate(j.tanggal) : `Setiap Hari ${j.hari}`}
                      </span>
                      {isToday && (
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded">
                          Hari Ini
                        </span>
                      )}
                      {isPast && (
                        <span className="text-[10px] font-semibold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                          Selesai
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-600 tabular-nums">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {j.jamMulai} - {j.jamSelesai} WIB
                      </span>
                      {j.reminderEnabled && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700">
                          <Bell className="w-3 h-3" />
                          {j.reminderMinutesBefore} mnt sebelum
                        </span>
                      )}
                    </div>

                    {j.catatan && (
                      <p className="text-xs text-slate-600 truncate" title={j.catatan}>
                        Materi: {j.catatan}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(j)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                      title="Edit Sesi"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(j.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Hapus Sesi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Linked Attendance & Quick Action Footer */}
                <div className="pt-2.5 border-t border-slate-200/80 flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-3 text-slate-600 tabular-nums">
                    <span className="inline-flex items-center gap-1 font-medium">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <strong className="text-slate-900">{linkedPresentIds.size}</strong> hadir
                    </span>
                    <span className={hasCoachJournal ? 'text-emerald-700 font-semibold' : 'text-slate-400'}>
                      {hasCoachJournal ? 'Jurnal terisi' : 'Belum ada jurnal'}
                    </span>
                  </div>

                  {onOpenQrScanner && (
                    <button
                      type="button"
                      onClick={() => onOpenQrScanner(j.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Scan Absen</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add/Edit Jadwal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                {editingId ? 'Edit Jadwal Sesi Latihan' : 'Tambah Jadwal Sesi Latihan'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sekolah</label>
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
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tanggal Latihan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
                {tanggal && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Hari: <strong className="text-slate-700">{getIndonesianDayName(parseLocalDate(tanggal))}</strong>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Rencana Materi / Topik (Opsional)</label>
                <input
                  type="text"
                  placeholder="Contoh: Drill Barisan & Display Lagu 1"
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Pengingat Option */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-xs font-semibold text-amber-950 flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-amber-600" />
                    Aktifkan Pengingat Sebelum Sesi
                  </span>
                  <input
                    type="checkbox"
                    checked={reminderEnabled}
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 cursor-pointer"
                  />
                </label>

                {reminderEnabled && (
                  <div>
                    <span className="text-[11px] text-amber-900 font-medium block mb-1">Kirim Pengingat:</span>
                    <select
                      value={reminderMinutesBefore}
                      onChange={(e) => setReminderMinutesBefore(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs"
                    >
                      <option value={15}>15 menit sebelum mulai</option>
                      <option value={30}>30 menit sebelum mulai</option>
                      <option value={60}>1 jam sebelum mulai</option>
                      <option value={120}>2 jam sebelum mulai</option>
                    </select>
                  </div>
                )}
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
                  className="flex-1 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition cursor-pointer"
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
