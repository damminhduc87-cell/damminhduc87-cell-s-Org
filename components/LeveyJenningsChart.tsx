import React, { useState, useMemo } from 'react';
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
  const [zoomLevel, setZoomLevel] = useState(4);
  const [isMultiLevelView, setIsMultiLevelView] = useState(false);

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

    let fill = '#10b981'; // Xanh lá: Hợp lệ
    let stroke = '#059669';
    let r = 6;

    if (payload.status === 'violation') {
      fill = '#ef4444'; // Đỏ: Vi phạm
      stroke = '#b91c1c';
      r = 8;
    } else if (payload.status === 'warning') {
      fill = '#f59e0b'; // Vàng cam: Cảnh báo 1-2s
      stroke = '#d97706';
      r = 7;
    }

    return (
      <circle
        key={`dot-${payload.timestamp}`}
        cx={cx}
        cy={cy}
        r={r}
        fill={fill}
        stroke={stroke}
        strokeWidth={2}
        className="cursor-pointer transition-all hover:scale-125"
        onClick={() => onPointClick && onPointClick(payload.rawResult)}
      />
    );
  };

  return (
    <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md p-6 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 w-full relative overflow-hidden">
      {/* Header bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <i className="fas fa-chart-line text-sm"></i>
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
              {title}
              {isMultiLevelView && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700">
                  Chuẩn hóa Đa mức (Z-score)
                </span>
              )}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Biểu đồ Levey-Jennings & Giám sát Westgard
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Chuyển đổi chế độ Đa mức nồng độ */}
          <button
            type="button"
            onClick={() => setIsMultiLevelView(!isMultiLevelView)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
              isMultiLevelView 
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            <i className="fas fa-layer-group"></i>
            <span>{isMultiLevelView ? 'Đang xem Đa mức' : 'Xem Đa mức (R_4s)'}</span>
          </button>

          {/* Zoom controls */}
          {!isMultiLevelView && (
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/70 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button 
                onClick={() => setZoomLevel(prev => Math.max(1, prev - 0.5))} 
                title="Phóng to" 
                className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-blue-600 hover:text-white transition-all shadow-xs flex items-center justify-center cursor-pointer"
              >
                <i className="fas fa-search-plus text-xs"></i>
              </button>
              <button 
                onClick={() => setZoomLevel(prev => Math.min(6, prev + 0.5))} 
                title="Thu nhỏ" 
                className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-blue-600 hover:text-white transition-all shadow-xs flex items-center justify-center cursor-pointer"
              >
                <i className="fas fa-search-minus text-xs"></i>
              </button>
              <button 
                onClick={() => setZoomLevel(4)} 
                title="Mặc định ±4SD" 
                className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-200 hover:bg-blue-600 hover:text-white transition-all shadow-xs flex items-center justify-center cursor-pointer"
              >
                <i className="fas fa-redo-alt text-xs"></i>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Legend & Guide */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-[11px] font-bold text-slate-500">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Hợp lệ (&lt;2SD)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Cảnh báo 1-2s</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Vi phạm Westgard (Nhấn để lập CAPA)</span>
        {isMultiLevelView && (
          <>
            <span className="flex items-center gap-1.5 ml-auto text-blue-600"><span className="w-3 h-0.5 bg-blue-600"></span> Mức Thấp (Low)</span>
            <span className="flex items-center gap-1.5 text-indigo-600"><span className="w-3 h-0.5 bg-indigo-600"></span> Mức Bình thường</span>
            <span className="flex items-center gap-1.5 text-purple-600"><span className="w-3 h-0.5 bg-purple-600"></span> Mức Cao (High)</span>
          </>
        )}
      </div>

      {/* Chart Canvas */}
      <div className="h-[360px] w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          {!isMultiLevelView ? (
            /* Biểu đồ Đơn mức (Single Level) */
            <LineChart data={singleChartData} margin={{ top: 10, right: 80, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis 
                dataKey="fullLabel" 
                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis 
                domain={yDomainSingle} 
                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} 
                axisLine={false} 
                tickLine={false} 
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl text-xs border border-slate-700">
                        <p className="font-bold text-slate-300 mb-1">{d.dateTimeStr}</p>
                        <p className="text-sm font-black">Giá trị đo: <span className="text-blue-400">{d.value} {unit}</span></p>
                        <p className="font-bold">Độ lệch Z-score: <span className={d.status === 'violation' ? 'text-red-400' : d.status === 'warning' ? 'text-amber-400' : 'text-emerald-400'}>{d.zScore > 0 ? '+' : ''}{d.zScore} SD</span></p>
                        <p className="mt-1">Quy tắc: <strong className="uppercase">{d.rule}</strong></p>
                        <p className="text-[10px] text-slate-400">KTV: {d.technician} | Lô: {d.lotNumber}</p>
                        {d.status === 'violation' && (
                          <p className="text-[10px] text-red-300 font-bold mt-1.5 animate-pulse">
                            👉 Nhấn vào điểm này để lập biên bản CAPA
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {/* Reference Lines */}
              <ReferenceLine y={mean} stroke="#0f172a" strokeWidth={2} label={{ position: 'right', value: formatRefLabel('Mean', mean), fontSize: 9, fill: '#0f172a', fontWeight: 'bold' }} />
              <ReferenceLine y={mean + sd} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1} label={{ position: 'right', value: formatRefLabel('+1SD', mean + sd), fontSize: 8, fill: '#94a3b8' }} />
              <ReferenceLine y={mean - sd} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={1} label={{ position: 'right', value: formatRefLabel('-1SD', mean - sd), fontSize: 8, fill: '#94a3b8' }} />
              <ReferenceLine y={mean + 2*sd} stroke="#f59e0b" strokeDasharray="5 3" strokeWidth={1.5} label={{ position: 'right', value: formatRefLabel('+2SD', mean + 2*sd), fontSize: 9, fill: '#f59e0b', fontWeight: 'bold' }} />
              <ReferenceLine y={mean - 2*sd} stroke="#f59e0b" strokeDasharray="5 3" strokeWidth={1.5} label={{ position: 'right', value: formatRefLabel('-2SD', mean - 2*sd), fontSize: 9, fill: '#f59e0b', fontWeight: 'bold' }} />
              <ReferenceLine y={mean + 3*sd} stroke="#ef4444" strokeWidth={2} label={{ position: 'right', value: formatRefLabel('+3SD', mean + 3*sd), fontSize: 9, fill: '#ef4444', fontWeight: 'bold' }} />
              <ReferenceLine y={mean - 3*sd} stroke="#ef4444" strokeWidth={2} label={{ position: 'right', value: formatRefLabel('-3SD', mean - 3*sd), fontSize: 9, fill: '#ef4444', fontWeight: 'bold' }} />
              
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#2563eb" 
                strokeWidth={3} 
                dot={renderCustomDot} 
                activeDot={{ r: 9, fill: '#1d4ed8' }}
              />
            </LineChart>
          ) : (
            /* Biểu đồ Đa mức Chuẩn hóa Z-score */
            <LineChart data={multiLevelChartData} margin={{ top: 10, right: 80, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="fullLabel" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
              <YAxis domain={[-4, 4]} ticks={[-4, -3, -2, -1, 0, 1, 2, 3, 4]} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl text-xs">
                        <p className="font-bold text-slate-300 mb-1">{d.dateTimeStr}</p>
                        {d.z_Low !== undefined && <p className="text-blue-400">Mức Low: {d.val_Low} ({d.z_Low} SD)</p>}
                        {d.z_Normal !== undefined && <p className="text-indigo-400">Mức Normal: {d.val_Normal} ({d.z_Normal} SD)</p>}
                        {d.z_High !== undefined && <p className="text-purple-400">Mức High: {d.val_High} ({d.z_High} SD)</p>}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine y={0} stroke="#0f172a" strokeWidth={2} label={{ position: 'right', value: 'Mean (0 SD)', fontSize: 9, fill: '#0f172a', fontWeight: 'bold' }} />
              <ReferenceLine y={2} stroke="#f59e0b" strokeDasharray="5 3" strokeWidth={1.5} label={{ position: 'right', value: '+2SD', fontSize: 9, fill: '#f59e0b' }} />
              <ReferenceLine y={-2} stroke="#f59e0b" strokeDasharray="5 3" strokeWidth={1.5} label={{ position: 'right', value: '-2SD', fontSize: 9, fill: '#f59e0b' }} />
              <ReferenceLine y={3} stroke="#ef4444" strokeWidth={2} label={{ position: 'right', value: '+3SD', fontSize: 9, fill: '#ef4444' }} />
              <ReferenceLine y={-3} stroke="#ef4444" strokeWidth={2} label={{ position: 'right', value: '-3SD', fontSize: 9, fill: '#ef4444' }} />

              <Line type="monotone" dataKey="z_Low" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 5, fill: '#3b82f6' }} name="Mức Low" />
              <Line type="monotone" dataKey="z_Normal" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 5, fill: '#6366f1' }} name="Mức Normal" />
              <Line type="monotone" dataKey="z_High" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 5, fill: '#a855f7' }} name="Mức High" />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
