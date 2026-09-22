import React from 'react';
import { LabTest, QCLevel, QCConfig } from '../types';

interface HeaderFilterBarProps {
  tests: LabTest[];
  selectedTestId: string;
  onSelectTest: (testId: string) => void;
  selectedLevel: QCLevel;
  onSelectLevel: (level: QCLevel) => void;
  selectedAnalyzer: string;
  onSelectAnalyzer: (analyzer: string) => void;
  analyzers: string[];
  activeTest: LabTest;
  activeLevelConfig: QCConfig;
  onOpenLotModal: () => void;
  timeRange: string;
  onChangeTimeRange: (range: string) => void;
}

export const HeaderFilterBar: React.FC<HeaderFilterBarProps> = ({
  tests,
  selectedTestId,
  onSelectTest,
  selectedLevel,
  onSelectLevel,
  selectedAnalyzer,
  onSelectAnalyzer,
  analyzers,
  activeTest,
  activeLevelConfig,
  onOpenLotModal,
  timeRange,
  onChangeTimeRange
}) => {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-xs transition-all">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-lg font-bold text-[#0F1F3D] tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            Giám sát chất lượng nội kiểm
          </h3>
          <p className="text-xs text-slate-500 font-normal mt-0.5">
            Theo dõi xu hướng và phát hiện sai lệch quy tắc Westgard theo thời gian thực
          </p>
        </div>

        {/* Machine & TEa summary tags */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5">
            <i className="fas fa-microchip text-blue-600 text-[11px]"></i>
            {activeTest?.analyzerName || 'Máy Hóa sinh'}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
            TEa CLIA: {activeTest?.tea}%
          </span>
        </div>
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-4 items-center">
        {/* 1. Test Selector */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Xét nghiệm ({tests.length})
          </label>
          <div className="relative">
            <select
              value={selectedTestId}
              onChange={e => onSelectTest(e.target.value)}
              className="w-full appearance-none bg-slate-50 hover:bg-slate-100/80 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3 py-2 text-xs font-bold text-[#0F1F3D] outline-none cursor-pointer pr-8 transition-colors truncate"
            >
              {tests.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.unit})
                </option>
              ))}
            </select>
            <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
          </div>
        </div>

        {/* 2. Level Segmented Control */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Mức nồng độ (QC Level)
          </label>
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            {[
              { id: QCLevel.LOW, label: 'Thấp (Low)' },
              { id: QCLevel.NORMAL, label: 'Chuẩn (Normal)' },
              { id: QCLevel.HIGH, label: 'Cao (High)' }
            ].map(lvl => {
              const isSelected = selectedLevel === lvl.id;
              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => onSelectLevel(lvl.id)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer truncate ${
                    isSelected
                      ? 'bg-white text-blue-600 shadow-xs border border-slate-200/60'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {lvl.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Analyzer Machine Filter */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Máy phân tích
          </label>
          <div className="relative">
            <select
              value={selectedAnalyzer}
              onChange={e => onSelectAnalyzer(e.target.value)}
              className="w-full appearance-none bg-slate-50 hover:bg-slate-100/80 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3 py-2 text-xs font-semibold text-[#0F1F3D] outline-none cursor-pointer pr-8 transition-colors truncate"
            >
              <option value="all">Tất cả máy ({analyzers.length})</option>
              {analyzers.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
          </div>
        </div>

        {/* 4. Lot Number Chip with Modal Trigger */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Số Lô (Lot QC)
          </label>
          <button
            type="button"
            onClick={onOpenLotModal}
            className="w-full flex items-center justify-between px-3 py-2 bg-indigo-50/70 hover:bg-indigo-100 border border-indigo-200/80 rounded-xl text-xs font-bold text-indigo-800 transition-colors cursor-pointer"
            title="Nhấn để xem thông tin hạn dùng và quản lý Lô QC"
          >
            <span className="truncate flex items-center gap-1.5">
              <i className="fas fa-boxes text-indigo-500 text-[11px]"></i>
              {activeLevelConfig.currentLot || 'Chưa gán lô'}
            </span>
            <span className="text-[10px] text-indigo-600 underline shrink-0 ml-1">Đổi Lô</span>
          </button>
        </div>

        {/* 5. Time Range */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Khoảng thời gian
          </label>
          <div className="relative">
            <select
              value={timeRange}
              onChange={e => onChangeTimeRange(e.target.value)}
              className="w-full appearance-none bg-slate-50 hover:bg-slate-100/80 border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl px-3 py-2 text-xs font-semibold text-[#0F1F3D] outline-none cursor-pointer pr-8 transition-colors"
            >
              <option value="all">Tất cả dữ liệu</option>
              <option value="30">30 ngày gần nhất</option>
              <option value="7">7 ngày gần nhất</option>
            </select>
            <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
          </div>
        </div>
      </div>
    </div>
  );
};
