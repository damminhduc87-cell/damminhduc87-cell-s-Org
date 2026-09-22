import React, { useState, useMemo, useRef } from 'react';
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
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Dữ liệu hiển thị đơn mức (Single Level - Giá trị đo thực tế)
  const singleChartData = useMemo(() => {
    return [...data]
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(r => {
        const z = config.sd > 0 ? calculateZScore(r.value, config.mean, config.sd) : 0;
        return {
          rawResult: r,
          timestamp: r.timestamp,
          fullLabel: new Date(r.timestamp).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
          dateTimeStr: new Date(r.timestamp).toLocaleString('vi-VN'),
          value: r.value,
          zScore: z,
          rule: r.westgardRule || 'none',
          status: r.westgardStatus || 'passed',
          technician: r.technician || 'KTV',
          lotNumber: r.lotNumber || 'Default'
        };
      });
  }, [data, config]);

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
        const cfg = allConfigs[r.level];
        if (cfg && cfg.sd > 0) {
          const z = calculateZScore(r.value, cfg.mean, cfg.sd);
          mapByTime[timeKey][`z_${r.level}`] = z;
          mapByTime[timeKey][`val_${r.level}`] = r.value;
          mapByTime[timeKey][`res_${r.level}`] = r;
        }
      });

    return Object.values(mapByTime);
  }, [allResultsForTest, allConfigs]);

  const yDomainSingle = useMemo(() => [
    Number((mean - zoomLevel * sd).toFixed(2)),
    Number((mean + zoomLevel * sd).toFixed(2))
  ], [mean, sd, zoomLevel]);

  const formatRefLabel = (label: string, value: number) => {
    return `${value.toFixed(2)} (${label})`;
  };

  // Custom dot renderer hiển thị màu sắc theo trạng thái Westgard
  const renderCustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (cx === undefined || cy === undefined) return null;

    let fill = '#10B981'; // Xanh lá: Hợp lệ
    let stroke = '#059669';
    let r = 5.5;

    if (payload.status === 'violation') {
      fill = '#EF4444'; // Đỏ: Vi phạm
      stroke = '#B91C1C';
      r = 7.5;
    } else if (payload.status === 'warning') {
      fill = '#F59E0B'; // Vàng cam: Cảnh báo 1-2s
      stroke = '#D97706';
      r = 6.5;
    }

    return (
      <circle
        key={`dot-${payload.timestamp}-${cx}`}
        cx={cx}
        cy={cy}
        r={r}
        fill={fill}
        stroke="#FFFFFF"
        strokeWidth={2}
        className="cursor-pointer transition-all hover:scale-150 drop-shadow-xs"
        onClick={() => onPointClick && onPointClick(payload.rawResult)}
      />
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
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(blob);
    
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
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 sm:p-6 shadow-xs w-full transition-all">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
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
              Levey–Jennings & Westgard monitoring
            </p>
          </div>
        </div>

        {/* Toolbar controls */}
        <div className="flex items-center gap-2 flex-wrap">
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

      {/* Legend Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 pb-2 text-[11px] font-semibold text-slate-600">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Hợp lệ (&lt;2SD)
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Cảnh báo 1-2s
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-800 border border-red-200/80">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            Vi phạm Westgard (Click để mở CAPA)
          </span>
        </div>

        {isMultiLevelView && (
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-blue-600 font-bold">
              <span className="w-3 h-1 bg-blue-600 rounded"></span> Mức Thấp
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
              <span className="w-3 h-1 bg-emerald-600 rounded"></span> Mức Bình thường
            </span>
            <span className="flex items-center gap-1.5 text-amber-600 font-bold">
              <span className="w-3 h-1 bg-amber-600 rounded"></span> Mức Cao
            </span>
          </div>
        )}
      </div>

      {/* Chart Canvas */}
      <div ref={chartContainerRef} className="h-[380px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {!isMultiLevelView ? (
            /* Biểu đồ Đơn mức (Single Level) */
            <LineChart data={singleChartData} margin={{ top: 12, right: 80, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis 
                dataKey="fullLabel" 
                tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} 
                axisLine={{ stroke: '#E2E8F0' }} 
                tickLine={false} 
              />
              <YAxis 
                domain={yDomainSingle} 
                tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} 
                axisLine={{ stroke: '#E2E8F0' }} 
                tickLine={false} 
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-[#0F1F3D] text-white p-3.5 rounded-xl shadow-xl text-xs border border-slate-700 min-w-[210px]">
                        <p className="text-slate-400 font-medium mb-1 border-b border-slate-700 pb-1 flex items-center justify-between">
                          <span>{d.dateTimeStr}</span>
                          <span className="text-[10px] text-blue-400 font-bold">Lô: {d.lotNumber}</span>
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
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          KTV thực hiện: <strong>{d.technician}</strong>
                        </p>
                        {d.status === 'violation' && (
                          <div className="mt-2 pt-2 border-t border-red-500/40 text-[11px] text-red-300 font-bold flex items-center gap-1.5 animate-pulse">
                            <i className="fas fa-file-medical-alt"></i> Nhấn để mở biên bản CAPA
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
                strokeWidth={2.5}
                dot={renderCustomDot}
                activeDot={{ r: 8, stroke: '#FFFFFF', strokeWidth: 2 }}
                isAnimationActive={true}
                animationDuration={600}
              />
            </LineChart>
          ) : (
            /* Biểu đồ Đa mức Chuẩn hóa Z-Score (-4SD đến +4SD) */
            <LineChart data={multiLevelChartData} margin={{ top: 12, right: 80, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis 
                dataKey="fullLabel" 
                tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} 
                axisLine={{ stroke: '#E2E8F0' }} 
                tickLine={false} 
              />
              <YAxis 
                domain={[-4, 4]} 
                ticks={[-4, -3, -2, -1, 0, 1, 2, 3, 4]} 
                tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} 
                axisLine={{ stroke: '#E2E8F0' }} 
                tickLine={false} 
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-[#0F1F3D] text-white p-3.5 rounded-xl shadow-xl text-xs border border-slate-700 min-w-[220px]">
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
              {/* Reference Lines cho trục Z-Score chuẩn */}
              <ReferenceLine y={0} stroke="#0F1F3D" strokeWidth={2} label={{ position: 'right', value: 'Mean (0 SD)', fontSize: 10, fill: '#0F1F3D', fontWeight: 700 }} />
              <ReferenceLine y={2} stroke="#F59E0B" strokeDasharray="4 4" strokeWidth={1.5} label={{ position: 'right', value: '+2.0 SD (Cảnh báo)', fontSize: 9, fill: '#D97706', fontWeight: 600 }} />
              <ReferenceLine y={-2} stroke="#F59E0B" strokeDasharray="4 4" strokeWidth={1.5} label={{ position: 'right', value: '-2.0 SD (Cảnh báo)', fontSize: 9, fill: '#D97706', fontWeight: 600 }} />
              <ReferenceLine y={3} stroke="#EF4444" strokeDasharray="5 5" strokeWidth={1.5} label={{ position: 'right', value: '+3.0 SD (Vi phạm)', fontSize: 9, fill: '#DC2626', fontWeight: 700 }} />
              <ReferenceLine y={-3} stroke="#EF4444" strokeDasharray="5 5" strokeWidth={1.5} label={{ position: 'right', value: '-3.0 SD (Vi phạm)', fontSize: 9, fill: '#DC2626', fontWeight: 700 }} />

              <Line type="monotone" dataKey="z_Low" name="Mức Thấp" stroke="#2563EB" strokeWidth={2} dot={{ r: 4 }} connectNulls />
              <Line type="monotone" dataKey="z_Normal" name="Mức Bình thường" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} connectNulls />
              <Line type="monotone" dataKey="z_High" name="Mức Cao" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} connectNulls />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
