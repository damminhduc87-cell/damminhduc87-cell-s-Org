import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { QCLevel, LabTest, QCResult } from '../types';
import { evaluateWestgardResult, calculateZScore } from '../services/westgardEngine';

interface ImportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  tests: LabTest[];
  currentTechnician: string;
  onImportSuccess: (importedResults: QCResult[], updatedTests?: LabTest[]) => void;
}

// Bảng ánh xạ linh hoạt tên xét nghiệm từ Google Sheet sang testId chuẩn của hệ thống
const TEST_NAME_MAP: Record<string, string> = {
  // Protein
  'pro': 'protein',
  'protein': 'protein',
  'protein toan phan': 'protein',
  'protein toàn phần': 'protein',
  // Creatinine
  'creatinin': 'creatinine',
  'creatinine': 'creatinine',
  'cre': 'creatinine',
  // Albumin (bao gồm cả lỗi gõ 'aibumil' trên file thực tế)
  'aibumil': 'albumin',
  'aibumin': 'albumin',
  'albumin': 'albumin',
  'alb': 'albumin',
  // Uric Acid
  'uric': 'uric-acid',
  'acid uric': 'uric-acid',
  'uric acid': 'uric-acid',
  // GPT / ALT
  'gpt': 'alt',
  'alt': 'alt',
  'alt (gpt)': 'alt',
  // GOT / AST
  'got': 'ast',
  'ast': 'ast',
  'ast (got)': 'ast',
  // Urea
  'urease': 'urea',
  'urea': 'urea',
  'ure': 'urea',
  // HDL
  'hdl': 'hdl',
  'hdl-c': 'hdl',
  'hdl cholesterol': 'hdl',
  // LDL
  'ldl': 'ldl',
  'ldl-c': 'ldl',
  'ldl cholesterol': 'ldl',
  // Triglycerid
  'triglycerid': 'triglycerides',
  'triglyceride': 'triglycerides',
  'triglycerides': 'triglycerides',
  // Cholesterol
  'cholesterol': 'cholesterol',
  'cholesterol toan phan': 'cholesterol',
  'cholesterol toàn phần': 'cholesterol',
  'chol': 'cholesterol',
  // Glucose
  'glucose': 'glucose',
  'glu': 'glucose',
  'duong huyet': 'glucose',
  // Bilirubin
  'bilirubin': 'bilirubin-tp',
  'bilirubin tp': 'bilirubin-tp',
  'bili tp': 'bilirubin-tp',
  'bilirubin toan phan': 'bilirubin-tp',
  'bilirubin toàn phần': 'bilirubin-tp',
  'bilirubin tt': 'bilirubin-tt',
  'bili tt': 'bilirubin-tt',
  'bilirubin truc tiep': 'bilirubin-tt',
  'bilirubin trực tiếp': 'bilirubin-tt',
  // Calci
  'calcium': 'calcium',
  'calci': 'calcium',
  'canxi': 'calcium',
  // Điện giải
  'natri': 'electrolytes-na',
  'na': 'electrolytes-na',
  'na+': 'electrolytes-na',
  'kali': 'electrolytes-k',
  'k': 'electrolytes-k',
  'k+': 'electrolytes-k',
  'clo': 'electrolytes-cl',
  'cl': 'electrolytes-cl',
  'cl-': 'electrolytes-cl',
  // CRP & GGT
  'crp': 'crp',
  'ggt': 'ggt'
};

