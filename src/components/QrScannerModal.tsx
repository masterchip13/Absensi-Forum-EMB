import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, Camera, Upload, CheckCircle2, X, User, AlertCircle, Sparkles } from 'lucide-react';
import { Anggota, Sekolah } from '../types';
import { StorageService } from '../data/storage';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSekolahId: string;
  onScanSuccess: (anggota: Anggota, columnNumber: number) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  selectedSekolahId,
  onScanSuccess
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedStudent, setScannedStudent] = useState<Anggota | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<number>(1);
  const [scannedMessage, setScannedMessage] = useState<string | null>(null);
  const [isScanningCamera, setIsScanningCamera] = useState(false);

  const qrRegionId = 'qr-reader-element';
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  const allAnggota = StorageService.getAnggota();
  const schoolAnggota = allAnggota.filter(a => a.sekolahId === selectedSekolahId);
  const selectedSekolah = StorageService.getSekolah().find(s => s.id === selectedSekolahId);

  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    setIsScanningCamera(true);

    try {
      const html5QrCode = new Html5Qrcode(qrRegionId);
      html5QrcodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 }
        },
        (decodedText) => {
          handleQrDecoded(decodedText);
          html5QrCode.stop().catch(() => {});
          setIsScanningCamera(false);
        },
        () => {
          // Ignore scanning frame errors
        }
      );
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('Kamera tidak dapat diakses atau izin ditolak. Anda dapat menggunakan tab Simulasi Manual atau Unggah QR.');
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

  const handleQrDecoded = (qrText: string) => {
    // Match QR code data or student ID
    const found = allAnggota.find(a => a.qrCodeData === qrText || a.id === qrText || qrText.includes(a.nama));
    if (found) {
      setScannedStudent(found);
      setScannedMessage(`Berhasil memindai QR code ${found.nama}`);
    } else {
      setCameraError(`QR Code "${qrText}" tidak terdaftar pada sistem.`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode('file-qr-temp');
      const result = await html5QrCode.scanFile(file, true);
      handleQrDecoded(result);
    } catch (err) {
      setCameraError('Gagal membaca QR Code dari file foto tersebut.');
    }
  };

  const handleConfirmAttendance = () => {
    if (!scannedStudent) return;
    onScanSuccess(scannedStudent, selectedColumn);
    setScannedMessage(`Absensi ${scannedStudent.nama} kolom ke-${selectedColumn} berhasil dicatat dengan tanda tangan digital!`);
    setTimeout(() => {
      setScannedStudent(null);
      setScannedMessage(null);
      onClose();
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/10 rounded-xl">
              <QrCode className="w-6 h-6 text-yellow-300" />
            </div>
            <div>
              <h3 className="font-bold text-base">Scanner QR Absensi Siswa</h3>
              <p className="text-xs text-blue-100">{selectedSekolah?.namaSekolah || 'Semua Sekolah'}</p>
            </div>
          </div>
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="p-1.5 hover:bg-white/20 rounded-full transition text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Column selection selector */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-700">Pilih Kolom Pertemuan Bulan Ini:</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((col) => (
              <button
                key={col}
                onClick={() => setSelectedColumn(col)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                  selectedColumn === col
                    ? 'bg-blue-600 text-white shadow-md scale-105'
                    : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-100'
                }`}
              >
                {col}
              </button>
            ))}
          </div>
        </div>

        {/* Tab selector */}
        <div className="flex border-b border-slate-200 bg-slate-100 p-1">
          <button
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'camera' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Camera className="w-4 h-4" />
            Kamera HP
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'upload' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload File QR
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
              activeTab === 'manual' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            Pilih Siswa
          </button>
        </div>

        {/* Tab content */}
        <div className="p-4">
          {cameraError && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>{cameraError}</div>
            </div>
          )}

          {scannedMessage && (
            <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-semibold">{scannedMessage}</span>
            </div>
          )}

          {activeTab === 'camera' && !scannedStudent && (
            <div className="flex flex-col items-center justify-center">
              <div className="w-full max-w-[280px] h-[260px] bg-slate-900 rounded-2xl overflow-hidden relative shadow-inner flex items-center justify-center border-2 border-dashed border-blue-400">
                <div id={qrRegionId} className="w-full h-full" />
                {isScanningCamera && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-yellow-400 rounded-xl animate-pulse" />
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs text-slate-500 text-center">
                Arahkan kamera HP ke QR Code ID Card anggota marching band.
              </p>
            </div>
          )}

          {activeTab === 'upload' && !scannedStudent && (
            <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50">
              <Upload className="w-10 h-10 text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Pilih foto QR Code dari galeri</p>
              <p className="text-xs text-slate-500 mb-4">Format JPG, PNG atau Screenshot</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                id="file-qr-input"
                className="hidden"
              />
              <label
                htmlFor="file-qr-input"
                className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow transition"
              >
                Pilih Gambar QR
              </label>
              <div id="file-qr-temp" className="hidden" />
            </div>
          )}

          {activeTab === 'manual' && !scannedStudent && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600 font-medium">
                Pilih siswa dari sekolah ini untuk memproses absensi QR cepat:
              </p>
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {schoolAnggota.length === 0 ? (
                  <p className="text-xs text-slate-400 italic p-3 text-center">Belum ada anggota terdaftar untuk sekolah ini.</p>
                ) : (
                  schoolAnggota.map((student) => (
                    <button
                      key={student.id}
                      onClick={() => handleQrDecoded(student.qrCodeData)}
                      className="w-full text-left p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-xl transition flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                          {student.nama.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700">{student.nama}</p>
                          <p className="text-[10px] text-slate-500">{student.kelas} • {student.divisiNama}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        Scan QR
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Scanned Result Confirmation Card */}
          {scannedStudent && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 animate-scale-up">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-lg shadow-sm">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-base">{scannedStudent.nama}</h4>
                  <p className="text-xs text-slate-600">{scannedStudent.kelas} — {scannedStudent.divisiNama}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs mb-3 bg-white p-2.5 rounded-xl border border-blue-100">
                <div>
                  <span className="text-slate-400 block text-[10px]">Kode QR:</span>
                  <span className="font-mono font-semibold text-slate-700">{scannedStudent.qrCodeData}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Kolom Absen:</span>
                  <span className="font-bold text-blue-700">Pertemuan Ke-{selectedColumn}</span>
                </div>
              </div>

              {/* Digital Signature Preview */}
              <div className="mb-4">
                <span className="text-[10px] text-slate-500 font-semibold mb-1 block">Tanda Tangan Anggota Terlampir:</span>
                <div className="bg-white border border-slate-200 rounded-xl p-2 flex items-center justify-center h-16 shadow-inner">
                  {scannedStudent.signatureUrl ? (
                    <img src={scannedStudent.signatureUrl} alt="Signature" className="max-h-12 object-contain" />
                  ) : (
                    <span className="text-xs text-slate-400 italic">Tanda tangan digital belum digambar</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setScannedStudent(null)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition"
                >
                  Batal / Pindai Ulang
                </button>
                <button
                  onClick={handleConfirmAttendance}
                  className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Simpan Absensi Kolom {selectedColumn}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
