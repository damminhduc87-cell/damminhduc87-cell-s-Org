
import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine 
} from 'recharts';

// --- Types & Constants ---
enum QCLevel { LOW = 'Low', NORMAL = 'Normal', HIGH = 'High' }

interface QCConfig { mean: number; sd: number; }
interface LabTest {
  id: string;
  name: string;
  unit: string;
  configs: Record<QCLevel, QCConfig>;
}
interface QCResult {
  id: string;
  testId: string;
  level: QCLevel;
  value: number;
  timestamp: number;
}
interface ChatMessage { role: 'user' | 'model'; text: string; }

const INITIAL_TESTS: LabTest[] = [
  {
    id: 'glucose',
    name: 'Glucose (Máu)',
    unit: 'mmol/L',
    configs: {
      [QCLevel.LOW]: { mean: 3.5, sd: 0.12 },
      [QCLevel.NORMAL]: { mean: 5.6, sd: 0.18 },
      [QCLevel.HIGH]: { mean: 15.2, sd: 0.45 },
    }
  },
  {
    id: 'hba1c',
    name: 'HbA1c',
    unit: '%',
    configs: {
      [QCLevel.LOW]: { mean: 4.8, sd: 0.1 },
      [QCLevel.NORMAL]: { mean: 5.7, sd: 0.15 },
      [QCLevel.HIGH]: { mean: 9.5, sd: 0.3 },
    }
  }
];