export const ImportDataModal: React.FC<ImportDataModalProps> = ({
  isOpen,
  onClose,
  tests,
  currentTechnician,
  onImportSuccess
}) => {
  const [activeMode, setActiveMode] = useState<'file' | 'paste'>('file');
  const [pasteContent, setPasteContent] = useState('');
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Chuẩn hóa tên xét nghiệm
  const matchTestId = (rawName: any): string => {
    if (!rawName) return '';
    const clean = String(rawName).trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // bỏ dấu tiếng Việt

    // 1. Tra cứu trong từ điển alias
    if (TEST_NAME_MAP[clean]) return TEST_NAME_MAP[clean];

    // 2. Tra cứu trực tiếp theo danh sách tests hiện có
    const matched = tests.find(t => {
      const tClean = t.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return t.id.toLowerCase() === clean || tClean === clean || tClean.includes(clean);
    });

    return matched ? matched.id : '';
  };

  // Chuẩn hóa mức QC
  const normalizeLevel = (rawLevel: any): QCLevel => {
    const s = String(rawLevel || '').trim().toLowerCase();
    if (s.includes('low') || s.includes('thap') || s.includes('thấp') || s === '1') return QCLevel.LOW;
    if (s.includes('high') || s.includes('cao') || s === '3') return QCLevel.HIGH;
    return QCLevel.NORMAL;
  };

  // Chuyển đổi số có dấu phẩy hoặc chấm (ví dụ: "184,3" -> 184.3)
  const parseNum = (val: any): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    const str = String(val).trim().replace(',', '.');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  // Phân tích ngày giờ
  const parseDate = (val: any): number => {
    if (!val) return Date.now();
    if (val instanceof Date) return val.getTime();
    if (typeof val === 'number') {
      // Excel serial date number
      return new Date((val - (25567 + 2)) * 86400 * 1000).getTime();
    }
    const str = String(val).trim();
    // Khớp DD/MM/YYYY
    const parts = str.split(/[/ -]/);
    if (parts.length >= 3) {
      const p1 = parseInt(parts[0], 10);
      const p2 = parseInt(parts[1], 10);
      const p3 = parseInt(parts[2], 10);
      if (!isNaN(p1) && !isNaN(p2) && !isNaN(p3)) {
        if (p3 > 1000) {
          // DD/MM/YYYY
          return new Date(p3, p2 - 1, p1, 8, 0, 0).getTime();
        } else if (p1 > 1000) {
          // YYYY/MM/DD
          return new Date(p1, p2 - 1, p3, 8, 0, 0).getTime();
        }
      }
    }
    const d = new Date(str).getTime();
    return isNaN(d) ? Date.now() : d;
  };

  // Xử lý nạp mảng dòng JSON thành đối tượng QCResult
  const processRawRows = (rawJsonRows: any[]) => {
    const parsedList: any[] = [];

    rawJsonRows.forEach((row, idx) => {
      // Nhận diện cột theo cấu trúc file Google Sheet: NGAY_GIO, XET_NGHIEM, MUC_IQC, GIA_TRI_DO_LUONG...
      const rawDate = row['NGAY_GIO'] || row['Ngay_gio'] || row['Ngày giờ'] || row['NGAY'] || row['Date'];
      const rawTest = row['XET_NGHIEM'] || row['Xet_nghiem'] || row['Xét nghiệm'] || row['Test'];
      const rawLevel = row['MUC_IQC'] || row['Muc_iqc'] || row['Mức QC'] || row['Level'] || row['MUC'];
      const rawVal = row['GIA_TRI_DO_LUONG'] || row['Gia_tri_do_luong'] || row['Giá trị đo'] || row['Value'];
      const rawMean = row['TAGRET_MEAN'] || row['TARGET_MEAN'] || row['Mean Đích'] || row['Mean'];
      const rawSd = row['SD_DOLECHCHUAN'] || row['SD_Dolechchuan'] || row['SD Đích'] || row['SD'];
      const rawMachine = row['TEN_MAY'] || row['Ten_may'] || row['Máy phân tích'] || row['Machine'];

      if (!rawTest && !rawVal) return; // Bỏ qua dòng trống

      const testId = matchTestId(rawTest);
      const level = normalizeLevel(rawLevel);
      const value = parseNum(rawVal);
      const timestamp = parseDate(rawDate);
      const targetMean = parseNum(rawMean);
      const targetSd = parseNum(rawSd);

      parsedList.push({
        rawIndex: idx + 1,
        rawTestName: String(rawTest || ''),
        testId: testId || 'unknown',
        testObj: tests.find(t => t.id === testId),
        level,
        value,
        timestamp,
        formattedDate: new Date(timestamp).toLocaleDateString('vi-VN'),
        targetMean,
        targetSd,
        analyzerName: rawMachine ? String(rawMachine).trim() : ''
      });
    });

    setPreviewRows(parsedList);
  };

  // 1. Khi người dùng chọn file Excel từ máy tính
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
        
        // Ưu tiên sheet 'NhatKy_IQC' nếu có, không thì lấy sheet đầu tiên
        const sheetName = wb.SheetNames.includes('NhatKy_IQC') ? 'NhatKy_IQC' : wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(ws);

        processRawRows(jsonData);
      } catch (err: any) {
        alert('Có lỗi khi đọc file Excel: ' + (err.message || 'File không hợp lệ'));
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  // 2. Khi người dùng dán nội dung từ clipboard (Ctrl+V từ Google Sheet)
  const handleParsePaste = () => {
    if (!pasteContent.trim()) {
      alert('Vui lòng dán dữ liệu từ bảng Google Sheet vào ô văn bản trước.');
      return;
    }

    setIsProcessing(true);
    try {
      const lines = pasteContent.trim().split(/\r?\n/);
      if (lines.length === 0) return;

      // Hàng đầu tiên là tiêu đề (tách bởi tab)
      const headers = lines[0].split('\t').map(h => h.trim());
      const rawJsonRows: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split('\t');
        if (cols.length === 0 || cols.every(c => !c.trim())) continue;
        const rowObj: any = {};
        headers.forEach((h, hIdx) => {
          rowObj[h] = cols[hIdx] !== undefined ? cols[hIdx].trim() : '';
        });
        rawJsonRows.push(rowObj);
      }

      processRawRows(rawJsonRows);
    } catch (err: any) {
      alert('Lỗi phân tích dữ liệu dán: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Xác nhận nạp toàn bộ vào hệ thống
  const handleConfirmImport = () => {
    if (previewRows.length === 0) {
      alert('Không có dữ liệu hợp lệ để nạp.');
      return;
    }

    const finalResults: QCResult[] = [];
    const updatedTestsMap = new Map<string, LabTest>();
    tests.forEach(t => updatedTestsMap.set(t.id, { ...t }));

    previewRows.forEach((row, idx) => {
      let t = updatedTestsMap.get(row.testId);

      // Nếu chỉ số chưa tồn tại trong danh mục, tự động tạo mới dựa trên tên từ Google Sheet
      if (!t) {
        const newId = `test_imp_${Date.now()}_${idx}`;
        const newTest: LabTest = {
          id: newId,
          name: row.rawTestName || 'Xét nghiệm mới',
          unit: 'mmol/L',
          tea: 10,
          analyzerName: row.analyzerName || 'Máy Hóa sinh 1',
          configs: {
            [QCLevel.LOW]: { mean: row.level === QCLevel.LOW && row.targetMean ? row.targetMean : 50, sd: row.level === QCLevel.LOW && row.targetSd ? row.targetSd : 5, bias: 2, currentLot: 'LOT-2026' },
            [QCLevel.NORMAL]: { mean: row.level === QCLevel.NORMAL && row.targetMean ? row.targetMean : 100, sd: row.level === QCLevel.NORMAL && row.targetSd ? row.targetSd : 10, bias: 1.5, currentLot: 'LOT-2026' },
            [QCLevel.HIGH]: { mean: row.level === QCLevel.HIGH && row.targetMean ? row.targetMean : 200, sd: row.level === QCLevel.HIGH && row.targetSd ? row.targetSd : 20, bias: 2, currentLot: 'LOT-2026' }
          }
        };
        updatedTestsMap.set(newId, newTest);
        t = newTest;
      } else {
        // Nếu file có Mean / SD tùy biến, có thể đồng bộ cập nhật vào test
        if (row.targetMean > 0 && row.targetSd > 0) {
          t.configs[row.level as QCLevel].mean = row.targetMean;
          t.configs[row.level as QCLevel].sd = row.targetSd;
        }
      }

      const cfg = t.configs[row.level as QCLevel];
      const z = cfg.sd > 0 ? calculateZScore(row.value, cfg.mean, cfg.sd) : 0;

      const itemRes: QCResult = {
        id: `qc_imp_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 4)}`,
        testId: t.id,
        level: row.level,
        value: row.value,
        timestamp: row.timestamp,
        technician: currentTechnician,
        lotNumber: cfg.currentLot || 'LOT-IMPORT',
        zScore: z
      };

      // Đánh giá quy tắc Westgard sơ bộ
      const evaluation = evaluateWestgardResult(itemRes, [], t.configs);
      itemRes.westgardRule = evaluation.rule;
      itemRes.westgardStatus = evaluation.status;

      finalResults.push(itemRes);
    });

    onImportSuccess(finalResults, Array.from(updatedTestsMap.values()));
    onClose();
  };

  const validCount = previewRows.filter(r => r.testId !== 'unknown').length;
  const unknownCount = previewRows.length - validCount;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center text-lg">
              <i className="fas fa-file-import"></i>
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F1F3D]">
                Đồng bộ dữ liệu từ Google Drive (Google Sheets)
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Nạp kết quả các ngày trước từ file Excel hoặc dán trực tiếp từ Google Sheet
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Guide Steps */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 space-y-1.5">
            <span className="font-bold flex items-center gap-1.5 text-xs text-blue-800">
              <i className="fas fa-info-circle text-blue-600"></i> Hướng dẫn tải file từ Google Sheets trên Google Drive:
            </span>
            <p className="text-[11px] leading-relaxed text-blue-800/90">
              Trên tab Google Sheets của bạn: Chọn menu <strong>Tệp (File)</strong> &rarr; <strong>Tải xuống (Download)</strong> &rarr; Chọn <strong>Microsoft Excel (.xlsx)</strong>, sau đó chọn file vừa tải ở mục bên dưới.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 max-w-sm">
            <button
              type="button"
              onClick={() => setActiveMode('file')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'file'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="fas fa-file-excel mr-1.5 text-emerald-600"></i> Chọn File Excel (.xlsx)
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('paste')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeMode === 'paste'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <i className="fas fa-paste mr-1.5 text-blue-600"></i> Dán từ Google Sheet
            </button>
          </div>

          {/* Mode 1: File Upload */}
          {activeMode === 'file' && (
            <div className="space-y-3">
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/20 rounded-2xl p-8 text-center cursor-pointer transition-colors space-y-2"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center text-xl">
                  <i className="fas fa-cloud-upload-alt"></i>
                </div>
                <div>
                  <span className="font-bold text-sm text-[#0F1F3D] block">
                    {fileName ? fileName : 'Bấm vào đây để chọn file Excel (.xlsx) từ máy tính'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Hỗ trợ định dạng .xlsx, .xls xuất từ Google Sheets hoặc Excel
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Mode 2: Paste from Clipboard */}
          {activeMode === 'paste' && (
            <div className="space-y-2.5">
              <label className="font-bold text-slate-600 block">
                Bôi đen các hàng trong Google Sheet (gồm cả hàng tiêu đề) &rarr; Nhấn Ctrl+C &rarr; Nhấp vào đây và nhấn Ctrl+V:
              </label>
              <textarea
                rows={5}
                value={pasteContent}
                onChange={e => setPasteContent(e.target.value)}
                placeholder="Dán dữ liệu Google Sheets vào đây..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-xs outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={handleParsePaste}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer transition-colors"
              >
                <i className="fas fa-play text-[10px] mr-1"></i> Phân tích dữ liệu vừa dán
              </button>
            </div>
          )}

          {/* Preview Table */}
          {previewRows.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#0F1F3D]">
                  Xem trước dữ liệu ({previewRows.length} kết quả):
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {validCount} xét nghiệm khớp chuẩn
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-100 text-[10px] font-bold uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">STT</th>
                      <th className="px-3 py-2">Ngày</th>
                      <th className="px-3 py-2">Xét nghiệm</th>
                      <th className="px-3 py-2">Mức QC</th>
                      <th className="px-3 py-2">Giá trị đo</th>
                      <th className="px-3 py-2">Khớp hệ thống</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRows.slice(0, 50).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-1.5 text-slate-400 font-mono text-[11px]">{r.rawIndex}</td>
                        <td className="px-3 py-1.5 text-slate-600 font-medium">{r.formattedDate}</td>
                        <td className="px-3 py-1.5 font-bold text-[#0F1F3D]">{r.rawTestName}</td>
                        <td className="px-3 py-1.5 font-semibold text-slate-600">{r.level}</td>
                        <td className="px-3 py-1.5 font-black text-blue-600">{r.value}</td>
                        <td className="px-3 py-1.5">
                          {r.testId !== 'unknown' ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                              <i className="fas fa-check-circle text-emerald-500"></i> {r.testObj?.name || r.testId}
                            </span>
                          ) : (
                            <span className="text-amber-700 font-bold flex items-center gap-1 text-[11px]">
                              <i className="fas fa-plus-circle text-amber-500"></i> Tạo mới
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewRows.length > 50 && (
                <p className="text-[10px] text-slate-400 italic text-right">
                  Đang hiển thị trước 50/{previewRows.length} bản ghi...
                </p>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-500 hover:text-slate-800 font-bold text-xs cursor-pointer"
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            disabled={previewRows.length === 0 || isProcessing}
            onClick={handleConfirmImport}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md ${
              previewRows.length > 0 && !isProcessing
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            <i className="fas fa-check-circle"></i>
            <span>Xác nhận nạp {previewRows.length} kết quả vào app</span>
          </button>
        </div>
      </div>
    </div>
  );
};
