import React, { useState } from 'react';
import { EventLog, Sekolah, User } from '../types';
import { StorageService } from '../data/storage';
import { Calendar, MapPin, Award, Plus, Trash2, Edit3, Image as ImageIcon, Search, School, FileText, CheckCircle, X, ExternalLink, Printer } from 'lucide-react';

interface EventManagerProps {
  sekolahList: Sekolah[];
  selectedSekolahId: string;
  onSelectSekolah?: (id: string) => void;
  eventsList: EventLog[];
  currentUser?: User;
  onDataChanged: () => void;
  activeTahunAjaran?: string;
}

export const EventManager: React.FC<EventManagerProps> = ({
  sekolahList,
  selectedSekolahId,
  onSelectSekolah,
  eventsList,
  currentUser,
  onDataChanged,
  activeTahunAjaran = '2024/2025'
}) => {
  const [filterSekolahId, setFilterSekolahId] = useState<string>(selectedSekolahId || 'ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventLog | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Form State
  const [formSekolahId, setFormSekolahId] = useState<string>(selectedSekolahId || (sekolahList[0]?.id || ''));
  const [formTanggal, setFormTanggal] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formNamaEvent, setFormNamaEvent] = useState('');
  const [formLokasi, setFormLokasi] = useState('');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formPrestasi, setFormPrestasi] = useState('');
  const [formFotoUrl, setFormFotoUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Filtered Events
  const filteredEvents = eventsList.filter(evt => {
    const matchSchool = filterSekolahId === 'ALL' || evt.sekolahId === filterSekolahId;
    const searchLower = searchTerm.toLowerCase();
    const matchSearch =
      evt.namaEvent.toLowerCase().includes(searchLower) ||
      (evt.lokasi && evt.lokasi.toLowerCase().includes(searchLower));
    return matchSchool && matchSearch;
  });

  const openAddModal = () => {
    setEditingEvent(null);
    setFormSekolahId(selectedSekolahId || sekolahList[0]?.id || '');
    setFormTanggal(new Date().toISOString().split('T')[0]);
    setFormNamaEvent('');
    setFormLokasi('');
    setFormKeterangan('');
    setFormPrestasi('');
    setFormFotoUrl('');
    setIsModalOpen(true);
  };

  const openEditModal = (evt: EventLog) => {
    setEditingEvent(evt);
    setFormSekolahId(evt.sekolahId);
    setFormTanggal(evt.tanggal);
    setFormNamaEvent(evt.namaEvent);
    setFormLokasi(evt.lokasi || '');
    setFormKeterangan(evt.keterangan || '');
    setFormPrestasi(evt.prestasi || '');
    setFormFotoUrl(evt.fotoUrl || '');
    setIsModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 700;
        const MAX_HEIGHT = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.65);
          setFormFotoUrl(compressedDataUrl);
        }
        setIsUploading(false);
      };
      img.onerror = () => setIsUploading(false);
      img.src = event.target?.result as string;
    };
    reader.onerror = () => setIsUploading(false);
    reader.readAsDataURL(file);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNamaEvent.trim() || !formSekolahId || !formTanggal) {
      alert('Mohon isi nama kegiatan, tanggal, dan sekolah pelaksana.');
      return;
    }

    const eventData: EventLog = {
      id: editingEvent ? editingEvent.id : `evt-${Date.now()}`,
      sekolahId: formSekolahId,
      tanggal: formTanggal,
      namaEvent: formNamaEvent.trim(),
      lokasi: formLokasi.trim(),
      keterangan: '',
      prestasi: '',
      fotoUrl: formFotoUrl,
      tahunAjaran: activeTahunAjaran,
      createdByName: currentUser?.name || 'Pelatih'
    };

    StorageService.saveEvent(eventData);
    setIsModalOpen(false);
    onDataChanged();
  };

  const handleDeleteEvent = (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus laporan kegiatan "${name}"?`)) {
      StorageService.deleteEvent(id);
      onDataChanged();
    }
  };

  const getSchoolName = (sekolahId: string) => {
    const found = sekolahList.find(s => s.id === sekolahId);
    return found ? found.namaSekolah : 'Sekolah';
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-purple-500/30 text-purple-200 text-[10px] font-extrabold px-3 py-1 rounded-full border border-purple-400/30 uppercase tracking-wider">
              Laporan Kegiatan & Event
            </span>
            <span className="bg-amber-500/20 text-amber-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30">
              TA {activeTahunAjaran}
            </span>
          </div>
          <h2 className="text-xl font-black">Laporan Kegiatan & Event Sekolah</h2>
          <p className="text-xs text-purple-200 mt-1 max-w-xl">
            Catat agenda penampilan, lomba, parade, dan pertunjukan marching band sekolah binaan lengkap dengan dokumentasi foto kegiatan.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs px-5 py-3 rounded-2xl shadow-lg transition transform active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>+ Tambah Laporan Event</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* School Selector Filter */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs">
            <School className="w-4 h-4 text-slate-500" />
            <span className="text-slate-600 font-medium">Sekolah:</span>
            <select
              value={filterSekolahId}
              onChange={(e) => {
                setFilterSekolahId(e.target.value);
                if (onSelectSekolah && e.target.value !== 'ALL') {
                  onSelectSekolah(e.target.value);
                }
              }}
              className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Semua Sekolah ({eventsList.length} Event)</option>
              {sekolahList.map(s => {
                const count = eventsList.filter(e => e.sekolahId === s.id).length;
                return (
                  <option key={s.id} value={s.id}>
                    {s.namaSekolah} ({count} Event)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari nama event atau lokasi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="text-xs font-semibold text-slate-500 bg-purple-50 px-3 py-2 rounded-xl border border-purple-100 text-purple-800">
          Total: <b>{filteredEvents.length} Laporan Kegiatan</b>
        </div>
      </div>

      {/* Event Cards Grid */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-slate-300">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-sm">Belum Ada Laporan Event / Kegiatan</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {filterSekolahId !== 'ALL'
              ? 'Belum ada kegiatan/lomba yang dicatat untuk sekolah ini. Klik tombol Tambah Laporan Event untuk menambahkan.'
              : 'Belum ada data event yang terdaftar. Mulai catat laporan event marching band sekarang.'}
          </p>
          <button
            onClick={openAddModal}
            className="mt-4 inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Event Baru</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((evt) => {
            const schoolName = getSchoolName(evt.sekolahId);
            return (
              <div
                key={evt.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition duration-200 overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Photo Banner if exists */}
                  {evt.fotoUrl ? (
                    <div className="relative h-44 bg-slate-900 group cursor-pointer" onClick={() => setPreviewPhotoUrl(evt.fotoUrl || null)}>
                      <img
                        src={evt.fotoUrl}
                        alt={evt.namaEvent}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-3">
                        <span className="text-[10px] font-extrabold text-white bg-black/50 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-white/20 flex items-center gap-1">
                          <ImageIcon className="w-3 h-3 text-amber-300" /> Lihat Foto Dokumentasi
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-24 bg-gradient-to-br from-slate-100 to-purple-50 flex items-center justify-center border-b border-slate-100">
                      <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold">
                        <ImageIcon className="w-5 h-5 text-purple-300" />
                        <span>Foto Dokumentasi Belum Diunggah</span>
                      </div>
                    </div>
                  )}

                  {/* Card Content */}
                  <div className="p-4 space-y-3">
                    {/* Header tags */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="bg-purple-100 text-purple-800 font-extrabold text-[10px] px-2.5 py-1 rounded-lg border border-purple-200 truncate">
                        {schoolName}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        <Calendar className="w-3.5 h-3.5 text-purple-600" />
                        <span>{evt.tanggal}</span>
                      </div>
                    </div>

                    {/* Title & Location */}
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm leading-snug line-clamp-2">
                        {evt.namaEvent}
                      </h3>
                      {evt.lokasi && (
                        <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          <span className="truncate">{evt.lokasi}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] text-slate-400">
                    Oleh: {evt.createdByName || 'Pelatih'}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(evt)}
                      className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                      title="Edit Laporan"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteEvent(evt.id, evt.namaEvent)}
                      className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition"
                      title="Hapus Laporan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Tambah / Edit Event */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden my-8">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-800 to-indigo-900 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base">
                  {editingEvent ? 'Edit Laporan Kegiatan / Event' : 'Tambah Laporan Kegiatan / Event'}
                </h3>
                <p className="text-xs text-purple-200 mt-0.5">
                  Laporan resmi penampilan atau kegiatan marching band sekolah
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEvent} className="p-5 space-y-4">
              {/* Sekolah Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Sekolah Binaan <span className="text-red-500">*</span>
                </label>
                <select
                  value={formSekolahId}
                  onChange={(e) => setFormSekolahId(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                >
                  {sekolahList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.namaSekolah}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tanggal & Nama Event Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Kegiatan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formTanggal}
                    onChange={(e) => setFormTanggal(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lokasi / Tempat
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Lapangan Merdeka / Stadion"
                    value={formLokasi}
                    onChange={(e) => setFormLokasi(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Nama Event */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Event / Kegiatan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Lomba Kirab MB Se-Kabupaten / Unjuk Gelar HUT RI"
                  value={formNamaEvent}
                  onChange={(e) => setFormNamaEvent(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* Foto Dokumentasi Upload */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Upload Foto Dokumentasi Event
                </label>
                <div className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 hover:bg-slate-100 transition relative">
                  {formFotoUrl ? (
                    <div className="relative w-full h-40 group rounded-xl overflow-hidden">
                      <img src={formFotoUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormFotoUrl('')}
                        className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full shadow-md hover:bg-red-700 transition"
                        title="Hapus foto"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center text-center p-2">
                      <ImageIcon className="w-8 h-8 text-purple-400 mb-1" />
                      <span className="text-xs font-bold text-purple-700">Pilih Foto Kegiatan</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Format JPG / PNG (Kompresi Otomatis)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                  {isUploading && (
                    <div className="text-xs text-purple-600 font-bold mt-2 animate-pulse">
                      Mengompresi foto...
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {editingEvent ? 'Simpan Perubahan' : 'Simpan Laporan Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Lightbox Modal */}
      {previewPhotoUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div className="relative max-w-3xl w-full bg-slate-900 rounded-2xl overflow-hidden p-2 shadow-2xl" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute top-4 right-4 bg-black/60 text-white p-2 rounded-full hover:bg-red-600 transition z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={previewPhotoUrl} alt="Dokumentasi Full" className="w-full max-h-[80vh] object-contain rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
};
