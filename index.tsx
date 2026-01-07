
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
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-[500px] chart-container transition-all relative overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <i className="fas fa-wave-square text-blue-500"></i> Biểu đồ Levey-Jennings: {title}
        </h3>
        <div className="flex gap-2 text-[10px] font-bold uppercase">
          <span className="bg-red-50 text-red-600 px-2 py-1 rounded">±3SD Lỗi</span>
          <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded">±2SD Cảnh báo</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <LineChart 
          data={chartData} 
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          onMouseMove={(state: any) => {
            if (state && state.activePayload && state.activePayload.length > 0) {
              onHover(state.activePayload[0].payload);
            }
          }}
          onMouseLeave={() => onHover(null)}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tick={{fontSize: 11}} tickMargin={10} />
          <YAxis domain={yDomain} tick={{fontSize: 11}} label={{ value: unit, angle: -90, position: 'insideLeft', offset: 10 }} />
          <Tooltip content={() => null} />
          
          <ReferenceLine y={mean} stroke="#1e293b" strokeWidth={2} label={{ position: 'right', value: 'Mean', fontSize: 10, fill: '#1e293b' }} />
          <ReferenceLine y={mean + sd} stroke="#94a3b8" strokeDasharray="3 3" label={{ position: 'right', value: '+1SD', fontSize: 10, fill: '#94a3b8' }} />
          <ReferenceLine y={mean - sd} stroke="#94a3b8" strokeDasharray="3 3" label={{ position: 'right', value: '-1SD', fontSize: 10, fill: '#94a3b8' }} />
          <ReferenceLine y={mean + 2 * sd} stroke="#f97316" strokeDasharray="5 5" label={{ position: 'right', value: '+2SD', fontSize: 10, fill: '#f97316' }} />
          <ReferenceLine y={mean - 2 * sd} stroke="#f97316" strokeDasharray="5 5" label={{ position: 'right', value: '-2SD', fontSize: 10, fill: '#f97316' }} />
          <ReferenceLine y={mean + 3 * sd} stroke="#ef4444" strokeWidth={1} label={{ position: 'right', value: '+3SD', fontSize: 10, fill: '#ef4444' }} />
          <ReferenceLine y={mean - 3 * sd} stroke="#ef4444" strokeWidth={1} label={{ position: 'right', value: '-3SD', fontSize: 10, fill: '#ef4444' }} />

          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#2563eb" 
            strokeWidth={3} 
            dot={{ r: 5, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
            activeDot={{ r: 8, fill: '#1e40af', strokeWidth: 4, stroke: 'rgba(37, 99, 235, 0.2)' }}
            animationDuration={1000}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const RegulatoryAdvisor = () => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([
    { role: 'model', text: 'Chào bạn! Tôi là trợ lý AI MinhDucLab. Tôi có thể giải đáp về Westgard, cách tính SD từ khoảng giới hạn của nhà sản xuất, hoặc Quyết định 2429. Bạn cần hỗ trợ gì?' }
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
          systemInstruction: `Bạn là chuyên gia QC Lab. Nếu user hỏi về khoảng giới hạn NSX (ví dụ +/- 2SD), hãy hướng dẫn họ: SD = (Giới hạn trên - Mean) / 2. Trả lời bằng tiếng Việt, Markdown.`,
          tools: [{ googleSearch: {} }]
        }
      });
      
      let text = response.text || 'Lỗi xử lý.';
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks && groundingChunks.length > 0) {
        const links = groundingChunks
          .map((chunk: any) => chunk.web ? `[${chunk.web.title}](${chunk.web.uri})` : null)
          .filter(Boolean);
        if (links.length > 0) {
          text += '\n\n**Nguồn tham khảo:**\n' + links.join('\n');
        }
      }
      setMessages(prev => [...prev, { role: 'model', text }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: 'Có lỗi kết nối AI.' }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2"><i className="fas fa-brain text-blue-400"></i> Cố vấn AI MinhDucLab</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 text-sm">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl ${m.role === 'user' ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-800 shadow-sm'}`}>
              <div className="whitespace-pre-wrap">{m.text}</div>
            </div>
          </div>
        ))}
        {loading && <div className="text-slate-400 text-xs italic animate-pulse px-4">AI đang phân tích...</div>}
        <div ref={chatEndRef} />
      </div>
      <div className="p-4 border-t border-slate-100 bg-white flex gap-2">
        <input 
          className="flex-1 bg-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Hỏi AI..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage} className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700">
          <i className="fas fa-paper-plane"></i>
        </button>
      </div>
    </div>
  );
};

