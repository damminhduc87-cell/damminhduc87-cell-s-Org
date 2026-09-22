import React from 'react';
import { LabTest, QCConfig } from '../types';

interface SigmaAnalysisProps {
  test: LabTest;
  config: QCConfig;
}

export const SigmaAnalysis: React.FC<SigmaAnalysisProps> = ({ test, config }) => {
  const { mean, sd, bias, eqaTarget, eqaResult } = config;

  // Tính Bias% thực tế từ Ngoại kiểm EQA (nếu có)
  const actualBias = (eqaTarget && eqaResult && eqaTarget > 0)
    ? Number(((Math.abs(eqaResult - eqaTarget) / eqaTarget) * 100).toFixed(2))
    : bias;

  const cv = mean > 0 ? Number(((sd / mean) * 100).toFixed(2)) : 0;
  const tea = test.tea;

  // TE Actual = |Bias%| + 2*CV%
  const teActual = Number((Math.abs(actualBias) + 2 * cv).toFixed(2));

  // Sigma = (TEa - |Bias%|) / CV%
  const sigma = cv > 0 ? Number(((tea - Math.abs(actualBias)) / cv).toFixed(2)) : 0;

  const getStatus = (s: number) => {
    if (s >= 6) return { label: 'Đẳng cấp Thế giới (≥6σ)', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/50', border: 'border-emerald-200 dark:border-emerald-800', advice: 'Máy vận hành cực kỳ ổn định. Phòng xét nghiệm có thể tối ưu giảm tần suất chạy QC.' };
    if (s >= 5) return { label: 'Xuất sắc (5-6σ)', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/50', border: 'border-blue-200 dark:border-blue-800', advice: 'Quy trình kiểm soát chất lượng đạt chuẩn cao. Duy trì lịch bảo dưỡng định kỳ.' };
    if (s >= 4) return { label: 'Khá (4-5σ)', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/50', border: 'border-indigo-200 dark:border-indigo-800', advice: 'Mức chất lượng tốt, máy vận hành ổn định. Áp dụng quy tắc Westgard chuẩn.' };
    if (s >= 3) return { label: 'Trung bình (3-4σ)', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/50', border: 'border-amber-200 dark:border-amber-800', advice: 'Cần giám sát chặt chẽ đa quy tắc Westgard (1-3s, 2-2s, R-4s). Cân nhắc hiệu chuẩn lại máy.' };
    return { label: 'Không đạt (<3σ)', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/50', border: 'border-red-200 dark:border-red-800', advice: 'Sai số thực tế quá lớn (vượt ngưỡng TEa). Cần dừng xét nghiệm, bảo trì linh kiện hoặc đổi lô thuốc thử ngay lập tức.' };
  };

  const status = getStatus(sigma);

  return (
    <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 flex flex-col gap-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <h3 className="font-black text-slate-800 dark:text-white text-xs tracking-widest uppercase flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
            <i className="fas fa-microchip text-xs"></i>
          </div>
          Đánh giá Six Sigma & Tổng Sai Số Cho Phép (CLIA 2024)
        </h3>
        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border ${status.bg} ${status.color} ${status.border}`}>
          {status.label}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">TEa Cho Phép (CLIA)</p>
          <p className="text-xl font-black text-slate-800 dark:text-white">{tea}%</p>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Bias (%) {eqaTarget ? '(Từ EQA)' : '(Cố định)'}
          </p>
          <p className="text-xl font-black text-slate-800 dark:text-white">{actualBias}%</p>
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">TE Thực tế (|Bias| + 2*CV)</p>
          <p className={`text-xl font-black ${teActual > tea ? 'text-red-600' : 'text-slate-800 dark:text-white'}`}>
            {teActual}% {teActual > tea && <span className="text-xs text-red-500 font-bold block">(Vượt TEa!)</span>}
          </p>
        </div>
        <div className={`p-4 rounded-2xl flex flex-col justify-center border ${status.bg} ${status.border}`}>
          <p className={`text-[9px] font-black uppercase tracking-widest mb-1 ${status.color}`}>Chỉ số Six Sigma</p>
          <p className={`text-3xl font-black ${status.color}`}>{sigma}</p>
        </div>
      </div>

      <div className={`p-5 rounded-2xl border-l-4 ${status.bg} border-l-current border-y border-r ${status.border} space-y-1.5`}>
        <p className={`text-xs font-bold leading-relaxed ${status.color}`}>
          <i className="fas fa-lightbulb mr-2"></i>
          {status.advice}
        </p>
        <p className="text-[10px] text-slate-400 italic">
          Công thức chuẩn quốc tế: Sigma = (TEa - |Bias%|) / CV% | TE_actual = |Bias%| + 2*CV%
        </p>
      </div>
    </div>
  );
};
