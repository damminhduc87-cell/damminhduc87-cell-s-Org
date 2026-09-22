import React from 'react';
import { QCResult, LabTest } from '../types';

interface HeroStatusCardProps {
  latestResult: QCResult | null;
  activeTest: LabTest;
  onOpenCapa: (result: QCResult) => void;
  onNewEntry: () => void;
}

export const HeroStatusCard: React.FC<HeroStatusCardProps> = ({
  latestResult,
  activeTest,
  onOpenCapa,
  onNewEntry
}) => {
  if (!latestResult) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-[#CBD5E1] p-6 text-center text-slate-500">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-2">
          <i className="fas fa-inbox text-lg"></i>
        </div>
        <h4 className="text-sm font-bold text-slate-700">Chưa có kết quả nội kiểm nào</h4>
        <p className="text-xs text-slate-400 mt-0.5">Nhập kết quả đầu ngày để hệ thống tự động đánh giá Westgard</p>
        <button
          type="button"
          onClick={onNewEntry}
          className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-2 shadow-xs"
        >
          <i className="fas fa-plus"></i> Nhập kết quả ngay
        </button>
      </div>
    );
  }

  const isViolation = latestResult.westgardStatus === 'violation';
  const isWarning = latestResult.westgardStatus === 'warning';

  const theme = isViolation
    ? {
        bg: 'bg-red-50/70 border-red-200',
        badgeBg: 'bg-red-600 text-white',
        badgeText: `VI PHẠM QUY TẮC ${latestResult.westgardRule || '1-3s'}`,
        iconBg: 'bg-red-500 text-white ring-4 ring-red-100',
        icon: 'fa-exclamation-circle',
        titleColor: 'text-red-900',
        subColor: 'text-red-700',
        zColor: 'text-red-600'
      }
    : isWarning
    ? {
        bg: 'bg-amber-50/70 border-amber-200',
        badgeBg: 'bg-amber-500 text-white',
        badgeText: 'CẢNH BÁO 1-2s (WARNING)',
        iconBg: 'bg-amber-500 text-white ring-4 ring-amber-100',
        icon: 'fa-exclamation-triangle',
        titleColor: 'text-amber-900',
        subColor: 'text-amber-700',
        zColor: 'text-amber-600'
      }
    : {
        bg: 'bg-emerald-50/60 border-emerald-200',
        badgeBg: 'bg-emerald-600 text-white',
        badgeText: 'HỢP LỆ (IN-CONTROL)',
        iconBg: 'bg-emerald-500 text-white ring-4 ring-emerald-100',
        icon: 'fa-check',
        titleColor: 'text-emerald-950',
        subColor: 'text-emerald-800',
        zColor: 'text-emerald-600'
      };

  const formattedDate = new Date(latestResult.timestamp).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <div className={`rounded-2xl border p-5 sm:p-6 transition-all ${theme.bg}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        {/* Left icon & description */}
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg shrink-0 ${theme.iconBg}`}>
            <i className={`fas ${theme.icon}`}></i>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${theme.badgeBg}`}>
                {theme.badgeText}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Lần đo gần nhất: <strong className="text-slate-700">{formattedDate}</strong>
              </span>
            </div>

            <p className={`text-sm font-bold ${theme.titleColor}`}>
              Giá trị đo: <span className="text-base font-black">{latestResult.value} {activeTest.unit}</span>
              <span className="mx-2 text-slate-300">|</span>
              Z-score: <span className={`text-base font-black ${theme.zColor}`}>{latestResult.zScore > 0 ? '+' : ''}{latestResult.zScore} SD</span>
            </p>

            <p className={`text-xs ${theme.subColor} leading-relaxed`}>
              {latestResult.comment || 'Hệ thống tự động phân tích và đối chiếu chuỗi thời gian liên hoàn theo thuật toán Westgard.'}
            </p>
          </div>
        </div>

        {/* Right CTA Actions */}
        <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
          {isViolation && (
            <button
              type="button"
              onClick={() => onOpenCapa(latestResult)}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-red-500/20 flex items-center gap-2 cursor-pointer transition-all animate-pulse"
            >
              <i className="fas fa-file-medical-alt"></i> MỞ BIÊN BẢN CAPA
            </button>
          )}

          {isWarning && (
            <button
              type="button"
              onClick={() => onOpenCapa(latestResult)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer transition-all"
            >
              <i className="fas fa-clipboard-list"></i> Ghi nhận theo dõi
            </button>
          )}

          <button
            type="button"
            onClick={onNewEntry}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <i className="fas fa-plus text-blue-600 text-xs"></i>
            <span>Nhập kết quả mới</span>
          </button>
        </div>
      </div>
    </div>
  );
};
