import React, { useState } from 'react';
import { LabTest, QCLevel, QCLot } from '../types';

interface LotManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  test: LabTest;
  onUpdateTestLots: (updatedTest: LabTest) => void;
}

export const LotManagementModal: React.FC<LotManagementModalProps> = ({
  isOpen,
  onClose,
  test,
  onUpdateTestLots
}) => {
  const [selectedLevel, setSelectedLevel] = useState<QCLevel>(QCLevel.NORMAL);
  const [lots, setLots] = useState<QCLot[]>(test.lots || [
    {
      id: 'lot-1',
      testId: test.id,
      level: QCLevel.LOW,
      lotNumber: 'LOT-2026-L1',
      expirationDate: '2026-12-31',
      openDate: '2026-09-01',
      manufacturer: 'Bio-Rad Liquichek',
      mean: test.configs[QCLevel.LOW].mean,
      sd: test.configs[QCLevel.LOW].sd,
      unit: test.unit,
      isActive: true
    },
    {
      id: 'lot-2',
      testId: test.id,
      level: QCLevel.NORMAL,
      lotNumber: 'LOT-2026-N1',
      expirationDate: '2026-12-31',
      openDate: '2026-09-01',
      manufacturer: 'Bio-Rad Liquichek',
      mean: test.configs[QCLevel.NORMAL].mean,
      sd: test.configs[QCLevel.NORMAL].sd,
      unit: test.unit,
      isActive: true
    },
    {
      id: 'lot-3',
      testId: test.id,
      level: QCLevel.HIGH,
      lotNumber: 'LOT-2026-H1',
      expirationDate: '2026-12-31',
      openDate: '2026-09-01',
      manufacturer: 'Bio-Rad Liquichek',
      mean: test.configs[QCLevel.HIGH].mean,
      sd: test.configs[QCLevel.HIGH].sd,
      unit: test.unit,
      isActive: true
    }
  ]);

  // Form thêm lô mới
  const [newLotNum, setNewLotNum] = useState('');
  const [newExpDate, setNewExpDate] = useState('');
  const [newOpenDate, setNewOpenDate] = useState(new Date().toISOString().split('T')[0]);
  const [newManufacturer, setNewManufacturer] = useState('Bio-Rad / Roche');
  const [newMean, setNewMean] = useState(String(test.configs[selectedLevel].mean));
  const [newSd, setNewSd] = useState(String(test.configs[selectedLevel].sd));

  if (!isOpen) return null;

  const currentLevelLots = lots.filter(l => l.level === selectedLevel);

  const handleAddLot = () => {
    if (!newLotNum.trim()) return alert('Vui lòng nhập số Lô chứng (Lot Number).');
    const meanVal = parseFloat(newMean);
    const sdVal = parseFloat(newSd);
    if (isNaN(meanVal) || isNaN(sdVal) || sdVal <= 0) return alert('Vui lòng nhập Mean và SD hợp lệ (> 0).');

    const newLot: QCLot = {
      id: `lot_${Date.now()}`,
      testId: test.id,
      level: selectedLevel,
      lotNumber: newLotNum.trim().toUpperCase(),
      expirationDate: newExpDate || '2026-12-31',
      openDate: newOpenDate,
      manufacturer: newManufacturer,
      mean: meanVal,
      sd: sdVal,
      unit: test.unit,
      isActive: true
    };

    // Deactivate previous active lots of this level
    const updatedLots = lots.map(l => l.level === selectedLevel ? { ...l, isActive: false } : l);
    updatedLots.push(newLot);
    setLots(updatedLots);

    // Update test configs with new active lot mean/sd
    const updatedConfigs = {
      ...test.configs,
      [selectedLevel]: {
        ...test.configs[selectedLevel],
        mean: meanVal,
        sd: sdVal,
        currentLot: newLot.lotNumber
      }
    };

    onUpdateTestLots({
      ...test,
      configs: updatedConfigs,
      lots: updatedLots
    });

    setNewLotNum('');
    alert(`Đã thêm và kích hoạt Lô ${newLot.lotNumber} thành công!`);
  };

  const handleActivateLot = (lotId: string) => {
    const targetLot = lots.find(l => l.id === lotId);
    if (!targetLot) return;

    const updatedLots = lots.map(l => {
      if (l.level === targetLot.level) {
        return { ...l, isActive: l.id === lotId };
      }
      return l;
    });

    setLots(updatedLots);

    const updatedConfigs = {
      ...test.configs,
      [targetLot.level]: {
        ...test.configs[targetLot.level],
        mean: targetLot.mean,
        sd: targetLot.sd,
        currentLot: targetLot.lotNumber
      }
    };

    onUpdateTestLots({
      ...test,
      configs: updatedConfigs,
      lots: updatedLots
    });
  };

  const isExpired = (expDate: string) => {
    if (!expDate) return false;
    return new Date(expDate).getTime() < Date.now();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative bg-white dark:bg-slate-900 w-full max-w-3xl rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-6 md:p-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-xl shadow-inner">
              <i className="fas fa-boxes"></i>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">QUẢN LÝ LÔ CHỨNG (LOT QC)</h3>
              <p className="text-xs text-slate-400 font-bold">Xét nghiệm: {test.name} ({test.unit}) - Chuẩn QĐ 2429</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 flex items-center justify-center cursor-pointer">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Level Switcher */}
        <div className="flex gap-2 my-6">
          {Object.values(QCLevel).map(lvl => (
            <button
              key={lvl}
              onClick={() => {
                setSelectedLevel(lvl);
                setNewMean(String(test.configs[lvl].mean));
                setNewSd(String(test.configs[lvl].sd));
              }}
              className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase transition-all cursor-pointer ${
                selectedLevel === lvl ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
              }`}
            >
              Mức {lvl}
            </button>
          ))}
        </div>

        {/* Danh sách các Lô của Mức đã chọn */}
        <div className="space-y-4 mb-8">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <i className="fas fa-list-ul"></i> Lịch sử Lô chứng Mức {selectedLevel}
          </h4>
          
          <div className="space-y-3">
            {currentLevelLots.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-4 text-center">Chưa có lô chứng nào được cấu hình cho mức này.</p>
            ) : (
              currentLevelLots.map(lot => {
                const expired = isExpired(lot.expirationDate);
                return (
                  <div
                    key={lot.id}
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                      lot.isActive 
                        ? 'bg-indigo-50/70 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800' 
                        : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-75'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <strong className="text-sm font-black text-slate-900 dark:text-white">{lot.lotNumber}</strong>
                        {lot.isActive && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-700 uppercase">
                            Đang áp dụng
                          </span>
                        )}
                        {expired && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700 uppercase">
                            Đã hết hạn
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        <span>Hãng: {lot.manufacturer || 'Bio-Rad'}</span>
                        <span>Hạn dùng: {lot.expirationDate}</span>
                        <span>Mở nắp: {lot.openDate || '---'}</span>
                        <span>Mean = <strong>{lot.mean}</strong>, SD = <strong>{lot.sd}</strong></span>
                      </div>
                    </div>

                    {!lot.isActive && (
                      <button
                        type="button"
                        onClick={() => handleActivateLot(lot.id)}
                        className="px-4 py-2 bg-white dark:bg-slate-900 hover:bg-indigo-600 hover:text-white border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0"
                      >
                        Kích hoạt Lô này
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Form Khai Báo Lô Mới */}
        <div className="p-6 bg-slate-50 dark:bg-slate-800/80 rounded-3xl border border-slate-200 dark:border-slate-700 space-y-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <i className="fas fa-plus-circle text-indigo-500"></i> Khai báo Lô chứng Mới (Đổi Lot)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-500 block mb-1 uppercase text-[10px]">Số Lô (Lot Number) *</label>
              <input
                type="text"
                placeholder="VD: LOT-2026-X02"
                value={newLotNum}
                onChange={e => setNewLotNum(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-300 dark:border-slate-600 font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-500 block mb-1 uppercase text-[10px]">Hãng sản xuất</label>
              <input
                type="text"
                value={newManufacturer}
                onChange={e => setNewManufacturer(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-300 dark:border-slate-600 font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-500 block mb-1 uppercase text-[10px]">Hạn sử dụng lọ (Exp Date)</label>
              <input
                type="date"
                value={newExpDate}
                onChange={e => setNewExpDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-300 dark:border-slate-600 font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-500 block mb-1 uppercase text-[10px]">Ngày mở nắp lọ (Open Date)</label>
              <input
                type="date"
                value={newOpenDate}
                onChange={e => setNewOpenDate(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-300 dark:border-slate-600 font-bold"
              />
            </div>
            <div>
              <label className="font-bold text-slate-500 block mb-1 uppercase text-[10px]">Mean mục tiêu của Lô mới *</label>
              <input
                type="number"
                step="0.01"
                value={newMean}
                onChange={e => setNewMean(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-300 dark:border-slate-600 font-bold text-indigo-600"
              />
            </div>
            <div>
              <label className="font-bold text-slate-500 block mb-1 uppercase text-[10px]">SD mục tiêu của Lô mới *</label>
              <input
                type="number"
                step="0.01"
                value={newSd}
                onChange={e => setNewSd(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-300 dark:border-slate-600 font-bold text-indigo-600"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddLot}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-indigo-200 uppercase tracking-wider transition-all cursor-pointer"
          >
            Lưu và Kích hoạt Lô Mới
          </button>
        </div>
      </div>
    </div>
  );
};
