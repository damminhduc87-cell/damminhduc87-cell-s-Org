
import React, { useState, useMemo, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine 
} from 'recharts';

// --- Types & Constants ---
enum QCLevel { LOW = 'Low', NORMAL = 'Normal', HIGH = 'High' }

interface QCConfig { 
  mean: number; 
  sd: number; 
  bias: number; // Độ chệch (%)
}
interface LabTest {
  id: string;
  name: string;
  unit: string;
  tea: number; // Sai số cho phép (%)
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
    tea: 10, // CLIA tiêu chuẩn cho Glucose là 10%
    configs: {
      [QCLevel.LOW]: { mean: 3.5, sd: 0.12, bias: 1.5 },
      [QCLevel.NORMAL]: { mean: 5.6, sd: 0.18, bias: 1.2 },
      [QCLevel.HIGH]: { mean: 15.2, sd: 0.45, bias: 2.0 },
    }
  },
  {
    id: 'hba1c',
    name: 'HbA1c',
    unit: '%',
    tea: 6, // HbA1c yêu cầu khắt khe hơn ~6%
    configs: {
      [QCLevel.LOW]: { mean: 4.8, sd: 0.1, bias: 0.8 },
      [QCLevel.NORMAL]: { mean: 5.7, sd: 0.15, bias: 1.0 },
      [QCLevel.HIGH]: { mean: 9.5, sd: 0.3, bias: 1.5 },
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
    { role: 'model', text: 'Chào bạn! Tôi là trợ lý AI chuyên trách quản lý chất lượng Lab. Tôi có thể giúp bạn tra cứu Quyết định 2429, Thông tư 37 hoặc tư vấn về Six Sigma. Bạn cần hỗ trợ gì?' }
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
          1. Quyết định 2429/QĐ-BYT.
          2. Westgard Rules và Six Sigma trong Lab.
          3. Công thức Sigma = (TEa - Bias) / CV.
          Trả lời chuyên nghiệp, cấu trúc bảng biểu bằng Markdown.`,
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
            placeholder="Hỏi về cách tính Sigma hoặc quy tắc Westgard..."
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
  const [newTestTea, setNewTestTea] = useState('10');

  const activeTest = tests.find(t => t.id === selectedTestId) || tests[0];
  const filteredResults = results.filter(r => r.testId === selectedTestId && r.level === selectedLevel);
  
  const displayResult = useMemo(() => {
    if (hoveredResultData) return hoveredResultData.raw as QCResult;
    return filteredResults.length > 0 ? filteredResults[filteredResults.length - 1] : null;
  }, [hoveredResultData, filteredResults]);

  const zScore = displayResult 
    ? (displayResult.value - activeTest.configs[selectedLevel].mean) / activeTest.configs[selectedLevel].sd 
    : 0;

  // Sigma Calculation
  const sigmaMetrics = useMemo(() => {
    const config = activeTest.configs[selectedLevel];
    const cv = config.mean !== 0 ? (config.sd / config.mean) * 100 : 0;
    const sigma = cv !== 0 ? (activeTest.tea - config.bias) / cv : 0;
    
    let status = "Kém";
    let color = "text-red-500";
    let bg = "bg-red-50";
    
    if (sigma >= 6) { status = "Đẳng cấp Thế giới"; color = "text-blue-600"; bg = "bg-blue-50"; }
    else if (sigma >= 5) { status = "Rất tốt"; color = "text-emerald-600"; bg = "bg-emerald-50"; }
    else if (sigma >= 4) { status = "Tốt"; color = "text-green-600"; bg = "bg-green-50"; }
    else if (sigma >= 3) { status = "Tạm được"; color = "text-orange-500"; bg = "bg-orange-50"; }
    
    return { sigma: sigma.toFixed(2), cv: cv.toFixed(2), status, color, bg };
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

  const updateTestConfig = (testId: string, level: QCLevel, field: keyof QCConfig, val: string) => {
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

  const updateTea = (testId: string, val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    setTests(prev => prev.map(t => t.id === testId ? { ...t, tea: num } : t));
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
      tea: parseFloat(newTestTea) || 10,
      configs: {
        [QCLevel.LOW]: { mean: 0, sd: 0.1, bias: 0 },
        [QCLevel.NORMAL]: { mean: 0, sd: 0.1, bias: 0 },
        [QCLevel.HIGH]: { mean: 0, sd: 0.1, bias: 0 },
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
            <div className="bg-gradient-to-tr from-blue-600 to-blue-400 p-2.5 rounded-xl shadow-lg shadow-blue-900/40">
              <i className="fas fa-microscope text-white text-xl"></i>
            </div>
            <h1 className="text-white font-bold text-xl tracking-tight">BioQC <span className="text-blue-500 text-sm font-normal">v2.1</span></h1>
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
                <span className="text-xs font-bold text-slate-100 uppercase tracking-tighter">Chất lượng Sigma</span>
                <span className="text-xs font-black text-blue-400">Target 6σ</span>
            </div>
            <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-[85%] rounded-full"></div>
            </div>
        </div>
      </aside>

      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900">
                {activeTab === 'dashboard' && 'Năng lực Xét nghiệm Six Sigma'}
                {activeTab === 'entry' && 'Cập nhật Dữ liệu QC'}
                {activeTab === 'config' && 'Tham số Sigma & Mean/SD'}
                {activeTab === 'advisor' && 'Trợ lý AI Phân tích Sigma'}
            </h2>
            <p className="text-slate-500 mt-1 font-medium italic">Tối ưu hóa quy trình theo tiêu chuẩn quốc tế</p>
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
            {/* Sigma Result Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-2 bg-gradient-to-br from-indigo-700 to-blue-900 p-8 rounded-[40px] shadow-2xl text-white relative overflow-hidden">
                  <div className="relative z-10">
                     <div className="flex items-center gap-3 mb-6">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-200">Phân tích năng lực (Sigma Metric)</span>
                     </div>
                     <div className="flex flex-col md:flex-row md:items-end gap-10">
                        <div className="flex-1">
                           <div className="text-sm text-blue-200 font-bold mb-1 italic">Chỉ số Sigma đạt được:</div>
                           <h4 className="text-7xl font-black mb-4 flex items-baseline gap-3">
                              {sigmaMetrics.sigma} <span className="text-2xl font-medium text-blue-300">σ</span>
                           </h4>
                           <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20`}>
                              <div className={`w-3 h-3 rounded-full ${sigmaMetrics.sigma >= 4 ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`}></div>
                              <span className="text-lg font-black uppercase tracking-tight">{sigmaMetrics.status}</span>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-8 border-l border-white/20 pl-8">
                           <div>
                              <p className="text-[10px] font-black text-blue-300 uppercase mb-2">Hệ số biến thiên (CV)</p>
                              <div className="text-2xl font-black text-white">{sigmaMetrics.cv}%</div>
                           </div>
                           <div>
                              <p className="text-[10px] font-black text-blue-300 uppercase mb-2">TEa Cho phép</p>
                              <div className="text-2xl font-black text-white">{activeTest.tea}%</div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm flex flex-col justify-center">
                  <h5 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-6">Diễn giải Sigma</h5>
                  <div className="space-y-4">
                     {[
                        { label: 'World Class', val: '6σ+', color: 'bg-blue-500' },
                        { label: 'Excellent', val: '5σ', color: 'bg-emerald-500' },
                        { label: 'Good', val: '4σ', color: 'bg-green-500' },
                        { label: 'Marginal', val: '3σ', color: 'bg-orange-500' },
                        { label: 'Poor', val: '<3σ', color: 'bg-red-500' },
                     ].map(item => (
                        <div key={item.label} className="flex items-center justify-between group">
                           <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${item.color}`}></div>
                              <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{item.label}</span>
                           </div>
                           <span className="text-xs font-black text-slate-400">{item.val}</span>
                        </div>
                     ))}
                  </div>
                  <p className="mt-8 text-[10px] text-slate-400 italic leading-relaxed font-medium">Sigma càng cao, xác suất lỗi càng thấp. Mục tiêu tối thiểu 3σ cho Lab lâm sàng.</p>
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
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-4">Bias (%)</span>
                  <span className="text-4xl font-black text-orange-600">
                      {activeTest.configs[selectedLevel].bias}%
                  </span>
               </div>
            </div>

            <LeveyJenningsChart 
              results={filteredResults} config={activeTest.configs[selectedLevel]} unit={activeTest.unit} title={`${activeTest.name} - ${selectedLevel}`} onHover={setHoveredResultData}
            />
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {tests.map(test => (
                  <div key={test.id} className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                      <div className="flex items-center justify-between mb-8">
                          <h4 className="text-xl font-black">{test.name}</h4>
                          <div className="flex flex-col items-end">
                             <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-xl text-[10px] font-bold uppercase mb-1">TEa: {test.tea}%</span>
                             <input 
                               type="number" 
                               value={test.tea} 
                               onChange={(e) => updateTea(test.id, e.target.value)} 
                               className="w-16 bg-slate-50 text-right p-1 rounded font-bold text-xs" 
                             />
                          </div>
                      </div>
                      <div className="space-y-6">
                          {Object.values(QCLevel).map(lvl => (
                              <div key={lvl} className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                  <span className="text-[10px] font-black text-slate-400 uppercase block mb-4">Level {lvl}</span>
                                  <div className="grid grid-cols-3 gap-4">
                                      <div className="space-y-1">
                                          <span className="text-[8px] font-bold text-slate-500 uppercase block">Mean</span>
                                          <input type="number" step="0.01" value={test.configs[lvl].mean} onChange={(e) => updateTestConfig(test.id, lvl, 'mean', e.target.value)} className="w-full bg-white p-2 rounded-xl font-black text-slate-800 text-xs shadow-inner" />
                                      </div>
                                      <div className="space-y-1">
                                          <span className="text-[8px] font-bold text-slate-500 uppercase block">SD</span>
                                          <input type="number" step="0.01" value={test.configs[lvl].sd} onChange={(e) => updateTestConfig(test.id, lvl, 'sd', e.target.value)} className="w-full bg-white p-2 rounded-xl font-black text-slate-800 text-xs shadow-inner" />
                                      </div>
                                      <div className="space-y-1">
                                          <span className="text-[8px] font-bold text-slate-500 uppercase block">Bias (%)</span>
                                          <input type="number" step="0.01" value={test.configs[lvl].bias} onChange={(e) => updateTestConfig(test.id, lvl, 'bias', e.target.value)} className="w-full bg-white p-2 rounded-xl font-black text-orange-600 text-xs shadow-inner" />
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                      <button onClick={() => alert("Đã lưu cấu hình Sigma!")} className="mt-8 w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-blue-600 transition-all">
                        Lưu cấu hình Sigma
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
                <h3 className="text-xl font-black text-slate-900">Thêm xét nghiệm Sigma</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600"><i className="fas fa-times text-xl"></i></button>
              </div>
              <div className="space-y-4">
                <input type="text" placeholder="Tên xét nghiệm (VD: Creatinine)" value={newTestName} onChange={(e) => setNewTestName(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                <input type="text" placeholder="Đơn vị tính (VD: µmol/L)" value={newTestUnit} onChange={(e) => setNewTestUnit(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                <input type="number" placeholder="TEa cho phép (%)" value={newTestTea} onChange={(e) => setNewTestTea(e.target.value)} className="w-full bg-slate-50 p-4 rounded-2xl font-bold border-none" />
                <button onClick={handleCreateNewTest} className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg mt-4">Tạo cấu hình Sigma</button>
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
