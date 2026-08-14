import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Anggota, Sekolah } from '../types';
import { Printer, QrCode as QrIcon, CheckSquare, Square, School, Filter, X } from 'lucide-react';

interface BatchQrPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  anggotaList: Anggota[];
  sekolahList: Sekolah[];
  selectedSekolahId: string;
}

interface MemberWithQr extends Anggota {
  qrDataUrl: string;
}

export const BatchQrPrintModal: React.FC<BatchQrPrintModalProps> = ({
  isOpen,
  onClose,
  anggotaList,
  sekolahList,
  selectedSekolahId
}) => {
  const [filterSekolahId, setFilterSekolahId] = useState<string>(selectedSekolahId || 'ALL');
  const [filterDivisi, setFilterDivisi] = useState<string>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [membersWithQr, setMembersWithQr] = useState<MemberWithQr[]>([]);
  const [loadingQr, setLoadingQr] = useState<boolean>(false);

  // Sync selected school on open
  useEffect(() => {
    if (selectedSekolahId) {
      setFilterSekolahId(selectedSekolahId);
    }
  }, [selectedSekolahId, isOpen]);

  // Available division options based on filtered school
  const divisionOptions = React.useMemo(() => {
    const list = filterSekolahId === 'ALL'
      ? anggotaList
      : anggotaList.filter(a => a.sekolahId === filterSekolahId);
    const divs = new Set(list.map(a => a.divisiNama).filter(Boolean));
    return Array.from(divs);
  }, [anggotaList, filterSekolahId]);

  // Filtered members list
  const filteredMembers = React.useMemo(() => {
    return anggotaList.filter(a => {
      if (filterSekolahId !== 'ALL' && a.sekolahId !== filterSekolahId) return false;
      if (filterDivisi !== 'ALL' && a.divisiNama !== filterDivisi) return false;
      return true;
    });
  }, [anggotaList, filterSekolahId, filterDivisi]);

  // Initialize all as selected when filtered list changes
  useEffect(() => {
    setSelectedIds(filteredMembers.map(m => m.id));
  }, [filteredMembers]);

  // Generate QR code data URLs for selected members
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoadingQr(true);

    const generateQrs = async () => {
      const activeMembers = filteredMembers.filter(m => selectedIds.includes(m.id));
      const results: MemberWithQr[] = [];

      for (const m of activeMembers) {
        try {
          const qrDataUrl = await QRCode.toDataURL(m.qrCodeData || `FMB-${m.sekolahId}-${m.id}`, {
            width: 200,
            margin: 1,
            color: {
              dark: '#0f172a',
              light: '#ffffff'
            }
          });
          results.push({ ...m, qrDataUrl });
        } catch (err) {
          console.error('Error generating QR for', m.nama, err);
          results.push({ ...m, qrDataUrl: '' });
        }
      }

      if (isMounted) {
        setMembersWithQr(results);
        setLoadingQr(false);
      }
    };

    generateQrs();

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedIds, filteredMembers]);

  if (!isOpen) return null;

  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredMembers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMembers.map(m => m.id));
    }
  };

  const handleToggleStudent = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const activeSchoolName = sekolahList.find(s => s.id === filterSekolahId)?.namaSekolah || 'Semua Sekolah';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      {/* Print-specific style block */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-qr-container, #printable-qr-container * {
            visibility: visible !important;
          }
          #printable-qr-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            padding: 10px !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-after: always;
          }
          .qr-card-print {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-auto flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="no-print bg-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-sm">
              <QrIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Cetak Banyak QR Code Anggota</h3>
              <p className="text-xs text-slate-300">
                Kartu identitas presensi QR Code siswa terdaftar ({membersWithQr.length} kartu siap dicetak)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={membersWithQr.length === 0 || loadingQr}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow transition"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF ({membersWithQr.length})</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls (No Print) */}
        <div className="no-print p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Filter Sekolah */}
            <div className="flex items-center gap-2">
              <School className="w-4 h-4 text-blue-600 shrink-0" />
              <select
                value={filterSekolahId}
                onChange={(e) => setFilterSekolahId(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="ALL">🏫 Semua Sekolah</option>
                {sekolahList.map(s => (
                  <option key={s.id} value={s.id}>{s.namaSekolah}</option>
                ))}
              </select>
            </div>

            {/* Filter Divisi */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-amber-600 shrink-0" />
              <select
                value={filterDivisi}
                onChange={(e) => setFilterDivisi(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="ALL">🎷 Semua Divisi</option>
                {divisionOptions.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Toggle All Selection */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleSelectAll}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-300 shadow-xs transition"
            >
              {selectedIds.length === filteredMembers.length ? (
                <>
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                  <span>Batalkan Semua</span>
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-slate-400" />
                  <span>Pilih Semua ({filteredMembers.length})</span>
                </>
              )}
            </button>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
              {selectedIds.length} Siswa Terpilih
            </span>
          </div>
        </div>

        {/* Modal Scrollable Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/60">
          {/* Member selection checkboxes pills (No Print) */}
          <div className="no-print mb-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Pilih Anggota Yang Ingin Dicetak QR Code-nya:
            </p>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
              {filteredMembers.map((m) => {
                const isSelected = selectedIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    onClick={() => handleToggleStudent(m.id)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-xl border transition flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{m.nama}</span>
                    <span className="text-[10px] opacity-80">({m.divisiNama})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PRINTABLE CONTAINER (Rendered on screen & formatted for window.print) */}
          <div id="printable-qr-container">
            {/* Header Document Title for Print */}
            <div className="text-center mb-4 pb-2 border-b-2 border-slate-800">
              <h2 className="text-lg font-black uppercase text-slate-900 tracking-wider">
                KARTU ANGGOTA & QR CODE ABSENSI MARCHING BAND
              </h2>
              <p className="text-xs font-bold text-slate-700">
                {activeSchoolName} • TOTAL: {membersWithQr.length} SISWA
              </p>
            </div>

            {loadingQr ? (
              <div className="no-print py-12 text-center text-slate-500">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs font-bold">Membuat Gambar QR Code Anggota...</p>
              </div>
            ) : membersWithQr.length === 0 ? (
              <div className="no-print py-12 text-center bg-white rounded-2xl border border-dashed border-slate-300">
                <p className="text-xs font-semibold text-slate-600">Tidak ada anggota yang dipilih.</p>
                <p className="text-[11px] text-slate-400 mt-1">Pilih setidaknya 1 anggota untuk mencetak QR Code.</p>
              </div>
            ) : (
              /* Grid Layout for Cards (3 Columns suitable for A4) */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {membersWithQr.map((student, idx) => {
                  const studentSchool = sekolahList.find(s => s.id === student.sekolahId)?.namaSekolah || activeSchoolName;

                  return (
                    <div
                      key={student.id}
                      className="qr-card-print bg-white border-2 border-slate-800 rounded-2xl p-3 shadow-xs flex flex-col items-center justify-between relative overflow-hidden text-center"
                      style={{ minHeight: '260px' }}
                    >
                      {/* Decorative Header Banner */}
                      <div className="w-full bg-slate-900 text-white py-1 px-2 rounded-xl text-center mb-2">
                        <p className="text-[9px] font-black uppercase tracking-widest text-amber-400">MARCHING BAND</p>
                        <p className="text-[10px] font-bold truncate">{studentSchool}</p>
                      </div>

                      {/* QR Code Image */}
                      <div className="bg-white p-1.5 border border-slate-300 rounded-xl shadow-xs my-1">
                        {student.qrDataUrl ? (
                          <img
                            src={student.qrDataUrl}
                            alt={`QR ${student.nama}`}
                            className="w-32 h-32 object-contain mx-auto"
                          />
                        ) : (
                          <div className="w-32 h-32 bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                            QR Error
                          </div>
                        )}
                      </div>

                      {/* Student Info */}
                      <div className="w-full mt-1">
                        <h4 className="font-extrabold text-slate-900 text-xs truncate uppercase">
                          {idx + 1}. {student.nama}
                        </h4>
                        <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-slate-700 mt-0.5">
                          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            Kelas: {student.kelas}
                          </span>
                          <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                            {student.divisiNama}
                          </span>
                        </div>
                        <p className="text-[8px] font-mono text-slate-400 mt-1 truncate">
                          {student.qrCodeData}
                        </p>
                      </div>

                      {/* TTD Thumbnail if available */}
                      {student.signatureUrl && (
                        <div className="w-full mt-1 pt-1 border-t border-dashed border-slate-200 flex items-center justify-between text-[8px] text-slate-400">
                          <span>TTD Siswa:</span>
                          <img src={student.signatureUrl} alt="TTD" className="h-4 max-w-[60px] object-contain" />
                        </div>
                      )}

                      {/* Cut guide indicator */}
                      <div className="no-print absolute top-1 right-1 text-[8px] text-slate-300">
                        ✂️
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer (No Print) */}
        <div className="no-print p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-300">
            💡 <b>Tips Cetak:</b> Pilih opsi <i>"Save as PDF"</i> atau printer lokal. Format kartu disusun optimal untuk dipotong dan dimasukkan ke dalam id card holder siswa.
          </p>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-xl transition"
            >
              Tutup
            </button>
            <button
              onClick={handlePrint}
              disabled={membersWithQr.length === 0 || loadingQr}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 rounded-xl shadow transition flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Sekarang</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