const INITIAL_RESULTS: QCResult[] = [
  { id: '1', testId: 'glucose', level: QCLevel.NORMAL, value: 5.5, timestamp: Date.now() - 86400000 * 4 },
  { id: '2', testId: 'glucose', level: QCLevel.NORMAL, value: 5.8, timestamp: Date.now() - 86400000 * 3 },
  { id: '3', testId: 'glucose', level: QCLevel.NORMAL, value: 5.4, timestamp: Date.now() - 86400000 * 2 },
  { id: '4', testId: 'glucose', level: QCLevel.NORMAL, value: 5.65, timestamp: Date.now() - 86400000 * 1 },
  { id: '5', testId: 'glucose', level: QCLevel.NORMAL, value: 5.6, timestamp: Date.now() },
];

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
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Chào bạn! Tôi là trợ lý AI chuyên trách quản lý chất lượng Lab. Tôi có thể giúp bạn tra cứu Quyết định 2429, Thông tư 37 hoặc hướng dẫn an toàn sinh học. Bạn muốn hỏi gì?' }
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
          systemInstruction: `Bạn là một chuyên gia tư vấn QC Lab tại Việt Nam. Trả lời dựa trên: 
          1. Quyết định 2429/QĐ-BYT (Tiêu chí chất lượng Lab).
          2. Thông tư 37/2017/TT-BYT.
          3. Westgard Rules.
          Trả lời chuyên nghiệp bằng Markdown.`,
          tools: [{ googleSearch: {} }]
        }
      });

      let resultText = response.text || 'Lỗi xử lý.';
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (groundingChunks && groundingChunks.length > 0) {
        const sources = groundingChunks
          .map((chunk: any) => chunk.web ? `[${chunk.web.title}](${chunk.web.uri})` : null)
          .filter(Boolean);
        if (sources.length > 0) {
          resultText += '\n\n**Nguồn tham khảo:**\n' + sources.join('\n');
        }
      }

      setMessages(prev => [...prev, { role: 'model', text: resultText }]);
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
        <h3 className="font-bold flex items-center gap-2"><i className="fas fa-brain text-blue-400"></i> Cố vấn AI BioQC</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${m.role === 'user' ? 'bg-blue-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-800 shadow-sm'}`}>
              <div className="whitespace-pre-wrap">{m.text}</div>
            </div>
          </div>
        ))}
        {loading && <div className="text-slate-400 text-xs italic animate-pulse px-4">AI đang phân tích...</div>}
        <div ref={chatEndRef} />
      </div>
      <div className="p-4 border-t border-slate-100 bg-white">
        <div className="flex gap-2">
          <input 
            className="flex-1 bg-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="VD: Cần bao nhiêu điểm QC để tính Mean?"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && sendMessage()}
          />
          <button onClick={sendMessage} className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700">
            <i className="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tests, setTests] = useState<LabTest[]>(INITIAL_TESTS);
  const [results, setResults] = useState<QCResult[]>(INITIAL_RESULTS);
  const [selectedTestId, setSelectedTestId] = useState(INITIAL_TESTS[0].id);
  const [selectedLevel, setSelectedLevel] = useState<QCLevel>(QCLevel.NORMAL);
  const [hoveredResultData, setHoveredResultData] = useState<any | null>(null);

  const [newValue, setNewValue] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTestName, setNewTestName] = useState('');
  const [newTestUnit, setNewTestUnit] = useState('');

  const activeTest = tests.find(t => t.id === selectedTestId) || tests[0];
  const filteredResults = results.filter(r => r.testId === selectedTestId && r.level === selectedLevel);
  
  const displayResult = useMemo(() => {
    if (hoveredResultData) return hoveredResultData.raw as QCResult;
    return filteredResults.length > 0 ? filteredResults[filteredResults.length - 1] : null;
  }, [hoveredResultData, filteredResults]);

  const zScore = displayResult 
    ? (displayResult.value - activeTest.configs[selectedLevel].mean) / activeTest.configs[selectedLevel].sd 
    : 0;

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

  const updateTestConfig = (testId: string, level: QCLevel, field: 'mean' | 'sd', val: string) => {
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

  const handleCreateNewTest = () => {
    if (!newTestName || !newTestUnit) {
      alert("Vui lòng nhập đầy đủ tên và đơn vị!");
      return;
    }
    const newTest: LabTest = {
      id: newTestName.toLowerCase().replace(/\s+/g, '-'),
      name: newTestName,
      unit: newTestUnit,
      configs: {
        [QCLevel.LOW]: { mean: 0, sd: 0.1 },
        [QCLevel.NORMAL]: { mean: 0, sd: 0.1 },
        [QCLevel.HIGH]: { mean: 0, sd: 0.1 },
      }
    };
    setTests([...tests, newTest]);
    setNewTestName('');
    setNewTestUnit('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 text-slate-300 hidden lg:flex flex-col border-r border-slate-800 shrink-0">
        <div className="p-8 border-b border-slate-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-gradient-to-tr from-blue-600 to-blue-400 p-2.5 rounded-xl">
              <i className="fas fa-microscope text-white text-xl"></i>
            </div>
            <h1 className="text-white font-bold text-xl tracking-tight">BioQC <span className="text-blue-500 text-sm font-normal">v2.0</span></h1>
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Medical Lab Management</p>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-pie' },
            { id: 'entry', label: 'Nhập kết quả QC', icon: 'fa-edit' },
            { id: 'config', label: 'Cấu hình Mean/SD', icon: 'fa-sliders-h' },
            { id: 'advisor', label: 'Cố vấn AI 2429', icon: 'fa-user-md' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all ${
                activeTab === item.id 
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40' 
                : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <i className={`fas ${item.icon} text-lg`}></i>
              <span className="font-semibold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-6 bg-slate-800/40 m-4 rounded-3xl border border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-100 uppercase tracking-tighter">QĐ 2429/QĐ-BYT</span>
                <span className="text-xs font-black text-blue-400">Mức 3/5</span>
            </div>
            <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-[60%] rounded-full"></div>
            </div>
        </div>
      </aside>

      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900">
                {activeTab === 'dashboard' && 'Giám sát Nội kiểm (IQC)'}
                {activeTab === 'entry' && 'Cập nhật Dữ liệu'}
                {activeTab === 'config' && 'Tham số Kỹ thuật'}
                {activeTab === 'advisor' && 'Trợ lý AI Thông minh'}
            </h2>
            <p className="text-slate-500 mt-1 font-medium italic">Tiêu chuẩn ISO 15189 & QĐ 2429</p>
          </div>
          
          {activeTab === 'dashboard' && (
            <div className="flex flex-wrap gap-3 p-1.5 bg-white rounded-2xl shadow-sm border border-slate-200">
                <select value={selectedTestId} onChange={e => setSelectedTestId(e.target.value)} className="bg-slate-50 border-none px-4 py-2.5 rounded-xl font-bold text-sm focus:ring-2 focus:ring-blue-500 outline-none">
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
          )}
        </header>

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 gap-8">
            {/* Dynamic Result Panel */}
            <div className="bg-gradient-to-br from-blue-700 to-blue-900 p-8 rounded-[40px] shadow-2xl text-white relative overflow-hidden">
               <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200">
                      {hoveredResultData ? 'Dữ liệu tại điểm chọn' : 'Kết quả nội kiểm gần nhất'}
                    </span>
                  </div>
                  {displayResult ? (
                    <div className="flex flex-col md:flex-row md:items-end gap-10">
                       <div className="flex-1">
                          <h4 className="text-5xl font-black mb-2 flex items-baseline gap-3">
                             {displayResult.value} <span className="text-xl font-medium text-blue-300">{activeTest.unit}</span>
                          </h4>
                          <p className="text-blue-100/70 font-bold text-sm">
                            <i className="far fa-clock mr-2"></i> {new Date(displayResult.timestamp).toLocaleString('vi-VN')}
                          </p>
                       </div>
                       <div className="grid grid-cols-2 gap-8 border-l border-white/20 pl-8">
                          <div>
                             <p className="text-[10px] font-black text-blue-300 uppercase mb-2">Z-Score</p>
                             <div className={`text-2xl font-black ${Math.abs(zScore) > 3 ? 'text-red-400' : Math.abs(zScore) > 2 ? 'text-orange-400' : 'text-emerald-400'}`}>
                                {zScore > 0 ? '+' : ''}{zScore.toFixed(2)} SD
                             </div>
                          </div>
                          <div>
                             <p className="text-[10px] font-black text-blue-300 uppercase mb-2">Trạng thái</p>
                             <span className="text-lg font-black uppercase tracking-tight">
                                {Math.abs(zScore) > 3 ? 'Lỗi hệ thống' : Math.abs(zScore) > 2 ? 'Cảnh báo' : 'Ổn định'}
                             </span>
                          </div>
                       </div>
                    </div>
                  ) : <div className="py-10 text-blue-300 italic">Chưa có dữ liệu QC cho mức này.</div>}
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-200">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-4">Target Mean</span>
                  <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black text-slate-900">{activeTest.configs[selectedLevel].mean}</span>
                      <span className="text-slate-400 font-bold">{activeTest.unit}</span>
                  </div>
               </div>
               <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-200">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-4">2SD Range</span>
                  <div className="text-xl font-bold text-slate-900">
                      {(activeTest.configs[selectedLevel].mean - 2 * activeTest.configs[selectedLevel].sd).toFixed(2)} - {(activeTest.configs[selectedLevel].mean + 2 * activeTest.configs[selectedLevel].sd).toFixed(2)}
                  </div>
               </div>
               <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-200">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-4">CV (%)</span>
                  <span className="text-4xl font-black text-emerald-600">
                      {activeTest.configs[selectedLevel].mean !== 0 ? ((activeTest.configs[selectedLevel].sd / activeTest.configs[selectedLevel].mean) * 100).toFixed(2) : '0'}%
                  </span>
               </div>
            </div>

            <LeveyJenningsChart 
              results={filteredResults} config={activeTest.configs[selectedLevel]} unit={activeTest.unit} title={`${activeTest.name} - ${selectedLevel}`} onHover={setHoveredResultData}
            />

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                    <h4 className="font-black text-slate-800 uppercase text-sm">Lịch sử kết quả</h4>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-400 font-bold text-[10px] uppercase">
                            <tr><th className="px-8 py-4">Thời gian</th><th className="px-8 py-4">Giá trị đo</th><th className="px-8 py-4">Độ lệch (SD)</th><th className="px-8 py-4">Trạng thái</th></tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredResults.sort((a,b)=>b.timestamp-a.timestamp).map(r => {
                                const curZ = (r.value - activeTest.configs[selectedLevel].mean) / activeTest.configs[selectedLevel].sd;
                                return (
                                    <tr key={r.id} className="hover:bg-blue-50 cursor-pointer" onMouseEnter={() => setHoveredResultData({ raw: r })} onMouseLeave={() => setHoveredResultData(null)}>
                                        <td className="px-8 py-5 text-slate-600">{new Date(r.timestamp).toLocaleString('vi-VN')}</td>
                                        <td className="px-8 py-5 font-black">{r.value}</td>
                                        <td className={`px-8 py-5 font-bold ${Math.abs(curZ) > 3 ? 'text-red-600' : Math.abs(curZ) > 2 ? 'text-orange-600' : 'text-emerald-600'}`}>{curZ.toFixed(2)} SD</td>
                                        <td className="px-8 py-5">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${Math.abs(curZ) > 3 ? 'bg-red-100 text-red-700' : Math.abs(curZ) > 2 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {Math.abs(curZ) > 3 ? 'Lỗi' : Math.abs(curZ) > 2 ? 'Cảnh báo' : 'Đạt'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
        )}

        {activeTab === 'entry' && (
          <div className="max-w-xl mx-auto bg-white p-10 rounded-[40px] shadow-2xl border border-slate-100">
            <h3 className="text-2xl font-black text-slate-900 text-center mb-8">Nhập dữ liệu QC</h3>
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
                    <label className="text-[10px] font-black text-slate-400 uppercase">Ngày thực hiện</label>
                    <input type="date" className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" value={newDate} onChange={e=>setNewDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Giá trị kết quả ({activeTest.unit})</label>
                    <input type="number" step="0.01" className="w-full bg-slate-50 p-6 rounded-2xl font-black text-3xl text-blue-600 border-none text-center" placeholder="0.00" value={newValue} onChange={e=>setNewValue(e.target.value)} />
                </div>
                <button onClick={handleAddResult} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl hover:bg-blue-700 transition-all text-lg shadow-lg">Lưu kết quả QC</button>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {tests.map(test => (
                  <div key={test.id} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                      <div className="flex items-center justify-between mb-8">
                          <h4 className="text-xl font-black">{test.name}</h4>
                          <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-xl text-xs font-bold">{test.unit}</span>
                      </div>
                      <div className="space-y-6">
                          {Object.values(QCLevel).map(lvl => (
                              <div key={lvl} className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                  <span className="text-[10px] font-black text-slate-400 uppercase block mb-4">Level {lvl}</span>
                                  <div className="grid grid-cols-2 gap-6">
                                      <div className="space-y-2">
                                          <span className="text-[9px] font-bold text-slate-500 block">TARGET MEAN</span>
                                          <input type="number" step="0.01" value={test.configs[lvl].mean} onChange={(e) => updateTestConfig(test.id, lvl, 'mean', e.target.value)} className="w-full bg-white p-3 rounded-xl font-black text-slate-800 shadow-inner border-none focus:ring-2 focus:ring-blue-500" />
                                      </div>
                                      <div className="space-y-2">
                                          <span className="text-[9px] font-bold text-slate-500 block">STD. DEV (SD)</span>
                                          <input type="number" step="0.01" value={test.configs[lvl].sd} onChange={(e) => updateTestConfig(test.id, lvl, 'sd', e.target.value)} className="w-full bg-white p-3 rounded-xl font-black text-slate-800 shadow-inner border-none focus:ring-2 focus:ring-blue-500" />
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                      <button onClick={() => alert("Đã lưu cấu hình!")} className="mt-8 w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-blue-600 transition-all">
                        Lưu cấu hình
                      </button>
                  </div>
              ))}
              <div onClick={() => setIsAddModalOpen(true)} className="bg-dashed border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center p-12 text-slate-400 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-500 cursor-pointer transition-all">
                  <i className="fas fa-plus-circle text-4xl mb-4"></i>
                  <span className="font-black uppercase text-sm">Thêm xét nghiệm mới</span>
              </div>
          </div>
        )}

        {activeTab === 'advisor' && <RegulatoryAdvisor />}

        {/* Modal Thêm Xét nghiệm Mới */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-900">Thêm xét nghiệm mới</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600"><i className="fas fa-times text-xl"></i></button>
              </div>
              <div className="space-y-4">
                <input type="text" placeholder="Tên xét nghiệm (VD: AST)" value={newTestName} onChange={(e) => setNewTestName(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none focus:ring-2 focus:ring-blue-500" />
                <input type="text" placeholder="Đơn vị tính (VD: U/L)" value={newTestUnit} onChange={(e) => setNewTestUnit(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={handleCreateNewTest} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg mt-4">Xác nhận</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
