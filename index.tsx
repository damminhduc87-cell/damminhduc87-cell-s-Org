
import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine 
} from 'recharts';
import { INITIAL_TESTS, MOCK_RESULTS } from './constants';
import { QCLevel, LabTest, QCResult, QCConfig } from './types';

// --- Components ---

const LeveyJenningsChart = ({ 
  results, 
  config, 
  unit, 
  title, 
  onHover 
}: { 
  results: QCResult[], 
  config: { mean: number; sd: number; bias: number }, 
  unit: string, 
  title: string,
  onHover: (data: any | null) => void
}) => {
  const chartData = useMemo(() => {
    return results.sort((a, b) => a.timestamp - b.timestamp).map(r => ({
      date: new Date(r.timestamp).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
      value: r.value,
      fullDate: new Date(r.timestamp).toLocaleString('vi-VN'),
      raw: r
    }));
  }, [results]);

  const { mean, sd } = config;
  const yDomain = [Number((mean - 4 * sd).toFixed(2)), Number((mean + 4 * sd).toFixed(2))];

  return (
    <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 h-[400px] md:h-[500px] chart-container transition-all relative overflow-hidden">
      <div className="flex justify-between items-center mb-4 md:mb-6">
        <h3 className="text-sm md:text-lg font-bold text-slate-800 flex items-center gap-2">
          <i className="fas fa-wave-square text-blue-500"></i> {title}
        </h3>
        <div className="flex gap-1 md:gap-2 text-[8px] md:text-[10px] font-bold uppercase">
          <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded">±3SD</span>
          <span className="bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded">±2SD</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart 
          data={chartData} 
          margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
          onMouseMove={(state: any) => {
            if (state && state.activePayload && state.activePayload.length > 0) {
              onHover(state.activePayload[0].payload);
            }
          }}
          onMouseLeave={() => onHover(null)}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{fontSize: 10}} tickMargin={10} />
          <YAxis domain={yDomain} tick={{fontSize: 10}} />
          <Tooltip content={() => null} />
          
          <ReferenceLine y={mean} stroke="#1e293b" strokeWidth={2} label={{ position: 'right', value: 'M', fontSize: 9, fill: '#1e293b' }} />
          <ReferenceLine y={mean + 2 * sd} stroke="#f97316" strokeDasharray="5 5" label={{ position: 'right', value: '+2', fontSize: 9, fill: '#f97316' }} />
          <ReferenceLine y={mean - 2 * sd} stroke="#f97316" strokeDasharray="5 5" label={{ position: 'right', value: '-2', fontSize: 9, fill: '#f97316' }} />
          <ReferenceLine y={mean + 3 * sd} stroke="#ef4444" strokeWidth={1} label={{ position: 'right', value: '+3', fontSize: 9, fill: '#ef4444' }} />
          <ReferenceLine y={mean - 3 * sd} stroke="#ef4444" strokeWidth={1} label={{ position: 'right', value: '-3', fontSize: 9, fill: '#ef4444' }} />

          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#2563eb" 
            strokeWidth={2} 
            dot={{ r: 4, fill: '#2563eb', strokeWidth: 1, stroke: '#fff' }}
            activeDot={{ r: 6, fill: '#1e40af' }}
            animationDuration={1000}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const RegulatoryAdvisor = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    { role: 'model', text: 'Chào bạn! Tôi là trợ lý AI MinhDucLab. Bạn cần hỗ trợ gì về QC hay Six Sigma không?' }
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
        contents: userText,
        config: {
          systemInstruction: `Bạn là chuyên gia QC Lab Việt Nam. Trả lời súc tích, chuyên nghiệp.`,
          tools: [{ googleSearch: {} }]
        }
      });
      setMessages(prev => [...prev, { role: 'model', text: response.text || 'Lỗi.' }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: 'Lỗi kết nối.' }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  return (
    <div className="flex flex-col h-[500px] md:h-[600px] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-900 p-4 text-white">
        <h3 className="font-bold text-sm flex items-center gap-2"><i className="fas fa-brain text-blue-400"></i> Cố vấn AI</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 text-xs md:text-sm">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] p-3 rounded-xl ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200'}`}>
              <div className="whitespace-pre-wrap">{m.text}</div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <div className="p-3 border-t bg-white flex gap-2">
        <input className="flex-1 bg-slate-100 rounded-lg px-3 py-2 text-sm outline-none" placeholder="Hỏi AI..." value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendMessage()} />
        <button onClick={sendMessage} className="bg-blue-600 text-white p-2 rounded-lg"><i className="fas fa-paper-plane"></i></button>
      </div>
    </div>
  );
};

