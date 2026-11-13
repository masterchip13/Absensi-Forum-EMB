import React, { useState, useMemo } from 'react';
import { AbsenPelatihItem, EventLog, Sekolah, User } from '../types';
import { Camera, Search, Filter, Calendar, School, User as UserIcon, Award, Download, X, Maximize2, Trophy, MapPin, Trash2 } from 'lucide-react';

interface DokumentasiGaleriProps {
  absenPelatihList: AbsenPelatihItem[];
  eventsList?: EventLog[];
  sekolahList: Sekolah[];
  usersList?: User[];
  selectedSekolahId?: string;
  onSelectSekolah?: (id: string) => void;
  canDelete?: boolean;
  onDeletePhoto?: (item: PhotoItemType) => void;
}

export type PhotoItemType = 
  | { kind: 'latihan'; data: AbsenPelatihItem; id: string; date: string; schoolId: string; photoUrl: string; title: string; subtitle?: string }
  | { kind: 'event'; data: EventLog; id: string; date: string; schoolId: string; photoUrl: string; title: string; subtitle?: string };

export const DokumentasiGaleri: React.FC<DokumentasiGaleriProps> = ({
  absenPelatihList,
  eventsList = [],
  sekolahList,
  usersList = [],
  selectedSekolahId,
  onSelectSekolah,
  canDelete = false,
  onDeletePhoto
}) => {
  const [filterSekolahId, setFilterSekolahId] = useState<string>(selectedSekolahId || 'ALL');
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'LATIHAN' | 'EVENT'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<'newest' | 'oldest'>('newest');
  const [selectedItemForLightbox, setSelectedItemForLightbox] = useState<PhotoItemType | null>(null);

  // Sync state if prop changes
  React.useEffect(() => {
    if (selectedSekolahId) {
      setFilterSekolahId(selectedSekolahId);
    }
  }, [selectedSekolahId]);

  const handleSekolahChange = (newId: string) => {
    setFilterSekolahId(newId);
    if (onSelectSekolah && newId !== 'ALL') {
      onSelectSekolah(newId);
    }
  };

  // Unified items list
  const allPhotoItems = useMemo<PhotoItemType[]>(() => {
    const items: PhotoItemType[] = [];

    // Training photos
    absenPelatihList.forEach((item) => {
      if (item.fotoDokumentasiUrl) {
        items.push({
          kind: 'latihan',
          data: item,
          id: `lat-${item.id}`,
          date: item.tanggal,
          schoolId: item.sekolahId,
          photoUrl: item.fotoDokumentasiUrl,
          title: item.materiPokok,
          subtitle: item.hariTanggalFormat
        });
      }
    });

    // Event photos
    eventsList.forEach((evt) => {
      if (evt.fotoUrl) {
        items.push({
          kind: 'event',
          data: evt,
          id: `evt-${evt.id}`,
          date: evt.tanggal,
          schoolId: evt.sekolahId,
          photoUrl: evt.fotoUrl,
          title: evt.namaEvent,
          subtitle: evt.lokasi ? `Lokasi: ${evt.lokasi}` : undefined
        });
      }
    });

    return items;
  }, [absenPelatihList, eventsList]);

  // Filtered and Sorted Documentation Items
  const filteredItems = useMemo(() => {
    return allPhotoItems
      .filter((item) => {
        // Category filter
        if (filterCategory === 'LATIHAN' && item.kind !== 'latihan') return false;
        if (filterCategory === 'EVENT' && item.kind !== 'event') return false;

        // School filter
        if (filterSekolahId !== 'ALL' && item.schoolId !== filterSekolahId) {
          return false;
        }

        // Search query filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const school = sekolahList.find((s) => s.id === item.schoolId);

          const matchesTitle = item.title?.toLowerCase().includes(q);
          const matchesDate = item.date?.toLowerCase().includes(q);
          const matchesSchool = school?.namaSekolah.toLowerCase().includes(q);

          let matchesExtra = false;
          if (item.kind === 'latihan') {
            const trainer = usersList.find((u) => u.id === item.data.pelatihId);
            matchesExtra = !!(item.data.catatan?.toLowerCase().includes(q) || trainer?.name.toLowerCase().includes(q));
          } else if (item.kind === 'event') {
            matchesExtra = !!(item.data.lokasi?.toLowerCase().includes(q) || item.data.prestasi?.toLowerCase().includes(q) || item.data.keterangan?.toLowerCase().includes(q));
          }

          if (!matchesTitle && !matchesDate && !matchesSchool && !matchesExtra) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.date).getTime() || 0;
        const timeB = new Date(b.date).getTime() || 0;
        if (sortOption === 'newest') {
          return timeB - timeA;
        }
        return timeA - timeB;
      });
  }, [allPhotoItems, filterCategory, filterSekolahId, searchQuery, sortOption, sekolahList, usersList]);

  const activeSchoolObj = sekolahList.find((s) => s.id === filterSekolahId);

  const handleDownloadImage = (item: PhotoItemType) => {
    const schoolName = sekolahList.find((s) => s.id === item.schoolId)?.namaSekolah || 'Sekolah';
    const link = document.createElement('a');
    link.href = item.photoUrl;
    link.download = `Dokumentasi-${item.kind === 'event' ? 'Event' : 'Latihan'}-${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}-${item.date}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalLatihanPhotos = allPhotoItems.filter(p => p.kind === 'latihan').length;
  const totalEventPhotos = allPhotoItems.filter(p => p.kind === 'event').length;

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              Galeri Dokumentasi Kegiatan & Event
            </h2>
            <p className="text-xs text-slate-500">
              {filteredItems.length} foto ditampilkan ({totalLatihanPhotos} latihan, {totalEventPhotos} event)
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
        {/* Category Tabs: Semua, Latihan, Event */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3">
          <button
            type="button"
            onClick={() => setFilterCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
              filterCategory === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Semua ({allPhotoItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterCategory('LATIHAN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
              filterCategory === 'LATIHAN'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Latihan ({totalLatihanPhotos})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterCategory('EVENT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
              filterCategory === 'EVENT'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Event ({totalEventPhotos})</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* School Selector Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <School className="w-3.5 h-3.5 text-slate-500" />
              <span>Sekolah</span>
            </label>
            <select
              value={filterSekolahId}
              onChange={(e) => handleSekolahChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">Semua Sekolah ({sekolahList.length})</option>
              {sekolahList.map((school) => {
                const count = allPhotoItems.filter(a => a.schoolId === school.id).length;
                return (
                  <option key={school.id} value={school.id}>
                    {school.namaSekolah} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span>Pencarian</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari materi, event, tanggal..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Sort Option */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>Urutkan</span>
            </label>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
            </select>
          </div>
        </div>

        {/* Quick School Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 mr-1">Akses Cepat:</span>
          <button
            onClick={() => handleSekolahChange('ALL')}
            className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
              filterSekolahId === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua
          </button>
          {sekolahList.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSekolahChange(s.id)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                filterSekolahId === s.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{s.namaSekolah}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Gallery Cards Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-3">
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto">
            <Camera className="w-8 h-8" />
          </div>
          <h3 className="font-extrabold text-slate-800 text-base">Tidak Ada Foto Dokumentasi</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {filterSekolahId !== 'ALL'
              ? `Belum ada foto kegiatan terunggah untuk ${activeSchoolObj?.namaSekolah || 'sekolah ini'}.`
              : 'Belum ada bukti foto latihan atau foto event yang diunggah.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const school = sekolahList.find((s) => s.id === item.schoolId);

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between group"
              >
                {/* Photo Preview Frame */}
                <div className="relative h-48 bg-slate-900 overflow-hidden cursor-pointer" onClick={() => setSelectedItemForLightbox(item)}>
                  <img
                    src={item.photoUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition" />

                  {/* Category Badge Top Right */}
                  {item.kind === 'event' ? (
                    <div className="absolute top-2.5 right-2.5 bg-purple-700/90 backdrop-blur-xs text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 border border-purple-400/30">
                      <Trophy className="w-3 h-3 text-amber-300" />
                      <span>FOTO EVENT</span>
                    </div>
                  ) : (
                    <div className="absolute top-2.5 right-2.5 bg-emerald-600/90 backdrop-blur-xs text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 border border-emerald-400/30">
                      <Award className="w-3 h-3 text-amber-300" />
                      <span>{item.data.pencapaianPercent}%</span>
                    </div>
                  )}

                  {/* School Badge Top Left */}
                  <div className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-700/60 max-w-[150px] truncate">
                    {school?.namaSekolah || 'Sekolah'}
                  </div>

                  {/* Expand Lightbox Button Overlay */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedItemForLightbox(item);
                    }}
                    className="absolute bottom-2.5 right-2.5 bg-white/20 hover:bg-white/40 text-white p-1.5 rounded-lg backdrop-blur-sm transition"
                    title="Perbesar Foto"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Content Info */}
                <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                        {item.date}
                      </span>
                      {item.kind === 'latihan' ? (
                        <span className="font-mono text-slate-500 text-[10px]">
                          {item.data.jamMulai} - {item.data.jamSelesai}
                        </span>
                      ) : item.data.lokasi ? (
                        <span className="text-[10px] text-purple-700 font-bold flex items-center gap-0.5 truncate max-w-[120px]">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {item.data.lokasi}
                        </span>
                      ) : null}
                    </div>

                    <h4 className="font-extrabold text-slate-900 text-xs leading-snug line-clamp-2">
                      {item.title}
                    </h4>

                    {item.kind === 'event' && item.data.prestasi && (
                      <div className="mt-1 flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-[10.5px] font-bold text-amber-900">
                        <Trophy className="w-3 h-3 text-amber-600 shrink-0" />
                        <span className="truncate">{item.data.prestasi}</span>
                      </div>
                    )}

                    {item.kind === 'latihan' && item.data.catatan && (
                      <p className="text-[11px] text-slate-600 italic mt-1 line-clamp-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        "{item.data.catatan}"
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-600 flex items-center gap-1 truncate max-w-[140px]">
                      {item.kind === 'event' ? (
                        <span className="text-purple-700 text-[10.5px] font-extrabold flex items-center gap-1">
                          <Trophy className="w-3 h-3" /> Event Sekolah
                        </span>
                      ) : (
                        <span className="text-blue-700 text-[10.5px] font-extrabold flex items-center gap-1">
                          <UserIcon className="w-3 h-3" /> Pelatih
                        </span>
                      )}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDownloadImage(item)}
                        className="p-1 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition cursor-pointer"
                        title="Unduh Foto"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      {canDelete && onDeletePhoto && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePhoto(item);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition cursor-pointer"
                          title="Hapus Foto dari Galeri"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox / Full Detail Modal */}
      {selectedItemForLightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                {selectedItemForLightbox.kind === 'event' ? (
                  <Trophy className="w-5 h-5 text-amber-400" />
                ) : (
                  <Camera className="w-5 h-5 text-amber-400" />
                )}
                <div>
                  <h3 className="font-extrabold text-sm text-white">
                    {sekolahList.find((s) => s.id === selectedItemForLightbox.schoolId)?.namaSekolah}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {selectedItemForLightbox.kind === 'event'
                      ? `Dokumentasi Event: ${selectedItemForLightbox.title} (${selectedItemForLightbox.date})`
                      : `Sesi Latihan: ${selectedItemForLightbox.subtitle} (${selectedItemForLightbox.data.jamMulai} - ${selectedItemForLightbox.data.jamSelesai})`}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedItemForLightbox(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4">
              {/* Photo Large View */}
              <div className="bg-slate-950 rounded-2xl overflow-hidden max-h-[400px] flex items-center justify-center relative group">
                <img
                  src={selectedItemForLightbox.photoUrl}
                  alt={selectedItemForLightbox.title}
                  className="max-h-[400px] w-auto object-contain"
                />

                <button
                  onClick={() => handleDownloadImage(selectedItemForLightbox)}
                  className="absolute bottom-3 right-3 bg-slate-900/90 text-white font-bold text-xs px-3 py-1.5 rounded-xl shadow border border-slate-700 hover:bg-blue-600 transition flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Foto Asli</span>
                </button>
              </div>

              {/* Details for Event or Training */}
              {selectedItemForLightbox.kind === 'event' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-purple-50/70 p-4 rounded-2xl border border-purple-200 text-xs">
                  <div>
                    <span className="text-[10px] text-purple-700 font-bold uppercase tracking-wider block mb-1">Nama Kegiatan / Event</span>
                    <p className="font-extrabold text-slate-900 text-sm">{selectedItemForLightbox.data.namaEvent}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-purple-700 font-bold uppercase tracking-wider block mb-1">Tanggal & Lokasi</span>
                    <p className="font-bold text-slate-800">
                      📅 {selectedItemForLightbox.data.tanggal}
                      {selectedItemForLightbox.data.lokasi && ` • 📍 ${selectedItemForLightbox.data.lokasi}`}
                    </p>
                  </div>

                  {selectedItemForLightbox.data.prestasi && (
                    <div className="sm:col-span-2 pt-2 border-t border-purple-200">
                      <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wider block mb-0.5">Prestasi / Penghargaan</span>
                      <p className="font-extrabold text-amber-900 bg-amber-100/70 px-2.5 py-1 rounded-lg border border-amber-200">
                        🏆 {selectedItemForLightbox.data.prestasi}
                      </p>
                    </div>
                  )}

                  {selectedItemForLightbox.data.keterangan && (
                    <div className="sm:col-span-2 pt-2 border-t border-purple-200">
                      <span className="text-[10px] text-purple-700 font-bold uppercase tracking-wider block mb-0.5">Keterangan / Uraian</span>
                      <p className="text-slate-700 font-medium italic">{selectedItemForLightbox.data.keterangan}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Materi Pokok Latihan</span>
                    <p className="font-extrabold text-slate-900 text-sm">{selectedItemForLightbox.data.materiPokok}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Tingkat Pencapaian Target</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-emerald-700">{selectedItemForLightbox.data.pencapaianPercent}%</span>
                      <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full"
                          style={{ width: `${selectedItemForLightbox.data.pencapaianPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {selectedItemForLightbox.data.catatan && (
                    <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Catatan Pelatih</span>
                      <p className="text-slate-700 font-medium italic">{selectedItemForLightbox.data.catatan}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
              <div>
                {canDelete && onDeletePhoto && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = selectedItemForLightbox;
                      onDeletePhoto(target);
                      setSelectedItemForLightbox(null);
                    }}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Foto Ini</span>
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedItemForLightbox(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                Tutup Galeri
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
