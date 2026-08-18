import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Anggota, Divisi, Sekolah } from '../types';
import { StorageService } from '../data/storage';
import { FileSpreadsheet, Upload, Download, CheckCircle2, AlertTriangle, X, Plus, HelpCircle, FileText } from 'lucide-react';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPelatihId: string;
  selectedSekolahId: string;
  sekolahList: Sekolah[];
  divisiList: Divisi[];
  onDataImported: () => void;
}

interface ImportedRow {
  nama: string;
  kelas: string;
  divisiNama: string;
  isValid: boolean;
  error?: string;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  isOpen,
  onClose,
  currentPelatihId,
  selectedSekolahId,
  sekolahList,
  divisiList,
  onDataImported
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ImportedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);

  const activeSchool = sekolahList.find(s => s.id === selectedSekolahId) || sekolahList[0];

  if (!isOpen) return null;

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        'Nama Siswa': 'Andi Pratama',
        'Kelas': 'VIII A',
        'Divisi': 'Brass'
      },
      {
        'Nama Siswa': 'Siti Rahmawati',
        'Kelas': 'VIII B',
        'Divisi': 'Battery Percussion'
      },
      {
        'Nama Siswa': 'Budi Setiawan',
        'Kelas': 'IX C',
        'Divisi': 'Color Guard'
      },
      {
        'Nama Siswa': 'Dewi Anggraini',
        'Kelas': 'VII A',
        'Divisi': 'Pit Instrument'
      },
      {
        'Nama Siswa': 'Rian Hidayat',
        'Kelas': 'IX A',
        'Divisi': 'Field Commander'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 25 }, // Nama Siswa
      { wch: 15 }, // Kelas
      { wch: 22 }  // Divisi
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Siswa');

    XLSX.writeFile(workbook, `Template_Import_Siswa_${activeSchool?.namaSekolah.replace(/\s+/g, '_') || 'MarchingBand'}.xlsx`);
  };

  // Process File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);
    setImportSuccessCount(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

        const rows: ImportedRow[] = jsonRows.map((row) => {
          // Flexible key matching for column names
          const keys = Object.keys(row);

          const findValue = (possibleHeaderNames: string[]) => {
            const matchedKey = keys.find(k =>
              possibleHeaderNames.some(p => k.trim().toLowerCase().includes(p.toLowerCase()))
            );
            return matchedKey ? String(row[matchedKey]).trim() : '';
          };

          const nama = findValue(['nama siswa', 'nama lengkap', 'nama', 'student', 'name']);
          const kelas = findValue(['kelas', 'class', 'grade', 'tingkat']);
          let divisiNama = findValue(['divisi', 'division', 'seksi', 'bagian']);

          // If division is empty, default to Brass or first division
          if (!divisiNama && divisiList.length > 0) {
            divisiNama = divisiList[0].namaDivisi;
          }

          // Validate
          let isValid = true;
          let error = '';

          if (!nama) {
            isValid = false;
            error = 'Nama siswa kosong';
          } else if (!kelas) {
            isValid = false;
            error = 'Kelas kosong';
          }

          return {
            nama,
            kelas,
            divisiNama: divisiNama || 'Brass',
            isValid,
            error
          };
        });

        setParsedRows(rows);
      } catch (err) {
        console.error('Failed to parse Excel file:', err);
        alert('Gagal membaca file Excel. Pastikan format file benar (.xlsx, .xls, atau .csv).');
      } finally {
        setIsProcessing(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Save Valid Imported Students
  const handleConfirmImport = () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (validRows.length === 0) {
      alert('Tidak ada data valid yang dapat diimpor.');
      return;
    }

    const timestamp = Date.now();

    validRows.forEach((row, idx) => {
      const id = `ang-${timestamp}-${idx}`;
      const qrCodeData = `FMB-${selectedSekolahId}-${id}-${row.nama.replace(/\s+/g, '').toUpperCase()}`;

      const newAnggota: Anggota = {
        id,
        pelatihId: currentPelatihId,
        sekolahId: selectedSekolahId,
        nama: row.nama,
        kelas: row.kelas,
        divisiNama: row.divisiNama,
        qrCodeData,
        signatureUrl: '',
        createdAt: new Date().toISOString().split('T')[0]
      };

      StorageService.saveAnggota(newAnggota);
    });

    setImportSuccessCount(validRows.length);
    onDataImported();
  };

  const resetModalState = () => {
    setFileName('');
    setParsedRows([]);
    setImportSuccessCount(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-600/30 border border-emerald-500/40 text-emerald-400 rounded-2xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white leading-tight">
                Import Data Siswa via Excel
              </h3>
              <p className="text-xs text-slate-400">
                Impor massal nama siswa, kelas, dan divisi ke <span className="text-emerald-300 font-semibold">{activeSchool?.namaSekolah}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              resetModalState();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Step 1: Download Template Instruction */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-600" />
                Langkah 1: Format Excel
              </span>
              <p className="text-xs text-emerald-800">
                Gunakan template standar Excel dengan kolom header: <strong>Nama Siswa</strong>, <strong>Kelas</strong>, dan <strong>Divisi</strong>.
              </p>
            </div>

            <button
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Template Excel</span>
            </button>
          </div>

          {/* Success Banner */}
          {importSuccessCount !== null && (
            <div className="bg-emerald-600 text-white p-4 rounded-2xl shadow-md flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-200 shrink-0" />
                <div>
                  <h4 className="font-extrabold text-sm">Berhasil Mengimpor {importSuccessCount} Siswa!</h4>
                  <p className="text-xs text-emerald-100">
                    QR Code dan profil data siswa telah otomatis dibuat dan disimpan.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  resetModalState();
                  onClose();
                }}
                className="px-3.5 py-1.5 bg-white text-emerald-800 font-extrabold text-xs rounded-xl shadow-xs hover:bg-emerald-50 transition"
              >
                Selesai
              </button>
            </div>
          )}

          {/* Upload Area */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              Langkah 2: Pilih / Drop File Excel (.xlsx, .xls, .csv)
            </label>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/40 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div className="p-3 bg-white group-hover:bg-emerald-100 rounded-2xl text-slate-500 group-hover:text-emerald-700 shadow-xs border border-slate-200 transition">
                <Upload className="w-6 h-6" />
              </div>

              {fileName ? (
                <div>
                  <p className="text-xs font-extrabold text-slate-800">{fileName}</p>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">File berhasil dimuat. Periksa pratinjau di bawah.</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold text-slate-700">Klik di sini untuk memilih file Excel</p>
                  <p className="text-[11px] text-slate-400">Mendukung file Format .XLSX, .XLS, atau .CSV</p>
                </div>
              )}
            </div>
          </div>

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  Pratinjau Data ({parsedRows.length} Baris Ditemukan)
                </h4>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-lg">
                    {validCount} Valid
                  </span>
                  {invalidCount > 0 && (
                    <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 font-bold rounded-lg">
                      {invalidCount} Tidak Valid
                    </span>
                  )}
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-2.5 w-10 text-center">No</th>
                      <th className="p-2.5">Nama Siswa</th>
                      <th className="p-2.5">Kelas</th>
                      <th className="p-2.5">Divisi</th>
                      <th className="p-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className={row.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/50'}>
                        <td className="p-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-slate-900">{row.nama || <span className="text-rose-500 italic">Kosong</span>}</td>
                        <td className="p-2.5 font-semibold text-slate-700">{row.kelas || <span className="text-rose-500 italic">Kosong</span>}</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-semibold text-[11px]">
                            {row.divisiNama}
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full" title={row.error}>
                              <AlertTriangle className="w-3 h-3 text-rose-600" /> {row.error}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              resetModalState();
              onClose();
            }}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition"
          >
            Tutup
          </button>

          {parsedRows.length > 0 && validCount > 0 && (
            <button
              onClick={handleConfirmImport}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Impor {validCount} Anggota ke Sekolah</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
