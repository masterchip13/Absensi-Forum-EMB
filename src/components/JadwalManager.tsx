import React, { useState, useMemo } from 'react';
import { JadwalLatihan, Sekolah, AbsenPelatihItem, User } from '../types';
import { StorageService } from '../data/storage';
import { playNotificationTone, requestBrowserNotification } from '../utils/scheduleNotifications';
import { 
  Calendar, 
  Clock, 
  Bell, 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  MapPin, 
  BookOpen, 
  AlertCircle, 
  ChevronRight, 
  Filter, 
  Volume2, 
  X,
  FileText,
  UserCheck
} from 'lucide-react';

interface JadwalManagerProps {
  currentPelatihId: string;
  selectedSekolahId: string;
  sekolahList: Sekolah[];
  jadwalList: JadwalLatihan[];
  absenPelatihList?: AbsenPelatihItem[];
  currentUser?: User;
  onDataChanged: () => void;
  onStartAttendance?: (jadwal: JadwalLatihan) => void;
  onViewJurnal?: (absenId: string) => void;
}

const INDO_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const INDO_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

export const JadwalManager: React.FC<JadwalManagerProps> = ({
  currentPelatihId,
  selectedSekolahId,
  sekolahList,
  jadwalList,
  absenPelatihList = [],
  currentUser,
  onDataChanged,
  onStartAttendance,
  onViewJurnal
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form States
  const [targetSekolahId, setTargetSekolahId] = useState(selectedSekolahId || (sekolahList[0]?.id || ''));
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [jamMulai, setJamMulai] = useState('15:00');
  const [jamSelesai, setJamSelesai] = useState('17:30');
  const [materiRencana, setMateriRencana] = useState('');
  const [lokasiLatihan, setLokasiLatihan] = useState('Lapangan Sekolah');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState(60);
  const [pelatih2Id, setPelatih2Id] = useState('');
  const [formError, setFormError] = useState('');
  const [notificationStatus, setNotificationStatus] = useState<string>('');

  // Filters
  const [filterSekolah, setFilterSekolah] = useState<string>(selectedSekolahId || 'ALL');
  const [filterTab, setFilterTab] = useState<'semua' | 'akan_datang' | 'selesai'>('semua');

  const allUsers = StorageService.getUsers();
  const allCoaches = allUsers.filter(u => u.role === 'pelatih');

  const todayStr = new Date().toISOString().split('T')[0];

  const filteredJadwal = useMemo(() => {
    return jadwalList.filter(j => {
      // School filter
      if (filterSekolah !== 'ALL' && j.sekolahId !== filterSekolah) {
        return false;
      }
      // Tab filter
      const isPastOrDone = (j.tanggal && j.tanggal < todayStr) || j.status === 'selesai' || !!j.absenPelatihId;
      if (filterTab === 'akan_datang' && isPastOrDone) {
        return false;
      }
      if (filterTab === 'selesai' && !isPastOrDone) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      // Newest / nearest date first
      const dateA = a.tanggal || '';
      const dateB = b.tanggal || '';
      return dateB.localeCompare(dateA);
    });
  }, [jadwalList, filterSekolah, filterTab, todayStr]);

  const openAdd = () => {
    setEditingId(null);
    setFormError('');
    setTargetSekolahId(selectedSekolahId || (sekolahList[0]?.id || ''));
    setTanggal(new Date().toISOString().split('T')[0]);
    setJamMulai('15:00');
    setJamSelesai('17:30');
    setMateriRencana('');
    setLokasiLatihan('Lapangan Sekolah');
    setReminderEnabled(true);
    setReminderMinutesBefore(60);
    setPelatih2Id('');
    setIsModalOpen(true);
  };

  const openEdit = (j: JadwalLatihan) => {
    setEditingId(j.id);
    setFormError('');
    setTargetSekolahId(j.sekolahId);
    setTanggal(j.tanggal || new Date().toISOString().split('T')[0]);
    setJamMulai(j.jamMulai || '15:00');
    setJamSelesai(j.jamSelesai || '17:30');
    setMateriRencana(j.materiRencana || '');
    setLokasiLatihan(j.lokasiLatihan || 'Lapangan Sekolah');
    setReminderEnabled(j.reminderEnabled ?? true);
    setReminderMinutesBefore(j.reminderMinutesBefore || 60);
    setPelatih2Id(j.pelatih2Id || '');
    setIsModalOpen(true);
  };

  const handleTestSound = () => {
    playNotificationTone();
    requestBrowserNotification().then(granted => {
      if (granted) {
        setNotificationStatus('Notifikasi browser aktif.');
      } else {
        setNotificationStatus('Suara pengingat berbunyi.');
      }
      setTimeout(() => setNotificationStatus(''), 4000);
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSekolahId) {
      setFormError('Pilih sekolah binaan latihan.');
      return;
    }
    if (!tanggal) {
      setFormError('Tentukan tanggal sesi latihan.');
      return;
    }
    if (!jamMulai || !jamSelesai) {
      setFormError('Lengkapi jam mulai dan jam selesai latihan.');
      return;
    }

    const school = sekolahList.find(s => s.id === targetSekolahId);
    const d = new Date(tanggal + 'T00:00:00');
    const dayName = INDO_DAYS[d.getDay()] || 'Senin';
    const dayFormat = `${dayName}, ${d.getDate()} ${INDO_MONTHS[d.getMonth()]} ${d.getFullYear()}`;

    const coach1 = allUsers.find(u => u.id === currentPelatihId);
    const coach2 = pelatih2Id ? allUsers.find(u => u.id === pelatih2Id) : undefined;

    const existing = editingId ? jadwalList.find(x => x.id === editingId) : null;

    const newJadwal: JadwalLatihan = {
      id: editingId || `jdw-${Date.now()}`,
      pelatihId: existing?.pelatihId || currentPelatihId,
      pelatihNama: existing?.pelatihNama || coach1?.name || 'Pelatih',
      pelatih2Id: pelatih2Id || undefined,
      pelatih2Nama: coach2?.name || undefined,
      sekolahId: targetSekolahId,
      sekolahNama: school?.namaSekolah || 'Sekolah',
      hari: dayName,
      tanggal,
      hariTanggalFormat: dayFormat,
      jamMulai,
      jamSelesai,
      materiRencana,
      lokasiLatihan,
      reminderEnabled,
      reminderMinutesBefore,
      status: existing?.status || 'terjadwal',
      absenPelatihId: existing?.absenPelatihId,
      createdAt: existing?.createdAt || new Date().toISOString()
    };

    StorageService.saveJadwal(newJadwal);
    setIsModalOpen(false);
    onDataChanged();
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      StorageService.deleteJadwal(deleteConfirmId);
      setDeleteConfirmId(null);
      onDataChanged();
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/10 text-amber-700 rounded-xl flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="font-extrabold text-slate-900 text-base">Jadwal Sesi Latihan</h2>
            <p className="text-xs text-slate-500">
              Tentukan tanggal, jam sesi latihan, materi rencana & sistem pengingat otomatis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTestSound}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-2 rounded-xl transition cursor-pointer"
            title="Coba tes nada dering pengingat"
          >
            <Volume2 className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">Tes Alarm</span>
          </button>

          <button
            type="button"
            onClick={openAdd}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Jadwal</span>
          </button>
        </div>
      </div>

      {notificationStatus && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notificationStatus}</span>
        </div>
      )}

      {/* Filter and Tab Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setFilterTab('semua')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterTab === 'semua' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Semua ({jadwalList.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('akan_datang')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterTab === 'akan_datang' ? 'bg-white text-amber-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Akan Datang
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('selesai')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              filterTab === 'selesai' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Selesai / Ada Jurnal
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Sekolah:
          </span>
          <select
            value={filterSekolah}
            onChange={(e) => setFilterSekolah(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-slate-800 focus:ring-2 focus:ring-amber-500 cursor-pointer"
          >
            <option value="ALL">Semua Sekolah Binaan</option>
            {sekolahList.map(s => (
              <option key={s.id} value={s.id}>{s.namaSekolah}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Schedule Cards Grid */}
      {filteredJadwal.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-slate-300">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-700">Belum Ada Sesi Latihan</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Jadwalkan sesi latihan untuk setiap sekolah, lengkap dengan materi rencana dan pengingat alarm.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="mt-4 inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Jadwal Pertama</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredJadwal.map((j) => {
            const school = sekolahList.find(s => s.id === j.sekolahId);
            const isToday = j.tanggal === todayStr;
            const hasAttendance = !!j.absenPelatihId || absenPelatihList.some(a => a.jadwalId === j.id || (a.sekolahId === j.sekolahId && a.tanggal === j.tanggal));
            const linkedAbsen = j.absenPelatihId ? absenPelatihList.find(a => a.id === j.absenPelatihId) : absenPelatihList.find(a => a.jadwalId === j.id || (a.sekolahId === j.sekolahId && a.tanggal === j.tanggal));

            return (
              <div 
                key={j.id}
                className={`bg-white rounded-2xl p-4 border transition hover:shadow-sm flex flex-col justify-between ${
                  isToday ? 'border-amber-400 ring-2 ring-amber-400/20' : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg truncate max-w-[170px]">
                      🏫 {school?.namaSekolah || j.sekolahNama || 'Sekolah'}
                    </span>
                    
                    {isToday ? (
                      <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                        <Bell className="w-3 h-3" /> Hari Ini
                      </span>
                    ) : hasAttendance ? (
                      <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Selesai
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full shrink-0">
                        Terjadwal
                      </span>
                    )}
                  </div>

                  {/* Date & Time */}
                  <div className="space-y-1 mb-3">
                    <div className="flex items-center gap-2 text-slate-900 font-extrabold text-sm">
                      <Calendar className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{j.hariTanggalFormat || j.tanggal || j.hari}</span>
                    </div>

                    <div className="flex items-center gap-2 text-slate-600 font-semibold text-xs pl-6">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Pukul {j.jamMulai} - {j.jamSelesai} WIB</span>
                    </div>

                    {j.lokasiLatihan && (
                      <div className="flex items-center gap-2 text-slate-500 text-xs pl-6">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{j.lokasiLatihan}</span>
                      </div>
                    )}
                  </div>

                  {/* Planned Topic */}
                  {j.materiRencana && (
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-xs mb-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Materi Rencana:</span>
                      <p className="font-semibold text-slate-800 line-clamp-2">{j.materiRencana}</p>
                    </div>
                  )}

                  {/* Coaches Tag */}
                  <div className="text-[11px] text-slate-500 mb-3 flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-slate-400" />
                    <span>{j.pelatihNama || 'Pelatih'}</span>
                    {j.pelatih2Nama && <span>& {j.pelatih2Nama}</span>}
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(j)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                      title="Edit Jadwal"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(j.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      title="Hapus Jadwal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Action Link to Attendance */}
                  {hasAttendance ? (
                    <button
                      type="button"
                      onClick={() => linkedAbsen && onViewJurnal ? onViewJurnal(linkedAbsen.id) : null}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Lihat Jurnal</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onStartAttendance ? onStartAttendance(j) : null}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-xl shadow-2xs transition cursor-pointer"
                    >
                      <span>Isi Presensi</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-xl border border-slate-200 overflow-hidden animate-fade-in flex flex-col max-h-[92vh]">
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <h3 className="font-extrabold text-sm text-white">
                  {editingId ? 'Edit Sesi Latihan' : 'Jadwalkan Sesi Latihan Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
              {formError && (
                <div className="bg-rose-50 text-rose-700 border border-rose-200 p-3 rounded-xl font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Sekolah */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Sekolah Binaan Latihan *</label>
                <select
                  value={targetSekolahId}
                  onChange={(e) => setTargetSekolahId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500"
                  required
                >
                  {sekolahList.map(s => (
                    <option key={s.id} value={s.id}>{s.namaSekolah}</option>
                  ))}
                </select>
              </div>

              {/* Tanggal & Waktu */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block font-bold text-slate-700 mb-1">Tanggal *</label>
                  <input
                    type="date"
                    value={tanggal}
                    onChange={(e) => setTanggal(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Mulai *</label>
                  <input
                    type="time"
                    value={jamMulai}
                    onChange={(e) => setJamMulai(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jam Selesai *</label>
                  <input
                    type="time"
                    value={jamSelesai}
                    onChange={(e) => setJamSelesai(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>
              </div>

              {/* Materi Rencana */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Materi Rencana Latihan</label>
                <textarea
                  value={materiRencana}
                  onChange={(e) => setMateriRencana(e.target.value)}
                  placeholder="Contoh: Latihan pemanasan basic marching, drill display lagu 1, pembagian section percussion"
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Lokasi & Pelatih Kolaborator */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lokasi Latihan</label>
                  <input
                    type="text"
                    value={lokasiLatihan}
                    onChange={(e) => setLokasiLatihan(e.target.value)}
                    placeholder="Lapangan / Ruang Musik"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pelatih Pendamping (Opsional)</label>
                  <select
                    value={pelatih2Id}
                    onChange={(e) => setPelatih2Id(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">-- Tanpa Kolaborator --</option>
                    {allCoaches.filter(c => c.id !== currentPelatihId).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reminder Config */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-700" />
                    <span className="font-bold text-slate-900 text-xs">Aktifkan Pengingat Sesi</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={reminderEnabled}
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded-sm cursor-pointer"
                  />
                </div>

                {reminderEnabled && (
                  <div className="pt-2 border-t border-amber-200 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-600">Beri Notifikasi Alarm Sebelum:</span>
                    <select
                      value={reminderMinutesBefore}
                      onChange={(e) => setReminderMinutesBefore(Number(e.target.value))}
                      className="bg-white border border-amber-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800"
                    >
                      <option value={15}>15 Menit Sebelum</option>
                      <option value={30}>30 Menit Sebelum</option>
                      <option value={45}>45 Menit Sebelum</option>
                      <option value={60}>1 Jam Sebelum</option>
                      <option value={90}>1.5 Jam Sebelum</option>
                      <option value={120}>2 Jam Sebelum</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition shadow-xs cursor-pointer"
                >
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5 shadow-xl border border-slate-200 text-center animate-fade-in">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm">Hapus Sesi Latihan Ini?</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Jadwal yang dihapus tidak dapat dipulihkan kembali.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-slate-700 font-bold bg-slate-100 hover:bg-slate-200 transition cursor-pointer text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 rounded-xl text-white font-bold bg-rose-600 hover:bg-rose-700 transition cursor-pointer text-xs shadow-xs"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