// --- Main App ---

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tests, setTests] = useState<LabTest[]>(INITIAL_TESTS);
  const [results, setResults] = useState<QCResult[]>(MOCK_RESULTS);
  const [selectedTestId, setSelectedTestId] = useState(INITIAL_TESTS[0].id);
  const [selectedLevel, setSelectedLevel] = useState<QCLevel>(QCLevel.NORMAL);
  const [hoveredResultData, setHoveredResultData] = useState<any | null>(null);

  const [newValue, setNewValue] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

  const activeTest = tests.find(t => t.id === selectedTestId) || tests[0];
  const filteredResults = results.filter(r => r.testId === selectedTestId && r.level === selectedLevel);
  
  const displayResult = useMemo(() => {
    if (hoveredResultData) return hoveredResultData.raw as QCResult;
    return filteredResults.length > 0 ? filteredResults[filteredResults.length - 1] : null;
  }, [hoveredResultData, filteredResults]);

  const sigmaMetrics = useMemo(() => {
    const config = activeTest.configs[selectedLevel];
    const cv = config.mean !== 0 ? (config.sd / config.mean) * 100 : 0;
    const sigma = cv !== 0 ? (activeTest.tea - config.bias) / cv : 0;
    
    let status = "Kém";
    if (sigma >= 6) status = "Đẳng cấp Thế giới";
    else if (sigma >= 5) status = "Rất tốt";
    else if (sigma >= 4) status = "Tốt";
    else if (sigma >= 3) status = "Tạm được";
    
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
        return {
          ...t,
          configs: {
            ...t.configs,
            [level]: { ...t.configs[level], [field]: num }
          }
        };
      }
      return t;
    }));
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 text-slate-300 hidden lg:flex flex-col border-r border-slate-800 shrink-0">
        <div className="p-8 border-b border-slate-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-tr from-blue-600 to-blue-400 p-2.5 rounded-xl shadow-lg">
              <i className="fas fa-microscope text-white text-xl"></i>
            </div>
            <h1 className="text-white font-bold text-xl tracking-tight">MinhDucLab</h1>
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Six Sigma Lab Management</p>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-2">
          {[
            { id: 'dashboard', label: 'Dashboard Sigma', icon: 'fa-chart-pie' },
            { id: 'entry', label: 'Nhập kết quả QC', icon: 'fa-edit' },
            { id: 'config', label: 'Cấu hình Sigma/QC', icon: 'fa-sliders-h' },
            { id: 'advisor', label: 'Cố vấn AI 2429', icon: 'fa-user-md' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
                activeTab === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40' : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <i className={`fas ${item.icon} text-lg`}></i>
              <span className="font-semibold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full overflow-y-auto h-screen">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                {activeTab === 'dashboard' && 'Năng lực Xét nghiệm Six Sigma'}
                {activeTab === 'entry' && 'Cập nhật Dữ liệu QC'}
                {activeTab === 'config' && 'Tham số Sigma & Mean/SD'}
                {activeTab === 'advisor' && 'Trợ lý AI Phân tích Sigma'}
            </h2>
            <p className="text-slate-500 mt-1 font-medium italic">MinhDucLab - Tiêu chuẩn quốc tế</p>
          </div>
          
          <div className="flex flex-wrap gap-3 p-1.5 bg-white rounded-2xl shadow-sm border border-slate-200">
              <select value={selectedTestId} onChange={e => setSelectedTestId(e.target.value)} className="bg-slate-50 border-none px-4 py-2.5 rounded-xl font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none min-w-[180px]">
                {tests.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <div className="flex gap-1">
                {Object.values(QCLevel).map(lvl => (
                  <button key={lvl} onClick={() => setSelectedLevel(lvl)} className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${selectedLevel === lvl ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                    {lvl}
                  </button>
                ))}
              </div>
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 gap-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-2 bg-gradient-to-br from-indigo-700 to-blue-900 p-8 rounded-[40px] shadow-2xl text-white relative overflow-hidden">
                  <div className="relative z-10">
                     <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200">Sigma Metric Analysis</span>
                     <div className="flex flex-col md:flex-row md:items-end gap-10 mt-6">
                        <div className="flex-1">
                           <h4 className="text-7xl font-black mb-4">{sigmaMetrics.sigma} <span className="text-2xl font-medium text-blue-300">σ</span></h4>
                           <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
                              <span className="text-lg font-black uppercase tracking-tight">{sigmaMetrics.status}</span>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-8 border-l border-white/20 pl-8">
                           <div><p className="text-[10px] font-black text-blue-300 uppercase mb-2">CV (%)</p><div className="text-2xl font-black">{sigmaMetrics.cv}%</div></div>
                           <div><p className="text-[10px] font-black text-blue-300 uppercase mb-2">TEa (%)</p><div className="text-2xl font-black">{activeTest.tea}%</div></div>
                        </div>
                     </div>
                  </div>
               </div>
               <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col justify-center">
                  <h5 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-6">Thang đo Sigma</h5>
                  <div className="space-y-4">
                     {[{ l: 'World Class', v: '6σ+', c: 'bg-blue-500' }, { l: 'Excellent', v: '5σ', c: 'bg-emerald-500' }, { l: 'Good', v: '4σ', c: 'bg-green-500' }].map(i => (
                        <div key={i.l} className="flex items-center justify-between text-xs font-bold"><div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${i.c}`}></div>{i.l}</div><span className="text-slate-400">{i.v}</span></div>
                     ))}
                  </div>
               </div>
            </div>
            <LeveyJenningsChart results={filteredResults} config={activeTest.configs[selectedLevel]} unit={activeTest.unit} title={`${activeTest.name} - ${selectedLevel}`} onHover={setHoveredResultData} />
          </div>
        )}

        {activeTab === 'entry' && (
          <div className="max-w-xl mx-auto bg-white p-10 rounded-[40px] shadow-2xl border border-slate-100">
            <h3 className="text-2xl font-black text-slate-900 text-center mb-8">Nhập kết quả IQC</h3>
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Xét nghiệm</label>
                        <select className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" value={selectedTestId} onChange={e=>setSelectedTestId(e.target.value)}>
                            {tests.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase">Mức QC</label>
                        <select className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" value={selectedLevel} onChange={e=>setSelectedLevel(e.target.value as QCLevel)}>
                            {Object.values(QCLevel).map(l=><option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Giá trị đo ({activeTest.unit})</label>
                    <input type="number" step="0.01" className="w-full bg-slate-50 p-6 rounded-2xl font-black text-3xl text-blue-600 border-none text-center" placeholder="0.00" value={newValue} onChange={e=>setNewValue(e.target.value)} />
                </div>
                <button onClick={handleAddResult} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl hover:bg-blue-700 transition-all text-lg shadow-lg">Lưu kết quả QC</button>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-10">
              {tests.map(test => (
                  <div key={test.id} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                      <div className="flex items-center justify-between mb-8">
                          <h4 className="text-xl font-black text-slate-900">{test.name}</h4>
                          <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-xl text-[10px] font-bold uppercase">TEa: {test.tea}%</span>
                      </div>
                      
                      <div className="mb-6 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <div className="flex items-center gap-2 mb-2">
                           <i className="fas fa-calculator text-blue-600"></i>
                           <span className="text-[10px] font-black text-blue-800 uppercase">Mẹo tính SD nhanh</span>
                        </div>
                        <p className="text-[10px] text-blue-600 leading-relaxed italic">
                           Nếu NSX chỉ ghi khoảng +/- 2SD, hãy lấy: <br/> 
                           <b>SD = (Giới hạn trên - Mean) / 2</b>
                        </p>
                      </div>

                      <div className="space-y-6">
                          {Object.values(QCLevel).map(lvl => {
                              const currentMean = test.configs[lvl].mean;
                              const currentSD = test.configs[lvl].sd;
                              return (
                                <div key={lvl} className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                    <div className="flex justify-between items-center mb-4">
                                       <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mức {lvl}</div>
                                       <div className="flex gap-2 text-[8px] font-bold">
                                          <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">2SD: {(currentSD * 2).toFixed(2)}</span>
                                          <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded">3SD: {(currentSD * 3).toFixed(2)}</span>
                                       </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-bold text-slate-500 uppercase">Mean (Trung bình)</label>
                                            <input type="number" step="0.01" value={test.configs[lvl].mean} onChange={(e) => handleUpdateConfig(test.id, lvl, 'mean', e.target.value)} className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-blue-500" placeholder="Mean" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-bold text-slate-500 uppercase">SD (Độ lệch 1SD)</label>
                                            <input type="number" step="0.01" value={test.configs[lvl].sd} onChange={(e) => handleUpdateConfig(test.id, lvl, 'sd', e.target.value)} className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-black shadow-inner outline-none focus:ring-2 focus:ring-blue-500" placeholder="SD" />
                                            <p className="text-[8px] text-slate-400 italic">Nhập 1SD gốc</p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[8px] font-bold text-slate-500 uppercase text-orange-600">Bias (% Độ chệch)</label>
                                            <input type="number" step="0.01" value={test.configs[lvl].bias} onChange={(e) => handleUpdateConfig(test.id, lvl, 'bias', e.target.value)} className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-black text-orange-600 shadow-inner outline-none focus:ring-2 focus:ring-orange-500" placeholder="Bias%" />
                                        </div>
                                    </div>
                                </div>
                              );
                          })}
                      </div>
                      <button onClick={() => alert('Đã cập nhật cấu hình!')} className="mt-8 w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-blue-600 transition-all text-sm shadow-lg">Lưu cấu hình</button>
                  </div>
              ))}
          </div>
        )}

        {activeTab === 'advisor' && <RegulatoryAdvisor />}
      </main>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
