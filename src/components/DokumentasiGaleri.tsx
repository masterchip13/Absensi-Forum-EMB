import React, { useState, useMemo } from 'react';
import { AbsenPelatihItem, Sekolah, User } from '../types';
import { Camera, Search, Filter, Calendar, School, User as UserIcon, Award, Download, X, Maximize2, Sparkles, CheckCircle2, Clock, FileText } from 'lucide-react';

interface DokumentasiGaleriProps {
  absenPelatihList: AbsenPelatihItem[];
  sekolahList: Sekolah[];
  usersList?: User[];
  selectedSekolahId?: string;
  onSelectSekolah?: (id: string) => void;
}

export const DokumentasiGaleri: React.FC<DokumentasiGaleriProps> = ({
  absenPelatihList,
  sekolahList,
  usersList = [],
  selectedSekolahId,
  onSelectSekolah
}) => {
  const [filterSekolahId, setFilterSekolahId] = useState<string>(selectedSekolahId || 'ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<'newest' | 'oldest' | 'pencapaian_desc' | 'pencapaian_asc'>('newest');
  const [selectedItemForLightbox, setSelectedItemForLightbox] = useState<AbsenPelatihItem | null>(null);

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

  // Filtered and Sorted Documentation Items
  const filteredItems = useMemo(() => {
    return absenPelatihList
      .filter((item) => {
        // Must have photo
        if (!item.fotoDokumentasiUrl) return false;

        // School filter
        if (filterSekolahId !== 'ALL' && item.sekolahId !== filterSekolahId) {
          return false;
        }

        // Search query filter (matches materi, notes, date, or school name)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const school = sekolahList.find((s) => s.id === item.sekolahId);
          const trainer = usersList.find((u) => u.id === item.pelatihId);

          const matchesMateri = item.materiPokok?.toLowerCase().includes(q);
          const matchesCatatan = item.catatan?.toLowerCase().includes(q);
          const matchesDate = item.hariTanggalFormat?.toLowerCase().includes(q);
          const matchesSchool = school?.namaSekolah.toLowerCase().includes(q);
          const matchesTrainer = trainer?.name.toLowerCase().includes(q);

          if (!matchesMateri && !matchesCatatan && !matchesDate && !matchesSchool && !matchesTrainer) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOption === 'newest') {
          return new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime();
        }
        if (sortOption === 'oldest') {
          return new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime();
        }
        if (sortOption === 'pencapaian_desc') {
          return b.pencapaianPercent - a.pencapaianPercent;
        }
        if (sortOption === 'pencapaian_asc') {
          return a.pencapaianPercent - b.pencapaianPercent;
        }
        return 0;
      });
  }, [absenPelatihList, filterSekolahId, searchQuery, sortOption, sekolahList, usersList]);

  const activeSchoolObj = sekolahList.find((s) => s.id === filterSekolahId);

  const handleDownloadImage = (item: AbsenPelatihItem) => {
    const schoolName = sekolahList.find((s) => s.id === item.sekolahId)?.namaSekolah || 'Sekolah';
    const link = document.createElement('a');
    link.href = item.fotoDokumentasiUrl;
    link.download = `Dokumentasi-${schoolName.replace(/\s+/g, '_')}-${item.tanggal}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl shadow-sm">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 leading-tight">
              Galeri Dokumentasi Foto Latihan
            </h2>
            <p className="text-xs text-slate-500">
              Kumpulan bukti foto kehadiran dan kegiatan melatih marching band antar sekolah
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl shrink-0">
          <span className="text-xs font-bold text-slate-600 px-2.5">
            Total Foto: <strong className="text-slate-900 font-extrabold">{filteredItems.length}</strong>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* School Selector Dropdown */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1 flex items-center gap-1.5">
              <School className="w-3.5 h-3.5 text-blue-600" />
              <span>Filter Berdasarkan Sekolah</span>
            </label>
            <select
              value={filterSekolahId}
              onChange={(e) => handleSekolahChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="ALL">🌟 Semua Sekolah Binaan ({sekolahList.length})</option>
              {sekolahList.map((school) => {
                const count = absenPelatihList.filter(a => a.sekolahId === school.id && a.fotoDokumentasiUrl).length;
                return (
                  <option key={school.id} value={school.id}>
                    🏫 {school.namaSekolah} ({count} Foto)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-blue-600" />
              <span>Cari Materi / Catatan</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cari materi pokok, tanggal, pelatih..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Sort Option */}
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>Urutkan Tampilan</span>
            </label>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="newest">📅 Tanggal Terbaru</option>
              <option value="oldest">📅 Tanggal Terlama</option>
              <option value="pencapaian_desc">🎯 Pencapaian Tertinggi (%)</option>
              <option value="pencapaian_asc">🎯 Pencapaian Terrendah (%)</option>
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
              ? `Belum ada foto kegiatan melatih terunggah untuk ${activeSchoolObj?.namaSekolah || 'sekolah ini'}.`
              : 'Belum ada bukti foto latihan yang diisi oleh pelatih.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const school = sekolahList.find((s) => s.id === item.sekolahId);
            const trainer = usersList.find((u) => u.id === item.pelatihId);

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition duration-200 flex flex-col justify-between group"
              >
                {/* Photo Preview Frame */}
                <div className="relative h-48 bg-slate-900 overflow-hidden cursor-pointer" onClick={() => setSelectedItemForLightbox(item)}>
                  <img
                    src={item.fotoDokumentasiUrl}
                    alt={item.materiPokok}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  {/* Overlay Gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition" />

                  {/* Achievement Badge */}
                  <div className="absolute top-2.5 right-2.5 bg-emerald-600/90 backdrop-blur-xs text-white text-[11px] font-black px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 border border-emerald-400/30">
                    <Award className="w-3 h-3 text-amber-300" />
                    <span>{item.pencapaianPercent}%</span>
                  </div>

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
                        {item.hariTanggalFormat}
                      </span>
                      <span className="font-mono text-slate-500">
                        {item.jamMulai} - {item.jamSelesai}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-slate-900 text-xs leading-snug line-clamp-2">
                      {item.materiPokok}
                    </h4>

                    {item.catatan && (
                      <p className="text-[11px] text-slate-600 italic mt-1 line-clamp-2 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        "{item.catatan}"
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-blue-700 flex items-center gap-1 truncate max-w-[140px]">
                      <UserIcon className="w-3 h-3 text-blue-500 shrink-0" />
                      {trainer?.name || 'Pelatih'}
                    </span>

                    <button
                      onClick={() => handleDownloadImage(item)}
                      className="p-1 text-slate-400 hover:text-blue-600 transition"
                      title="Unduh Foto"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
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
                <Camera className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-extrabold text-sm text-white">
                    {sekolahList.find((s) => s.id === selectedItemForLightbox.sekolahId)?.namaSekolah}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Sesi Latihan {selectedItemForLightbox.hariTanggalFormat} ({selectedItemForLightbox.jamMulai} - {selectedItemForLightbox.jamSelesai})
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
                  src={selectedItemForLightbox.fotoDokumentasiUrl}
                  alt={selectedItemForLightbox.materiPokok}
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

              {/* Training Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Materi Pokok Latihan</span>
                  <p className="font-extrabold text-slate-900 text-sm">{selectedItemForLightbox.materiPokok}</p>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Tingkat Pencapaian Target</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black text-emerald-700">{selectedItemForLightbox.pencapaianPercent}%</span>
                    <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full"
                        style={{ width: `${selectedItemForLightbox.pencapaianPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {selectedItemForLightbox.catatan && (
                  <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Catatan Pelatih</span>
                    <p className="text-slate-700 font-medium italic">{selectedItemForLightbox.catatan}</p>
                  </div>
                )}
              </div>

              {/* Trainer Paraf Signature if Available */}
              {selectedItemForLightbox.parafPelatihUrl && (
                <div className="flex items-center justify-between p-3 bg-blue-50/60 rounded-2xl border border-blue-200">
                  <div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Paraf Pengesahan Pelatih</span>
                    <span className="text-xs font-extrabold text-slate-800">
                      {usersList.find((u) => u.id === selectedItemForLightbox.pelatihId)?.name || 'Pelatih'}
                    </span>
                  </div>
                  <img
                    src={selectedItemForLightbox.parafPelatihUrl}
                    alt="Paraf"
                    className="h-10 border border-blue-300 rounded-lg bg-white p-1"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setSelectedItemForLightbox(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition"
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
