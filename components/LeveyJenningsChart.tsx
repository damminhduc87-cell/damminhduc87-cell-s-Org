
import React, { useState } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { QCConfig, QCResult } from '../types';

interface Props {
  data: QCResult[];
  config: QCConfig;
  unit: string;
  title: string;
}

const LeveyJenningsChart: React.FC<Props> = ({ data, config, unit, title }) => {
  const { mean, sd } = config;
  const [zoomLevel, setZoomLevel] = useState(4); // Mặc định hiển thị phạm vi 4SD
  
  // Format data for Recharts
  const chartData = data.slice().sort((a, b) => a.timestamp - b.timestamp).map(r => ({
    date: new Date(r.timestamp).toLocaleDateString('vi-VN'),
    value: r.value,
  }));

  const yDomain = [
    Number((mean - zoomLevel * sd).toFixed(2)),
    Number((mean + zoomLevel * sd).toFixed(2))
  ];

  const handleZoomIn = () => setZoomLevel(prev => Math.max(1.5, prev - 0.5));
  const handleZoomOut = () => setZoomLevel(prev => Math.min(10, prev + 0.5));
  const handleResetZoom = () => setZoomLevel(4);

  return (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200 w-full h-[500px] relative group overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/20 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 relative z-10">
        <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
             <i className="fas fa-chart-line"></i>
          </div>
          <div className="flex flex-col">
            <span className="leading-tight">{title}</span>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Biểu đồ Levey-Jennings</span>
          </div>
        </h3>
        
        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50 shadow-inner">
          <button 
            onClick={handleZoomIn}
            className="w-9 h-9 rounded-xl bg-white text-slate-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center justify-center active:scale-90"
            title="Phóng to (Thu hẹp vùng SD)"
          >
            <i className="fas fa-search-plus text-xs"></i>
          </button>
          <button 
            onClick={handleZoomOut}
            className="w-9 h-9 rounded-xl bg-white text-slate-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center justify-center active:scale-90"
            title="Thu nhỏ (Mở rộng vùng SD)"
          >
            <i className="fas fa-search-minus text-xs"></i>
          </button>
          <div className="w-px h-6 bg-slate-300 mx-1"></div>
          <button 
            onClick={handleResetZoom}
            className="w-9 h-9 rounded-xl bg-white text-slate-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm flex items-center justify-center active:scale-90"
            title="Đặt lại vùng nhìn tiêu chuẩn (4SD)"
          >
            <i className="fas fa-expand-arrows-alt text-xs"></i>
          </button>
          <div className="px-3 border-l border-slate-200 ml-1">
             <span className="text-[10px] font-black text-blue-600 tabular-nums">±{zoomLevel.toFixed(1)} SD</span>
          </div>
        </div>
      </div>

      <div className="h-[320px] w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 40, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              tick={{fontSize: 9, fill: '#94a3b8', fontWeight: '800'}}
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis 
              domain={yDomain} 
              tick={{fontSize: 9, fill: '#94a3b8', fontWeight: '800'}}
              axisLine={false}
              tickLine={false}
              label={{ value: unit, angle: -90, position: 'insideLeft', style: { fill: '#cbd5e1', fontWeight: '900', fontSize: '9px', textTransform: 'uppercase' } }} 
            />
            <Tooltip 
              contentStyle={{ borderRadius: '1.25rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
              itemStyle={{ fontWeight: '900', fontSize: '11px', textTransform: 'uppercase' }}
              labelStyle={{ fontWeight: '900', color: '#64748b', marginBottom: '4px' }}
            />
            <Legend wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em', paddingTop: '20px' }} />
            
            {/* Reference Lines for SDs */}
            <ReferenceLine y={mean} stroke="#0f172a" strokeWidth={2.5} label={{ value: 'MEAN', position: 'right', fill: '#0f172a', fontSize: 9, fontWeight: '900' }} />
            
            {zoomLevel >= 1 && (
              <>
                <ReferenceLine y={mean + sd} stroke="#fbbf24" strokeDasharray="6 4" strokeOpacity={0.4} label={{ value: '+1SD', position: 'right', fill: '#fbbf24', fontSize: 8, fontWeight: '700' }} />
                <ReferenceLine y={mean - sd} stroke="#fbbf24" strokeDasharray="6 4" strokeOpacity={0.4} label={{ value: '-1SD', position: 'right', fill: '#fbbf24', fontSize: 8, fontWeight: '700' }} />
              </>
            )}
            
            {zoomLevel >= 2 && (
              <>
                <ReferenceLine y={mean + 2 * sd} stroke="#f97316" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: '+2SD', position: 'right', fill: '#f97316', fontSize: 8, fontWeight: '800' }} />
                <ReferenceLine y={mean - 2 * sd} stroke="#f97316" strokeDasharray="4 4" strokeWidth={1.5} label={{ value: '-2SD', position: 'right', fill: '#f97316', fontSize: 8, fontWeight: '800' }} />
              </>
            )}
            
            {zoomLevel >= 3 && (
              <>
                <ReferenceLine y={mean + 3 * sd} stroke="#ef4444" strokeWidth={2} label={{ value: '+3SD', position: 'right', fill: '#ef4444', fontSize: 8, fontWeight: '900' }} />
                <ReferenceLine y={mean - 3 * sd} stroke="#ef4444" strokeWidth={2} label={{ value: '-3SD', position: 'right', fill: '#ef4444', fontSize: 8, fontWeight: '900' }} />
              </>
            )}

            <Line 
              type="monotone" 
              dataKey="value" 
              name="Giá trị QC" 
              stroke="#2563eb" 
              strokeWidth={4} 
              dot={{ r: 6, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 9, fill: '#1d4ed8', strokeWidth: 3, stroke: '#fff' }} 
              animationDuration={1500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-6 text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 border-t border-slate-50 pt-6">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-sm shadow-red-200"></div>
          <span>Vi phạm 1-3s (±3SD)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-orange-500 rounded-full shadow-sm shadow-orange-200"></div>
          <span>Cảnh báo 1-2s (±2SD)</span>
        </div>
        <div className="ml-auto text-slate-300 italic flex items-center gap-2">
          <i className="fas fa-mouse-pointer text-[8px]"></i>
          <span>Di chuột để xem thông số chi tiết</span>
        </div>
      </div>
    </div>
  );
};

export default LeveyJenningsChart;
