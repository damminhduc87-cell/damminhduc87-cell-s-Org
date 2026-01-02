
import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { QCConfig, QCResult } from '../types';

interface Props {
  data: QCResult[];
  config: QCConfig;
  title: string;
}

const LeveyJenningsChart: React.FC<Props> = ({ data, config, title }) => {
  const { mean, sd } = config;
  
  // Format data for Recharts
  const chartData = data.sort((a, b) => a.timestamp - b.timestamp).map(r => ({
    date: new Date(r.timestamp).toLocaleDateString('vi-VN'),
    value: r.value,
  }));

  const yDomain = [
    Number((mean - 4 * sd).toFixed(2)),
    Number((mean + 4 * sd).toFixed(2))
  ];

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 w-full h-[450px]">
      <h3 className="text-lg font-bold text-slate-800 mb-4">{title} - Biểu đồ Levey-Jennings</h3>
      <ResponsiveContainer width="100%" height="80%">
        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" />
          <YAxis domain={yDomain} label={{ value: config.unit, angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Legend />
          
          {/* Reference Lines for SDs */}
          <ReferenceLine y={mean} stroke="#000" strokeWidth={2} label="Mean" />
          <ReferenceLine y={mean + sd} stroke="#fbbf24" strokeDasharray="5 5" label="+1SD" />
          <ReferenceLine y={mean - sd} stroke="#fbbf24" strokeDasharray="5 5" label="-1SD" />
          <ReferenceLine y={mean + 2 * sd} stroke="#f97316" strokeDasharray="3 3" label="+2SD" />
          <ReferenceLine y={mean - 2 * sd} stroke="#f97316" strokeDasharray="3 3" label="-2SD" />
          <ReferenceLine y={mean + 3 * sd} stroke="#ef4444" label="+3SD" />
          <ReferenceLine y={mean - 3 * sd} stroke="#ef4444" label="-3SD" />

          <Line 
            type="monotone" 
            dataKey="value" 
            name="Giá trị đo" 
            stroke="#2563eb" 
            strokeWidth={3} 
            dot={{ r: 6, fill: '#2563eb' }}
            activeDot={{ r: 8 }} 
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium text-slate-500">
        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded-full"></div> Ngoài ±3SD: Lỗi hệ thống</span>
        <span className="flex items-center gap-1"><div className="w-3 h-3 bg-orange-500 rounded-full"></div> Ngoài ±2SD: Cảnh báo</span>
      </div>
    </div>
  );
};

export default LeveyJenningsChart;