// --- Main App ---

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tests, setTests] = useState<LabTest[]>(INITIAL_TESTS);
  const [results, setResults] = useState<QCResult[]>(MOCK_RESULTS);
  const [selectedTestId, setSelectedTestId] = useState(INITIAL_TESTS[0].id);
  const [selectedLevel, setSelectedLevel] = useState<QCLevel>(QCLevel.NORMAL);
  const [hoveredResultData, setHoveredResultData] = useState<any | null>(null);

  const [newValue, setNewValue] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

  const activeTest = tests.find(t => t.id === selectedTestId) || tests[0];
  const filteredResults = results.filter(r => r.testId === selectedTestId && r.level === selectedLevel);
  
  const sigmaMetrics = useMemo(() => {
    const config = activeTest.configs[selectedLevel];
    const cv = config.mean !== 0 ? (config.sd / config.mean) * 100 : 0;
    const sigma = cv !== 0 ? (activeTest.tea - config.bias) / cv : 0;
    let status = "Kém";
    if (sigma >= 6) status = "Thế giới";
    else if (sigma >= 5) status = "Rất tốt";
    else if (sigma >= 4) status = "Tốt";
    else if (sigma >= 3) status = "Tạm";
    return { sigma: sigma.toFixed(2), cv: cv.toFixed(2), status };
  }, [activeTest, selectedLevel]);

  const handleAddResult = () => {
    if (!newValue || isNaN(Number(newValue))) return;
    const res: QCResult = {
      id: Math.random().toString(36).substr(2, 9),
      testId: selectedTestId,
      level: selectedLevel,
      value: Number(newValue),
      timestamp: new Date(newDate).getTime()
    };
    setResults([...results, res]);
    setNewValue('');
    setActiveTab('dashboard');
  };

  const handleUpdateConfig = (testId: string, level: QCLevel, field: keyof QCConfig, val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    setTests(prev => prev.map(t => {
      if (t.id === testId) {
        return { ...t, configs: { ...t.configs, [level]: { ...t.configs[level], [field]: num } } };
      }
      return t;
    }));
  };

  const MenuItems = [
    { id: 'dashboard', label: 'Dashboard Sigma', icon: 'fa-chart-pie' },
    { id: 'entry', label: 'Nhập kết quả QC', icon: 'fa-edit' },
    { id: 'config', label: 'Cấu hình Sigma/QC', icon: 'fa-sliders-h' },
    { id: 'advisor', label: 'Cố vấn AI 2429', icon: 'fa-user-md' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 relative overflow-x-hidden">
      {/* Overlay cho mobile khi mở sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Drawer cho mobile */}
      <aside className={`
        fixed inset-y-0 left-0 w-72 bg-slate-900 text-slate-300 z-50 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-8 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl"><i className="fas fa-microscope text-white"></i></div>
            <h1 className="text-white font-bold text-xl">MinhDucLab</h1>
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase mt-2">Six Sigma Management</p>
        </div>
        <nav className="p-4 space-y-2">
          {MenuItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
                activeTab === item.id ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'
              }`}
            >
              <i className={`fas ${item.icon}`}></i>
              <span className="font-semibold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-full overflow-x-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-600">
            <i className="fas fa-bars text-xl"></i>
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 w-8 h-8 rounded-lg flex items-center justify-center"><i className="fas fa-microscope text-white text-xs"></i></div>
            <span className="font-bold text-slate-800 text-sm">MinhDucLab</span>
          </div>
          <div className="w-10"></div> {/* Spacer */}
        </header>

        <div className="p-4 md:p-10 max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="mb-6 md:mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-3xl font-black text-slate-900">
                {MenuItems.find(m => m.id === activeTab)?.label}
              </h2>
            </div>
            
            {/* Quick Filter Bar */}
            <div className="flex flex-wrap gap-2 p-1 bg-white rounded-xl shadow-sm border border-slate-200">
              <select value={selectedTestId} onChange={e => setSelectedTestId(e.target.value)} className="bg-slate-50 border-none px-3 py-2 rounded-lg font-bold text-xs outline-none">
                {tests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <div className="flex gap-1 overflow-x-auto no-scrollbar">
                {Object.values(QCLevel).map(lvl => (
                  <button key={lvl} onClick={() => setSelectedLevel(lvl)} className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase whitespace-nowrap ${selectedLevel === lvl ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 bg-gradient-to-br from-indigo-700 to-blue-900 p-6 md:p-8 rounded-3xl shadow-xl text-white">
                  <span className="text-[10px] font-black uppercase text-blue-200">Sigma Metric</span>
                  <div className="flex items-end justify-between mt-4">
                    <div>
                      <h4 className="text-5xl md:text-6xl font-black">{sigmaMetrics.sigma}</h4>
                      <div className="inline-block mt-2 px-3 py-1 rounded-lg bg-white/10 border border-white/20 text-xs font-bold uppercase">{sigmaMetrics.status}</div>
                    </div>
                    <div className="text-right border-l border-white/20 pl-4 md:pl-8">
                      <p className="text-[8px] md:text-[10px] text-blue-300 font-black uppercase">CV: {sigmaMetrics.cv}%</p>
                      <p className="text-[8px] md:text-[10px] text-blue-300 font-black uppercase">TEa: {activeTest.tea}%</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hidden md:flex flex-col justify-center">
                  <h5 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-4">Thang đo Sigma</h5>
                  <div className="space-y-2 text-[10px] font-bold">
                    <div className="flex justify-between"><span className="text-blue-500">World Class</span><span>6σ+</span></div>
                    <div className="flex justify-between"><span className="text-emerald-500">Excellent</span><span>5σ</span></div>
                    <div className="flex justify-between"><span className="text-green-500">Good</span><span>4σ</span></div>
                  </div>
                </div>
              </div>
              <LeveyJenningsChart results={filteredResults} config={activeTest.configs[selectedLevel]} unit={activeTest.unit} title={`${activeTest.name} - ${selectedLevel}`} onHover={setHoveredResultData} />
            </div>
          )}

          {activeTab === 'entry' && (
            <div className="max-w-md mx-auto bg-white p-6 md:p-10 rounded-3xl shadow-xl border border-slate-100">
              <h3 className="text-lg md:text-2xl font-black text-center mb-6">Nhập IQC</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Xét nghiệm</label>
                    <select className="w-full bg-slate-50 p-3 rounded-xl font-bold border-none text-xs" value={selectedTestId} onChange={e=>setSelectedTestId(e.target.value)}>{tests.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Mức</label>
                    <select className="w-full bg-slate-50 p-3 rounded-xl font-bold border-none text-xs" value={selectedLevel} onChange={e=>setSelectedLevel(e.target.value as QCLevel)}>{Object.values(QCLevel).map(l=><option key={l} value={l}>{l}</option>)}</select>
                  </div>
                </div>
                <div className="space-y-1 text-center">
                  <label className="text-[10px] font-black text-slate-400 uppercase block">Giá trị ({activeTest.unit})</label>
                  <input type="number" step="0.01" className="w-full bg-slate-50 p-4 md:p-6 rounded-2xl font-black text-2xl md:text-4xl text-blue-600 border-none text-center" placeholder="0.00" value={newValue} onChange={e=>setNewValue(e.target.value)} />
                </div>
                <button onClick={handleAddResult} className="w-full bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg mt-4">Lưu kết quả</button>
              </div>
            </div>
          )}

          {activeTab === 'config' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-10">
              {tests.map(test => (
                <div key={test.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="font-black text-slate-900">{test.name}</h4>
                    <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-lg text-[8px] font-bold uppercase">TEa: {test.tea}%</span>
                  </div>
                  <div className="space-y-4">
                    {Object.values(QCLevel).map(lvl => (
                      <div key={lvl} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase">Mức {lvl}</span>
                          <span className="text-[8px] font-bold text-orange-600">2SD: {(test.configs[lvl].sd * 2).toFixed(2)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input type="number" step="0.01" value={test.configs[lvl].mean} onChange={(e) => handleUpdateConfig(test.id, lvl, 'mean', e.target.value)} className="bg-white border p-2 rounded-lg text-xs font-black outline-none" placeholder="Mean" />
                          <input type="number" step="0.01" value={test.configs[lvl].sd} onChange={(e) => handleUpdateConfig(test.id, lvl, 'sd', e.target.value)} className="bg-white border p-2 rounded-lg text-xs font-black outline-none" placeholder="SD" />
                          <input type="number" step="0.01" value={test.configs[lvl].bias} onChange={(e) => handleUpdateConfig(test.id, lvl, 'bias', e.target.value)} className="bg-white border p-2 rounded-lg text-xs font-black text-orange-600" placeholder="Bias" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'advisor' && <RegulatoryAdvisor />}
        </div>
      </main>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
