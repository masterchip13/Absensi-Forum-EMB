import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, Camera, Upload, CheckCircle2, X, AlertCircle, Sparkles, Volume2, History, RefreshCw } from 'lucide-react';
import { Anggota } from '../types';
import { StorageService } from '../data/storage';
import { StudentWetSignature } from '../utils/studentSignature';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSekolahId: string;
  onScanSuccess: (anggota: Anggota, columnNumber: number, monthName?: string) => void;
}

interface ScannedHistoryItem {
  student: Anggota;
  time: string;
  column: number;
  month: string;
}

const BULAN_OPTIONS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  selectedSekolahId,
  onScanSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<number>(1);
  const [selectedMonth, setSelectedMonth] = useState<string>('Agustus');
  const [lastConfirmedStudent, setLastConfirmedStudent] = useState<Anggota | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [scannedHistory, setScannedHistory] = useState<ScannedHistoryItem[]>([]);
  const [isScanningCamera, setIsScanningCamera] = useState(false);

  const qrRegionId = 'qr-reader-element';
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedCodeRef = useRef<string>('');
  const lastScanTimestampRef = useRef<number>(0);

  const allAnggota = StorageService.getAnggota();
  const schoolAnggota = allAnggota.filter(a => a.sekolahId === selectedSekolahId);
  const selectedSekolah = StorageService.getSekolah().find(s => s.id === selectedSekolahId);

  // Play pleasant double chime when student is automatically confirmed
  const playConfirmationChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.12);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(783.99, now + 0.1); // G5
      gain2.gain.setValueAtTime(0.2, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.35);
    } catch (e) {
      // Audio context might be restricted before interaction
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, cameraFacingMode]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    setIsScanningCamera(true);

    try {
      const html5QrCode = new Html5Qrcode(qrRegionId);
      html5QrcodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: cameraFacingMode },
        {
          fps: 15,
          qrbox: { width: 230, height: 230 }
        },
        (decodedText) => {
          handleAutoConfirmQr(decodedText);
        },
        () => {
          // Ignore non-matching video frames
        }
      );
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('Kamera tidak dapat diakses atau izin ditolak. Anda dapat menggunakan tab Pilih Siswa atau Unggah QR.');
      setIsScanningCamera(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
        html5QrcodeRef.current.clear();
      } catch (e) {
        // quiet cleanup
      }
      html5QrcodeRef.current = null;
    }
    setIsScanningCamera(false);
  };

  // Direct, instant auto-confirmation upon QR decode
  const handleAutoConfirmQr = (qrText: string) => {
    const now = Date.now();
    // Debounce duplicate scans of the exact same code within 2 seconds
    if (lastScannedCodeRef.current === qrText && now - lastScanTimestampRef.current < 2000) {
      return;
    }
    lastScannedCodeRef.current = qrText;
    lastScanTimestampRef.current = now;

    const trimmed = qrText.trim();
    const found = allAnggota.find(a => 
      a.qrCodeData === trimmed || 
      a.id === trimmed || 
      trimmed.includes(a.nama) ||
      a.qrCodeData.includes(trimmed)
    );

    if (found) {
      // 1. Immediately fire onScanSuccess to save attendance & signature
      onScanSuccess(found, selectedColumn, selectedMonth);

      // 2. Play audible confirmation tone
      playConfirmationChime();

      // 3. Update active confirmation feedback
      setLastConfirmedStudent(found);
      setSuccessToast(`✅ TERKONFIRMASI: ${found.nama} hadir di Pertemuan Kolom ${selectedColumn} (${selectedMonth})`);

      // 4. Record to session history
      const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setScannedHistory(prev => [
        { student: found, time: timeStr, column: selectedColumn, month: selectedMonth },
        ...prev.filter(item => !(item.student.id === found.id && item.column === selectedColumn && item.month === selectedMonth))
      ]);
    } else {
      setCameraError(`QR Code "${trimmed}" tidak cocok dengan data anggota yang terdaftar.`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode('file-qr-temp');
      const result = await html5QrCode.scanFile(file, true);
      handleAutoConfirmQr(result);
    } catch (err) {
      setCameraError('Gagal membaca QR Code dari file foto tersebut.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white p-4 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/15 rounded-xl border border-white/20">
              <QrCode className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base leading-none">Scanner Presensi Siswa</h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-slate-950 px-2 py-0.5 rounded-full">
                  Auto-Confirm
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-1 font-medium">{selectedSekolah?.namaSekolah || 'Semua Sekolah'}</p>
            </div>
          </div>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="p-2 hover:bg-white/20 rounded-full transition text-white"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Column and Month Selector Controls */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 space-y-2 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Kolom Pertemuan:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((col) => (
                  <button
                    key={col}
                    onClick={() => setSelectedColumn(col)}
                    className={`w-7 h-7 rounded-lg text-xs font-black transition flex items-center justify-center ${
                      selectedColumn === col
                        ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-400 scale-105'
                        : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {col}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-600">Bulan:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-xs font-bold bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-800 focus:ring-2 focus:ring-blue-500"
              >
                {BULAN_OPTIONS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-100 p-1 shrink-0">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'camera' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-4 h-4 text-blue-600" />
            Kamera HP
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'upload' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-4 h-4 text-indigo-600" />
            Upload File QR
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'manual' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            Pilih Siswa
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {/* Instant Auto-Confirmation Banner */}
          {successToast && (
            <div className="p-3 bg-emerald-50 border-2 border-emerald-500 rounded-2xl text-emerald-900 shadow-sm animate-scale-up">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase text-emerald-700 tracking-wider flex items-center gap-1">
                      <Volume2 className="w-3.5 h-3.5" /> Langsung Terkonfirmasi
                    </span>
                    <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                      Kolom {selectedColumn}
                    </span>
                  </div>
                  {lastConfirmedStudent && (
                    <div className="mt-1">
                      <h4 className="font-extrabold text-slate-950 text-sm">{lastConfirmedStudent.nama}</h4>
                      <p className="text-xs text-emerald-800 font-medium">
                        {lastConfirmedStudent.kelas} • {lastConfirmedStudent.divisiNama}
                      </p>
                      
                      {/* Attached wet-ink signature preview */}
                      <div className="mt-2 pt-2 border-t border-emerald-200/80 flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-emerald-700">Tanda Tangan Hadir:</span>
                        <div className="bg-white border border-emerald-300 rounded-lg px-2 py-0.5 flex items-center justify-center">
                          <StudentWetSignature
                            studentName={lastConfirmedStudent.nama}
                            columnIndex={selectedColumn}
                            customSignatureUrl={lastConfirmedStudent.signatureUrl}
                            height="16px"
                            maxWidth="50px"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {cameraError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>{cameraError}</div>
            </div>
          )}

          {/* TAB: CAMERA SCANNER */}
          {activeTab === 'camera' && (
            <div className="flex flex-col items-center justify-center space-y-2.5">
              <div className="flex items-center justify-between w-full max-w-[280px] px-1">
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  {cameraFacingMode === 'user' ? '📷 Kamera Depan Aktif' : '📷 Kamera Belakang Aktif'}
                </span>
                <button
                  type="button"
                  onClick={() => setCameraFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                  className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition flex items-center gap-1 shadow-2xs"
                  title="Ganti ke kamera depan / belakang"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{cameraFacingMode === 'user' ? 'Ganti Kamera Belakang' : 'Ganti Kamera Depan'}</span>
                </button>
              </div>

              <div className="w-full max-w-[280px] h-[250px] bg-slate-950 rounded-2xl overflow-hidden relative shadow-inner flex items-center justify-center border-2 border-emerald-400">
                <div id={qrRegionId} className="w-full h-full" />
                {isScanningCamera && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-emerald-400 rounded-2xl animate-pulse flex items-center justify-center">
                      <div className="w-full h-0.5 bg-emerald-400/70 animate-bounce" />
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-600 text-center font-medium">
                Arahkan barcode/QR ID Card anggota ke kamera depan. Presensi langsung terkonfirmasi!
              </p>
            </div>
          )}

          {/* TAB: UPLOAD QR */}
          {activeTab === 'upload' && (
            <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50">
              <Upload className="w-10 h-10 text-indigo-500 mb-2" />
              <p className="text-sm font-bold text-slate-800">Pilih foto QR Code dari galeri</p>
              <p className="text-xs text-slate-500 mb-4">Sistem akan langsung mendeteksi dan mengonfirmasi absensi</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                id="file-qr-input"
                className="hidden"
              />
              <label
                htmlFor="file-qr-input"
                className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition"
              >
                Pilih Foto QR Siswa
              </label>
              <div id="file-qr-temp" className="hidden" />
            </div>
          )}

          {/* TAB: MANUAL LIST (1-CLICK AUTO CONFIRM) */}
          {activeTab === 'manual' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-600 font-bold">
                Klik nama siswa di bawah untuk langsung mengonfirmasi absensi kolom ke-{selectedColumn}:
              </p>
              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {schoolAnggota.length === 0 ? (
                  <p className="text-xs text-slate-400 italic p-3 text-center">Belum ada anggota terdaftar untuk sekolah ini.</p>
                ) : (
                  schoolAnggota.map((student) => {
                    const isAlreadyScanned = scannedHistory.some(
                      h => h.student.id === student.id && h.column === selectedColumn && h.month === selectedMonth
                    );
                    return (
                      <button
                        key={student.id}
                        onClick={() => handleAutoConfirmQr(student.qrCodeData)}
                        className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between border ${
                          isAlreadyScanned
                            ? 'bg-emerald-50/80 border-emerald-300 hover:bg-emerald-100'
                            : 'bg-slate-50 hover:bg-blue-50 border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full font-black flex items-center justify-center text-xs ${
                            isAlreadyScanned ? 'bg-emerald-600 text-white' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {student.nama.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{student.nama}</p>
                            <p className="text-[10px] text-slate-500 font-medium">{student.kelas} • {student.divisiNama}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                          isAlreadyScanned
                            ? 'bg-emerald-200 text-emerald-900'
                            : 'bg-blue-600 text-white'
                        }`}>
                          {isAlreadyScanned ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                              <span>Hadir (Kol {selectedColumn})</span>
                            </>
                          ) : (
                            <span>+ Absen Kol {selectedColumn}</span>
                          )}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Session Attendance Scan History */}
          {scannedHistory.length > 0 && (
            <div className="pt-3 border-t border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  Riwayat Scan Sesi Ini ({scannedHistory.length} Siswa)
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Bulan {selectedMonth}</span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 bg-slate-50 p-2 rounded-xl border border-slate-200">
                {scannedHistory.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 px-1.5 border-b border-slate-200/60 last:border-0">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <div>
                        <span className="font-bold text-slate-800">{item.student.nama}</span>
                        <span className="text-[10px] text-slate-500 ml-1.5">({item.student.kelas})</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                        Kolom {item.column}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};

