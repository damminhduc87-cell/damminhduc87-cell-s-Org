import React, { useState } from 'react';
import { LabTest, QCConfig } from '../types';

interface SigmaAnalysisProps {
  test: LabTest;
  config: QCConfig;
  onOpenCapa?: () => void;
  onConsultAdvisor?: () => void;
}

export const SigmaAnalysis: React.FC<SigmaAnalysisProps> = ({
  test,
  config,
  onOpenCapa,
  onConsultAdvisor
}) => {
  const { mean, sd, bias, eqaTarget, eqaResult } = config;
  const [showFormula, setShowFormula] = useState(false);

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
    if (s >= 6) {
      return {
        label: 'Đẳng cấp Thế giới (≥6σ)',
        color: 'text-emerald-700',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        ringColor: '#10B981',
        isPassed: true,
        advice: 'Máy vận hành cực kỳ ổn định. Phòng xét nghiệm có thể tối ưu giảm tần suất chạy QC theo ISO 15189.'
      };
    }
    if (s >= 5) {
      return {
        label: 'Xuất sắc (5-6σ)',
        color: 'text-blue-700',
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        ringColor: '#2563EB',
        isPassed: true,
        advice: 'Quy trình kiểm soát chất lượng đạt chuẩn cao. Duy trì lịch bảo dưỡng định kỳ và theo dõi hóa chất.'
      };
    }
    if (s >= 4) {
      return {
        label: 'Khá (4-5σ)',
        color: 'text-indigo-700',
        bg: 'bg-indigo-50',
        border: 'border-indigo-200',
        ringColor: '#4F46E5',
        isPassed: true,
        advice: 'Mức chất lượng tốt, máy vận hành ổn định. Áp dụng quy tắc Westgard chuẩn (1-3s, 2-2s).'
      };
    }
    if (s >= 3) {
      return {
        label: 'Trung bình (3-4σ)',
        color: 'text-amber-700',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        ringColor: '#F59E0B',
        isPassed: false,
        advice: 'Cần giám sát chặt chẽ đa quy tắc Westgard (1-3s, 2-2s, R-4s, 4-1s). Cân nhắc hiệu chuẩn lại máy nếu CV% tiếp tục tăng.'
      };
    }
    return {
      label: 'Không đạt (<3σ)',
      color: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-200',
      ringColor: '#EF4444',
      isPassed: false,
      advice: 'Sai số thực tế đang vượt ngưỡng đánh giá. Khuyến nghị kiểm tra hệ thống, bảo trì hoặc xem xét đổi lô thuốc thử.'
    };
  };

  const status = getStatus(sigma);

  // Tính tỷ lệ vòng tròn tiến độ (tối đa 6 Sigma = 100%)
  const percentage = Math.min(100, Math.max(0, (sigma / 6) * 100));
  const strokeDashoffset = 251.2 - (251.2 * percentage) / 100;

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-xs transition-all space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
            <i className="fas fa-microchip text-sm"></i>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-[#0F1F3D]">
                Đánh giá Six Sigma & Tổng sai số cho phép
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                CLIA 2024
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Phân tích năng lực phương pháp và độ tin cậy kết quả xét nghiệm
            </p>
          </div>
        </div>

        <span className={`px-3 py-1 rounded-full text-xs font-bold border self-start sm:self-center ${status.bg} ${status.color} ${status.border}`}>
          {status.label}
        </span>
      </div>

      {/* Main Section: Gauge Left + 3 Metrics Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Left: Gauge Circle */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background track */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="#E2E8F0"
                strokeWidth="8"
              />
              {/* Animated Progress ring */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke={status.ringColor}
                strokeWidth="8"
                strokeDasharray="251.2"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Center Value */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-[#0F1F3D] leading-none">
                {sigma}σ
              </span>
              <span className="text-[10px] font-bold uppercase text-slate-400 mt-1">
                Six Sigma
              </span>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-600 mt-2">
            Mục tiêu chất lượng: &ge; 4.0σ
          </span>
        </div>

        {/* Right: 3 Metric Boxes */}
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              TEa Cho Phép (CLIA)
            </span>
            <div className="text-xl font-black text-[#0F1F3D]">
              {tea}%
            </div>
            <span className="text-[11px] text-slate-500 font-medium block">
              Ngưỡng sai số tối đa
            </span>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Độ Chệch Bias (%)
            </span>
            <div className="text-xl font-black text-[#0F1F3D]">
              {actualBias}%
            </div>
            <span className="text-[11px] text-slate-500 font-medium block">
              {eqaTarget ? 'Tính từ Ngoại kiểm EQA' : 'Cố định từ NSX'}
            </span>
          </div>

          <div className={`p-4 rounded-xl border space-y-1 ${
            teActual > tea ? 'bg-red-50/60 border-red-200' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              TE Thực Tế (|Bias| + 2*CV)
            </span>
            <div className={`text-xl font-black ${teActual > tea ? 'text-red-600' : 'text-[#0F1F3D]'}`}>
              {teActual}%
            </div>
            <span className={`text-[11px] font-semibold block ${teActual > tea ? 'text-red-600' : 'text-slate-500'}`}>
              {teActual > tea ? '⚠️ Vượt ngưỡng TEa' : 'Trong giới hạn an toàn'}
            </span>
          </div>
        </div>
      </div>

      {/* Callout Message */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${status.bg} ${status.border}`}>
        <div className="flex items-start gap-3">
          <i className={`fas ${status.isPassed ? 'fa-info-circle' : 'fa-exclamation-triangle'} text-sm mt-0.5 ${status.color}`}></i>
          <div>
            <p className={`text-xs font-bold leading-relaxed ${status.color}`}>
              {status.advice}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Đánh giá dựa trên độ lệch thực tế (Bias) và độ lặp lại ngắn hạn (CV%).
            </p>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {onConsultAdvisor && (
            <button
              type="button"
              onClick={onConsultAdvisor}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              <i className="fas fa-robot text-blue-600 mr-1.5"></i> Xem hướng dẫn xử lý
            </button>
          )}

          {!status.isPassed && onOpenCapa && (
            <button
              type="button"
              onClick={onOpenCapa}
              className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
            >
              <i className="fas fa-file-medical mr-1.5"></i> Lập biên bản CAPA
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Accordion for Formula */}
      <div className="border-t border-slate-100 pt-2">
        <button
          type="button"
          onClick={() => setShowFormula(!showFormula)}
          className="text-[11px] font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <i className={`fas ${showFormula ? 'fa-chevron-up' : 'fa-chevron-down'} text-[10px]`}></i>
          <span>{showFormula ? 'Ẩn công thức tính toán Six Sigma' : 'Xem công thức tính toán chuẩn quốc tế'}</span>
        </button>

        {showFormula && (
          <div className="mt-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1.5 animate-in fade-in duration-200">
            <p>
              • <strong>Chỉ số Six Sigma:</strong> <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">Sigma = (TEa - |Bias%|) / CV%</code>
            </p>
            <p>
              • <strong>Tổng sai số thực tế (TE_actual):</strong> <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">TE = |Bias%| + 2 × CV%</code>
            </p>
            <p className="text-[11px] text-slate-400">
              * Quy ước theo CLIA 2024 / Westgard QC: Năng lực phương pháp &ge; 6σ là Đẳng cấp Thế giới, 4-6σ là Tốt, &lt; 3σ là Không đạt yêu cầu lâm sàng.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
