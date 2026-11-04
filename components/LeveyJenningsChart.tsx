import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { QCResult, QCConfig, QCLevel } from '../types';
import { calculateZScore } from '../services/westgardEngine';

interface LeveyJenningsChartProps {
  data: QCResult[];
  allResultsForTest?: QCResult[];
  config: QCConfig;
  allConfigs?: Record<QCLevel, QCConfig>;
  unit: string;
  title: string;
  onPointClick?: (result: QCResult) => void;
}

export type DisplayRangeOption = 'recent30' | 'gd1' | 'gd2' | 'all';

export const LeveyJenningsChart: React.FC<LeveyJenningsChartProps> = ({
  data,
  allResultsForTest = [],
  config,
  allConfigs,
  unit,
  title,
  onPointClick
}) => {
  const { mean, sd } = config;
  const [zoomLevel, setZoomLevel] = useState<number>(4);
  const [isMultiLevelView, setIsMultiLevelView] = useState<boolean>(false);
  
  // Tùy chọn phạm vi hiển thị: Mặc định 30 điểm gần nhất trên di động để các điểm thoáng và dễ thao tác
  const [displayRange, setDisplayRange] = useState<DisplayRangeOption>('recent30');
  
  // Chế độ cuộn ngang: Mặc định bật để mỗi điểm có độ rộng tối thiểu 36px, không bị dính vào nhau
  const [isScrollable, setIsScrollable] = useState<boolean>(true);

  // Điểm đang được chạm/chọn trên màn hình di động
  const [selectedPoint, setSelectedPoint] = useState<any>(null);

  // Điểm đang được rê chuột trực tiếp (bảo đảm 100% đúng dữ liệu của ngày đang trỏ tới)
  const [hoveredPoint, setHoveredPoint] = useState<any>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Dữ liệu hiển thị đơn mức (Single Level - Giá trị đo thực tế)
  const singleChartData = useMemo(() => {
    return [...data]
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(r => {
        const z = config.sd > 0 ? calculateZScore(r.value, config.mean, config.sd) : 0;
        const d = new Date(r.timestamp);
        const dayStr = String(d.getDate()).padStart(2, '0');
        const monthStr = String(d.getMonth() + 1).padStart(2, '0');
        const yearStr = d.getFullYear();
        const hourStr = String(d.getHours()).padStart(2, '0');
        const minStr = String(d.getMinutes()).padStart(2, '0');
        const secStr = String(d.getSeconds()).padStart(2, '0');

        return {
          rawResult: r,
          timestamp: r.timestamp,
          fullLabel: `${dayStr}/${monthStr}`,
          dateTimeStr: `${hourStr}:${minStr}:${secStr} ${dayStr}/${monthStr}/${yearStr}`,
          value: r.value,
          zScore: z,
          rule: r.westgardRule || 'none',
          status: r.westgardStatus || 'passed',
          technician: r.technician || 'KTV',
          lotNumber: (r.lotNumber && r.lotNumber !== '---' && r.lotNumber !== 'LOT-DEFAULT') ? r.lotNumber : (config.currentLot || 'LOT-2026')
        };
      });
  }, [data, config]);

  // Lọc dữ liệu theo phạm vi người dùng chọn & đánh số chartIndex độc nhất
  const filteredSingleData = useMemo(() => {
    if (singleChartData.length === 0) return [];
    let list = singleChartData;
    if (displayRange === 'recent30') {
      list = singleChartData.slice(-30);
    } else if (displayRange === 'gd1') {
      list = singleChartData.filter(d => {
        const date = new Date(d.timestamp);
        const m = date.getMonth() + 1;
        const y = date.getFullYear();
        return y === 2026 && (m === 5 || m === 6);
      });
    } else if (displayRange === 'gd2') {
      list = singleChartData.filter(d => {
        const date = new Date(d.timestamp);
        const m = date.getMonth() + 1;
        const y = date.getFullYear();
        return y === 2026 && (m === 7 || m === 8);
      });
    }
    return list.map((item, idx) => ({
      ...item,
      chartIndex: idx
    }));
  }, [singleChartData, displayRange]);

  // Dữ liệu hiển thị đa mức chuẩn hóa (Multi-level Normalized Z-score -4SD đến +4SD)
  const multiLevelChartData = useMemo(() => {
    if (!allConfigs) return [];
    
    // Gom nhóm theo mốc ngày/lần chạy
    const mapByTime: Record<string, any> = {};

    [...allResultsForTest]
      .sort((a, b) => a.timestamp - b.timestamp)
      .forEach(r => {
        const timeKey = new Date(r.timestamp).toISOString().slice(0, 10);
        if (!mapByTime[timeKey]) {
          mapByTime[timeKey] = {
            timestamp: r.timestamp,
            fullLabel: new Date(r.timestamp).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
            dateTimeStr: new Date(r.timestamp).toLocaleDateString('vi-VN'),
          };
        }
        const cfg = allConfigs?.[r.level];
        if (cfg && cfg.sd > 0) {
          const z = calculateZScore(r.value, cfg.mean, cfg.sd);
          mapByTime[timeKey][`z_${r.level}`] = z;
          mapByTime[timeKey][`val_${r.level}`] = r.value;
          mapByTime[timeKey][`res_${r.level}`] = r;
        }
      });

    return Object.values(mapByTime);
  }, [allResultsForTest, allConfigs]);

  const filteredMultiData = useMemo(() => {
    if (multiLevelChartData.length === 0) return [];
    let list = multiLevelChartData;
    if (displayRange === 'recent30') {
      list = multiLevelChartData.slice(-30);
    } else if (displayRange === 'gd1') {
      list = multiLevelChartData.filter((d: any) => {
        const date = new Date(d.timestamp);
        const m = date.getMonth() + 1;
        return m === 5 || m === 6;
      });
    } else if (displayRange === 'gd2') {
      list = multiLevelChartData.filter((d: any) => {
        const date = new Date(d.timestamp);
        const m = date.getMonth() + 1;
        return m === 7 || m === 8;
      });
    }
    return list.map((item: any, idx: number) => ({
      ...item,
      chartIndex: idx
    }));
  }, [multiLevelChartData, displayRange]);

  const activeData = isMultiLevelView ? filteredMultiData : filteredSingleData;
  const activeDataLength = activeData.length;

  // Tính toán chiều rộng động: Đảm bảo tối thiểu 36px cho mỗi điểm đo khi cuộn ngang
  const calculatedWidth = useMemo(() => {
    if (!isScrollable) return '100%';
    const minW = Math.max(340, activeDataLength * 36 + 120);
    return `${minW}px`;
  }, [isScrollable, activeDataLength]);

  // Tự động cuộn sang bên phải (mốc thời gian gần nhất) mỗi khi thay đổi dữ liệu hoặc chế độ
  useEffect(() => {
    if (isScrollable && scrollContainerRef.current) {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
        }
      }, 50);
    }
  }, [displayRange, isScrollable, isMultiLevelView]);

  const yDomainSingle = useMemo(() => [
    Number((mean - zoomLevel * sd).toFixed(2)),
    Number((mean + zoomLevel * sd).toFixed(2))
  ], [mean, sd, zoomLevel]);

  const formatRefLabel = (label: string, value: number) => {
    return `${value.toFixed(2)} (${label})`;
  };

  // Custom dot renderer hiển thị màu sắc theo trạng thái Westgard & hỗ trợ cảm ứng
  const renderCustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined) return null;

    const isCrowded = !isScrollable && activeDataLength > 40;
    
    // 1. Phân loại màu sắc & kích thước to rõ cho từng trạng thái
    let fill = '#10B981'; // Xanh ngọc lục bảo tươi (Hợp lệ)
    let strokeColor = '#FFFFFF';
    let strokeW = isCrowded ? 1.5 : 2;
    let r = isCrowded ? 5 : 6.5; // Chấm to rõ ràng, không bị đường nối nuốt mất
    const isViolation = payload.status === 'violation';
    const isWarning = payload.status === 'warning';

    if (isViolation) {
      fill = '#EF4444'; // Đỏ tươi nổi bật (Vi phạm Westgard)
      r = isCrowded ? 7.5 : 9.5; // Kích thước to nhất để nhận diện lỗi lập tức
      strokeW = isCrowded ? 2 : 2.5;
    } else if (isWarning) {
      fill = '#F59E0B'; // Vàng cam hổ phách rực rỡ (Cảnh báo 1-2s)
      r = isCrowded ? 6 : 8; // To hơn điểm hợp lệ để dễ lưu ý
      strokeW = isCrowded ? 1.5 : 2;
    }

    const isSelected = (selectedPoint && selectedPoint.timestamp === payload.timestamp) ||
                       (hoveredPoint && hoveredPoint.timestamp === payload.timestamp);
    const hitRadius = Math.max(16, r + 8);

    return (
      <g 
        key={`dot-group-${payload.timestamp}-${cx}`}
        className="cursor-pointer"
        onMouseEnter={() => setHoveredPoint(payload)}
        onMouseLeave={() => setHoveredPoint(null)}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedPoint(payload);
          if (onPointClick) onPointClick(payload.rawResult);
        }}
      >
        {/* Vùng đệm bắt sự kiện chuột/chạm cố định kích thước, chống rung lắc */}
        <circle
          cx={cx}
          cy={cy}
          r={hitRadius}
          fill="transparent"
          stroke="none"
        />

        {/* Vòng cảnh báo kép đặc biệt cho điểm VI PHẠM WESTGARD (Đỏ) */}
        {isViolation && (
          <circle
            cx={cx}
            cy={cy}
            r={r + (isCrowded ? 3 : 4)}
            fill="none"
            stroke="#EF4444"
            strokeWidth={1.5}
            strokeDasharray="2 2"
            opacity={0.85}
            className="pointer-events-none"
          />
        )}

        {/* Vòng viền nhấn cho điểm CẢNH BÁO 1-2s (Vàng) */}
        {isWarning && (
          <circle
            cx={cx}
            cy={cy}
            r={r + (isCrowded ? 2.5 : 3)}
            fill="none"
            stroke="#F59E0B"
            strokeWidth={1.2}
            opacity={0.7}
            className="pointer-events-none"
          />
        )}

        {/* Vòng hào quang hiển thị khi chọn hoặc hover */}
        {isSelected && (
          <circle
            cx={cx}
            cy={cy}
            r={r + (isCrowded ? 5 : 6)}
            fill="none"
            stroke={fill}
            strokeWidth={2.5}
            strokeDasharray="3 3"
            className="pointer-events-none"
          />
        )}

        {/* Chấm tròn chính hiển thị kết quả đo với viền trắng tương phản cao */}
        <circle
          cx={cx}
          cy={cy}
          r={isSelected ? r + 1.5 : r}
          fill={fill}
          stroke={strokeColor}
          strokeWidth={isSelected ? strokeW + 1 : strokeW}
          className="pointer-events-none"
        />
      </g>
    );
  };

  // Hàm tải ảnh biểu đồ
  const handleDownloadChart = () => {
    if (!chartContainerRef.current) return;
    const svgElement = chartContainerRef.current.querySelector('svg');
    if (!svgElement) {
      alert('Không tìm thấy dữ liệu đồ họa để xuất ảnh.');
      return;
    }

    const svgString = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const URLObj = window.URL || (window as any).webkitURL;
    const blobURL = URLObj.createObjectURL(blob);
    
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = svgElement.clientWidth * 2 || 1200;
      canvas.height = svgElement.clientHeight * 2 || 800;
      const context = canvas.getContext('2d');
      if (context) {
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const png = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `LeveyJennings_${title.replace(/\s+/g, '_')}_${Date.now()}.png`;
        downloadLink.href = png;
        downloadLink.click();
      }
    };
    image.src = blobURL;
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-6 shadow-xs w-full transition-all">
      {/* 1. Header bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <i className="fas fa-chart-line text-sm"></i>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-[#0F1F3D]">
                {title}
              </h3>
              {isMultiLevelView ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
                  Chuẩn hóa Đa mức Z-score
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                  Đơn vị: {unit}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Levey–Jennings & Westgard monitoring ({activeDataLength} điểm đo)
            </p>
          </div>
        </div>

        {/* Toolbar controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Nút chuyển chế độ Cuộn ngang thoáng / Vừa màn hình */}
          <button
            type="button"
            onClick={() => setIsScrollable(!isScrollable)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              isScrollable
                ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
            }`}
            title="Bật/Tắt chế độ cuộn ngang để các điểm đo cách đều 36px, không bị dính vào nhau trên điện thoại"
          >
            <i className={`fas ${isScrollable ? 'fa-arrows-alt-h text-blue-600' : 'fa-compress-arrows-alt text-slate-500'}`}></i>
            <span>{isScrollable ? 'Cuộn ngang thoáng (Dễ chạm)' : 'Thu gọn vừa màn hình'}</span>
          </button>

          {/* Chuyển đổi chế độ Đa mức nồng độ */}
          <button
            type="button"
            onClick={() => setIsMultiLevelView(!isMultiLevelView)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
              isMultiLevelView 
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
            title="So sánh đồng thời Z-score của cả 3 mức nồng độ để kiểm tra quy tắc R-4s"
          >
            <i className="fas fa-layer-group text-xs"></i>
            <span>{isMultiLevelView ? 'Đang xem Đa mức' : 'Xem Đa mức (R_4s)'}</span>
          </button>

          {/* Zoom controls (khi xem đơn mức) */}
          {!isMultiLevelView && (
            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
              <button 
                type="button"
                onClick={() => setZoomLevel(prev => Math.max(1.5, prev - 0.5))} 
                title="Phóng to theo trục Z" 
                className="w-7 h-7 rounded-lg bg-white hover:bg-blue-600 hover:text-white text-slate-600 transition-colors shadow-2xs flex items-center justify-center cursor-pointer text-xs"
              >
                <i className="fas fa-search-plus"></i>
              </button>
              <button 
                type="button"
                onClick={() => setZoomLevel(prev => Math.min(6, prev + 0.5))} 
                title="Thu nhỏ theo trục Z" 
                className="w-7 h-7 rounded-lg bg-white hover:bg-blue-600 hover:text-white text-slate-600 transition-colors shadow-2xs flex items-center justify-center cursor-pointer text-xs"
              >
                <i className="fas fa-search-minus"></i>
              </button>
              <button 
                type="button"
                onClick={() => setZoomLevel(4)} 
                title="Mặc định ±4SD" 
                className="w-7 h-7 rounded-lg bg-white hover:bg-blue-600 hover:text-white text-slate-600 transition-colors shadow-2xs flex items-center justify-center cursor-pointer text-xs font-bold"
              >
                <i className="fas fa-rotate-left"></i>
              </button>
            </div>
          )}

          {/* Tải ảnh biểu đồ */}
          <button
            type="button"
            onClick={handleDownloadChart}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
            title="Tải ảnh biểu đồ Levey-Jennings dạng PNG"
          >
            <i className="fas fa-download text-xs text-slate-500"></i>
            <span className="hidden sm:inline">Tải ảnh</span>
          </button>
        </div>
      </div>

      {/* 2. Bộ lọc khoảng thời gian trực quan (Tabs) */}
      <div className="pt-3 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
          <span className="text-[10px] uppercase font-bold text-slate-400 mr-1 shrink-0">
            Hiển thị:
          </span>
          {[
            { id: 'recent30', label: '30 điểm gần nhất' },
            { id: 'gd1', label: 'GĐ 1 (T5-T6)' },
            { id: 'gd2', label: 'GĐ 2 (T7-T8)' },
            { id: 'all', label: `Tất cả (${data.length} điểm)` }
          ].map(opt => {
            const isSelected = displayRange === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setDisplayRange(opt.id as DisplayRangeOption);
                  setSelectedPoint(null);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Legend status indicators */}
        <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-600 flex-wrap shrink-0">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span>
            Hợp lệ (Xanh)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-200"></span>
            Cảnh báo 1-2s (Vàng)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-800 border border-red-200 shadow-2xs font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-200"></span>
            Vi phạm Westgard (Đỏ)
          </span>
        </div>
      </div>

      {/* 3. Banner hướng dẫn vuốt ngang trên điện thoại */}
      {isScrollable && activeDataLength > 10 && (
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-blue-700 bg-blue-50/90 px-3 py-1.5 rounded-xl border border-blue-200/70">
          <span className="flex items-center gap-1.5 font-bold">
            <i className="fas fa-arrows-left-right text-blue-600"></i>
            Vuốt ngang để xem lịch sử ({activeDataLength} điểm đo cách đều 36px)
          </span>
          <span className="text-[10px] text-blue-600 font-medium">Mới nhất ở bên phải &rarr;</span>
        </div>
      )}

      {/* 4. Chart Canvas Container (Có thể cuộn ngang mượt mà trên điện thoại) */}
      <div 
        ref={scrollContainerRef}
        className={`w-full overflow-y-hidden mt-2 ${
          isScrollable 
            ? 'overflow-x-auto touch-pan-x border border-slate-100 rounded-xl bg-slate-50/30 custom-scrollbar' 
            : 'overflow-x-hidden'
        }`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div 
          ref={chartContainerRef} 
          className="h-[320px] sm:h-[390px] pt-2"
          style={{
            width: calculatedWidth,
            minWidth: calculatedWidth
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            {!isMultiLevelView ? (
              /* Biểu đồ Đơn mức (Single Level) */
              <LineChart 
                data={filteredSingleData} 
                margin={{ top: 12, right: 85, left: 10, bottom: 5 }}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="chartIndex" 
                  tickFormatter={(idx) => filteredSingleData[idx]?.fullLabel || ''}
                  tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }} 
                  axisLine={{ stroke: '#E2E8F0' }} 
                  tickLine={false} 
                  interval={isScrollable ? 0 : (activeDataLength > 40 ? Math.ceil(activeDataLength / 12) : 'preserveStartEnd')}
                />
                <YAxis 
                  domain={yDomainSingle} 
                  tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} 
                  axisLine={{ stroke: '#E2E8F0' }} 
                  tickLine={false} 
                />
                <Tooltip 
                  isAnimationActive={false}
                  wrapperStyle={{ pointerEvents: 'none', zIndex: 1000, outline: 'none' }}
                  cursor={{ stroke: '#64748B', strokeWidth: 1, strokeDasharray: '4 4' }}
                  content={({ active, payload }) => {
                    const d = hoveredPoint || (active && payload && payload.length ? payload[0].payload : null);
                    if (d) {
                      return (
                        <div className="bg-[#0F1F3D] text-white p-3 rounded-xl shadow-xl text-xs border border-slate-700 min-w-[220px] pointer-events-none select-none">
                          <p className="text-slate-400 font-medium mb-1 border-b border-slate-700 pb-1 flex items-center justify-between gap-3">
                            <span className="truncate">{d.dateTimeStr}</span>
                            <span className="text-[10px] text-blue-400 font-bold shrink-0 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/60">
                              Lô: {d.lotNumber}
                            </span>
                          </p>
                          <p className="text-sm font-black text-white mt-1">
                            Giá trị đo: <span className="text-blue-400 font-black">{d.value} {unit}</span>
                          </p>
                          <p className="font-semibold text-slate-300">
                            Độ lệch Z-score:{' '}
                            <span className={d.status === 'violation' ? 'text-red-400 font-bold' : d.status === 'warning' ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                              {d.zScore > 0 ? '+' : ''}{d.zScore} SD
                            </span>
                          </p>
                          <p className="text-[11px] text-slate-300 mt-1">
                            Quy tắc Westgard: <strong className="uppercase text-white">{d.rule === 'none' ? 'Hợp lệ' : d.rule}</strong>
                          </p>
                          {d.status === 'violation' && (
                            <div className="mt-2 pt-1.5 border-t border-red-500/40 text-[11px] text-red-300 font-bold flex items-center gap-1.5">
                              <i className="fas fa-file-medical-alt"></i> Chạm vào điểm để mở CAPA
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {/* Reference Lines */}
                <ReferenceLine y={mean} stroke="#0F1F3D" strokeWidth={2} label={{ position: 'right', value: formatRefLabel('Mean', mean), fontSize: 10, fill: '#0F1F3D', fontWeight: 700 }} />
                <ReferenceLine y={mean + sd} stroke="#94A3B8" strokeDasharray="3 3" strokeWidth={1} label={{ position: 'right', value: formatRefLabel('+1SD', mean + sd), fontSize: 9, fill: '#64748B' }} />
                <ReferenceLine y={mean - sd} stroke="#94A3B8" strokeDasharray="3 3" strokeWidth={1} label={{ position: 'right', value: formatRefLabel('-1SD', mean - sd), fontSize: 9, fill: '#64748B' }} />
                <ReferenceLine y={mean + 2 * sd} stroke="#F59E0B" strokeDasharray="4 4" strokeWidth={1.5} label={{ position: 'right', value: formatRefLabel('+2SD', mean + 2 * sd), fontSize: 9, fill: '#D97706', fontWeight: 600 }} />
                <ReferenceLine y={mean - 2 * sd} stroke="#F59E0B" strokeDasharray="4 4" strokeWidth={1.5} label={{ position: 'right', value: formatRefLabel('-2SD', mean - 2 * sd), fontSize: 9, fill: '#D97706', fontWeight: 600 }} />
                <ReferenceLine y={mean + 3 * sd} stroke="#EF4444" strokeDasharray="5 5" strokeWidth={1.5} label={{ position: 'right', value: formatRefLabel('+3SD', mean + 3 * sd), fontSize: 9, fill: '#DC2626', fontWeight: 700 }} />
                <ReferenceLine y={mean - 3 * sd} stroke="#EF4444" strokeDasharray="5 5" strokeWidth={1.5} label={{ position: 'right', value: formatRefLabel('-3SD', mean - 3 * sd), fontSize: 9, fill: '#DC2626', fontWeight: 700 }} />

                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#2563EB"
                  strokeWidth={2}
                  dot={renderCustomDot}
                  activeDot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            ) : (
              /* Biểu đồ Đa mức Chuẩn hóa Z-Score (-4SD đến +4SD) */
              <LineChart 
                data={filteredMultiData} 
                margin={{ top: 12, right: 85, left: 10, bottom: 5 }}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="chartIndex" 
                  tickFormatter={(idx) => filteredMultiData[idx]?.fullLabel || ''}
                  tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }} 
                  axisLine={{ stroke: '#E2E8F0' }} 
                  tickLine={false} 
                  interval={isScrollable ? 0 : (activeDataLength > 40 ? Math.ceil(activeDataLength / 12) : 'preserveStartEnd')}
                />
                <YAxis 
                  domain={[-4, 4]} 
                  ticks={[-4, -3, -2, -1, 0, 1, 2, 3, 4]} 
                  tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} 
                  axisLine={{ stroke: '#E2E8F0' }} 
                  tickLine={false} 
                />
                <Tooltip 
                  isAnimationActive={false}
                  wrapperStyle={{ pointerEvents: 'none', zIndex: 1000, outline: 'none' }}
                  cursor={{ stroke: '#64748B', strokeWidth: 1, strokeDasharray: '4 4' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-[#0F1F3D] text-white p-3 rounded-xl shadow-xl text-xs border border-slate-700 min-w-[220px] pointer-events-none select-none">
                          <p className="text-slate-400 font-medium mb-1 border-b border-slate-700 pb-1">{d.dateTimeStr}</p>
                          <p className="text-blue-400 font-bold">Mức Thấp (Low): Z = {d.z_Low !== undefined ? `${d.z_Low > 0 ? '+' : ''}${d.z_Low.toFixed(2)} SD (${d.val_Low})` : 'Chưa đo'}</p>
                          <p className="text-emerald-400 font-bold">Mức Bình thường (Normal): Z = {d.z_Normal !== undefined ? `${d.z_Normal > 0 ? '+' : ''}${d.z_Normal.toFixed(2)} SD (${d.val_Normal})` : 'Chưa đo'}</p>
                          <p className="text-amber-400 font-bold">Mức Cao (High): Z = {d.z_High !== undefined ? `${d.z_High > 0 ? '+' : ''}${d.z_High.toFixed(2)} SD (${d.val_High})` : 'Chưa đo'}</p>
                          <p className="text-[10px] text-slate-400 mt-1 italic">
                            Quy tắc R-4s kích hoạt khi chênh lệch giữa 2 mức trong cùng lần chạy &ge; 4.0 SD.
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={0} stroke="#0F1F3D" strokeWidth={2} label={{ position: 'right', value: 'Mean (0 SD)', fontSize: 10, fill: '#0F1F3D', fontWeight: 700 }} />
                <ReferenceLine y={2} stroke="#F59E0B" strokeDasharray="4 4" strokeWidth={1.5} label={{ position: 'right', value: '+2.0 SD', fontSize: 9, fill: '#D97706', fontWeight: 600 }} />
                <ReferenceLine y={-2} stroke="#F59E0B" strokeDasharray="4 4" strokeWidth={1.5} label={{ position: 'right', value: '-2.0 SD', fontSize: 9, fill: '#D97706', fontWeight: 600 }} />
                <ReferenceLine y={3} stroke="#EF4444" strokeDasharray="5 5" strokeWidth={1.5} label={{ position: 'right', value: '+3.0 SD', fontSize: 9, fill: '#DC2626', fontWeight: 700 }} />
                <ReferenceLine y={-3} stroke="#EF4444" strokeDasharray="5 5" strokeWidth={1.5} label={{ position: 'right', value: '-3.0 SD', fontSize: 9, fill: '#DC2626', fontWeight: 700 }} />

                <Line type="monotone" dataKey="z_Low" name="Mức Thấp" stroke="#2563EB" strokeWidth={2} dot={{ r: 5, stroke: '#FFFFFF', strokeWidth: 1.5, fill: '#2563EB' }} activeDot={{ r: 7, stroke: '#FFFFFF', strokeWidth: 2, className: 'pointer-events-none' }} connectNulls isAnimationActive={false} />
                <Line type="monotone" dataKey="z_Normal" name="Mức Bình thường" stroke="#10B981" strokeWidth={2} dot={{ r: 5, stroke: '#FFFFFF', strokeWidth: 1.5, fill: '#10B981' }} activeDot={{ r: 7, stroke: '#FFFFFF', strokeWidth: 2, className: 'pointer-events-none' }} connectNulls isAnimationActive={false} />
                <Line type="monotone" dataKey="z_High" name="Mức Cao" stroke="#F59E0B" strokeWidth={2} dot={{ r: 5, stroke: '#FFFFFF', strokeWidth: 1.5, fill: '#F59E0B' }} activeDot={{ r: 7, stroke: '#FFFFFF', strokeWidth: 2, className: 'pointer-events-none' }} connectNulls isAnimationActive={false} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. Thẻ thông tin chi tiết điểm được chạm trên điện thoại (Touch Detail Card) */}
      {selectedPoint && (
        <div className="mt-3 p-4 rounded-2xl bg-[#0F1F3D] text-white border border-slate-700 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${
                selectedPoint.status === 'violation' ? 'bg-red-500 ring-4 ring-red-500/20' :
                selectedPoint.status === 'warning' ? 'bg-amber-500 ring-4 ring-amber-500/20' :
                'bg-emerald-500 ring-4 ring-emerald-500/20'
              }`}></span>
              <span className="text-xs font-bold text-slate-100">
                {selectedPoint.dateTimeStr}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-blue-300 border border-slate-700">
                Lô: {selectedPoint.lotNumber}
              </span>
              <button
                type="button"
                onClick={() => setSelectedPoint(null)}
                className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs cursor-pointer"
                title="Đóng chi tiết"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Giá trị đo</span>
              <span className="text-base font-black text-white">
                {selectedPoint.value} <span className="text-xs text-blue-400 font-normal">{unit}</span>
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Độ lệch Z-Score</span>
              <span className={`text-base font-black ${
                selectedPoint.status === 'violation' ? 'text-red-400' :
                selectedPoint.status === 'warning' ? 'text-amber-400' :
                'text-emerald-400'
              }`}>
                {selectedPoint.zScore > 0 ? '+' : ''}{selectedPoint.zScore} SD
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Trạng thái Westgard</span>
              <span className={`text-xs font-black uppercase ${
                selectedPoint.status === 'violation' ? 'text-red-400' :
                selectedPoint.status === 'warning' ? 'text-amber-400' :
                'text-emerald-400'
              }`}>
                {selectedPoint.rule === 'none' ? 'Hợp lệ (<2SD)' : selectedPoint.rule}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Người thực hiện</span>
              <span className="text-xs font-semibold text-slate-300">
                {selectedPoint.technician && !selectedPoint.technician.toLowerCase().includes('google')
                  ? selectedPoint.technician.replace(/^KTV\.?\s*/i, '')
                  : 'Đàm Minh Đức'}
              </span>
            </div>
          </div>

          {selectedPoint.status === 'violation' && (
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
              <span className="text-xs text-red-300 font-medium">
                <i className="fas fa-exclamation-triangle mr-1 text-red-400"></i>
                Phát hiện vi phạm quy tắc nội kiểm.
              </span>
              <button
                type="button"
                onClick={() => onPointClick && onPointClick(selectedPoint.rawResult)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black shadow-md shadow-red-500/20 cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <i className="fas fa-file-medical-alt"></i>
                <span>Mở Biên Bản CAPA</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
