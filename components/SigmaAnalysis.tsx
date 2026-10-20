import React, { useState, useMemo } from 'react';
import { LabTest, QCConfig, QCResult } from '../types';

interface SigmaAnalysisProps {
  test: LabTest;
  config: QCConfig;
  results?: QCResult[];
  timeRange?: string;
  onOpenCapa?: () => void;
  onConsultAdvisor?: () => void;
}

export const SigmaAnalysis: React.FC<SigmaAnalysisProps> = ({
  test,
  config,
  results = [],
  timeRange = 'all',
  onOpenCapa,
  onConsultAdvisor
}) => {
  const { mean, sd, bias, eqaTarget, eqaResult, currentLot } = config;
  const [showFormula, setShowFormula] = useState(false);
  const [calcMode, setCalcMode] = useState<'observed' | 'target'>('observed');

  // Lọc tập kết quả hợp lệ: loại bỏ các điểm không có giá trị hoặc khác Lô nếu chuyển đổi lô
  const validResults = useMemo(() => {
    return results.filter(r => {
      const isValidVal = typeof r.value === 'number' && !isNaN(r.value) && r.value > 0;
      if (!isValidVal) return false;
      // Bỏ qua điểm khác Lô nếu người dùng đang chuyển giao lô nội kiểm
      if (currentLot && r.lotNumber && r.lotNumber !== 'LOT-DEFAULT' && r.lotNumber !== 'LOT-SHEET' && r.lotNumber !== currentLot) {
        return false;
      }
      return true;
    });
  }, [results, currentLot]);

  const sampleCount = validResults.length;

  // Tính Mean, SD, CV% thực tế từ các điểm đo đang hiển thị trong kỳ
  const observedStats = useMemo(() => {
    if (sampleCount < 2) {
      return {
        mean: sampleCount === 1 ? validResults[0].value : mean,
        sd: sd,
        cv: mean > 0 ? Number(((sd / mean) * 100).toFixed(2)) : 0,
        isCalculated: false
      };
    }
    const sum = validResults.reduce((acc, r) => acc + r.value, 0);
    const obsMean = sum / sampleCount;
    const variance = validResults.reduce((acc, r) => acc + Math.pow(r.value - obsMean, 2), 0) / (sampleCount - 1);
    const obsSd = Math.sqrt(variance);
    const obsCv = obsMean > 0 ? (obsSd / obsMean) * 100 : 0;
    return {
      mean: Number(obsMean.toFixed(2)),
      sd: Number(obsSd.toFixed(3)),
      cv: Number(obsCv.toFixed(2)),
      isCalculated: true
    };
  }, [validResults, sampleCount, mean, sd]);

  // Bias% thực tế từ Ngoại kiểm EQA (nếu có) hoặc cài đặt
  const actualBias = (eqaTarget && eqaResult && eqaTarget > 0)
    ? Number(((Math.abs(eqaResult - eqaTarget) / eqaTarget) * 100).toFixed(2))
    : bias;

  const targetCv = mean > 0 ? Number(((sd / mean) * 100).toFixed(2)) : 0;
  const tea = test.tea;

  // Quyết định dùng CV thực tế hay CV định mức tùy theo chế độ xem
  const isUsingObserved = calcMode === 'observed' && observedStats.isCalculated;
  const activeCv = isUsingObserved ? observedStats.cv : targetCv;
  const activeSd = isUsingObserved ? observedStats.sd : sd;
  const activeMean = isUsingObserved ? observedStats.mean : mean;

  // TE Thực Tế = |Bias%| + 1.65 * CV% (Chuẩn CLSI C24 / Westgard ở độ tin cậy 95%)
  const teActual = Number((Math.abs(actualBias) + 1.65 * activeCv).toFixed(2));

  // Six Sigma = (TEa - |Bias%|) / CV%
  const sigma = activeCv > 0 ? Number(((tea - Math.abs(actualBias)) / activeCv).toFixed(2)) : 0;

  const getStatus = (s: number) => {
    if (s >= 6) {
      return {
        label: 'Đẳng cấp Thế giới (≥6σ)',
        color: 'text-emerald-700',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        ringColor: '#10B981',
        isPassed: true,
        advice: 'Máy vận hành cực kỳ ổn định, độ phân tán sai số tối thiểu. Đạt chuẩn tối ưu tần suất QC theo ISO 15189.'
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
        advice: 'Quy trình kiểm soát chất lượng đạt chuẩn cao. Độ chụm rất tốt, sai số kiểm soát an toàn.'
      };
    }
    if (s >= 4) {
      return {
        label: 'Khá / Tốt (4-5σ)',
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
        isPassed: true,
        advice: 'Năng lực ở ngưỡng chấp nhận lâm sàng. Cần giám sát chặt chẽ đa quy tắc Westgard và tránh bọt khí hóa chất.'
      };
    }
    return {
      label: 'Cần cải tiến (<3σ)',
      color: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-200',
      ringColor: '#EF4444',
      isPassed: false,
      advice: 'Tổng sai số thực tế đang vượt ngưỡng khuyến cáo. Đề xuất bảo trì máy, kiểm tra nhiệt độ ủ hoặc thay lọ thuốc thử.'
    };
  };

  const status = getStatus(sigma);
  const percentage = Math.min(100, Math.max(0, (sigma / 6) * 100));
  const strokeDashoffset = 251.2 - (251.2 * percentage) / 100;

  // Đánh giá cỡ mẫu theo chuẩn CLSI C24
  const sampleConfidence = useMemo(() => {
    if (sampleCount >= 20) {
      return {
        isStandard: true,
        badge: `Đạt chuẩn CLSI C24 / QĐ 2429 (N = ${sampleCount} mẫu)`,
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: 'fa-check-circle text-emerald-600',
        desc: `Cỡ mẫu thực tế N = ${sampleCount} (≥ 20 mẫu) đảm bảo độ tin cậy thống kê cao theo tiêu chuẩn CLSI C24. Thích hợp sử dụng cho giao ban chuyên môn và báo cáo nghiệm thu sáng kiến.`
      };
    }
    if (sampleCount > 0) {
      return {
        isStandard: false,
        badge: `Cỡ mẫu ngắn hạn tuần (N = ${sampleCount} < 20 mẫu)`,
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        icon: 'fa-triangle-exclamation text-amber-600',
        desc: `Theo CLSI C24, cỡ mẫu N = ${sampleCount} (< 20 mẫu) dùng để theo dõi biến động nhanh trong tuần. Để kết luận chính thức cho báo cáo tháng, phòng Lab cần tích lũy đủ N ≥ 20 mẫu.`
      };
    }
    return {
      isStandard: false,
      badge: 'Chưa có mẫu đo trong kỳ lọc',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      icon: 'fa-info-circle text-slate-400',
      desc: 'Đang hiển thị Six Sigma & TEa theo thông số định mức cài đặt ban đầu của phòng xét nghiệm.'
    };
  }, [sampleCount]);

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-xs transition-all space-y-5">
      {/* Header with Title and Mode Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
            <i className="fas fa-chart-line text-sm"></i>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-[#0F1F3D]">
                Đánh giá Six Sigma & Tổng sai số cho phép
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                CLIA 2024
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${sampleConfidence.badgeClass}`}>
                <i className={`fas ${sampleConfidence.icon} text-[9px]`}></i>
                <span>{sampleConfidence.badge}</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Phân tích năng lực phương pháp và độ tin cậy kết quả xét nghiệm thời gian thực
            </p>
          </div>
        </div>

        {/* Right Controls: Mode Toggle & Rating Badge */}
        <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-center">
          {/* Mode Switcher Toggle */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setCalcMode('observed')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                calcMode === 'observed'
                  ? 'bg-white text-blue-600 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Tính toán động từ chính các kết quả đo thực tế trong kỳ (nhảy số khi nhập/xóa điểm)"
            >
              <i className="fas fa-bolt text-amber-500"></i>
              <span>Dữ liệu đo thực tế ({sampleCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setCalcMode('target')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                calcMode === 'target'
                  ? 'bg-white text-blue-600 shadow-2xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Định mức lý thuyết ban đầu theo thông số cài đặt của hóa chất"
            >
              <i className="fas fa-sliders text-slate-400"></i>
              <span>Định mức NSX</span>
            </button>
          </div>

          {/* Status Label */}
          <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${status.bg} ${status.color} ${status.border}`}>
            {status.label}
          </span>
        </div>
      </div>

      {/* Main Section: Gauge Left + 4 Metric Boxes Right */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Left: Gauge Circle */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-center">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke="#E2E8F0"
                strokeWidth="8"
              />
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

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-[#0F1F3D] leading-none">
                {sigma}σ
              </span>
              <span className="text-[10px] font-bold uppercase text-slate-400 mt-1">
                {isUsingObserved ? 'Sigma thực tế' : 'Sigma định mức'}
              </span>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-600 mt-2">
            Mục tiêu chất lượng: &ge; 4.0σ
          </span>
        </div>

        {/* Right: 4 Balanced Metric Boxes */}
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Box 1: TEa Cố định */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              TEa Chuẩn Y Khoa
            </span>
            <div className="text-xl font-black text-[#0F1F3D]">
              {tea}%
            </div>
            <span className="text-[11px] text-slate-500 font-medium block">
              CLIA 2024 (Cố định)
            </span>
          </div>

          {/* Box 2: Bias Ngoại kiểm */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Độ Chệch Bias (EQA)
            </span>
            <div className="text-xl font-black text-[#0F1F3D]">
              {actualBias}%
            </div>
            <span className="text-[11px] text-slate-500 font-medium block truncate" title={eqaTarget && eqaResult ? `Đích: ${eqaTarget} | Lab: ${eqaResult}` : undefined}>
              {eqaTarget && eqaResult 
                ? `🎯 Đích ${eqaTarget} | Đo ${eqaResult}` 
                : 'Tham chiếu EQA'}
            </span>
          </div>

          {/* Box 3: CV% Thực tế vs Mục tiêu */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                CV% Độ Chụm
              </span>
              {isUsingObserved && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Tính động theo thời gian thực"></span>
              )}
            </div>
            <div className="text-xl font-black text-[#0F1F3D]">
              {activeCv}%
            </div>
            <span className="text-[11px] text-slate-500 font-medium block">
              {isUsingObserved ? `(Mục tiêu: ${targetCv}%)` : 'Định mức chuẩn'}
            </span>
          </div>

          {/* Box 4: TE Thực tế */}
          <div className={`p-3.5 rounded-xl border space-y-1 ${
            teActual > tea ? 'bg-red-50/60 border-red-200' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              TE Thực Tế
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

      {/* Statistical Sample Confidence Banner */}
      <div className={`p-3.5 rounded-xl border flex items-start gap-3 ${sampleConfidence.badgeClass}`}>
        <i className={`fas ${sampleConfidence.icon} text-sm mt-0.5`}></i>
        <div className="space-y-0.5">
          <div className="text-xs font-bold flex items-center gap-2 flex-wrap">
            <span>Đánh giá cỡ mẫu & Độ tin cậy thống kê:</span>
            <span className="underline">{sampleConfidence.badge}</span>
          </div>
          <p className="text-xs opacity-90 leading-relaxed font-medium">
            {sampleConfidence.desc}
          </p>
        </div>
      </div>

      {/* Callout Message & Expert Recommendations */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${status.bg} ${status.border}`}>
        <div className="flex items-start gap-3">
          <i className={`fas ${status.isPassed ? 'fa-info-circle' : 'fa-exclamation-triangle'} text-sm mt-0.5 ${status.color}`}></i>
          <div>
            <p className={`text-xs font-bold leading-relaxed ${status.color}`}>
              {status.advice}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isUsingObserved 
                ? `Đang phân tích trên ${sampleCount} lần đo thực tế (Mean thực: ${activeMean}, SD thực: ${activeSd}).`
                : `Đang phân tích theo thông số định mức cài đặt (Mean: ${activeMean}, SD: ${activeSd}).`}
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
              • <strong>Tổng sai số thực tế (TE_actual):</strong> <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">TE = |Bias%| + 1.65 × CV%</code>
            </p>
            <p>
              • <strong>Hệ số biến thiên thực tế:</strong> <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[11px]">CV% = (SD_thực_tế / Mean_thực_tế) × 100%</code>
            </p>
            <p className="text-[11px] text-slate-400">
              * Quy ước theo CLSI C24 / Westgard QC: Năng lực phương pháp &ge; 6σ là Đẳng cấp Thế giới, 4-6σ là Tốt, &lt; 3σ là Không đạt yêu cầu lâm sàng. Cỡ mẫu tối thiểu đạt độ tin cậy thống kê là N &ge; 20 mẫu.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
