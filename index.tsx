
import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { INITIAL_TESTS, MOCK_RESULTS } from './constants';
import { QCLevel, LabTest, QCResult, QCConfig } from './types';

// --- Utility: Animate Number ---
const AnimatedNumber = ({ value, duration = 1000 }: { value: number, duration?: number }) => {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    let start = displayValue;
    const end = value;
    if (isNaN(end)) return;
    
    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = progress * (2 - progress);
      const current = start + (end - start) * easeProgress;
      
      setDisplayValue(current);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);

  return <span>{displayValue.toFixed(2)}</span>;
};

// --- Components ---

const LeveyJenningsChart = ({ 
  results, 
  config, 
  unit, 
  title, 
  onHover 
}: { 
  results: QCResult[], 
  config: QCConfig, 
  unit: string, 
  title: string,
  onHover: (data: any | null) => void
}) => {
  const [zoomLevel, setZoomLevel] = useState(1); // 1 is default

  const chartData = useMemo(() => {
    if (!results || results.length === 0) return [];
    return [...results]
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(r => {
        const dateObj = new Date(r.timestamp);
        return {
          timestamp: r.timestamp,
          displayLabel: dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
          fullLabel: dateObj.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
          value: r.value,
          fullDate: dateObj.toLocaleString('vi-VN'),
          raw: r
        };
      });
  }, [results]);

  const { mean, sd } = config;
  const safeSd = sd || 0.1;

  const yDomain = useMemo(() => {
    // Zoom logic: reduce the visible range as zoomLevel increases
    // Default (1) shows at least ±5SD to accommodate new lines
    const baseRange = 5.2 / zoomLevel; 
    const lines = [mean - baseRange * safeSd, mean + baseRange * safeSd];
    
    if (chartData.length === 0) return [lines[0], lines[1]];
    
    const values = chartData.map(d => d.value);
    const minVal = Math.min(...values, ...lines);
    const maxVal = Math.max(...values, ...lines);
    const padding = safeSd * (0.5 / zoomLevel);
    
    return [Number((minVal - padding).toFixed(2)), Number((maxVal + padding).toFixed(2))];
  }, [chartData, mean, safeSd, zoomLevel]);

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.5, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  if (chartData.length === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-[2.5rem] shadow-xl border border-white h-[400px] md:h-[500px] flex flex-col items-center justify-center text-slate-400">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-3xl mb-4 text-slate-200"><i className="fas fa-chart-line"></i></div>
        <p className="font-black uppercase text-[10px] tracking-widest">Chưa có dữ liệu phân tích</p>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-md p-4 md:p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white h-[400px] md:h-[500px] transition-all relative overflow-hidden group">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm md:text-lg font-black text-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600"><i className="fas fa-wave-square"></i></div>
          {title}
        </h3>
        
        <div className="flex items-center gap-4">
          {/* Zoom Controls */}
          <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
            <button 
              onClick={handleZoomIn}
              title="Phóng to"
              className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-600 hover:text-blue-600 hover:scale-105 active:scale-95 transition-all"
            >
              <i className="fas fa-search-plus text-xs"></i>
            </button>
            <button 
              onClick={handleZoomOut}
              title="Thu nhỏ"
              className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-600 hover:text-blue-600 hover:scale-105 active:scale-95 transition-all"
            >
              <i className="fas fa-search-minus text-xs"></i>
            </button>
            <button 
              onClick={handleResetZoom}
              title="Mặc định"
              className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all"
            >
              <i className="fas fa-undo text-xs"></i>
            </button>
          </div>

          <div className="hidden sm:flex gap-2 text-[10px] font-black uppercase">
            <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full border border-red-200">±3SD</span>
            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full border border-slate-200">±5SD</span>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart data={chartData} margin={{ top: 10, right: 60, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={(unix) => new Date(unix).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
            tick={{fontSize: 10, fill: '#64748b', fontWeight: 700}} 
            tickMargin={12} 
            axisLine={false} 
            tickLine={false} 
          />
          <YAxis domain={yDomain} tick={{fontSize: 10, fill: '#64748b', fontWeight: 700}} axisLine={false} tickLine={false} />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload;
                const diff = (d.value - mean) / safeSd;
                return (
                  <div className="bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl shadow-2xl text-white border border-slate-700 text-[11px] min-w-[180px]">
                    <p className="font-black text-blue-400 mb-2 border-b border-white/10 pb-1 flex justify-between">
                      <span>{d.fullDate}</span>
                      <i className="fas fa-clock"></i>
                    </p>
                    <div className="flex justify-between mb-1"><span>Kết quả:</span> <span className="font-black text-lg text-white">{d.value} {unit}</span></div>
                    <div className="flex justify-between border-t border-white/5 pt-1 mt-1">
                      <span>Độ lệch:</span> 
                      <span className={`font-black ${Math.abs(diff) >= 3 ? 'text-red-400' : Math.abs(diff) >= 2 ? 'text-orange-400' : 'text-emerald-400'}`}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(2)} SD
                      </span>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          
          {/* TRUNG BÌNH */}
          <ReferenceLine y={mean} stroke="#0f172a" strokeWidth={2.5} label={{ position: 'right', value: 'Mean', fontSize: 11, fill: '#0f172a', fontWeight: '900', offset: 15 }} />
          
          {/* ±2SD - Cảnh báo */}
          <ReferenceLine y={mean + 2 * sd} stroke="#f59e0b" strokeDasharray="6 4" strokeWidth={1.5} label={{ position: 'right', value: '+2SD', fontSize: 10, fill: '#f59e0b', fontWeight: '800', offset: 10 }} />
          <ReferenceLine y={mean - 2 * sd} stroke="#f59e0b" strokeDasharray="6 4" strokeWidth={1.5} label={{ position: 'right', value: '-2SD', fontSize: 10, fill: '#f59e0b', fontWeight: '800', offset: 10 }} />
          
          {/* ±3SD - Lỗi hệ thống */}
          <ReferenceLine y={mean + 3 * sd} stroke="#ef4444" strokeWidth={2} label={{ position: 'right', value: '+3SD', fontSize: 10, fill: '#ef4444', fontWeight: '900', offset: 10 }} />
          <ReferenceLine y={mean - 3 * sd} stroke="#ef4444" strokeWidth={2} label={{ position: 'right', value: '-3SD', fontSize: 10, fill: '#ef4444', fontWeight: '900', offset: 10 }} />
          
          {/* ±4SD - Giới hạn kiểm soát rộng */}
          <ReferenceLine y={mean + 4 * sd} stroke="#991b1b" strokeWidth={1} strokeDasharray="3 3" label={{ position: 'right', value: '+4SD', fontSize: 9, fill: '#991b1b', fontWeight: '700', offset: 10 }} />
          <ReferenceLine y={mean - 4 * sd} stroke="#991b1b" strokeWidth={1} strokeDasharray="3 3" label={{ position: 'right', value: '-4SD', fontSize: 9, fill: '#991b1b', fontWeight: '700', offset: 10 }} />

          {/* ±5SD - Giới hạn kịch khung */}
          <ReferenceLine y={mean + 5 * sd} stroke="#450a0a" strokeWidth={1} strokeDasharray="2 2" label={{ position: 'right', value: '+5SD', fontSize: 8, fill: '#450a0a', fontWeight: '600', offset: 10 }} />
          <ReferenceLine y={mean - 5 * sd} stroke="#450a0a" strokeWidth={1} strokeDasharray="2 2" label={{ position: 'right', value: '-5SD', fontSize: 8, fill: '#450a0a', fontWeight: '600', offset: 10 }} />

          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#2563eb" 
            strokeWidth={4} 
            dot={{ r: 7, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 10, fill: '#1d4ed8', strokeWidth: 3, stroke: '#fff' }}
            animationDuration={1200}
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const RegulatoryAdvisor = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string; sources?: any[] }[]>([
    { role: 'model', text: 'Chào bạn! Tôi là trợ lý AI MinhDucLab. Bạn cần hỗ trợ gì về các quy định nội kiểm QC, tiêu chuẩn 2429 hay Six Sigma không?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userText = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: userText }] }],
        config: {
          systemInstruction: `Bạn là chuyên gia về quản lý chất lượng (QC) và Six Sigma trong phòng xét nghiệm y học tại Việt Nam. Trả lời súc tích, chuyên nghiệp.`,
          tools: [{ googleSearch: {} }]
        }
      });
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const aiText = response.text || "Xin lỗi, tôi không thể xử lý câu trả lời ngay bây giờ.";
      setMessages(prev => [...prev, { role: 'model', text: aiText, sources: groundingChunks }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: 'Lỗi kết nối AI.' }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  return (
    <div className="flex flex-col h-[500px] md:h-[600px] bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white overflow-hidden animate-in fade-in zoom-in duration-500">
      <div className="bg-slate-900 p-5 text-white flex justify-between items-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-transparent"></div>
        <h3 className="font-black text-sm flex items-center gap-3 relative z-10">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-white animate-pulse"><i className="fas fa-brain"></i></div>
          Cố vấn AI 2429
        </h3>
        <span className="text-[10px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full border border-blue-500/30 relative z-10">Trợ lý Thông minh</span>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 text-xs md:text-sm custom-scrollbar">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[85%] p-4 rounded-[1.5rem] shadow-sm relative ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-slate-100 rounded-bl-none text-slate-700'}`}>
              <div className="whitespace-pre-wrap leading-relaxed font-medium">{m.text}</div>
              {m.sources && m.sources.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100/50">
                   <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Nguồn tham khảo:</p>
                   {m.sources.map((s, idx) => s.web && (
                     <a key={idx} href={s.web.uri} target="_blank" className="text-[10px] text-blue-500 block hover:underline truncate"><i className="fas fa-link mr-1"></i> {s.web.title}</a>
                   ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="bg-white p-4 rounded-[1.5rem] rounded-bl-none shadow-sm flex items-center gap-2">
               <div className="flex gap-1"><div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.1s]"></div><div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.2s]"></div></div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Đang xử lý...</span>
             </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="p-4 bg-white/50 backdrop-blur-md border-t flex gap-3 items-center">
        <input className="flex-1 bg-slate-100/80 rounded-2xl px-5 py-3 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="Hỏi về Westgard, Sigma, 2429..." value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMessage()} />
        <button onClick={sendMessage} className="bg-blue-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center hover:bg-blue-700 hover:scale-105 transition-all shadow-lg shadow-blue-600/30"><i className="fas fa-paper-plane"></i></button>
      </div>
    </div>
  );
};

// --- TestEntryCard Component ---
const TestEntryCard: React.FC<{ 
  test: LabTest; 
  entryData: Record<QCLevel, { value: string; action: string; sdDiff: number }>;
  onUpdate: (level: QCLevel, field: 'value' | 'action', value: string) => void;
  onSave: () => void;
}> = ({ test, entryData, onUpdate, onSave }) => {
  return (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col h-full hover:shadow-2xl transition-all duration-300 group">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="font-black text-slate-900 tracking-tight text-lg group-hover:text-blue-600 transition-colors">{test.name}</h4>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{test.unit}</span>
        </div>
        <div className="bg-blue-50 text-blue-600 w-10 h-10 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all"><i className="fas fa-vial"></i></div>
      </div>
      <div className="space-y-4 flex-1">
        {Object.values(QCLevel).map(lvl => {
          const { value, action, sdDiff } = entryData[lvl];
          const hasError = sdDiff >= 3;
          const hasWarning = sdDiff >= 2;
          return (
            <div key={lvl} className={`p-4 rounded-[1.5rem] border transition-all duration-500 relative overflow-hidden ${hasError ? 'bg-red-50 border-red-200' : hasWarning ? 'bg-orange-50 border-orange-200' : 'bg-slate-50 border-slate-100 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/5'}`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest opacity-60">Mức: {lvl}</span>
                {hasWarning && <div className={`w-2 h-2 rounded-full animate-ping ${hasError ? 'bg-red-600' : 'bg-orange-500'}`}></div>}
              </div>
              <input type="number" placeholder="0.00" className="w-full bg-transparent font-black text-2xl outline-none text-slate-800" value={value} onChange={e => onUpdate(lvl, 'value', e.target.value)} />
              {hasWarning && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <textarea className="w-full mt-3 bg-white/60 backdrop-blur-sm p-3 rounded-xl text-[11px] outline-none border border-slate-200/50 focus:border-blue-500 h-16 transition-all shadow-inner" placeholder="Hành động khắc phục..." value={action} onChange={e => onUpdate(lvl, 'action', e.target.value)} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button onClick={onSave} className="mt-6 w-full bg-slate-100 text-slate-900 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-3 active:scale-95"><i className="fas fa-check"></i> Lưu riêng {test.name}</button>
    </div>
  );
};

// --- Main App ---

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [tests, setTests] = useState<LabTest[]>(() => {
    const saved = localStorage.getItem('mdlab_tests');
    return saved ? JSON.parse(saved) : INITIAL_TESTS;
  });
  const [results, setResults] = useState<QCResult[]>(() => {
    const saved = localStorage.getItem('mdlab_results');
    return saved ? JSON.parse(saved) : MOCK_RESULTS;
  });
  const [selectedTestId, setSelectedTestId] = useState(tests[0]?.id || INITIAL_TESTS[0].id);
  const [selectedLevel, setSelectedLevel] = useState<QCLevel>(QCLevel.NORMAL);
  const [hoveredResultData, setHoveredResultData] = useState<any | null>(null);

  const [bulkEntries, setBulkEntries] = useState<Record<string, Record<QCLevel, { value: string; action: string; sdDiff: number }>>>(() => {
    const initialState: any = {};
    tests.forEach(test => {
      initialState[test.id] = { [QCLevel.LOW]: { value: '', action: '', sdDiff: 0 }, [QCLevel.NORMAL]: { value: '', action: '', sdDiff: 0 }, [QCLevel.HIGH]: { value: '', action: '', sdDiff: 0 } };
    });
    return initialState;
  });

  useEffect(() => {
    setIsLoaded(true);
    localStorage.setItem('mdlab_tests', JSON.stringify(tests));
  }, [tests]);

  useEffect(() => {
    localStorage.setItem('mdlab_results', JSON.stringify(results));
  }, [results]);

  const activeTest = useMemo(() => tests.find(t => t.id === selectedTestId) || tests[0], [tests, selectedTestId]);
  const activeConfig = useMemo(() => activeTest.configs[selectedLevel], [activeTest, selectedLevel]);
  const filteredResults = useMemo(() => results.filter(r => r.testId === selectedTestId && r.level === selectedLevel), [results, selectedTestId, selectedLevel]);
  
  const sigmaMetrics = useMemo(() => {
    const config = activeConfig;
    const cv = config.mean !== 0 ? (config.sd / config.mean) * 100 : 0;
    const sigma = cv !== 0 ? (activeTest.tea - config.bias) / cv : 0;
    let status = "Kém", color = "text-red-400";
    if (sigma >= 6) { status = "Đẳng cấp Thế giới"; color = "text-blue-400"; }
    else if (sigma >= 5) { status = "Rất tốt"; color = "text-emerald-400"; }
    else if (sigma >= 4) { status = "Tốt"; color = "text-green-400"; }
    else if (sigma >= 3) { status = "Tạm đạt"; color = "text-orange-400"; }
    return { sigma: Number(sigma.toFixed(2)), cv: cv.toFixed(2), status, color };
  }, [activeTest, selectedLevel, activeConfig]);

  const handleUpdateEntry = (testId: string, level: QCLevel, field: 'value' | 'action', val: string) => {
    setBulkEntries(prev => {
      const currentEntry = prev[testId][level];
      const nextEntry = { ...currentEntry, [field]: val };
      if (field === 'value') {
        const num = parseFloat(val);
        const test = tests.find(t => t.id === testId);
        if (test && !isNaN(num)) {
          const config = test.configs[level];
          nextEntry.sdDiff = Math.abs((num - config.mean) / (config.sd || 0.1));
        } else nextEntry.sdDiff = 0;
      }
      return { ...prev, [testId]: { ...prev[testId], [level]: nextEntry } };
    });
  };

  const handleSaveAll = () => {
    const allNewResults: QCResult[] = [];
    const now = Date.now();
    let totalSaved = 0;
    const updatedEntries = { ...bulkEntries };

    for (const testId of Object.keys(bulkEntries)) {
      const testEntry = bulkEntries[testId];
      const testResults: QCResult[] = [];
      let hasViolationWithoutAction = false;

      Object.values(QCLevel).forEach(lvl => {
        const data = testEntry[lvl];
        if (data.value && !isNaN(parseFloat(data.value))) {
          if (data.sdDiff >= 2 && !data.action.trim()) {
             hasViolationWithoutAction = true;
          }
          testResults.push({ 
            id: Math.random().toString(36).substr(2, 9), 
            testId, 
            level: lvl, 
            value: parseFloat(data.value), 
            timestamp: Date.now(), 
            correctiveAction: data.action || (data.sdDiff >= 2 ? "Chưa ghi chú hành động" : "") 
          });
        }
      });

      if (testResults.length > 0) {
        if (hasViolationWithoutAction) {
          const proceed = confirm(`Xét nghiệm ${tests.find(t => t.id === testId)?.name} có giá trị ngoại lai (>=2SD) nhưng thiếu hành động khắc phục. Bạn vẫn muốn lưu?`);
          if (!proceed) continue;
        }
        allNewResults.push(...testResults);
        totalSaved++;
        updatedEntries[testId] = { [QCLevel.LOW]: { value: '', action: '', sdDiff: 0 }, [QCLevel.NORMAL]: { value: '', action: '', sdDiff: 0 }, [QCLevel.HIGH]: { value: '', action: '', sdDiff: 0 } };
      }
    }

    if (allNewResults.length > 0) {
      setResults(prev => [...prev, ...allNewResults]);
      setBulkEntries(updatedEntries);
      alert(`Đã lưu thành công ${allNewResults.length} kết quả mới.`);
      setActiveTab('dashboard');
    } else {
      alert("Vui lòng nhập ít nhất một kết quả hợp lệ.");
    }
  };

  const MenuItems = [
    { id: 'dashboard', label: 'Báo cáo Sigma', icon: 'fa-chart-pie' },
    { id: 'entry', label: 'Nhập kết quả tổng hợp', icon: 'fa-edit' },
    { id: 'config', label: 'Cấu hình xét nghiệm', icon: 'fa-sliders-h' },
    { id: 'advisor', label: 'Cố vấn AI 2429', icon: 'fa-user-md' },
  ];

  return (
    <div className={`flex min-h-screen bg-slate-50 transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
      <aside className={`fixed inset-y-0 left-0 w-72 bg-slate-900/95 backdrop-blur-xl text-slate-300 z-50 transform transition-transform duration-500 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
        <div className="p-8 flex items-center gap-4"><div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg"><i className="fas fa-microscope text-white text-xl"></i></div><div><h1 className="text-white font-black text-xl tracking-tighter leading-none">MinhDucLab</h1><p className="text-[9px] text-blue-400 font-black uppercase tracking-[0.2em] mt-1 opacity-80">Quản lý chất lượng</p></div></div>
        <nav className="p-4 space-y-3 flex-1 relative mt-4">{MenuItems.map(item => (<button key={item.id} onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all relative overflow-hidden ${activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'hover:bg-white/5'}`}><i className={`fas ${item.icon}`}></i><span className="font-bold text-sm">{item.label}</span>{activeTab === item.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-white animate-in slide-in-from-left duration-300"></div>}</button>))}</nav>
      </aside>
      <main className="flex-1 w-full max-w-full overflow-x-hidden relative flex flex-col">
        <header className="sticky top-0 z-30 bg-white/60 backdrop-blur-md border-b border-slate-200/50 px-6 py-4 flex items-center justify-between">
           <div className="flex items-center gap-4"><button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"><i className="fas fa-bars"></i></button><h2 className="hidden md:block text-2xl font-black text-slate-900 tracking-tight capitalize">{MenuItems.find(m => m.id === activeTab)?.label}</h2></div>
           <div className="flex items-center gap-3">
              {activeTab === 'entry' ? (
                <button onClick={handleSaveAll} className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg active:scale-95 flex items-center gap-2"><i className="fas fa-save"></i> Lưu tất cả</button>
              ) : (
                <>
                  <div className="hidden md:flex gap-1 p-1 bg-slate-100/50 rounded-2xl border border-slate-200">{Object.values(QCLevel).map(lvl => (<button key={lvl} onClick={() => setSelectedLevel(lvl)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${selectedLevel === lvl ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-500 hover:bg-white/40'}`}>{lvl}</button>))}</div>
                  <select value={selectedTestId} onChange={e => setSelectedTestId(e.target.value)} className="bg-slate-900 text-white border-none px-4 py-2.5 rounded-2xl font-bold text-xs outline-none cursor-pointer hover:bg-slate-800 shadow-lg shadow-slate-900/20">{tests.map(t => <option key={t.id} value={t.id} className="bg-white text-slate-900">{t.name}</option>)}</select>
                </>
              )}
           </div>
        </header>
        <div className="p-6 md:p-10 max-w-7xl mx-auto w-full flex-1">
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-6 fade-in duration-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-slate-900 rounded-[3rem] p-8 md:p-12 text-white relative overflow-hidden group shadow-2xl">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                  <div className="relative z-10">
                    <span className="text-[10px] font-black uppercase text-blue-400 tracking-[0.3em] mb-4 block">Hiệu năng Sigma hiện tại</span>
                    <h4 className="text-7xl md:text-9xl font-black tracking-tighter tabular-nums mb-4 flex items-baseline gap-4"><AnimatedNumber value={sigmaMetrics.sigma} /><span className="text-xl text-white/30 font-bold uppercase tracking-widest">σ</span></h4>
                    <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 border border-white/20 text-[11px] font-black uppercase tracking-widest ${sigmaMetrics.color}`}>{sigmaMetrics.status}</div>
                  </div>
                </div>
                <div className="bg-white/80 backdrop-blur-md p-8 rounded-[3rem] border border-white shadow-xl flex flex-col justify-center gap-6">
                  <h5 className="text-slate-400 text-[10px] font-black uppercase tracking-widest border-b pb-4">Thang đo chất lượng</h5>
                  <div className="space-y-4">{[{ label: 'Thế giới', val: '6σ+', col: 'text-blue-500' }, { label: 'Rất tốt', val: '5σ', col: 'text-emerald-500' }, { label: 'Tốt', val: '4σ', col: 'text-green-500' }, { label: 'Tạm đạt', val: '3σ', col: 'text-orange-500' }].map(row => (<div key={row.label} className="flex justify-between items-center group"><span className={`text-[11px] font-black uppercase ${row.col} group-hover:translate-x-1 transition-transform`}>{row.label}</span><span className="text-slate-800 font-black tabular-nums">{row.val}</span></div>))}</div>
                </div>
              </div>
              <LeveyJenningsChart results={filteredResults} config={activeConfig} unit={activeTest.unit} title={`Biểu đồ kiểm soát ${activeTest.name} - ${selectedLevel}`} onHover={setHoveredResultData} />
              <div className="bg-white/60 backdrop-blur-md rounded-[2.5rem] shadow-xl border border-white overflow-hidden">
                 <div className="p-6 border-b border-white flex items-center justify-between bg-white/40"><h3 className="font-black text-slate-800 flex items-center gap-3 text-sm"><div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500"><i className="fas fa-history"></i></div>Lịch sử phân tích</h3></div>
                 <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left">
                       <thead className="text-[10px] font-black uppercase text-slate-400 tracking-widest bg-slate-50/50"><tr><th className="p-6">Thời gian</th><th className="p-6">Kết quả</th><th className="p-6">Độ lệch (SD)</th><th className="p-6">Xử lý khắc phục</th></tr></thead>
                       <tbody className="divide-y divide-slate-100">{filteredResults.length === 0 ? (<tr><td colSpan={4} className="p-16 text-center text-slate-300 italic font-medium">Chưa có dữ liệu phân tích.</td></tr>) : (filteredResults.slice().sort((a,b) => b.timestamp - a.timestamp).map(r => { const sdDiff = (r.value - activeConfig.mean) / (activeConfig.sd || 0.1); return (<tr key={r.id} className="hover:bg-blue-50/50 transition-colors group/row"><td className="p-6 whitespace-nowrap text-xs text-slate-500 font-bold">{new Date(r.timestamp).toLocaleString('vi-VN')}</td><td className="p-6 font-black text-slate-900 text-lg">{r.value} <span className="text-[10px] text-slate-400 font-bold">{activeTest.unit}</span></td><td className="p-6"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase inline-block ${Math.abs(sdDiff) >= 3 ? 'bg-red-500 text-white' : Math.abs(sdDiff) >= 2 ? 'bg-orange-500 text-white' : 'bg-emerald-100 text-emerald-600'}`}>{sdDiff > 0 ? '+' : ''}{sdDiff.toFixed(2)} SD</span></td><td className="p-6 max-w-xs">{r.correctiveAction ? (<div className="text-[11px] font-medium text-slate-600 bg-white/50 p-3 rounded-xl border border-slate-100 italic shadow-inner">"{r.correctiveAction}"</div>) : (<span className="text-[10px] font-bold text-slate-300 italic opacity-50">— Không có yêu cầu</span>)}</td></tr>);}))}</tbody>
                    </table>
                 </div>
              </div>
            </div>
          )}
          {activeTab === 'entry' && (<div className="space-y-8 animate-in slide-in-from-bottom-6 duration-700"><div className="flex flex-col md:flex-row justify-between items-center bg-blue-600 p-8 rounded-[3rem] border border-blue-400 shadow-2xl text-white relative overflow-hidden group"><div className="relative z-10 text-center md:text-left mb-4 md:mb-0"><h3 className="text-2xl font-black tracking-tight mb-2">Bảng nhập liệu tổng hợp</h3><p className="text-xs text-blue-100 font-medium opacity-80 uppercase tracking-widest">Ghi kết quả nhanh cho toàn bộ hệ thống</p></div><button onClick={handleSaveAll} className="relative z-10 bg-white text-blue-600 px-10 py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"><i className="fas fa-check-double"></i> Lưu tất cả</button></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{tests.map(test => (<TestEntryCard key={test.id} test={test} entryData={bulkEntries[test.id]} onUpdate={(lvl, field, val) => handleUpdateEntry(test.id, lvl, field, val)} onSave={() => { handleSaveAll(); }} />))}</div></div>)}
          {activeTab === 'config' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-6 duration-700">{tests.map(test => (<div key={test.id} className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 hover:shadow-2xl transition-all group"><div className="flex items-center justify-between mb-8"><div><h4 className="font-black text-xl text-slate-900 group-hover:text-blue-600 transition-colors">{test.name}</h4><span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest mt-2 block">TEa mục tiêu: {test.tea}%</span></div></div><div className="space-y-4">{Object.values(QCLevel).map(lvl => (<div key={lvl} className="p-6 rounded-[2rem] bg-slate-50/50 border border-slate-100 group-hover:bg-white group-hover:border-blue-100 transition-all"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 block">Cấu hình spec: {lvl}</span><div className="grid grid-cols-3 gap-4">{[{ label: 'Mean', field: 'mean' as keyof QCConfig }, { label: 'SD', field: 'sd' as keyof QCConfig }, { label: 'Bias', field: 'bias' as keyof QCConfig }].map(item => (<div key={item.label} className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">{item.label}</label><input type="number" step="0.01" value={test.configs[lvl][item.field]} onChange={(e) => setTests(prev => prev.map(t => t.id === test.id ? {...t, configs: {...t.configs, [lvl]: {...t.configs[lvl], [item.field]: parseFloat(e.target.value)}}} : t))} className="w-full bg-white border border-slate-200/50 p-3 rounded-xl text-xs font-black outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-inner" /></div>))}</div></div>))}</div></div>))}</div>)}
          {activeTab === 'advisor' && <RegulatoryAdvisor />}
        </div>
      </main>
    </div>
  );
};

const style = document.createElement('style');
style.textContent = `.custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } .fade-in { animation: fadeIn 0.5s ease-out; }`;
document.head.appendChild(style);

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
