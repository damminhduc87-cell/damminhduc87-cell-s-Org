import React, { useState, useEffect } from 'react';
import { LabTest, QCLevel } from '../types';

interface AddEditTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTest: (test: LabTest) => void;
  editingTest?: LabTest | null;
  availableAnalyzers: string[];
  onAddAnalyzer?: (name: string) => void;
}

export const AddEditTestModal: React.FC<AddEditTestModalProps> = ({
  isOpen,
  onClose,
  onSaveTest,
  editingTest,
  availableAnalyzers,
  onAddAnalyzer
}) => {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('mmol/L');
  const [analyzerName, setAnalyzerName] = useState('Máy Hóa sinh 1');
  const [customAnalyzer, setCustomAnalyzer] = useState('');
  const [tea, setTea] = useState('10');

  // Configs cho 3 mức
  const [lowMean, setLowMean] = useState('');
  const [lowSd, setLowSd] = useState('');
  const [lowLot, setLowLot] = useState('LOT-2026-L');

  const [normMean, setNormMean] = useState('');
  const [normSd, setNormSd] = useState('');
  const [normLot, setNormLot] = useState('LOT-2026-N');

  const [highMean, setHighMean] = useState('');
  const [highSd, setHighSd] = useState('');
  const [highLot, setHighLot] = useState('LOT-2026-H');

  useEffect(() => {
    if (editingTest) {
      setName(editingTest.name);
      setUnit(editingTest.unit);
      setAnalyzerName(editingTest.analyzerName || 'Máy Hóa sinh 1');
      setTea(String(editingTest.tea));

      const l = editingTest.configs[QCLevel.LOW];
      setLowMean(String(l.mean));
      setLowSd(String(l.sd));
      setLowLot(l.currentLot || 'LOT-2026-L');

      const n = editingTest.configs[QCLevel.NORMAL];
      setNormMean(String(n.mean));
      setNormSd(String(n.sd));
      setNormLot(n.currentLot || 'LOT-2026-N');

      const h = editingTest.configs[QCLevel.HIGH];
      setHighMean(String(h.mean));
      setHighSd(String(h.sd));
      setHighLot(h.currentLot || 'LOT-2026-H');
    } else {
      setName('');
      setUnit('mmol/L');
      setAnalyzerName(availableAnalyzers[0] || 'Máy Hóa sinh 1');
      setTea('10');
      setLowMean(''); setLowSd(''); setLowLot('LOT-2026-L');
      setNormMean(''); setNormSd(''); setNormLot('LOT-2026-N');
      setHighMean(''); setHighSd(''); setHighLot('LOT-2026-H');
    }
  }, [editingTest, isOpen, availableAnalyzers]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Vui lòng nhập tên xét nghiệm.');
    if (!unit.trim()) return alert('Vui lòng nhập đơn vị xét nghiệm.');

    const teaVal = parseFloat(tea) || 10;
    const finalAnalyzer = customAnalyzer.trim() ? customAnalyzer.trim() : analyzerName;

    if (customAnalyzer.trim() && onAddAnalyzer) {
      onAddAnalyzer(customAnalyzer.trim());
    }

    const testId = editingTest ? editingTest.id : `test_${Date.now()}_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    const savedTest: LabTest = {
      id: testId,
      name: name.trim(),
      unit: unit.trim(),
      tea: teaVal,
      analyzerName: finalAnalyzer,
      configs: {
        [QCLevel.LOW]: {
          mean: parseFloat(lowMean) || 0,
          sd: parseFloat(lowSd) || 0,
          bias: 2.0,
          currentLot: lowLot.trim()
        },
        [QCLevel.NORMAL]: {
          mean: parseFloat(normMean) || 0,
          sd: parseFloat(normSd) || 0,
          bias: 1.5,
          currentLot: normLot.trim()
        },
        [QCLevel.HIGH]: {
          mean: parseFloat(highMean) || 0,
          sd: parseFloat(highSd) || 0,
          bias: 2.0,
          currentLot: highLot.trim()
        }
      }
    };

    onSaveTest(savedTest);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-6 md:p-10 max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl shadow-lg shadow-blue-500/30">
              <i className={`fas ${editingTest ? 'fa-edit' : 'fa-plus-circle'}`}></i>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                {editingTest ? 'CHỈNH SỬA XÉT NGHIỆM' : 'THÊM XÉT NGHIỆM MỚI'}
              </h3>
              <p className="text-xs text-slate-400 font-bold">
                Cấu hình thông số kỹ thuật, Máy phân tích và Giá trị Mean / SD
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-6 pt-6 text-xs">
          {/* Hàng 1: Tên xét nghiệm & Đơn vị */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="font-bold text-slate-500 block mb-1 uppercase text-[10px]">Tên xét nghiệm *</label>
              <input
                type="text"
                placeholder="VD: Bilirubin toàn phần, HbA1c, Canxi..."
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm"
                required
              />
            </div>
            <div>
              <label className="font-bold text-slate-500 block mb-1 uppercase text-[10px]">Đơn vị đo *</label>
              <input
                type="text"
                placeholder="mmol/L, µmol/L, U/L..."
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm"
                required
              />
            </div>
          </div>

          {/* Hàng 2: Máy phân tích (Tự do kê loại máy) & TEa CLIA 2024 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-blue-50/60 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900">
            <div className="sm:col-span-2 space-y-2">
              <label className="font-black text-blue-900 dark:text-blue-200 block uppercase text-[10px]">
                <i className="fas fa-microchip mr-1"></i> Máy phân tích (Tự chọn hoặc gõ máy mới)
              </label>
              <div className="flex gap-2">
                <select
                  value={analyzerName}
                  onChange={e => {
                    setAnalyzerName(e.target.value);
                    if (e.target.value !== 'custom') setCustomAnalyzer('');
                  }}
                  className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-xs cursor-pointer flex-1"
                >
                  {availableAnalyzers.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                  <option value="custom">+ Thêm máy phân tích khác...</option>
                </select>

                {analyzerName === 'custom' && (
                  <input
                    type="text"
                    placeholder="Gõ tên máy (VD: Mindray BS-480, Olympus AU480...)"
                    value={customAnalyzer}
                    onChange={e => setCustomAnalyzer(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-blue-400 font-bold text-xs"
                    autoFocus
                  />
                )}
              </div>
            </div>

            <div>
              <label className="font-black text-blue-900 dark:text-blue-200 block uppercase text-[10px] mb-2">
                TEa Cho phép (%) (CLIA)
              </label>
              <input
                type="number"
                step="0.1"
                placeholder="VD: 8, 10, 15..."
                value={tea}
                onChange={e => setTea(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-black text-blue-600"
              />
            </div>
          </div>

          {/* Hàng 3: Cấu hình 3 mức (Low, Normal, High) */}
          <div className="space-y-3">
            <h4 className="font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider text-xs flex items-center gap-2">
              <i className="fas fa-sliders-h text-blue-500"></i> Cấu hình Thông số Nội kiểm (Mean & SD từng mức)
            </h4>

            {/* Mức Thấp */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="font-black text-blue-600 uppercase text-[11px] block">Mức 1: Thấp (Low)</span>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block font-bold">Mean Target *</label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="VD: 3.5"
                    value={lowMean}
                    onChange={e => setLowMean(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 p-2 rounded-xl border font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block font-bold">SD Mục tiêu *</label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="VD: 0.12"
                    value={lowSd}
                    onChange={e => setLowSd(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 p-2 rounded-xl border font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block font-bold">Số Lô (Lot Number)</label>
                  <input
                    type="text"
                    value={lowLot}
                    onChange={e => setLowLot(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 p-2 rounded-xl border font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Mức Bình thường */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="font-black text-indigo-600 uppercase text-[11px] block">Mức 2: Bình thường (Normal)</span>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block font-bold">Mean Target *</label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="VD: 5.6"
                    value={normMean}
                    onChange={e => setNormMean(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 p-2 rounded-xl border font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block font-bold">SD Mục tiêu *</label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="VD: 0.14"
                    value={normSd}
                    onChange={e => setNormSd(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 p-2 rounded-xl border font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block font-bold">Số Lô (Lot Number)</label>
                  <input
                    type="text"
                    value={normLot}
                    onChange={e => setNormLot(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 p-2 rounded-xl border font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Mức Cao */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <span className="font-black text-purple-600 uppercase text-[11px] block">Mức 3: Cao (High)</span>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 block font-bold">Mean Target *</label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="VD: 15.2"
                    value={highMean}
                    onChange={e => setHighMean(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 p-2 rounded-xl border font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block font-bold">SD Mục tiêu *</label>
                  <input
                    type="number"
                    step="0.001"
                    placeholder="VD: 0.45"
                    value={highSd}
                    onChange={e => setHighSd(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 p-2 rounded-xl border font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block font-bold">Số Lô (Lot Number)</label>
                  <input
                    type="text"
                    value={highLot}
                    onChange={e => setHighLot(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 p-2 rounded-xl border font-bold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 text-slate-400 hover:text-slate-600 text-xs font-bold uppercase cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-blue-200 uppercase tracking-wider cursor-pointer transition-all"
            >
              {editingTest ? 'LƯU CẬP NHẬT' : 'TẠO XÉT NGHIỆM MỚI'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
